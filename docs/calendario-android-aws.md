# Google Calendar en Android y AWS con MySQL compartido

Android utiliza la cuenta Google ya sincronizada en el teléfono. El conductor autoriza una vez desde Panel → Calendario; los viajes confirmados futuros, sus cambios y cancelaciones se envían a su calendario principal. El pasajero autoriza únicamente su viaje confirmado desde el enlace privado. No se escribe sin consentimiento ni se sincronizan ediciones del teléfono hacia Driver Connect. La suscripción de iPhone continúa disponible.

## 1. Crear las credenciales de Google

1. En Google Cloud Console, crear un proyecto Driver Connect o seleccionar el proyecto destinado a esta aplicación.
2. En APIs y servicios → Biblioteca, habilitar **Google Calendar API**.
3. Configurar Google Auth Platform: nombre Driver Connect, correo real de asistencia, audiencia externa, dominio `comunidaddeconductorespanama.com`, página principal `https://nfc.comunidaddeconductorespanama.com` y privacidad `https://nfc.comunidaddeconductorespanama.com/privacidad-calendario`.
4. En acceso a datos, declarar `https://www.googleapis.com/auth/calendar.events.owned` y `https://www.googleapis.com/auth/userinfo.email`.
5. Para probar, añadir como usuarios de prueba las cuentas Google de los teléfonos que se usarán en la validación.
6. Crear un cliente OAuth de tipo **Aplicación web**, no Android. La autorización y el intercambio de códigos se realizan en el servidor.
7. Registrar exactamente esta URI de redirección:

   `https://nfc.comunidaddeconductorespanama.com/api/calendarios/callback/google`

8. Guardar Client ID y Client Secret directamente en el archivo privado del servidor, sin publicarlos en GitHub ni pegarlos en el chat.

Para vender el servicio a usuarios generales, publicar la aplicación de consentimiento y completar la verificación que Google exija. El modo Testing es sólo para las cuentas de prueba y los refresh tokens con permisos de calendario normalmente caducan a los siete días. Revisar los datos públicos de privacidad y asistencia antes de solicitar la verificación. No anunciar sincronización pública validada mientras sólo se haya probado con cuentas de prueba.

## 2. Comprobar la instalación existente

Esta guía corresponde a la instalación de Lightsail en `~/driver-connect`, con `compose.yaml` personalizado que define sólo `app` y `migrate`, MySQL compartido `ccpd-mysql` y Caddy compartido. Conservar los archivos Compose personalizados al descargar el código, como en la actualización anterior; copiar también el nuevo `compose.calendar.shared-db.yaml`.

No usar `compose.calendar.yaml` en esa instalación: asume un servicio local `db`. El nuevo archivo hereda de `migrate` la URL de MySQL, la imagen y las redes ya configuradas en el servidor, y no crea otro MySQL ni otro proxy. No combinar los dos archivos de calendario.

Antes de construir, hacer un respaldo nuevo de la base, fotografías y configuración como en [la actualización de direcciones](actualizar-direcciones-qr-aws.md). Descargar y extraer el código actualizado conservando `.env.production`, `compose.yaml`, `compose.shared-proxy.yaml` y `deploy`. Si la extracción excluye `compose*.yaml`, extraer el archivo nuevo de forma explícita:

```bash
cd ~/driver-connect
umask 022
tar -xzf /tmp/driver-connect-android.tar.gz --strip-components=1 driver-connect-main/compose.calendar.shared-db.yaml
umask 077
```

El archivo `/tmp/driver-connect-android.tar.gz` debe ser el archivo de `main` ya descargado desde GitHub después de integrar este cambio.

## 3. Configurar el servidor

```bash
cd ~/driver-connect
nano .env.production
```

Añadir o completar estos dos valores con las credenciales obtenidas de Google:

```ini
CALENDAR_GOOGLE_CLIENT_ID=tu_client_id_de_google
CALENDAR_GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
```

Conservar APP_ORIGIN, SESSION_SECRET y la conexión MySQL. Guardar con Ctrl+O, Enter y salir con Ctrl+X. Crear la clave de cifrado sólo si no existe; no reemplazar una clave en uso:

```bash
python3 - <<'PY'
from pathlib import Path
import re
import secrets
p = Path('.env.production')
s = p.read_text()
lines = [line for line in s.splitlines() if re.match(r'^\s*CALENDAR_TOKEN_KEY\s*=', line)]
if len(lines) > 1:
    raise SystemExit('Hay claves duplicadas. Revísalas antes de continuar.')
if lines:
    value = lines[0].split('=', 1)[1].strip().strip('"\'')
    if not value:
        p.write_text(s.replace(lines[0], 'CALENDAR_TOKEN_KEY=' + secrets.token_hex(32), 1))
        print('Clave vacía configurada sin mostrarla.')
    elif not re.fullmatch(r'[a-fA-F0-9]{64}', value):
        raise SystemExit('CALENDAR_TOKEN_KEY existe pero no es válida. No se modificó: revisar antes de continuar.')
    else:
        print('Se conservó la clave existente.')
else:
    p.write_text(s.rstrip() + '\nCALENDAR_TOKEN_KEY=' + secrets.token_hex(32) + '\n')
    print('Clave de cifrado creada sin mostrarla.')
p.chmod(0o600)
PY
```

Respaldar de nuevo `.env.production` de forma privada después de configurar las credenciales. Sin esa clave no se pueden recuperar las autorizaciones cifradas de los usuarios.

## 4. Construir y arrancar

Ejecutar un bloque a la vez y continuar únicamente si termina correctamente:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.shared-db.yaml config --quiet
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.shared-db.yaml build app migrate calendar-worker
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.shared-db.yaml run --rm --no-deps --user root migrate
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.shared-db.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app calendar-worker
```

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.shared-db.yaml ps
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.calendar.shared-db.yaml logs --tail=40 calendar-worker
```

El trabajador debe permanecer activo y mostrar que la sincronización se inició, sin errores de configuración o acceso a MySQL. Un contenedor activo por sí solo no confirma un envío a Google: hay que completar la prueba con una cuenta real. Usar estos mismos tres archivos Compose en actualizaciones posteriores del calendario; no borrar volúmenes ni cambiar la configuración del proxy.

## 5. Probar en un Android real

1. Abrir el sitio en Chrome, iniciar sesión como conductor y entrar en Panel → Calendario.
2. Pulsar Conectar cuenta Google Calendar. Elegir la cuenta Google del teléfono y conceder el permiso de calendario.
3. En Google Calendar del teléfono, comprobar que el calendario principal de esa cuenta está visible y tiene la sincronización activada.
4. Registrar un viaje futuro confirmado y verificar que aparece una sola vez con la hora de Panamá, servicio y recorrido, sin datos privados del pasajero.
5. Cambiar la hora en Driver Connect y verificar que se actualiza el mismo evento, sin duplicados.
6. Cancelar el viaje y verificar que el evento se retira del calendario conectado.
7. Probar también desde el enlace privado de un pasajero con un viaje confirmado: sólo debe enviarse ese viaje.
8. Probar desconexión y reconexión de la misma cuenta. La suscripción Apple y las copias manuales son alternativas, no deben añadirse simultáneamente al mismo viaje.

Si Google rechaza el navegador integrado de otra app, abrir el sitio directamente en Chrome y comenzar allí la conexión. Si muestra `redirect_uri_mismatch`, revisar la URI exacta del cliente web. Si el usuario no está autorizado durante Testing, añadir su cuenta de prueba. No compartir códigos OAuth, contraseñas, enlaces privados ni el contenido de `.env.production` al pedir asistencia.

## Referencias

- [Google: OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server).
- [Google: vigencia de autorizaciones en modo de pruebas](https://developers.google.com/identity/protocols/oauth2).
- [Docker: heredar servicios Compose](https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/).
