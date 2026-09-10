#!/usr/bin/env python3
"""Añade el sitio NFC al Caddy existente después de validar toda la configuración."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

CONFIG = Path("/opt/ccpd/server/Caddyfile")
SNIPPET = Path(__file__).resolve().parent.parent / "deploy/nfc.Caddyfile"
PROXY = "server-caddy-1"
APP = "driver-connect-app-1"
DOMAIN = "nfc.comunidaddeconductorespanama.com"


def run(*args, input=None):
    return subprocess.run(args, input=input, capture_output=True, text=True, check=True, timeout=45)


def inspect(name):
    return json.loads(run("docker", "inspect", name).stdout)[0]


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
    run("docker", "exec", "-i", PROXY, "caddy", "adapt", "--config", "-", "--adapter", "caddyfile", "--validate", input=candidate)
    if candidate == current:
        run("docker", "exec", PROXY, "caddy", "reload", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile")
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
        run("docker", "exec", PROXY, "caddy", "reload", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile")
    except (OSError, subprocess.SubprocessError) as exc:
        CONFIG.write_bytes(original)
        try:
            run("docker", "exec", PROXY, "caddy", "reload", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile")
        except subprocess.SubprocessError:
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
