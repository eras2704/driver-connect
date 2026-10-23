# Portada adaptable, fotografías y mensaje personalizado

La composición de referencia integra la imagen del vehículo y el contenido sobre una portada oscura, tarjetas de servicios en dos columnas, vehículo destacado, galería horizontal, biografía y acciones inferiores. Se conservan las paletas originales Plata azul y Azul noche.

Las fotos de vehículos y servicios se presentan completas con object-fit: contain. Una copia decorativa desenfocada llena el espacio restante sin estirar la imagen ni recortar la fotografía principal. La galería mantiene también las fotos completas y sus proporciones. El retrato utiliza el encuadre circular centrado existente. No se modifican los archivos originales por cambiar el diseño.

Se comprobó el diseño en anchos de 320, 390, 768 y 1440 píxeles, y con fotografías de prueba verticales, cuadradas y panorámicas. Textos y secciones crecen según el contenido; no se oculta el exceso de texto ni se fija la altura del mensaje.

## Mensaje de portada

Desde Mi perfil y desde administración, Mensaje de portada permite escribir hasta 120 caracteres, con una vista previa y traducción opcional al inglés. Vacío utiliza «Tu destino, en buenas manos.»; en inglés, «Your destination, in good hands.». Si existe un mensaje propio sin traducción se conserva ese mensaje al cambiar de idioma. El texto se publica escapado como texto, sin interpretar HTML.

Los clientes anteriores que omiten estos campos conservan el mensaje guardado. Enviar un campo vacío restaura el valor predeterminado. Los permisos del perfil siguen siendo los mismos.

## Actualización de AWS

Esta versión requiere la migración aditiva 20261023000000_profile_headline: agrega únicamente headline y headlineEn, ambos opcionales, a Driver. No cambia slug, qrSlug, DriverAddress, fotografías, usuarios ni vehículos. Respaldar la base y las imágenes actuales; conservar .env.production, compose*.yaml, compose*.yml, deploy y data al extraer el código.

Construir app y migrate antes de activar la nueva aplicación. Con los mismos cinco archivos Compose de la instalación actual, ejecutar:

```bash
dc run --rm --no-deps --user root migrate
```

Sólo después de una migración exitosa, recrear app. Si también se construye calendar-worker, hacerlo secuencialmente para no saturar la memoria de Lightsail. Mantener la configuración RSA de MySQL y restart: unless-stopped. Conservar el dominio y las direcciones públicas de las tarjetas NFC/QR.

La política de privacidad corregida del PR anterior se mantiene; el correo corporativo continúa pospuesto. No se deben reutilizar los comandos anteriores que indicaban que no existían nuevas migraciones: correspondían a la versión anterior sin mensajes personalizados.
