import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(shutil.which("docker"), "Docker Compose no está disponible")
class CalendarComposeTests(unittest.TestCase):
    def test_worker_uses_existing_shared_database_and_network(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "compose.yaml").write_text("""services:
  app:
    image: driver-connect-app
    environment:
      DATABASE_URL: mysql://driver_connect:ci-only@ccpd-mysql:3306/driver_connect
    networks: [existing]
  migrate:
    image: driver-connect-migrate
    environment:
      DATABASE_URL: mysql://driver_connect:ci-only@ccpd-mysql:3306/driver_connect
    networks: [existing]
networks:
  existing:
    external: true
    name: driver-connect_default
""", encoding="utf-8")
            shutil.copyfile(ROOT / "compose.calendar.shared-db.yaml", root / "calendar.yaml")
            env = {**os.environ, "CALENDAR_TOKEN_KEY": "a" * 64,
                   "CALENDAR_GOOGLE_CLIENT_ID": "ci-client", "CALENDAR_GOOGLE_CLIENT_SECRET": "ci-secret",
                   "APP_ORIGIN": "https://drivers.example", "SESSION_SECRET": "b" * 64}
            result = subprocess.run(["docker", "compose", "-f", str(root / "compose.yaml"),
                                     "-f", str(root / "calendar.yaml"), "config", "--format", "json"],
                                    check=True, capture_output=True, text=True, env=env)
            services = json.loads(result.stdout)["services"]
            worker = services["calendar-worker"]
            self.assertEqual(set(services), {"app", "migrate", "calendar-worker"})
            self.assertEqual(worker["environment"]["DATABASE_URL"], services["app"]["environment"]["DATABASE_URL"])
            self.assertEqual(worker["networks"], services["migrate"]["networks"])
            self.assertNotIn("db", worker.get("depends_on", {}))
            self.assertNotIn("ports", worker)
            self.assertEqual(worker["command"], ["pnpm", "calendar:worker"])
            self.assertEqual(worker["environment"]["CALENDAR_TOKEN_KEY"], services["app"]["environment"]["CALENDAR_TOKEN_KEY"])
            self.assertEqual(worker["environment"]["CALENDAR_GOOGLE_CLIENT_ID"], "ci-client")
            self.assertEqual(worker["restart"], "unless-stopped")


if __name__ == "__main__":
    unittest.main()
