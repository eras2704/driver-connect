# Administración

## Primera cuenta

Después de configurar `.env` y arrancar Docker:

```bash
docker compose --profile tools run --rm admin-create
```

Elegir un usuario de 3 a 64 letras minúsculas, números, puntos o guiones; nombre de 2 a 191 caracteres; contraseña de al menos 12 caracteres y como máximo 72 bytes UTF-8. La contraseña se introduce oculta, se confirma y se almacena con bcrypt. No hay credenciales iniciales en el repositorio.

Abrir `/login-admin` sobre el origen de `APP_ORIGIN`. `localhost` y `127.0.0.1` son orígenes distintos: usar el configurado. En un dominio, definir una URL HTTPS sin ruta, consulta ni fragmento y recrear el servicio `app`. No desactivar la validación de origen para resolver una configuración incorrecta.

## Gestionar conductores

1. Entrar en Conductores y elegir Nuevo conductor.
2. Definir nombre y dirección del perfil. La dirección no se puede cambiar una vez creada.
3. Completar presentación y canales de contacto que se quieren hacer públicos. Los teléfonos requieren código de país.
4. Seleccionar servicios e incluir opcionalmente el vehículo principal. Su placa sólo se muestra en administración.
5. Guardar como borrador. Editar para activar Publicar perfil y, si corresponde, la verificación administrativa.
6. Abrir Ver perfil para obtener su URL pública. Esa será la URL que se use en la tarjeta NFC.

Para retirar el perfil, desmarcar Publicar perfil y guardar. El enlace muestra que el perfil no está disponible; sus datos se conservan. La vCard deja de estar accesible. Si se vuelve a publicar, se reutiliza el mismo enlace.

## Recuperación de acceso

```bash
docker compose --profile tools run --rm admin-create pnpm admin:create --reset-password
```

El comando exige una cuenta existente, cambia su contraseña y elimina todas sus sesiones. No cambia su estado activo. Al terminar, volver a entrar en `/login-admin`.

Para crear otra cuenta administrativa, ejecutar el comando sin `--reset-password`. La herramienta rechaza sobrescribir una cuenta existente.

En CI, la herramienta puede recibir `ADMIN_USERNAME`, `ADMIN_NAME` y `ADMIN_PASSWORD` como variables efímeras. Esas variables no se pasan al contenedor de la aplicación. En uso interactivo no hace falta guardarlas en `.env` ni escribir contraseñas en argumentos de consola.

## Límites de esta etapa

No se incluyen autorregistro, recuperación por correo, segundo factor, gestión de administradores desde el panel, carga de archivos ni acceso del conductor. El catálogo se inicializa con tres servicios y el panel permite asignarlos. El despliegue real en AWS, dominio, HTTPS y respaldos quedan como siguiente fase.
