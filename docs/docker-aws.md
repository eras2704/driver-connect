# Docker y máquina virtual en AWS

En la máquina Ubuntu de Lightsail, la aplicación y MySQL ya respondían correctamente durante el diagnóstico. La publicación HTTPS requiere compartir el Caddy de la API existente; se incluye un ajuste para aplicar sin iniciar un segundo proxy.

Para la máquina Ubuntu de Lightsail, sigue [el paso a paso para perfiles NFC con el subdominio de Hostinger y HTTPS](aws-paso-a-paso.md). El repositorio incluye `compose.shared-proxy.yaml` para el servidor actual y `compose.aws.yaml` para máquinas con los puertos 80/443 disponibles. Estos archivos no crean recursos ni cambian nada en AWS por sí solos.

## Arquitectura de esta base

```text
Navegador -> proxy HTTPS en la VM -> 127.0.0.1:3000 -> aplicación
                                                    |
                                             MySQL en red Docker
                                                    |
                                           volumen mysql_data
```

El proxy HTTPS, el dominio y los certificados se configurarán al elegir la máquina. La aplicación usa la salida standalone de Next.js en un contenedor sin usuario root. MySQL no expone el puerto 3306 hacia Internet. La tarea `migrate` debe finalizar correctamente antes de iniciar `app`.

## Preparación de la máquina

1. Seleccionar la instancia, sistema operativo, almacenamiento y región de AWS.
2. Instalar Docker Engine y el plugin Docker Compose siguiendo la documentación oficial correspondiente al sistema operativo.
3. Configurar acceso de lectura al repositorio privado para la máquina, sin incorporar claves a la imagen Docker.
4. Clonar el repositorio, crear `.env` desde `.env.example` y asignar contraseñas diferentes generadas con `openssl rand -hex 32`.
5. Ejecutar `docker compose up -d --build` y revisar `docker compose ps` y `docker compose logs --tail=100 app migrate`.

Para inspeccionar la aplicación antes del dominio, establecer un túnel desde tu equipo:

```bash
ssh -L 3000:127.0.0.1:3000 USUARIO@HOST_DE_LA_VM
```

Después abrir `http://127.0.0.1:3000`, con ese mismo valor en `APP_ORIGIN`. `USUARIO` y `HOST_DE_LA_VM` son marcadores que deben sustituirse con los datos reales de la instancia.

## Publicación

Configurar un proxy HTTPS en la VM apuntando a `127.0.0.1:3000`. Permitir 80/443 para el sitio y restringir SSH a los orígenes administrativos necesarios. Mantener 3000 y 3306 sin exposición pública. Definir `APP_ORIGIN=https://TU_DOMINIO` en `.env` y recrear `app`; este valor controla la protección de formularios y activa la cookie Secure. Después crear la primera cuenta con `docker compose --profile tools run --rm admin-create` y acceder a `/login-admin`. No compartir contraseñas en el repositorio ni incorporarlas a las imágenes.

## Calendarios y comprobación del servicio

`APP_ORIGIN` debe coincidir exactamente con la dirección pública HTTPS. El proxy redirige HTTP a HTTPS y conserva las rutas `/calendario/*`; el acceso a esas rutas se valida con la firma privada del enlace y no requiere cookies de sesión. Evita registrar las URL completas de `/reserva/*` y `/calendario/*` en analítica, logs de acceso o servicios de terceros, porque contienen permisos de lectura.

`/api/health` comprueba la conexión real a MySQL y devuelve sólo `ok` o `unavailable`. Docker usa ese endpoint como healthcheck. Después de publicar, comprobar la apertura y sincronización en teléfonos Android e iPhone reales. La integración HTTP no sustituye esa comprobación.

## Actualizaciones

Respaldar MySQL y comprobar la restauración antes de aplicar cambios de esquema. Actualizar el código desde `main`, construir las imágenes y ejecutar explícitamente las migraciones:

```bash
git pull --ff-only origin main
docker compose build
docker compose run --rm migrate
docker compose up -d
```

Si la migración falla, resolver el error antes de continuar. Las migraciones deben ser compatibles con la versión de aplicación aún activa o ejecutarse dentro de una ventana de mantenimiento.

El volumen de MySQL conserva datos entre reinicios, pero no sustituye un respaldo externo. Cambiar las variables `MYSQL_PASSWORD` o `MYSQL_ROOT_PASSWORD` después de inicializar el volumen no cambia las contraseñas existentes en MySQL; la rotación requiere modificar también las cuentas de la base.

## Referencias oficiales

- [Despliegue propio de Next.js](https://nextjs.org/docs/app/guides/self-hosting).
- [Orden de arranque en Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/).
- [Instalación de Docker Engine](https://docs.docker.com/engine/install/).
