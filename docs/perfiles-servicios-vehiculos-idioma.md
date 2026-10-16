# Servicios propios, vehículos e idioma público

Cada conductor y administración pueden crear, editar y retirar hasta cinco servicios propios. Cada servicio admite nombre y descripción en español y su versión opcional en inglés, con una fotografía normalizada JPG/PNG/WebP. Los datos son exclusivos de ese perfil, no modifican el catálogo de otros conductores. Al guardar el primer servicio propio, este listado reemplaza el catálogo anterior en el perfil y en las nuevas reservas. Las reservas existentes conservan su nombre de servicio histórico. El catálogo anterior no se borra; mientras no se activen los servicios propios se muestran hasta cinco opciones antiguas.

Se pueden publicar hasta diez vehículos, cada uno con datos, capacidad y fotografía independiente. El primero activo por fecha de creación es el principal. Retirar un vehículo deja de publicarlo y permite agregar otro. Las placas nunca se envían al perfil público. Las solicitudes se validan contra la mayor capacidad de los vehículos activos; la asignación concreta del carro sigue coordinándose con el conductor.

El selector Español/English aparece en el perfil público y recuerda la elección en el navegador. Traduce navegación, acciones, galería y etiquetas. Los nombres y descripciones escritos por el conductor se muestran en su idioma original cuando no se proporcionó una versión inglesa. No se envía contenido a un servicio externo de traducción. El panel y el formulario de reservas mantienen su idioma actual.

## Google Calendar

El error 403 access_denied de la captura indica que la aplicación OAuth está en Testing y la cuenta que intenta conectar no está autorizada como tester. No es un error del teléfono ni de las reservas. En Google Auth Platform → Público del proyecto driver-connect-508320, el administrador debe agregar y guardar la cuenta de prueba correspondiente. Esto permite probar; no equivale a publicar o verificar la aplicación.

Antes de vender el servicio de sincronización a clientes generales, completar la publicación y la verificación que Google solicite para los permisos de calendario. Revisar marca, dominio autorizado, página de privacidad accesible, contacto de soporte, justificación de calendar.events.owned y demostración del consentimiento/creación/actualización/cancelación. No aumentar los permisos solicitados. Referencias oficiales: https://support.google.com/cloud/answer/15549945 y https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification.

Prueba real: conectar la cuenta autorizada desde Chrome Android, crear un viaje futuro confirmado, comprobar el evento en la misma cuenta Google, cambiar su hora sin duplicarlo y cancelarlo para comprobar que se retira. Esta prueba requiere la autorización del dueño de la cuenta; una prueba automatizada con proveedor simulado no verifica el consentimiento de Google.

## AWS

Respaldar código, base y fotos antes de actualizar. Conservar los archivos Compose locales, `.env.production`, el overlay del calendario y `compose.mysql-rsa.yaml`. Compilar app, migrate y calendar-worker, aplicar la migración 20261016000000_vehicle_photos y recrear app/calendar-worker usando los cuatro archivos Compose. No crear otra base ni otro proxy. La migración agrega columnas y una tabla; no elimina servicios, fotos ni vehículos existentes.

Comprobar cinco servicios y rechazo del sexto; editar uno sin alterar otro conductor; publicar tres carros y sus fotos; retirar uno; cambiar el selector público a inglés y volver a español, también en pantalla de teléfono. Los QR/NFC y vencimientos conservan su comportamiento.
