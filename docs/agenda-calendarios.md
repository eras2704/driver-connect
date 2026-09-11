# Agenda, reservas y calendarios

## Flujo completo

1. Administración crea o restablece el acceso del conductor desde su ficha. La cuenta debe estar activa.
2. El conductor inicia sesión y sustituye su contraseña temporal. Puede mantener su perfil y vehículo; no puede modificar su dirección NFC ni los indicadores administrativos de publicación y verificación.
3. Un perfil publicado con cuenta activa y servicios permite solicitar un traslado. El pasajero indica recorrido, contacto, fecha en hora de Panamá y consentimiento. La duración inicial es provisional: 60 minutos.
4. La solicitud llega pendiente a la agenda del conductor. El pasajero obtiene un enlace privado para seguir su estado; puede copiarlo y actualizar la página.
5. El conductor acuerda precio y disponibilidad por su canal habitual, ajusta la duración si hace falta y confirma. No se envían mensajes automáticos.
6. La confirmación habilita las opciones de calendario en el enlace del pasajero y en la agenda del conductor.

Los viajes manuales se registran confirmados y admiten duraciones de 15 a 1440 minutos. Las fechas deben estar en el futuro y dentro de 366 días. La agenda se presenta en America/Panama (UTC−5); MySQL almacena instantes UTC.

## Cuenta sincronizada con el teléfono

La conexión principal permite autorizar Google o Microsoft desde `/panel/calendario` (conductor) o el enlace privado de un viaje confirmado (pasajero). Escribe en el calendario principal de la cuenta elegida; la app ya instalada en el teléfono muestra los cambios si esa cuenta tiene la sincronización de calendario habilitada. No abre de forma universal todas las apps nativas de Android ni accede a calendarios locales sin cuenta.

El conductor conecta sus viajes confirmados futuros y las futuras confirmaciones. El pasajero conecta solo ese viaje. Un proceso Docker renueva autorizaciones y aplica cambios de horario y cancelaciones. No hay sincronización de vuelta: editar en el teléfono no altera la reserva. Los avisos siguen siendo responsabilidad de la app Calendario y del canal habitual del conductor.

Se requiere configurar al menos un cliente OAuth y mantener activo `calendar-worker`; consulta [activar calendarios y actualizar AWS](actualizar-fotos-temas-calendario.md). Sin credenciales, la interfaz muestra que la administración debe activar la conexión y no simula que funcione.

Las credenciales se cifran con AES-256-GCM y una clave separada. La autorización usa PKCE, estado de un solo uso, caducidad y cookie de navegador. El pasajero conserva la administración de su conexión en el navegador donde la autorizó; compartir el enlace de la reserva no permite desconectar otra cuenta. Al cerrar sesión, el conductor conserva su autorización; restablecer o desactivar su acceso la revoca. Renovar un enlace de pasajero revoca sus conexiones. La renovación de la suscripción de iPhone no afecta a la cuenta Google/Microsoft.

Las escrituras se encolan en la misma transacción que la reserva. El trabajador usa un bloqueo con caducidad, versiones y reintentos progresivos. Google usa un ID de evento persistente; Microsoft usa `transactionId` y una propiedad extendida para recuperar una creación interrumpida. Solo se modifican eventos creados por esta integración. La revocación detiene operaciones nuevas; una petición que ya estaba en curso puede terminar.

Desconectar borra el token guardado, pero conserva los identificadores del evento para una futura reconexión de la misma cuenta. Cambiar de cuenta deja de actualizar la anterior; sus eventos deben eliminarse manualmente si no se necesitan. Si el usuario elimina un evento desde el proveedor, no se recrea automáticamente. No combines la conexión, la suscripción Apple y una copia manual del mismo viaje, para evitar duplicados.

## Copia manual en Google Calendar

La opción secundaria abre un formulario de evento en Google. Es una copia independiente y requiere actualizarla manualmente; no es la nueva conexión automática.

## Calendario de iPhone

El botón `webcal://` entrega la dirección de una suscripción al sistema. El usuario confirma en Calendario; no descarga ni importa manualmente un archivo. El servidor sigue usando el formato estándar iCalendar como protocolo de la suscripción.

- Pasajero: suscripción privada que contiene únicamente ese viaje.
- Conductor: suscripción privada que incluye sus viajes confirmados y las cancelaciones de viajes previamente confirmados, desde 90 días antes de la fecha actual.
- La aplicación de calendario determina cuándo actualizar. Se sugiere un intervalo de 15 minutos, pero no se promete sincronización inmediata.
- Cada viaje conserva su UID, aumenta SEQUENCE al cambiar y publica STATUS:CANCELLED al cancelarse. Una solicitud pendiente no aparece como evento confirmado.
- La URL debe ser pública y accesible mediante HTTPS. El proxy de producción debe servir HTTPS y redirigir HTTP a HTTPS; no debe exigir cookies de sesión para estas rutas, porque la autorización está en la URL privada.
- En localhost se explica que iPhone se habilitará con un dominio HTTPS. Un teléfono no puede suscribirse a la dirección 127.0.0.1 de este equipo.

No existe aquí una aplicación iOS con EventKit ni una aplicación Android con Calendar Provider. El navegador no obtiene permiso general para escribir silenciosamente en la agenda del teléfono. Siempre se respeta la confirmación del usuario.

## Privacidad y autorización

Las sesiones del conductor usan tokens opacos aleatorios de 256 bits y huellas HMAC en MySQL, en una cookie distinta de la administrativa. Caducan a las ocho horas. Cada consulta y mutación comprueba la identidad y la propiedad del registro en el servidor. El cambio de contraseña elimina sesiones anteriores; restablecer el acceso desde administración también invalida la suscripción del conductor y vuelve a exigir contraseña personal.

La URL de cada suscripción contiene una firma HMAC asociada al propietario y a una versión revocable. El conductor puede renovar o desactivar su agenda, y renovar el enlace de un pasajero desde el viaje. Cambiar SESSION_SECRET invalida sesiones y enlaces de calendario. Revocar una URL no puede borrar información que una aplicación ya haya guardado.

El enlace del pasajero permite consultar servicio, conductor, estado, horarios y recorrido de ese viaje. Omite nombre del cliente, teléfono, correo y notas privadas. Caduca 90 días después del final del viaje. El calendario también omite esos datos de contacto. Los enlaces llevan permisos de lectura: quien conozca uno podrá leer su recorrido; no deben publicarse.

Las páginas privadas y feeds no se indexan; se evita enviar la URL privada como Referer a otros sitios. Los feeds responden `text/calendar` y `Cache-Control: private, no-store`, sin `Content-Disposition: attachment`.

## Consistencia y límites

Las confirmaciones y escrituras bloquean la fila del conductor dentro de una transacción. El conflicto usa intervalos semiabiertos: el fin de un viaje puede coincidir con el comienzo del siguiente. Dos confirmaciones simultáneas del mismo horario no pueden completarse ambas. Las solicitudes pendientes pueden coincidir hasta que el conductor decida.

Las ediciones y cambios de estado exigen la versión leída por el formulario; una vista desactualizada recibe un conflicto. Los viajes cancelados o rechazados se conservan y no se reabren; se crea otro viaje si hace falta.

Las solicitudes públicas son idempotentes por conductor y nonce del formulario. Repetir los mismos datos devuelve el mismo enlace; reutilizar el nonce con datos diferentes se rechaza. El limitador vive en MySQL y admite por ventana de 15 minutos: 200 solicitudes globales, 30 por conductor y tres por teléfono/conductor. Valida consentimiento, servicio asignado activo, cuenta activa, teléfono internacional, fecha real y capacidad del vehículo cuando exista.

La vista mensual muestra hasta 300 registros y avisa si hay más. La vista administrativa muestra los últimos 100. No se han importado viajes del respaldo de la otra versión.

## Comprobaciones

Las pruebas unitarias cubren zona horaria, fechas imposibles, URLs, Unicode, escape de iCalendar y privilegios de perfil. La integración en una base MySQL desechable cubre cuentas temporales, autorización cruzada, solicitud y reenvío, confirmaciones concurrentes, edición, cancelación, datos privados, límites, expiración y revocación de enlaces y sesiones.

La apertura del sistema y la sincronización real deben comprobarse en Android e iPhone físicos después de publicar en HTTPS. Las pruebas HTTP verifican el contenido y las respuestas de la aplicación, no el comportamiento de una app externa.

## Referencias oficiales

- [Apple: configurar calendarios y suscribirse desde un enlace](https://support.apple.com/en-au/guide/iphone/iph3d1110d4/ios).
- [Google: suscribirse desde una URL en ordenador](https://support.google.com/calendar/answer/37100?hl=es).
- [Google: crear eventos mediante API con autorización](https://developers.google.com/workspace/calendar/api/guides/create-events).
- [Android: acción nativa para insertar eventos](https://developer.android.com/guide/components/intents-common#Calendar).
- [RFC 5545: formato iCalendar, UID y SEQUENCE](https://www.rfc-editor.org/rfc/rfc5545).
