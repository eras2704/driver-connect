# Recuperar tarjetas normales por upgrade a premium

En Administración → Conductores → Tarjetas y upgrade:

1. Abrir el conductor original y registrar la referencia del upgrade.
2. Pulsar Preparar tarjeta premium. Se crea un enlace y QR premium que ya
   dirigen al mismo perfil. El QR normal continúa funcionando en esta etapa.
3. Imprimir/grabar y probar QR y NFC premium con el perfil publicado.
4. Recuperar físicamente la tarjeta normal. Confirmar ambas condiciones y
   completar el upgrade. La tarjeta normal queda libre y su enlace deja de
   mostrar el perfil anterior hasta que se asigne de nuevo.
5. Abrir Tarjetas y upgrade del siguiente conductor. Elegir la tarjeta libre,
   copiar el enlace mostrado para regrabar el NFC, registrar la entrega y
   confirmar la regrabación. Su QR principal de descarga será el de esa tarjeta.
6. Escanear el QR impreso y probar el NFC antes de entregar la tarjeta.

Solo se pueden reutilizar normales recuperadas por un upgrade completado.
No se permite liberar tarjetas premium mediante este flujo. Una tarjeta tiene
un único propietario; las operaciones administrativas y las reservas de
direcciones se serializan en una transacción. Reintentar una petición con el
mismo identificador no duplica el upgrade ni la asignación. Se exige sesión de
administración y origen válido. Cada operación registra actor, fecha, QR,
referencia y perfiles involucrados. No hay API para borrar el historial. Los formularios de reserva llevan una firma
ligada al perfil y al enlace. Un formulario antiguo sin firma o con firma del
anterior conductor se rechaza si el QR ya pertenece a otro perfil; se pide abrir
el perfil otra vez antes de reservar.

## Los enlaces que ya están impresos

Los QR anteriores contienen /conductor/{direccion}. No se modifica el sticker:
se libera y reasigna exclusivamente esa dirección. Si era también la dirección
actual del perfil original, su dirección actual cambia al enlace premium al
completar el upgrade. Todas las copias, fotos y marcadores del enlace recuperado
abrirán al nuevo conductor después de reasignarlo. Esto se explica y confirma
en administración. No es posible que la misma URL distinga un sticker de una copia.

Los demás enlaces históricos se conservan en su perfil. El ID del conductor,
reservas y enlaces privados, credenciales, fotos, vehículos, servicios, calendario
y fechas de suscripción no se transfieren ni se reinician. Una reasignación no
publica ni activa un perfil: un borrador o servicio vencido sigue sin ser público.

No se registra ni reasigna automáticamente ninguna tarjeta existente durante la
migración. Las tarjetas actuales se registran como normales únicamente al iniciar
su upgrade. Para tarjetas premium anteriores no registradas, administración debe
comprobar físicamente que la tarjeta a recuperar sea normal antes de iniciar.

## Despliegue

Se requiere la migración aditiva 20261025000000_reusable_cards, que crea cuatro
tablas y un registro de bloqueo. No modifica los perfiles ni los enlaces actuales.
Respaldar base y fotos, construir app y migrate secuencialmente y ejecutar migrate
antes de activar la nueva app, con los cinco archivos Compose existentes. No
ejecutar integración contra producción: sus datos deben ser desechables de CI.

El verificador de enlaces sigue detectando cambios de destino. Tomar el snapshot
inmediatamente antes del despliegue y comparar después sin operaciones de tarjetas
entre ambas capturas. Un snapshot anterior a una reasignación deliberada debe
avisar del cambio; no se debe omitir esa alerta sin revisar el historial.
