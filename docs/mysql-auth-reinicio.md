# Driver Connect: autenticación MySQL después de reiniciar — 12 octubre 2026

Después de reiniciar MySQL 8.4, el cliente MariaDB de Prisma podía fallar durante la autenticación completa caching_sha2_password. El endpoint /api/health devolvía unavailable y Docker marcaba unhealthy. Error comprobado: RSA public key is not available client side; el pool agotaba su timeout sin conexiones.

La fábrica createDatabase acepta MYSQL_CACHING_RSA_PUBLIC_KEY, que indica el archivo o contenido de la clave pública RSA verificada del servidor. La variable es opcional para instalaciones con TLS configurado. No se cambian contraseñas, plugins de autenticación ni registros de conductores.

## Preparar el archivo público

En el VPS consolidado existente, desde ~/driver-connect:

```bash
mkdir -p deploy
sudo docker exec ccpd-admin-db-1 cat /var/lib/mysql/public_key.pem > deploy/mysql-public-key.pem
chmod 644 deploy/mysql-public-key.pem
```

Copiar únicamente public_key.pem; no copiar private_key.pem. El archivo público proviene del contenedor MySQL conocido del mismo VPS y se monta como solo lectura. Los PEM ya están excluidos de Git. Si se reemplaza la clave del servidor, repetir la exportación verificada antes de recrear la aplicación.

## Reconstrucciones posteriores desde código

Aplicar compose.mysql-auth.yaml junto con los archivos activos. Revisar migraciones pendientes y respaldos antes de desplegar una versión completa con otros cambios.

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.mysql-auth.yaml build app migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml -f compose.mysql-auth.yaml up -d --no-deps --no-build --wait --wait-timeout 120 app
```

En el VPS reparado, estas variables y el volumen ya quedaron incluidos en compose.shared-proxy.yaml. Conservar esa configuración al actualizar mediante ZIP, o usar el overlay nuevo. No cambiar la base de Admin.

## Reparación desplegada y recuperación

Se recuperó el servicio autenticando con la clave pública verificada. Docker había perdido metadatos de la imagen original; se exportó el filesystem de la versión en ejecución, sin volúmenes de fotos ni credenciales de entorno, y se reconstruyó una imagen de respaldo. La imagen desplegada driver-connect-app:mysql-auth-fix-20261012 modifica únicamente la configuración RSA del módulo de conexión compilado. La corrección equivalente queda en el código fuente para las siguientes construcciones completas. No se activaron migraciones ni actualizaciones de QR en esta reparación.

Configuración respaldada en /home/ubuntu/respaldos-driver-connect/mysql-auth-*. Imagen previa recuperada: driver-connect-app:before-mysql-auth-20261012. Scripts y contexto de la recuperación quedaron en /home/ubuntu/ccpd-mobility-validation-20261012/driver-auth-image. La configuración Compose conserva el volumen de fotografías y las redes existentes.

## Validación realizada

Cuenta temporal nueva con caching_sha2_password y permisos SELECT: el contenedor corregido respondió status ok sin utilizar caché de autenticación previa. Cuenta y contenedor de prueba eliminados después de verificar. Aplicación real healthy; portada y login-admin HTTP 200; /api/health devuelve status ok por HTTPS. No se reinició el MySQL compartido para probar.

Opción oficial: https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options
