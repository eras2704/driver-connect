# Cambiar direcciones conservando QR y tarjetas NFC

Administración puede editar la dirección de un perfil después de crearlo. El QR conserva exactamente el enlace original; todas las direcciones anteriores siguen abriendo el mismo perfil, contacto y reservas. Una dirección histórica no puede asignarse a otro conductor. El conductor no tiene permiso para cambiarla desde su panel.

La migración `20261005000000_driver_addresses` añade el enlace original `qrSlug` y el registro `DriverAddress`. Antes de permitir cambios, copia las direcciones de todos los perfiles existentes. No modifica conductores, fotos, contraseñas ni reservas. Es obligatorio migrar antes de activar la nueva aplicación.

## Instalación existente en AWS Lightsail

Estos comandos corresponden a la instalación verificada: `/home/ubuntu/driver-connect`, distribución desde ZIP, MySQL compartido `ccpd-admin-db-1` con alias `ccpd-mysql`, base `driver_connect`, proxy Caddy compartido y archivos Compose personalizados que definen sólo `app` y `migrate`.

Ejecuta cada bloque en la terminal SSH de AWS. Continúa sólo si termina sin errores. Conserva `.env.production`, los archivos Compose y el proxy. No ejecutes `down -v`.

### 1. Respaldar

```bash
cd ~/driver-connect
mkdir -p ../respaldos-driver-connect
chmod 700 ../respaldos-driver-connect
umask 077
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude=data --exclude=backups -czf "../respaldos-driver-connect/codigo-$(date +%Y%m%d-%H%M%S).tar.gz" .
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml exec -T app tar -C /app/data -czf - uploads > "../respaldos-driver-connect/fotos-$(date +%Y%m%d-%H%M%S).tar.gz"
```

```bash
qr_backup="../respaldos-driver-connect/base-driver-connect-$(date +%Y%m%d-%H%M%S).sql"
if sudo docker exec ccpd-admin-db-1 sh -c 'test -n "$MYSQL_ROOT_PASSWORD" && MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --single-transaction --no-tablespaces -u root driver_connect' > "$qr_backup"; then
  echo "Respaldo completado"
  ls -lh "$qr_backup"
else
  echo "Respaldo fallido: no continúes"
fi
```

### 2. Descargar y conservar la configuración del servidor

Después de integrar el pull request en `main`:

```bash
curl --fail --location https://github.com/eras2704/driver-connect/archive/refs/heads/main.tar.gz --output /tmp/driver-connect-direcciones-qr.tar.gz
```

```bash
tar -tzf /tmp/driver-connect-direcciones-qr.tar.gz > /dev/null
```

```bash
umask 022
tar -xzf /tmp/driver-connect-direcciones-qr.tar.gz \
  --strip-components=1 \
  --exclude='driver-connect-main/compose*.yaml' \
  --exclude='driver-connect-main/compose*.yml' \
  --exclude='driver-connect-main/.env*' \
  --exclude='driver-connect-main/deploy' \
  --exclude='driver-connect-main/data' \
  -C "$HOME/driver-connect"
umask 077
```

La máscara 022 permite leer los archivos fuente dentro de la imagen. Los archivos privados se excluyen de la extracción. La contraseña de MySQL y el dominio del QR se conservan.

```bash
test -f prisma/migrations/20261005000000_driver_addresses/migration.sql && echo "Migración de direcciones disponible"
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml config --services
```

Deben aparecer `migrate` y `app`.

### 3. Construir y migrar

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml build app migrate
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml run --rm --no-deps --user root migrate
```

El usuario root se aplica sólo a este contenedor temporal de migración, como en la actualización anterior. La aplicación continúa ejecutándose como su usuario habitual. Si falla la migración, no actives el nuevo contenedor. La versión anterior continúa siendo compatible con las columnas y tabla añadidas; la migración no elimina datos.

### 4. Activar y comprobar

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml ps
curl --fail --silent --show-error https://nfc.comunidaddeconductorespanama.com/api/health
```

En administración, descarga el QR de un perfil publicado, cambia su dirección y guarda. El QR descargado debe seguir abriendo ese perfil; las descargas nuevas contienen el mismo QR y los datos públicos están actualizados. Comprueba también la dirección nueva. Repite el cambio si necesitas verificar más de una dirección anterior. Un borrador continúa sin acceso público por cualquiera de sus direcciones.

Si hay errores:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml logs --tail=80 app
```
