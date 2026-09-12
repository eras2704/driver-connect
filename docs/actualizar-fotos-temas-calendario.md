# Fotos, temas y calendario del teléfono

Esta versión añade galería, fotos del conductor y del vehículo, tres apariencias y conexión de cuentas de calendario. La conexión automática necesita configuración externa; galería y temas funcionan sin cuentas Google/Microsoft.

## Uso para los conductores

Para cambiar la foto personal, entrar en **Mi perfil → Datos del conductor → Fotografía del conductor**, seleccionar el archivo del celular o computadora, revisar la vista previa circular y guardar. Conviene que el rostro esté centrado. Aparece junto al nombre en el perfil público y reemplaza la foto personal anterior. Se puede guardar al mismo tiempo que la foto del vehículo; si alguna foto o algún dato falla, se conservan los cambios previamente guardados.

Para cambiar la foto principal del carro, entrar en **Mi perfil → Vehículo principal → Fotografía del vehículo**. Seleccionar el archivo, revisar la vista previa, confirmar permiso para publicarlo y pulsar **Guardar cambios**. Ya no se necesita un enlace HTTPS en este campo. La foto se guarda junto con los datos del perfil, queda primera en el álbum Vehículo y aparece también en el carrusel. Las anteriores se conservan. Para guardar sólo cambios de texto, no seleccionar otra foto.

Para añadir imágenes a los servicios, entrar en **Mi perfil → Fotos de los servicios** (el enlace de la sección Servicios baja hasta esos controles). Cada servicio activado permite elegir una foto, ver la vista previa y pulsar **Guardar foto del servicio**. Se guarda una foto propia por servicio y conductor. También se puede reemplazar o quitar. Si acabas de activar un servicio, guarda primero el perfil para que aparezca en esta sección.

El perfil público muestra una sola acción **Solicitar un traslado**, en la cabecera. Se retiraron las solicitudes repetidas de las tarjetas de servicios, el bloque de contacto y la barra móvil; el formulario de reservas sigue disponible desde esa acción principal.

Para gestionar el resto de la galería:

1. Entrar en **Espacio del conductor → Mis fotos**.
2. Seleccionar una imagen del celular o computadora, elegir **Viajes** o **Vehículo**, escribir su descripción y confirmar permiso para publicarla.
3. Pulsar **Subir foto**. Si el perfil está publicado, aparece en el carrusel inmediatamente. Si es borrador, permanece privada hasta que administración publique el perfil.
4. Las flechas cambian el orden. La primera imagen del álbum Vehículo pasa a ser la imagen principal del perfil. También se puede editar su descripción, cambiarla de álbum o eliminarla.

Se admiten 24 fotos de galería por conductor, más su foto personal. JPG/PNG/WebP de hasta 8 MB cada una y 40 megapíxeles; se convierten a WebP de máximo 2000 píxeles por lado y se retira EXIF. HEIC no se procesa: en iPhone usar una imagen JPG o el ajuste de cámara “Más compatible”. Las imágenes ya subidas no dependen del teléfono: permanecen en AWS.

El selector **Apariencia** aparece en todas las páginas: **Según mi dispositivo**, **Claro · Plata azul**, **Oscuro · Azul noche**. Sigue los cambios del sistema cuando está en automático y recuerda la elección en ese navegador. Las áreas azules de identidad conservan su contraste en los tres modos.

## Uso para administradores

En **Administración → Conductores → Nuevo conductor / Editar**, el administrador puede subir la foto personal en **Datos del conductor → Fotografía del conductor** y la del auto en **Vehículo principal**. Ambos campos permiten seleccionar un archivo y revisar la vista previa. En borrador, sólo el administrador y el conductor propietario pueden ver las imágenes. Al publicar, el retrato aparece junto al nombre y la foto del auto como portada y en el carrusel. Editar otros datos sin elegir una nueva imagen conserva las fotos actuales.

Después de guardar el conductor, **Fotos de los servicios** permite a administración subir, reemplazar o quitar la imagen de cada servicio activado. La imagen sólo pertenece al conductor que se está editando. Si el servicio se desactiva o se retira del perfil, deja de ser pública; se conserva para volver a usarla si se reactiva.

La foto personal requiere la migración `20260911010000_driver_portrait`, que añade una columna opcional y su índice a la tabla de conductores. Las fotos personales que ya usan enlaces HTTPS se siguen mostrando hasta que se suba un archivo nuevo. Las fotos personales nuevas se guardan en el mismo volumen de imágenes, por lo que están incluidas en el respaldo de `uploads`.

Las fotos por servicio requieren además `20260912000000_driver_service_photos`, que crea una tabla de imágenes por conductor y servicio. También se incluyen en el respaldo de `uploads`. Cada foto admite JPG, PNG o WebP de hasta 8 MB. Esta tabla y la columna de retratos se crean al ejecutar el paso de migración indicado abajo.

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

Ejecuta la migración antes de sustituir la aplicación; la nueva versión necesita la columna de la foto personal y la tabla de fotos de servicios. Estos pasos sirven también para actualizar únicamente las fotografías, sin activar el calendario.

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml build app migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml run --rm --no-deps migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app
curl --fail --silent --show-error https://nfc.comunidaddeconductorespanama.com/api/health
```

La migración de retratos agrega una columna opcional y su índice. Las anteriores agregan tablas y un contador de revocación; no eliminan reservas, conductores ni contraseñas. Solo se sustituye el contenedor de la aplicación Driver Connect; puede haber una breve interrupción. Docker crea el volumen persistente `driver-connect_driver_uploads`. El Caddy y la API existentes conservan su configuración.

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
