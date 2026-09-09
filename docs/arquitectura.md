# Arquitectura

La aplicación usa Next.js 16 con App Router y componentes de servidor. Prisma ORM 7 se conecta a MySQL 8.4 mediante `@prisma/adapter-mariadb`. La conexión se crea al solicitar datos; construir la imagen no requiere credenciales ni una base activa.

Docker Compose administra la aplicación, una tarea de migración y MySQL con volumen persistente. Los perfiles de Compose `tools` y `test` contienen comandos de administración y pruebas que no arrancan como servicios permanentes. El destino previsto es una máquina virtual AWS; todavía no se ha creado ni desplegado.

## Rutas implementadas

| Área | Ruta | Acceso |
| --- | --- | --- |
| Demostración ficticia | `/` y `/conductor/demo` | Público, sin MySQL |
| Perfil publicado | `/conductor/[slug]` | Público, sólo campos autorizados |
| Contacto publicado | `/conductor/[slug]/contacto` | Público, vCard |
| Acceso administrativo | `/login-admin` | Formulario de autenticación |
| Resumen administrativo | `/admin` | Sesión administrativa vigente |
| Lista de conductores | `/admin/conductores` | Sesión administrativa vigente |
| Crear conductor | `/admin/conductores/nuevo` | Sesión administrativa vigente |
| Editar conductor | `/admin/conductores/[id]/editar` | Sesión administrativa vigente |
| API administrativa | `/api/admin/*` | Sesión y autorización en servidor, salvo acceso/salida |

El acceso del conductor está implementado en `/login-conductor`, con panel `/panel`, agenda `/panel/agenda`, perfil `/panel/perfil`, seguridad `/panel/seguridad` y conexión `/panel/calendario`. Cada lectura y mutación privada verifica la sesión y la propiedad de los datos. `DriverSession`, `Booking` y `RequestLimit` amplían el esquema sin reemplazar las migraciones anteriores.

Las solicitudes públicas llegan por `/conductor/[slug]/reservar`. `/reserva/[id]/[token]` permite al pasajero consultar sólo ese viaje. Las suscripciones usan `/calendario/reserva/[id]/[token]` y `/calendario/conductor/[id]/[token]`, con firmas revocables; no dependen de cookies de navegador. Ver [agenda y calendarios](agenda-calendarios.md).

## Autenticación y autorización

Las cuentas administrativas se crean por consola, con contraseñas bcrypt de coste 12. No existe registro abierto. Cada sesión usa un token aleatorio de 256 bits; MySQL conserva sólo su huella HMAC-SHA256, asociada a una cuenta y fecha de vencimiento. La cookie HttpOnly, SameSite=Lax, dura ocho horas y exige Secure cuando `APP_ORIGIN` usa HTTPS.

Cada lectura privada y mutación valida la sesión y el estado activo del administrador en el servidor. Cerrar sesión, restablecer la contraseña o desactivar la cuenta revoca el acceso. Cambiar `SESSION_SECRET` invalida todas las sesiones existentes. Las mutaciones requieren JSON, validación estricta y coincidencia exacta del encabezado Origin con APP_ORIGIN. Los cuerpos JSON se limitan a 32 KiB.

Los intentos de acceso se limitan en MySQL por ventanas de 15 minutos: ocho por nombre de usuario y 200 globales. Los contadores persisten entre reinicios y no dependen de encabezados IP de confianza incierta. Los mensajes de contraseña incorrecta y usuario inexistente son iguales. Este límite básico no sustituye un control de tráfico en el proxy cuando se publique en Internet.

## Datos y publicación

Las escrituras de perfil, vehículo y servicios se ejecutan en una transacción. Los perfiles nacen como borradores. Publicar habilita inmediatamente la URL; retirar la publicación conserva los datos y oculta el perfil y su vCard. La dirección queda fija después de crear el conductor, por lo que una tarjeta NFC puede seguir usando la misma URL.

Las consultas públicas seleccionan campos explícitos. No incluyen identificadores internos, usuarios, contraseñas ni placas. Sólo muestran servicios y vehículo activos. Los perfiles usan renderizado dinámico para que un retiro de publicación no dependa de la expiración de una caché.

La interfaz administra un vehículo principal aunque el modelo admite varios para futuras etapas. Quitar el vehículo del formulario lo desactiva y conserva el registro. Las fotografías son enlaces HTTPS opcionales cargados directamente por el navegador; el servidor no descarga ni optimiza URLs externas proporcionadas en el panel.

La tarjeta NFC guardará únicamente la URL pública estable. La programación física aún no está implementada.
