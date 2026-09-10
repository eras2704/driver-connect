# Aplicar el diseño azul metálico en AWS

El ajuste cambia la presentación del perfil, administración, agenda, reservas y acceso: fondos azules, superficies metálicas, detalles plateados y controles adaptados al fondo oscuro. Los estados conservan sus colores verde, ámbar y rojo. El paquete contiene únicamente `src/app/globals.css` y `src/app/layout.tsx`.

Puedes ver la muestra local, con el servidor de desarrollo activo, en `http://127.0.0.1:3000/demo/agenda`.

## 1. Copiar el ajuste desde tu computadora

En una terminal local:

```bash
scp -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" "/home/eroca/Documentos/ChatGPT/Tarjetas NFC/dist/driver-connect-azul-metalico.tar.gz" ubuntu@35.169.111.143:~/driver-connect-azul-metalico.tar.gz
```

## 2. Actualizar dentro de Ubuntu en AWS

Ejecuta cada comando solo si el anterior terminó correctamente:

```bash
cd ~/driver-connect
tar -czf "../driver-connect-diseno-anterior-$(date +%Y%m%d-%H%M%S).tar.gz" src/app/globals.css src/app/layout.tsx
tar -xzf ~/driver-connect-azul-metalico.tar.gz
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml build app
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --no-deps --no-build --wait --wait-timeout 180 app
```

La compilación se hace mientras continúa sirviéndose la versión anterior; el último comando sustituye únicamente la aplicación de Driver Connect. Caddy, la API existente y las bases de datos conservan sus contenedores. No se ejecutan migraciones ni se cambian contraseñas. El cambio de contenedor puede causar una interrupción breve de Driver Connect.

## 3. Comprobar

```bash
curl --fail --silent --show-error https://nfc.comunidaddeconductorespanama.com/api/health
```

Recarga la página pública y la agenda del conductor. En un ordenador puedes usar `Ctrl+Shift+R`; en el teléfono, vuelve a abrir la página. Comprueba los campos de formularios y los estados de los viajes.

Si falla la compilación, conserva en ejecución la imagen anterior y corrige el error antes del último comando. Para volver al diseño anterior, extrae el respaldo que acabas de crear desde `~/driver-connect`, usando el nombre exacto mostrado en tu carpeta de usuario, y repite los dos comandos de Docker.
