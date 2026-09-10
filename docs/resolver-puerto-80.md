# Corregir el conflicto del puerto 80 en Lightsail

El diagnóstico encontró `server-caddy-1` atendiendo la API en los puertos 80 y 443. `driver-connect-app-1` y MySQL estaban saludables. La solución consiste en conectar la aplicación al proxy existente, usando `nfc.comunidaddeconductorespanama.com`; no detengas `server-caddy-1` ni cambies los registros DNS de la API.

## 1. Subir el ajuste desde tu computadora

Ejecuta en la terminal local, no en la terminal remota de AWS:

```bash
scp -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" "/home/eroca/Documentos/ChatGPT/Tarjetas NFC/dist/driver-connect-proxy-fix.tar.gz" ubuntu@35.169.111.143:~/driver-connect-proxy-fix.tar.gz
```

## 2. Aplicarlo dentro de Ubuntu en AWS

Si no estás conectado, entra desde tu terminal local:

```bash
ssh -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" ubuntu@35.169.111.143
```

Después, en la terminal de Ubuntu:

```bash
cd ~/driver-connect
tar -xzf ~/driver-connect-proxy-fix.tar.gz
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml rm -f caddy
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --no-build --wait --wait-timeout 180
sudo python3 scripts/add-caddy-site.py
```

Ejecuta cada línea solo si la anterior terminó correctamente. `rm -f caddy` retira únicamente el contenedor detenido del segundo Caddy que intentó arrancar este proyecto. No usa `--stop`, no retira volúmenes y no toca `server-caddy-1`. Si informa que el contenedor está en ejecución, detente y revisa el estado antes de continuar.

El script comprueba la salud de la aplicación y su acceso desde el proxy. Valida la combinación del archivo actual con el nuevo bloque, guarda un respaldo de `/opt/ccpd/server/Caddyfile` y recarga el Caddy existente. En caso de fallo de recarga, intenta restaurar el archivo anterior y recargarlo; informa si la recuperación falla. Las rutas de la API se conservan y no se regenera ninguna contraseña.

El proxy actual usa Caddy 2.11.4 con `admin off`. El script actualizado detecta esta configuración y utiliza `SIGUSR1`, después de comprobar la versión y que el proceso principal se inició con el Caddyfile esperado. Espera la confirmación de Caddy en los registros; no reinicia el contenedor ni habilita la administración.

Si el script dice que el sitio NFC ya existe con una configuración diferente, no la sobrescribe; revisa ese bloque antes de repetirlo. Si ya contiene exactamente este ajuste, lo valida y recarga sin duplicarlo.

## 3. Comprobar el resultado

Abre `https://nfc.comunidaddeconductorespanama.com` y confirma que tu API siga funcionando. Si el certificado todavía se está emitiendo, espera a que Caddy termine; no ignores advertencias de certificados.

Desde Ubuntu puedes comprobar la aplicación:

```bash
curl --fail https://nfc.comunidaddeconductorespanama.com/api/health
```

Para futuras actualizaciones de Driver Connect en esta máquina, utiliza **compose.shared-proxy.yaml**. **compose.aws.yaml** corresponde a una máquina donde este proyecto puede ocupar los puertos 80 y 443 por sí solo.

La conexión a `server_frontend` queda declarada en Compose para conservarse al recrear la aplicación. MySQL sigue únicamente en la red interna de Driver Connect. El bloque NFC queda en el Caddyfile del servidor existente; conserva esa adición cuando actualices el proyecto de la API.

## Si apareció «Archivo restaurado, pero no se pudo recargar»

El script anterior intentaba usar `caddy reload` aunque el proxy tuviera `admin off`. En ese caso tanto la recarga inicial como la de recuperación fallan; el archivo anterior queda restaurado. No vuelvas a ejecutar esa versión del script ni reinicies el proxy para resolverlo.

Sube únicamente el script corregido **desde la terminal de tu computadora**:

```bash
scp -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" "/home/eroca/Documentos/ChatGPT/Tarjetas NFC/scripts/add-caddy-site.py" ubuntu@35.169.111.143:~/driver-connect/scripts/add-caddy-site.py
```

Después, **en la terminal Ubuntu de AWS**:

```bash
cd ~/driver-connect
sudo python3 scripts/add-caddy-site.py
```

Debe informar que usa `SIGUSR1` y, solo tras confirmar la recarga, que el sitio NFC se añadió. La emisión del certificado es posterior: comprueba HTTPS con el comando del paso 3. Conserva el respaldo indicado por el script.

## Referencias

- [Docker: redes compartidas entre proyectos Compose](https://docs.docker.com/compose/how-tos/networking/).
- [Caddy: validar y recargar la configuración](https://caddyserver.com/docs/command-line).
- [Caddy: recarga mediante SIGUSR1](https://caddyserver.com/docs/command-line#signals).
