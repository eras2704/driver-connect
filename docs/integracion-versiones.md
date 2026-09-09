# Integración de las dos versiones

Se comparó el proyecto versionado en `eras2704/driver-connect` con el código incluido en `driver-connect-completo/codigo-fuente.zip`, proporcionado en Descargas. Los archivos de la otra versión se trataron como referencia funcional. No se ejecutaron sus scripts ni se restauró `respaldo/database.sql`.

## Selección incorporada

| Área | Resultado integrado |
| --- | --- |
| Perfil público | Identidad editorial y fotografía del proyecto actual, contacto fijo en móvil y solicitud de traslado de la otra versión. Una identidad visual coherente en todos los perfiles. |
| Espacio del conductor | Resumen, cuenta propia, edición del perfil, servicios y vehículo; navegación adaptada al móvil y agenda mensual. |
| Reservas | Solicitudes pendientes con consentimiento, viajes manuales, edición, confirmación, cancelación y control de solapamientos mediante transacciones. |
| Acceso | Sesiones revocables almacenadas como huellas, autorización por conductor, cambio obligatorio de contraseña temporal y recuperación desde administración. |
| Calendarios | Sustitución de la exportación descargable por enlaces de Google Calendar y suscripciones privadas de iPhone; enlace independiente para el pasajero y agenda completa para el conductor. |
| Consistencia | Idempotencia de solicitudes, limitadores persistentes en MySQL y versiones de formulario para evitar sobrescribir cambios recientes. |
| Operación | Docker y MySQL, migraciones aditivas, healthcheck real de base de datos y pruebas de integración sobre el contenedor de producción. |

Se conserva Next.js, Prisma, pnpm, el historial Git y las migraciones existentes. La otra versión utiliza identificadores numéricos y nombres de campos diferentes; sus migraciones y su respaldo no se pueden aplicar directamente sobre este esquema. Una futura importación de datos requerirá un mapeo explícito y una copia de seguridad.

## Dirección visual

Azul marino para identidad y navegación; superficies claras para lectura y formularios; acentos dorados discretos; estados verde y ámbar para viajes. Los perfiles usan títulos editoriales y una fotografía protagonista. Las herramientas de trabajo priorizan horarios, recorridos, estados y acciones. La agenda de muestra comparte exactamente los componentes visuales de la agenda real.

El perfil ficticio de Daniel Ríos permanece separado de MySQL y sus datos no se publican como registros reales. Se reutiliza la imagen ilustrativa ya incorporada al proyecto.

## Funciones que no forman parte de esta integración

No se copiaron credenciales, bases de datos, archivos subidos ni historiales privados. Continúan pendientes carga de imágenes, galerías, temas configurables por conductor, catálogo editable, registro de actividad detallado, avisos por correo, QR y la programación física NFC. La dirección estable y las opciones de compartir actuales ya permiten enlazar cada perfil.

La publicación en AWS y la conexión OAuth de Google necesitan configuración externa. No se crearon recursos de nube ni se enviaron mensajes a terceros como parte de esta integración.
