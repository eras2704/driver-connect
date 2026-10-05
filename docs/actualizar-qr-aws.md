# Actualizar QR de perfiles en AWS

Esta guía corresponde a la instalación documentada de Lightsail Ubuntu en `~/driver-connect`, con `.env.production`, `compose.yaml`, `compose.shared-proxy.yaml` y el Caddy compartido existente. La función QR no añade tablas ni requiere una migración nueva. Si tu instalación utiliza otros archivos Compose, conserva esos mismos archivos al actualizar.

Ejecuta los bloques dentro de la terminal SSH de AWS, uno por uno, y continúa sólo si el anterior termina correctamente. No ejecutes `docker compose down -v`: eliminaría los datos. No arranques `compose.aws.yaml` junto con el proxy compartido.

## 1. Integrar el cambio en GitHub

En el pull request de QR, espera a que las comprobaciones de GitHub Actions estén en verde y utiliza **Merge pull request**. Los pasos siguientes descargan `main`, por lo que deben ejecutarse después de integrarlo.

## 2. Abrir SSH y comprobar la instalación

En AWS Lightsail, abre la instancia Ubuntu y selecciona **Conectar mediante SSH**. Dentro de la terminal:

```bash
cd ~/driver-connect
pwd
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml ps
```

Si no existe esa carpeta o alguno de esos archivos, identifica la instalación actual antes de continuar. Si ya está activo `compose.calendar.yaml`, úsalo también en los comandos siguientes; no cambies las claves OAuth ni `CALENDAR_TOKEN_KEY`.

Comprueba sólo el dominio, sin imprimir el resto de las credenciales:

```bash
grep '^APP_ORIGIN=' .env.production
```

Para esta instalación debe ser `https://nfc.comunidaddeconductorespanama.com`. Mantén el dominio permanente de las tarjetas.

## 3. Respaldar la versión y los datos

```bash
mkdir -p ../respaldos-driver-connect
chmod 700 ../respaldos-driver-connect
umask 077
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude=data --exclude=backups -czf "../respaldos-driver-connect/codigo-$(date +%Y%m%d-%H%M%S).tar.gz" .
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --no-tablespaces -u "$MYSQL_USER" "$MYSQL_DATABASE"' > "../respaldos-driver-connect/base-$(date +%Y%m%d-%H%M%S).sql"
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml exec -T app tar -C /app/data -czf - uploads > "../respaldos-driver-connect/fotos-$(date +%Y%m%d-%H%M%S).tar.gz"
```

El respaldo de código incluye `.env.production`: mantén privada esa carpeta. Si un respaldo falla, resuelve el error antes de actualizar.

## 4. Descargar el código de GitHub

Si la carpeta es un repositorio Git:

```bash
git status --short
git branch --show-current
git pull --ff-only origin main
git log -1 --oneline
```

Continúa únicamente si estás en `main` y no hay cambios locales pendientes. Si hay cambios, consérvalos y revísalos; no uses `reset --hard`.

Si instalaste desde un ZIP y no existe `.git`, utiliza esta alternativa en lugar de `git pull`:

```bash
curl --fail --location https://github.com/eras2704/driver-connect/archive/refs/heads/main.tar.gz --output /tmp/driver-connect-main-qr.tar.gz
tar -tzf /tmp/driver-connect-main-qr.tar.gz > /dev/null
tar -xzf /tmp/driver-connect-main-qr.tar.gz --strip-components=1 -C "$HOME/driver-connect"
```

El archivo de GitHub no contiene `.env.production`, las credenciales ni los volúmenes de MySQL/fotografías. Verifica que se descargó la función:

```bash
test -f src/components/profile-qr-card.tsx && echo 'Código QR disponible'
```

## 5. Construir y actualizar

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml build app migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml run --rm --no-deps migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app
```

El Dockerfile instala las nuevas dependencias y ejecuta lint, TypeScript, pruebas y compilación. La migración sólo aplica migraciones previas pendientes; QR no añade ninguna. Si falla la construcción o la migración, no ejecutes el paso de sustitución de la aplicación. El cambio de contenedor puede causar una breve interrupción. Los volúmenes se conservan.

Para esta mejora no es necesario reiniciar Caddy, MySQL ni el trabajador de calendario.

## 6. Verificar

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml ps
curl --fail --silent --show-error https://nfc.comunidaddeconductorespanama.com/api/health
```

1. Abre `https://nfc.comunidaddeconductorespanama.com/login-admin` e inicia sesión.
2. En **Conductores → Editar**, comprueba el QR de un perfil existente. También aparece en **Panel → Mi perfil**.
3. Descarga SVG y PNG, y comprueba que el enlace corresponde al conductor y al dominio definitivo.
4. Escanea un QR de un perfil publicado con el teléfono. Cambia el nombre o teléfono y vuelve a escanear el mismo archivo: debe mostrar los datos actualizados.
5. Al crear un perfil nuevo, el QR aparece automáticamente después de guardarlo. Un borrador tendrá QR, pero su enlace público sólo abre después de publicar el perfil.

Si falla la aplicación:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml logs --tail=80 app
```

Conserva los respaldos y no borres volúmenes para resolver un error. No imprimas las tarjetas hasta verificar el QR en el sitio público y probarlo en el tamaño final.
