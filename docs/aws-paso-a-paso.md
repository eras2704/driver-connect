# Perfiles NFC: Hostinger + AWS con Ubuntu

Esta guía es para una instancia Ubuntu existente dedicada a Driver Connect. Los pasos los ejecutas tú; preparar el paquete no publica la aplicación. Si esa máquina ya sirve otras webs en los puertos 80 o 443, hay que integrar el proxy existente antes de seguir.

El resultado será: **tarjeta NFC → perfil del conductor → contacto o solicitud de viaje**. Tu web actual permanece en Hostinger; Driver Connect funciona en AWS bajo el subdominio `driverconnect`. Cada tarjeta guarda la dirección de un conductor, no la portada de muestra.

El subdominio confirmado es **driverconnect.comunidaddeconductorespanama.com**. En los comandos, sustituye únicamente `TU_IP` por la **IPv4 pública** de tu instancia y `TU_CLAVE.pem` por el nombre de tu clave de acceso. No uses la IPv4 privada ni copies literalmente esos dos marcadores.

## 1. Comprobar la instancia y su dirección pública

En **AWS → EC2 → Instancias**, selecciona tu máquina Ubuntu y comprueba que esté **En ejecución** y que pasen las comprobaciones de estado. Anota su IPv4 pública y localiza la clave `.pem` que utilizas para conectarte. Si no tienes la clave, revisa **Conectar** en la consola para establecer otro método de acceso antes de seguir con los comandos SSH de esta guía.

Para conservar la misma IP al detener e iniciar la instancia, comprueba si ya tiene una **Elastic IP** asociada. Si ya la tiene, reutilízala. Si todavía no y esta máquina está dedicada a Driver Connect:

1. En la misma región de la instancia, abre **EC2 → Red y seguridad → Direcciones IP elásticas**.
2. Elige **Asignar dirección IP elástica** y confirma la asignación.
3. Selecciona la nueva dirección y abre **Acciones → Asociar dirección IP elástica**.
4. Selecciona tu instancia Ubuntu y asóciala.
5. Anota esa dirección como `TU_IP` para los pasos siguientes.

AWS cobra por las IPv4 públicas, incluidas las Elastic IP. Asociar una nueva dirección sustituye la IPv4 pública anterior: si la máquina sirve otros sistemas, revisa sus dependencias antes de cambiarla. El nombre del subdominio será la dirección permanente de las tarjetas; si en el futuro cambia el servidor, podrás actualizar su registro DNS sin reescribir las tarjetas.

## 2. Permitir el acceso web en AWS

En la ficha de la instancia, abre **Seguridad → Grupo de seguridad → Editar reglas de entrada** y añade las reglas que falten:

| Tipo | Puerto | Origen |
| --- | --- | --- |
| HTTP | 80 TCP | 0.0.0.0/0 |
| HTTPS | 443 TCP | 0.0.0.0/0 |
| SSH | 22 TCP | Mi IP |

El acceso SSH descrito aquí es desde tu equipo con tu archivo `.pem`. Mantén 3000 y 3306 cerrados a Internet. Las reglas afectan a todas las instancias que compartan ese grupo: usa el grupo destinado a esta máquina. Si hay un firewall de Ubuntu activo, también debe permitir 80/443 y tu acceso SSH. La instancia necesita salida a Internet para instalar paquetes y obtener certificados.

## 3. Crear el subdominio NFC en Hostinger

Tu web sigue en `comunidaddeconductorespanama.com` y Driver Connect estará en `driverconnect.comunidaddeconductorespanama.com`.

En Hostinger, abre **Dominios → tu dominio → DNS / Nameservers → Registros DNS**. Si los servidores DNS pertenecen a otro proveedor, haz el cambio allí. Añade este registro para un nombre que todavía no esté en uso:

| Campo | Valor |
| --- | --- |
| Tipo | A |
| Nombre | driverconnect |
| Apunta a | TU_IP |
| TTL | Dejar el predeterminado |

No cambies los registros `@`, `www`, correo ni los nameservers: la web y el correo actuales los siguen necesitando. Para un servicio en AWS basta el registro DNS; no necesitas crear otra web ni contratar otro hosting en Hostinger.

Si `driverconnect` ya tiene un registro A, AAAA o CNAME, comprueba qué servicio utiliza antes de sustituirlo o añadir registros que entren en conflicto. El nuevo nombre debe apuntar únicamente al servidor que acabas de preparar. El DNS puede tardar en actualizarse; Hostinger indica que la propagación puede requerir hasta 24 horas.

## 4. Subir el paquete y entrar en Ubuntu

Guarda `driver-connect-aws.tar.gz` en Descargas, junto a tu clave `.pem` o ajusta su ruta. Ejecuta estos comandos **en la terminal de tu computadora**, no en AWS:

```bash
cd ~/Descargas
chmod 600 TU_CLAVE.pem
scp -i TU_CLAVE.pem driver-connect-aws.tar.gz ubuntu@TU_IP:~/driver-connect-aws.tar.gz
ssh -i TU_CLAVE.pem ubuntu@TU_IP
```

En la primera conexión SSH, compara la huella del servidor con la información de la instancia antes de aceptarla. Conserva la clave privada en tu equipo. El paquete contiene el código del proyecto; no incluye `.env`, claves ni respaldos y no necesita iniciar sesión en GitHub desde la máquina.

Desde este punto ejecuta los comandos **dentro de la terminal de Ubuntu en AWS**:

```bash
mkdir -p ~/driver-connect
cd ~/driver-connect
tar -xzf ~/driver-connect-aws.tar.gz
sudo bash scripts/install-docker-ubuntu.sh
```

El instalador admite Ubuntu 22.04, 24.04 y 26.04, y utiliza el repositorio oficial de Docker. Si ya hay Docker y Compose, conserva esa instalación. No ejecuta borrados de datos.

## 5. Configurar la dirección y las claves

Con tu subdominio de Hostinger:

```bash
bash scripts/configure-aws.sh driverconnect.comunidaddeconductorespanama.com
```

El comando ya contiene tu subdominio. El script genera tres claves distintas y las guarda en `.env.production`, con permisos restringidos. Si el archivo ya existe, lo conserva y se detiene: no borres ese archivo para repetir el proceso. Si la base ya tiene datos, hay que utilizar sus credenciales existentes.

## 6. Iniciar la aplicación y HTTPS

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml up -d --build --wait --wait-timeout 300
```

La primera ejecución puede tardar varios minutos. Compila la aplicación, inicia MySQL, aplica las migraciones y arranca Caddy para obtener y renovar HTTPS. El DNS debe apuntar a esta IP y los puertos 80/443 deben ser accesibles. El comando espera que la aplicación esté sana; la emisión del certificado puede finalizar después.

Comprueba el estado:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml ps
```

Abre `https://driverconnect.comunidaddeconductorespanama.com`. Verás el perfil de muestra: esto permite comprobar que el sitio abre. Esta portada no es el enlace que grabarás en las tarjetas. Si todavía no abre, consulta:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml logs --tail=60 caddy app migrate
```

Si aparece un error de DNS, revisa el registro A y espera su propagación. Un error de conexión o de validación del certificado suele requerir revisar IP, puertos y firewall. No ignores advertencias del navegador sobre certificados. Si falla la compilación por falta de memoria, la máquina necesita más recursos o una imagen compilada fuera de ella; no continúes con un despliegue incompleto.

## 7. Crear el administrador y los conductores

Desde la misma carpeta:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml --profile tools run --rm admin-create
```

Escribe el usuario, tu nombre y una contraseña de al menos 12 caracteres cuando el programa los solicite. No existe una contraseña predeterminada. Entra en `https://driverconnect.comunidaddeconductorespanama.com/login-admin`.

1. En **Conductores → Nuevo conductor**, completa los datos del conductor.
2. Elige su **Dirección del perfil**, por ejemplo `daniel-rios`. Esta parte de la dirección queda fija después de crear el perfil.
3. Asigna los servicios, completa el vehículo y guarda.
4. Desde su ficha, abre **Gestionar acceso del conductor** y crea su usuario con contraseña temporal. Necesita una cuenta activa y servicios asignados para recibir solicitudes.
5. Activa **Publicar perfil** cuando los datos estén listos.
6. Abre **Ver perfil** y copia la dirección completa. Por ejemplo: `https://driverconnect.comunidaddeconductorespanama.com/conductor/daniel-rios`.

El conductor entra en `https://driverconnect.comunidaddeconductorespanama.com/login-conductor` y cambia su contraseña temporal. Su panel permite gestionar el perfil y las reservas.

## 8. Grabar y comprobar cada tarjeta NFC

Usa una tarjeta NFC compatible y escribible, un teléfono con NFC y una aplicación para escribir registros URL, como **NFC Tools** de wakdev.

1. Abre la aplicación y elige **Escribir / Write**.
2. Añade un registro de tipo **URL / URI** e introduce la dirección HTTPS completa que copiaste desde **Ver perfil**. Comprueba que no quede duplicado el prefijo `https://`.
3. Graba ese único registro URL acercando la tarjeta al teléfono. Cada tarjeta debe contener la dirección del conductor al que pertenece; no debe incluir accesos administrativos ni enlaces privados de reservas o calendarios.
4. Retira la tarjeta y comprueba la lectura con un Android y un iPhone compatibles, con conexión a Internet. Abre la notificación que muestre el teléfono y confirma que lleva al conductor correcto.

El pasajero no necesita la aplicación usada para programar la tarjeta: se graba un enlace web estándar. Si el teléfono no detecta la tarjeta, comprueba la compatibilidad NFC, su activación cuando corresponda, el desbloqueo del teléfono y la posición de la antena.

Editar los datos del perfil no requiere volver a grabar la tarjeta mientras conserves su URL. La programación física la realizas con la aplicación NFC; Driver Connect administra el contenido del perfil.

## 9. Comprobar reservas y calendarios

1. Abre el perfil real desde el teléfono y solicita un viaje.
2. Entra como conductor, cambia la contraseña temporal y confirma el viaje.
3. Abre el enlace privado del pasajero y guarda o suscribe el viaje.
4. En iPhone confirma la suscripción de Calendario. Desde el panel, el conductor puede habilitar la suscripción de su agenda.
5. En Android utiliza Google Calendar y pulsa Guardar para cada viaje. Esa copia no recibe cambios automáticos; la suscripción de iPhone se actualiza cuando Calendario sincroniza.

Antes de usar datos reales, configura respaldos externos de MySQL y comprueba su restauración. El volumen Docker conserva los datos entre reinicios, pero no es un respaldo. No ejecutes `docker compose down -v`: borra volúmenes. Conserva también `.env.production` de forma segura fuera del repositorio.

## Visibilidad en buscadores

La aplicación ya incluye `noindex, nofollow` para indicar a los buscadores compatibles que no indexen las páginas. No hace falta añadirla a Google ni crear un catálogo público de perfiles. Conserva esa configuración y evita bloquear el rastreo con `robots.txt`, porque Google necesita poder leer la indicación `noindex`.

El acceso NFC abre un enlace web: también puede abrirlo quien lo copie o reciba. No indexar un perfil no lo convierte en privado ni garantiza que solo se pueda acceder mediante la tarjeta.

## Actualizar y cambiar de dirección

Para actualizar, conserva `.env.production`, los volúmenes y los respaldos; copia la nueva versión del código sobre la misma carpeta. Después de respaldar la base:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml build
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml run --rm migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml up -d --wait --wait-timeout 300
```

Si falla cualquier comando, resuelve ese error antes de continuar. Para cambiar de dirección, actualiza solo `APP_ORIGIN` en `.env.production` y vuelve a levantar los servicios después de configurar el DNS. Conserva las demás claves. Los enlaces NFC, privados y suscripciones que ya repartiste con la dirección anterior necesitan mantenerla operativa o renovarse.

## Documentación oficial

- [Hostinger: apuntar un subdominio a un servidor externo](https://www.hostinger.com/support/8907694-how-to-create-a-subdomain-without-a-hosting-plan-at-hostinger/).
- [Docker: instalación en Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
- [AWS: acceso SSH](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html).
- [AWS: Elastic IP y cargos de IPv4](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html).
- [Caddy: HTTPS automático](https://caddyserver.com/docs/automatic-https).
- [NFC Tools: escribir enlaces en tarjetas NFC](https://www.wakdev.com/en/apps/nfc-tools-android.html).
- [Google: impedir la indexación con noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
