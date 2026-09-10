import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("shared_proxy", ROOT / "scripts/add-caddy-site.py")
site = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(site)


class SharedProxyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config = Path(self.temp.name) / "Caddyfile"
        self.original = b"api.example.com {\n reverse_proxy api:8000\n}\n"
        self.config.write_bytes(self.original)
        self.commands = []
        self.validation_fails = False
        self.reload_fails = False
        self.reloads = 0
        self.app = {
            "NetworkSettings": {"Networks": {"server_frontend": {"Aliases": ["driver-connect-web"]}}},
            "State": {"Health": {"Status": "healthy"}},
            "Config": {"Env": [f"APP_ORIGIN=https://{site.DOMAIN}"]},
        }
        proxy = {"Mounts": [{"Source": str(self.config), "Destination": "/etc/caddy/Caddyfile"}], "NetworkSettings": self.app["NetworkSettings"]}
        for target in [patch.object(site, "CONFIG", self.config), patch.object(site.os, "geteuid", return_value=0), patch.object(site, "inspect", side_effect=lambda name: proxy if name == site.PROXY else self.app), patch.object(site, "run", side_effect=self.run_command)]:
            target.start()
            self.addCleanup(target.stop)

    def run_command(self, *args, input=None):
        self.commands.append(args)
        if "adapt" in args and self.validation_fails:
            raise subprocess.CalledProcessError(1, args)
        if "reload" in args:
            self.reloads += 1
            if self.reload_fails and self.reloads == 1:
                raise subprocess.TimeoutExpired(args, 45)
        return subprocess.CompletedProcess(args, 0, "", "")

    def test_preserves_api_and_backups_and_is_repeatable(self):
        site.main()
        updated = self.config.read_bytes()
        self.assertTrue(updated.startswith(self.original.rstrip()))
        backups = list(self.config.parent.glob("Caddyfile.before-driver-connect-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_bytes(), self.original)
        self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
        site.main()
        self.assertEqual(self.config.read_bytes(), updated)
        self.assertEqual(len(list(self.config.parent.glob("Caddyfile.before-driver-connect-*"))), 1)

    def test_invalid_candidate_does_not_write_or_reload(self):
        self.validation_fails = True
        with self.assertRaises(subprocess.CalledProcessError):
            site.main()
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(self.reloads, 0)

    def test_reload_timeout_restores_original(self):
        self.reload_fails = True
        with self.assertRaisesRegex(RuntimeError, "restaurada"):
            site.main()
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(self.reloads, 2)

    def test_existing_different_site_is_not_overwritten(self):
        self.config.write_bytes(self.original + f"\n{site.DOMAIN} {{ respond 200 }}\n".encode())
        original = self.config.read_bytes()
        with self.assertRaisesRegex(RuntimeError, "diferente"):
            site.main()
        self.assertEqual(self.config.read_bytes(), original)
        self.assertEqual(self.reloads, 0)

    def test_unhealthy_app_does_not_modify_proxy(self):
        self.app["State"]["Health"]["Status"] = "unhealthy"
        with self.assertRaisesRegex(RuntimeError, "saludable"):
            site.main()
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(self.commands, [])


if __name__ == "__main__":
    unittest.main()
