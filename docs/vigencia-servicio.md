# Vigencia del servicio

Los perfiles nuevos reciben 365 días exactos al publicarse. Los borradores comienzan al publicarse. Las cuentas existentes conservan acceso hasta que administración asigne manualmente su fecha en Conductores → Vigencia y renovación. La migración no inventa fechas ni suspende cuentas existentes.

La fecha original se interpreta a las 00:00 de Panamá; vence 365 días después. Cada asignación o corrección exige una referencia y queda en el historial. Corregir el inicio reemplaza la vigencia actual, incluidas las renovaciones anteriores; el historial se conserva.

Después de recibir el pago, registrar su referencia y confirmar la recepción para renovar. Si sigue vigente suma 365 días al vencimiento actual; si venció, cuenta desde el registro del pago. Los reintentos de una operación no duplican períodos. No hay cobro automático ni pasarela de pagos.

El panel muestra la fecha y un aviso en los últimos 30 días. Al vencer, iniciar sesión muestra la pantalla de renovación. Se suspenden panel, API del conductor, perfil público, contacto y nuevas reservas. No se borran perfiles, fotos, viajes ni direcciones QR/NFC. Los enlaces de viajes ya emitidos a pasajeros siguen disponibles para consultar lo acordado. La sincronización del conductor se pausa sin borrar eventos y se retoma al renovar si la autorización sigue válida. Renovar no reactiva un acceso deshabilitado administrativamente.

## Despliegue

Respaldar código, fotos y base. Conservar los archivos Compose y `.env.production` de AWS. Compilar las imágenes, aplicar `20261015000000_service_subscription` con `migrate` y recrear `app` y `calendar-worker` usando los tres archivos Compose de la instalación compartida. No eliminar volúmenes ni recrear MySQL.

Asignar las fechas reales a las cuentas existentes. Con un perfil de prueba, asignar un inicio de hace más de 365 días y verificar suspensión de panel/perfil/reservas. Registrar pago y comprobar reactivación del mismo QR. Probar renovación anticipada para verificar que conserva los días restantes.
