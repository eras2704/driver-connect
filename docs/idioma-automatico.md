# Idioma automático del perfil público

La interfaz del perfil y el formulario público de reservas incluyen español,
inglés, alemán, francés y portugués. En la primera visita se utiliza el primer
idioma compatible de `navigator.languages`; si ninguno está disponible, inglés.
El selector recuerda la elección manual en este navegador con la clave existente
`dc-public-language`. Las preferencias previas en español o inglés se respetan.
No se utiliza ubicación, no se envían datos a terceros y no hay API de traducción
ni costo por visita. Los paneles de administración y conductor siguen en español.

Las traducciones de interfaz están incluidas en `src/lib/public-translations.ts`.
Los textos personalizados del conductor y las descripciones de fotos no se
traducen automáticamente. Para idiomas distintos del español se usa su versión
en inglés cuando existe; de lo contrario se conserva el texto original. No se
promete traducción universal ni traducción del contenido de Google Calendar.

El mismo perfil, URL, QR y NFC sirven para todos los idiomas. No se cambian IDs,
direcciones, reservas, permisos OAuth ni datos de conductores. No hay migración
de base de datos. Se requiere reconstruir y desplegar la imagen de la app.

Comprobar: primera visita con navegador de-DE, fr-CA, pt-BR y es-PA; navegador
sin idioma compatible; cambio manual y recarga; navegación a reservas sin perder
idioma o los valores escritos; selector móvil sin desbordamientos; panel privado
en español. Los controles nativos de fecha y validación dependen del navegador.
