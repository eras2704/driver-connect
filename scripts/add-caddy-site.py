#!/usr/bin/env python3
"""Añade el sitio NFC al Caddy existente después de validar toda la configuración."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

CONFIG = Path("/opt/ccpd/server/Caddyfile")
SNIPPET = Path(__file__).resolve().parent.parent / "deploy/nfc.Caddyfile"
PROXY = "server-caddy-1"
APP = "driver-connect-app-1"
DOMAIN = "nfc.comunidaddeconductorespanama.com"
CONTAINER_CONFIG = "/etc/caddy/Caddyfile"


def run(*args, input=None):
    return subprocess.run(args, input=input, capture_output=True, text=True, check=True, timeout=45)


def inspect(name):
    return json.loads(run("docker", "inspect", name).stdout)[0]


def reload_method(config):
    if not config.get("admin", {}).get("disabled", False):
        return "api"
    # SIGUSR1 is supported by the installed 2.11.x release. Never send it to
    # an unknown PID 1, an older binary, or a process started with --resume.
    version = run("docker", "exec", PROXY, "caddy", "version").stdout
    match = re.match(r"v(\d+)\.(\d+)\.(\d+)(?:\s|$)", version)
    if not match or int(match[1]) != 2 or int(match[2]) < 11:
        raise RuntimeError("Caddy tiene admin off; se requiere Caddy 2.11 o posterior para esta recarga por señal. No se modificó el archivo.")
    command = run("docker", "exec", PROXY, "cat", "/proc/1/cmdline").stdout.rstrip("\0").split("\0")
    if not command or Path(command[0]).name != "caddy" or command[1:] != ["run", "--config", CONTAINER_CONFIG, "--adapter", "caddyfile"]:
        raise RuntimeError("Caddy tiene admin off, pero su proceso no permite verificar una recarga por señal. No se modificó el archivo.")
    # Confirm that Docker can read logs before changing the bind-mounted file.
    run("docker", "logs", "--tail", "1", PROXY)
    return "signal"


def signal_result(output, since):
    for line in output.splitlines():
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        if not isinstance(entry, dict) or entry.get("signal") != "SIGUSR1":
            continue
        timestamp = entry.get("ts")
        if not isinstance(timestamp, (int, float)) or timestamp < since:
            continue
        message = entry.get("msg", "")
        if message == "successfully reloaded config from file" and entry.get("file") == CONTAINER_CONFIG:
            return True
        if message == "failed to reload config from file" or "ignored SIGUSR1" in message:
            raise RuntimeError("Caddy rechazó o ignoró la recarga por SIGUSR1.")
    return False


def reload_config(method):
    if method == "api":
        run("docker", "exec", PROXY, "caddy", "reload", "--config", CONTAINER_CONFIG, "--adapter", "caddyfile")
        return
    since = time.time()
    run("docker", "kill", "--signal=USR1", PROXY)
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        logs = run("docker", "logs", "--since", f"{since:.9f}", "--tail", "1000", PROXY)
        if signal_result(logs.stdout + "\n" + logs.stderr, since):
            if not inspect(PROXY)["State"].get("Running"):
                raise RuntimeError("Caddy dejó de estar en ejecución después de la recarga.")
            return
        time.sleep(0.5)
    raise RuntimeError("Caddy no confirmó la recarga por SIGUSR1 en 30 segundos.")


def main():
    if os.geteuid() != 0:
        raise RuntimeError("Ejecuta: sudo python3 scripts/add-caddy-site.py")
    proxy, app = inspect(PROXY), inspect(APP)
    if not any(m.get("Source") == str(CONFIG) and m.get("Destination") == "/etc/caddy/Caddyfile" for m in proxy["Mounts"]):
        raise RuntimeError("El proxy no usa el Caddyfile esperado; no se modifica nada.")
    for container in (proxy, app):
        if "server_frontend" not in container["NetworkSettings"]["Networks"]:
            raise RuntimeError("Primero inicia Driver Connect con compose.shared-proxy.yaml.")
    if app["State"].get("Health", {}).get("Status") != "healthy":
        raise RuntimeError("Driver Connect todavía no está saludable; no se modifica el proxy.")
    if "driver-connect-web" not in app["NetworkSettings"]["Networks"]["server_frontend"].get("Aliases", []):
        raise RuntimeError("Falta el alias driver-connect-web de compose.shared-proxy.yaml.")
    if f"APP_ORIGIN=https://{DOMAIN}" not in app["Config"]["Env"]:
        raise RuntimeError("Configura APP_ORIGIN con el subdominio NFC y recrea la aplicación.")
    # Comprueba el acceso real desde el proxy antes de tocar su configuración.
    run("docker", "exec", PROXY, "wget", "-q", "-T", "10", "-O", "/dev/null", "http://driver-connect-web:3000/api/health")
    original = CONFIG.read_bytes()
    current = original.decode("utf-8")
    snippet = SNIPPET.read_text().strip()
    if snippet in current:
        print("El bloque NFC ya existe. Se validará y recargará sin añadir duplicados.")
        candidate = current
    elif DOMAIN in current or "# BEGIN Driver Connect NFC" in current:
        raise RuntimeError("Ya hay una configuración NFC diferente. Revísala sin sobrescribirla.")
    else:
        candidate = current.rstrip() + "\n\n" + snippet + "\n"
    # Captura la salida para no mostrar otras rutas ni posibles valores privados.
    adapted = run("docker", "exec", "-i", PROXY, "caddy", "adapt", "--config", "-", "--adapter", "caddyfile", "--validate", input=candidate)
    method = reload_method(json.loads(adapted.stdout))
    if method == "signal":
        print("Caddy usa admin off. Se recargará mediante SIGUSR1 y se comprobará su confirmación.")
    if candidate == current:
        reload_config(method)
        print(f"Proxy recargado. Comprueba https://{DOMAIN}")
        return
    if CONFIG.read_bytes() != original:
        raise RuntimeError("El archivo cambió durante la validación. Repite tras revisar ese cambio.")
    fd, backup = tempfile.mkstemp(prefix="Caddyfile.before-driver-connect-", dir=CONFIG.parent)
    with os.fdopen(fd, "wb") as handle:
        handle.write(original)
    try:
        # Mantiene el inodo del archivo enlazado al contenedor mediante bind mount.
        CONFIG.write_bytes(candidate.encode("utf-8"))
        reload_config(method)
    except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
        CONFIG.write_bytes(original)
        try:
            reload_config(method)
        except (RuntimeError, subprocess.SubprocessError):
            raise RuntimeError(f"Archivo restaurado, pero no se pudo recargar. Respaldo: {backup}") from exc
        raise RuntimeError(f"No se aplicó el cambio; configuración anterior restaurada. Respaldo: {backup}") from exc
    print(f"Sitio NFC añadido y proxy recargado. Respaldo: {backup}")
    print(f"Comprueba https://{DOMAIN} y el funcionamiento de tu API.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        if isinstance(error, subprocess.SubprocessError):
            print("Falló una comprobación de Docker o Caddy. No se publicó la configuración nueva.", file=sys.stderr)
        else:
            print(str(error), file=sys.stderr)
        sys.exit(1)
