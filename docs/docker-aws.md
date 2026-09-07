# Docker y máquina virtual en AWS

Esta guía prepara el despliegue; todavía no se ha creado una instancia ni se ha desplegado la aplicación en AWS.

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

Después abrir `http://localhost:3000`. `USUARIO` y `HOST_DE_LA_VM` son marcadores que deben sustituirse con los datos reales de la instancia.

## Publicación

Configurar un proxy HTTPS en la VM apuntando a `127.0.0.1:3000`. Permitir 80/443 para el sitio y restringir SSH a los orígenes administrativos necesarios. Mantener 3000 y 3306 sin exposición pública. Los accesos privados todavía no están implementados en esta base.

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
