# Fotos, temas y calendario del teléfono

Esta versión añade galería, fotos del vehículo, tres apariencias y conexión de cuentas de calendario. La conexión automática necesita configuración externa; galería y temas funcionan sin cuentas Google/Microsoft.

## Uso para los conductores

1. Entrar en **Espacio del conductor → Mis fotos**.
2. Seleccionar una imagen del celular o computadora, elegir **Viajes** o **Vehículo**, escribir su descripción y confirmar permiso para publicarla.
3. Pulsar **Subir foto**. Si el perfil está publicado, aparece en el carrusel inmediatamente. Si es borrador, permanece privada hasta que administración publique el perfil.
4. Las flechas cambian el orden. La primera imagen del álbum Vehículo pasa a ser la imagen principal del perfil. También se puede editar su descripción, cambiarla de álbum o eliminarla.

Se admiten 24 fotos por conductor, JPG/PNG/WebP de hasta 8 MB y 40 megapíxeles; se convierten a WebP de máximo 2000 píxeles por lado y se retira EXIF. HEIC no se procesa: en iPhone usar una imagen JPG o el ajuste de cámara “Más compatible”. Las imágenes ya subidas no dependen del teléfono: permanecen en AWS.

El selector **Apariencia** aparece en todas las páginas: **Según mi dispositivo**, **Claro · Plata azul**, **Oscuro · Azul noche**. Sigue los cambios del sistema cuando está en automático y recuerda la elección en ese navegador. Las áreas azules de identidad conservan su contraste en los tres modos.

## Actualizar en la máquina Ubuntu de AWS

Usa la instalación existente en `~/driver-connect` y el proxy compartido. No combines estos comandos con `compose.aws.yaml`: ya hay otro Caddy ocupando 80/443. No ejecutes `down --volumes` en producción.

Ejecuta cada comando solo cuando el anterior termine bien.

### 1. Obtener la versión

Si instalaste con Git, dentro de AWS:

```bash
cd ~/driver-connect
git status --short
git pull --ff-only
```

Si hay cambios locales, consérvalos antes de integrar; no uses `reset --hard`.

Si instalaste con el archivo comprimido, desde tu computadora:

```bash
scp -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" "/home/eroca/Documentos/ChatGPT/Tarjetas NFC/dist/driver-connect-aws.tar.gz" ubuntu@35.169.111.143:~/driver-connect-nuevo.tar.gz
```

Luego, dentro de AWS:

```bash
cd ~/driver-connect
mkdir -p ../respaldos-driver-connect
chmod 700 ../respaldos-driver-connect
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude=data --exclude=backups -czf "../respaldos-driver-connect/codigo-$(date +%Y%m%d-%H%M%S).tar.gz" .
tar -xzf ~/driver-connect-nuevo.tar.gz
```

El respaldo de código incluye tu configuración privada: conserva la carpeta con permisos restringidos. El paquete nuevo no incluye `.env.production`, fotos ni claves privadas.

### 2. Respaldar datos antes de migrar

```bash
cd ~/driver-connect
mkdir -p ../respaldos-driver-connect
chmod 700 ../respaldos-driver-connect
umask 077
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --no-tablespaces -u "$MYSQL_USER" "$MYSQL_DATABASE"' > "../respaldos-driver-connect/base-$(date +%Y%m%d-%H%M%S).sql"
```

Si ya utilizaste esta galería anteriormente, respalda además sus archivos:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml exec -T app tar -C /app/data -czf - uploads > "../respaldos-driver-connect/fotos-$(date +%Y%m%d-%H%M%S).tar.gz"
```

Guarda también una copia segura de `.env.production`. Base de datos, fotografías y clave de cifrado deben respaldarse juntos.

### 3. Compilar, migrar y actualizar la aplicación

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml build app migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml run --rm --no-deps migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app
curl --fail --silent --show-error https://nfc.comunidaddeconductorespanama.com/api/health
```

La migración agrega tablas y un contador de revocación; no elimina reservas, conductores ni contraseñas. Solo se sustituye el contenedor de la aplicación Driver Connect; puede haber una breve interrupción. Docker crea el volumen persistente `driver-connect_driver_uploads`. El Caddy y la API existentes conservan su configuración.

Si falla la compilación o migración, no ejecutes el último paso. Para volver al código anterior conserva las nuevas tablas y restaura el respaldo de código; no reviertas la base ni borres volúmenes automáticamente. Si falla la aplicación después del cambio, consulta `logs --tail=80 app` antes de actuar.

## Activar la cuenta del calendario

Elige primero Google si los teléfonos ya sincronizan una cuenta Google. Microsoft es una alternativa para cuentas Outlook/Microsoft 365. No necesitas instalar una nueva app en el teléfono: el calendario principal de la cuenta elegida debe estar habilitado en su app Calendario. Una agenda local sin cuenta no puede conectarse desde el navegador.

### Google

1. En [Google Cloud Console](https://console.cloud.google.com/), crear o seleccionar un proyecto Driver Connect.
2. Habilitar **Google Calendar API**.
3. En **Google Auth Platform**, configurar nombre, correo de asistencia, audiencia y pantalla de consentimiento. Para pruebas añade las cuentas de prueba autorizadas.
4. Declarar los permisos `https://www.googleapis.com/auth/calendar.events.owned` y `https://www.googleapis.com/auth/userinfo.email`.
5. Crear un cliente OAuth de tipo **Aplicación web** con esta URI de redirección exacta:

   `https://nfc.comunidaddeconductorespanama.com/api/calendarios/callback/google`

6. Copiar el Client ID y Client Secret directamente al archivo privado `.env.production` de AWS, sin pegarlos en el chat ni subirlos a GitHub.

Para uso general, completar el proceso de publicación y la verificación que Google solicite. En modo Testing, las autorizaciones con acceso de calendario normalmente caducan a los siete días: no sirve como configuración definitiva de producción. Revisar la página pública `/privacidad-calendario` y configurar los datos reales del responsable y de asistencia en la consola antes de solicitar verificación.

### Microsoft (opcional)

1. En [Microsoft Entra](https://entra.microsoft.com/), registrar una aplicación que admita **cuentas de cualquier directorio organizativo y cuentas Microsoft personales**.
2. Agregar la plataforma **Web** y esta redirección exacta:

   `https://nfc.comunidaddeconductorespanama.com/api/calendarios/callback/microsoft`

3. Añadir permisos **delegados** Microsoft Graph: `Calendars.ReadWrite`, `User.Read` y `offline_access`. No usar permisos de aplicación ni cuentas de servicio.
4. Crear un secreto de cliente. Guardar su **valor** y el **Application (client) ID** en `.env.production`; registrar su vencimiento para renovarlo. Algunas organizaciones pueden exigir autorización del administrador de su directorio.

### Guardar configuración y arrancar sincronización

Dentro de AWS:

```bash
cd ~/driver-connect
nano .env.production
```

Añadir los proveedores que vayas a usar (no cambiar `SESSION_SECRET`, las contraseñas MySQL ni `APP_ORIGIN`):

```ini
CALENDAR_GOOGLE_CLIENT_ID=valor_de_google
CALENDAR_GOOGLE_CLIENT_SECRET=valor_de_google
# Solo si usas Microsoft:
# CALENDAR_MICROSOFT_CLIENT_ID=valor_de_microsoft
# CALENDAR_MICROSOFT_CLIENT_SECRET=valor_de_microsoft
```

Crear una clave independiente sin mostrarla en pantalla y sin reemplazar una ya existente:

```bash
python3 - <<'PY'
from pathlib import Path
import secrets
p = Path('.env.production')
s = p.read_text()
if not any(line.strip().startswith('CALENDAR_TOKEN_KEY=') for line in s.splitlines()):
    p.write_text(s.rstrip() + '\nCALENDAR_TOKEN_KEY=' + secrets.token_hex(32) + '\n')
p.chmod(0o600)
print('Configuración guardada. Si CALENDAR_TOKEN_KEY ya existía, se conservó.')
PY
```

Si previamente añadiste `CALENDAR_TOKEN_KEY=` vacía, elimina solo esa línea vacía y vuelve a ejecutar el bloque. No regeneres una clave en uso: perderías acceso a los tokens cifrados.

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.yaml build app calendar-worker
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app calendar-worker
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.yaml logs --tail=30 calendar-worker
```

En futuras actualizaciones incluye `compose.calendar.yaml` y recompila/reinicia también `calendar-worker`. El proceso revisa la cola cada cinco segundos, reintenta fallos y verifica periódicamente las conexiones. El teléfono puede tardar más en actualizarse. No envía invitaciones ni correos a pasajeros.

## Prueba real con dos teléfonos

1. Entrar como conductor → **Conectar calendario** → autorizar la cuenta ya sincronizada en su teléfono.
2. Crear un viaje de prueba para una fecha futura.
3. Abrir su enlace privado en el teléfono del pasajero y autorizar la cuenta de ese pasajero.
4. En ambos, abrir la app Calendario habitual y comprobar que muestra el calendario principal de esa cuenta. Pulsar **Consultar estado** en Driver Connect para ver el último envío; “autorizada” no significa todavía “enviada”.
5. Cambiar la hora desde Driver Connect y comprobar que se actualiza el mismo evento.
6. Cancelar el viaje y comprobar que el evento se retira de ambas cuentas.
7. Probar desconectar: no debe haber futuras actualizaciones. Los eventos ya existentes se conservan. Evitar usar además la copia manual o la suscripción Apple para el mismo viaje.

Prueba también subir una foto real desde cada tipo de teléfono, ordenar dos fotos y alternar los tres temas en agenda, reserva, acceso y perfil. Los tests automáticos no sustituyen esta comprobación de cuentas y teléfonos reales.

## Referencias

- [Google: flujo OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server).
- [Google: caducidad de tokens en Testing](https://developers.google.com/identity/protocols/oauth2#expiration).
- [Google Calendar: crear eventos y permisos](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).
- [Microsoft: flujo de código de autorización](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).
- [Microsoft Graph: eventos](https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0).
