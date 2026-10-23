# Modernización y revisión de seguridad — 23 de octubre de 2026

## Alcance

El perfil público conserva las rutas /conductor/{direccion}, los alias DriverAddress y qrSlug. No necesita una nueva migración de datos ni recrear perfiles o QR. Se mantienen servicios personalizados (hasta cinco), vehículos, fotos, inglés, contacto y reservas. Las fotografías y especificaciones proceden de los registros existentes; no se sustituyen por las de la referencia visual.

La portada, servicios, vehículo destacado y presentación del conductor utilizan la paleta metálica original en claro y oscuro. En móvil se ofrece reserva directa cuando el perfil la admite, además de WhatsApp cuando existe ese contacto.

## Comprobación antes de desplegar

1. Respaldar código, .env.production, base de datos y volumen de fotografías.
2. Con la imagen migrator nueva ya construida, guardar una línea base de las direcciones de la base actual (consulta de solo lectura). Usar un archivo nuevo y privado:

```bash
dc run --rm --no-deps --user root -v "$HOME/respaldos-driver-connect:/respaldos" migrate node --import tsx scripts/verify-profile-links.ts --snapshot /respaldos/direcciones-antes-20261023.json
```

Después del despliegue, ejecutar con la misma base de datos:

```bash
dc run --rm --no-deps --user root -v "$HOME/respaldos-driver-connect:/respaldos" migrate node --import tsx scripts/verify-profile-links.ts --compare /respaldos/direcciones-antes-20261023.json
```

El comando falla si una dirección antigua cambia de propietario, un perfil desaparece o cambia el destino permanente de un QR. No modifica registros. Los perfiles desactivados o vencidos siguen sujetos a las restricciones existentes; conservar el enlace no los reactiva. Escanear además una tarjeta física ya entregada y abrir una dirección anterior de un perfil renombrado. Conservar el dominio y APP_ORIGIN de producción.

La función dc debe incluir los cinco archivos Compose locales usados en AWS (compose.yaml, compose.shared-proxy.yaml, compose.calendar.shared-db.yaml, compose.mysql-rsa.yaml y compose.restart.yaml). No sobrescribir esos archivos, .env.production, deploy ni data al extraer el código.

## Seguridad

Esta aplicación utiliza Next.js/Node.js, no PHP. Se actualizan Next.js y eslint-config-next a 16.4.2, Prisma a 7.10.1, sharp a 0.35.5 y zod a 4.6.7. Se renuevan dependencias transitivas y se fija el parche brace-expansion 5.0.12 únicamente para la versión vulnerable 5.0.9 de las herramientas de desarrollo. El archivo de bloqueo y pnpm-workspace.yaml forman parte de la actualización.

La revisión del código conserva la validación de origen, sesiones con huellas HMAC, contraseñas bcrypt, validación y límites de formularios, restricciones de permisos, consultas mediante Prisma y tratamiento de fotos sin metadatos EXIF. Una auditoría de paquetes no equivale a una prueba de penetración ni verifica el sistema operativo, otras aplicaciones o las imágenes instaladas en AWS. No implica que se haya explotado una vulnerabilidad en producción. Deben reconstruirse las imágenes de app y calendar-worker/migrate para incorporar los parches; actualizar archivos por sí solo no cambia un contenedor que ya está ejecutándose.

## Google Calendar

Consulta del 23 de octubre: marca verificada; revisión de acceso todavía pendiente. El detalle muestra funciones y permisos mínimos aprobados el 19 de octubre, con cuatro observaciones de privacidad (uso, transferencia, protección y conservación/eliminación). Se amplía /privacidad-calendario para describir el comportamiento del código y se incorpora un enlace permanente desde el pie del perfil público. La política mantiene eras2704@gmail.com como contacto existente; el buzón corporativo nuevo está pospuesto.

Tras publicar, comprobar la política en el dominio público. La consola pide responder al hilo del equipo de Google después de resolver las observaciones. No se ha enviado esa respuesta ni se ha obtenido aprobación final en este cambio. La revisión no se completa automáticamente al cumplirse 24 horas.

## Correo

Pospuesto a petición del usuario. No se ha creado ningún buzón ni enviado mensajes SMTP.
