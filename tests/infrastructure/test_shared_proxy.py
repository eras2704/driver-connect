import importlib.util
import json
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
        self.admin_off = False
        self.version = "v2.11.4 h1:test"
        self.process = "caddy\0run\0--config\0/etc/caddy/Caddyfile\0--adapter\0caddyfile\0"
        self.signal_rejects = False
        self.signal_ignored = False
        self.signals = 0
        self.app = {
            "NetworkSettings": {"Networks": {"server_frontend": {"Aliases": ["driver-connect-web"]}}},
            "State": {"Health": {"Status": "healthy"}},
            "Config": {"Env": [f"APP_ORIGIN=https://{site.DOMAIN}"]},
        }
        proxy = {"State": {"Running": True}, "Mounts": [{"Source": str(self.config), "Destination": "/etc/caddy/Caddyfile"}], "NetworkSettings": self.app["NetworkSettings"]}
        for target in [patch.object(site, "CONFIG", self.config), patch.object(site.os, "geteuid", return_value=0), patch.object(site, "inspect", side_effect=lambda name: proxy if name == site.PROXY else self.app), patch.object(site, "run", side_effect=self.run_command), patch.object(site.time, "time", return_value=1000.5)]:
            target.start()
            self.addCleanup(target.stop)

    def run_command(self, *args, input=None):
        self.commands.append(args)
        stdout = ""
        if "adapt" in args and self.validation_fails:
            raise subprocess.CalledProcessError(1, args)
        if "adapt" in args:
            stdout = json.dumps({"admin": {"disabled": self.admin_off}})
        if "version" in args:
            stdout = self.version
        if "/proc/1/cmdline" in args:
            stdout = self.process
        if "--signal=USR1" in args:
            self.signals += 1
        if "--since" in args:
            message = "successfully reloaded config from file"
            if self.signal_rejects and self.signals == 1:
                message = "failed to reload config from file"
            if self.signal_ignored and self.signals == 1:
                message = "last config unknown, ignored SIGUSR1"
            stdout = json.dumps({"signal": "SIGUSR1", "ts": 1001, "msg": message, "file": site.CONTAINER_CONFIG})
        if "reload" in args:
            self.reloads += 1
            if self.reload_fails and self.reloads == 1:
                raise subprocess.TimeoutExpired(args, 45)
        return subprocess.CompletedProcess(args, 0, stdout, "")

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

    def test_admin_off_uses_confirmed_signal_and_preserves_admin_off(self):
        self.admin_off = True
        self.original = b"{\n admin off\n}\n" + self.original
        self.config.write_bytes(self.original)
        site.main()
        self.assertTrue(self.config.read_bytes().startswith(self.original.rstrip()))
        self.assertEqual(self.signals, 1)
        self.assertEqual(self.reloads, 0)
        self.assertFalse(any("restart" in cmd or "stop" in cmd for cmd in self.commands))

    def test_rejected_signal_restores_and_confirms_original(self):
        self.admin_off = self.signal_rejects = True
        with self.assertRaisesRegex(RuntimeError, "restaurada"):
            site.main()
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(self.signals, 2)

    def test_ignored_signal_is_not_reported_as_success(self):
        self.admin_off = self.signal_ignored = True
        with self.assertRaisesRegex(RuntimeError, "restaurada"):
            site.main()
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(self.signals, 2)

    def test_signal_confirmation_timeout_restores_original(self):
        self.admin_off = True
        with patch.object(site.time, "monotonic", side_effect=[0, 31, 32, 33]):
            with self.assertRaisesRegex(RuntimeError, "restaurada"):
                site.main()
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(self.signals, 2)

    def test_unverified_version_or_process_does_not_modify_file(self):
        self.admin_off = True
        for version, process in [("v2.10.2", self.process), ("v2.11.4", "sh\0entrypoint.sh\0"), ("v2.11.4", self.process + "--resume\0")]:
            with self.subTest(version=version, process=process):
                self.version, self.process = version, process
                with self.assertRaisesRegex(RuntimeError, "No se modificó"):
                    site.main()
                self.assertEqual(self.config.read_bytes(), self.original)
                self.assertEqual(self.signals, 0)

    def test_stale_or_unrelated_logs_do_not_confirm_signal(self):
        for entry in [
            {"ts": 900, "signal": "SIGUSR1", "msg": "successfully reloaded config from file", "file": site.CONTAINER_CONFIG},
            {"ts": 1001, "msg": "successfully reloaded config from file", "file": site.CONTAINER_CONFIG},
            {"ts": 1001, "signal": "SIGUSR1", "msg": "successfully reloaded config from file", "file": "/other/Caddyfile"},
            {"ts": "invalid", "signal": "SIGUSR1"},
            [],
        ]:
            with self.subTest(entry=entry):
                self.assertFalse(site.signal_result("non-json log\n" + json.dumps(entry), 1000.5))


if __name__ == "__main__":
    unittest.main()
