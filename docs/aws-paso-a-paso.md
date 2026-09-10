# Perfiles NFC: Hostinger + AWS Lightsail con Ubuntu

Esta guía es para una instancia Ubuntu existente dedicada a Driver Connect. Los pasos los ejecutas tú; preparar el paquete no publica la aplicación. Si esa máquina ya sirve otras webs en los puertos 80 o 443, hay que integrar el proxy existente antes de seguir.

El resultado será: **tarjeta NFC → perfil del conductor → contacto o solicitud de viaje**. Tu web actual permanece en Hostinger; Driver Connect funciona en AWS bajo el subdominio `driverconnect`. Cada tarjeta guarda la dirección de un conductor, no la portada de muestra.

El subdominio confirmado es **driverconnect.comunidaddeconductorespanama.com**. La IP proporcionada es **35.169.111.143**, del recurso **StaticIp-1** en Lightsail, región **us-east-1**. La clave está en `/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem`. Los comandos ya incluyen estos datos; el contenido de la clave nunca se copia al proyecto ni al servidor.

## 1. Comprobar la instancia y su dirección pública

Abre **AWS Lightsail → Instancias** en la región **us-east-1**. Selecciona tu máquina Ubuntu y comprueba que esté **En ejecución**.

En **Redes / Networking**, comprueba que **StaticIp-1**, con dirección **35.169.111.143**, esté asociada a esa instancia. Si aparece sin instancia asociada, utiliza la opción de adjuntarla a tu Ubuntu. Si aparece asociada a otra instancia, revisa cuál es la destinada al proyecto antes de cambiarla.

Ya tienes una IP estática de Lightsail: conserva ese recurso. El nombre del subdominio será la dirección permanente de las tarjetas; si en el futuro cambia el servidor, podrás actualizar su registro DNS sin reescribir las tarjetas.

## 2. Permitir el acceso web en AWS

En la ficha de la instancia de Lightsail, abre **Redes / Networking → Firewall IPv4 → Añadir regla** y configura las reglas que falten:

| Tipo | Puerto | Origen |
| --- | --- | --- |
| HTTP | 80 TCP | Todas las direcciones IPv4 |
| HTTPS | 443 TCP | Todas las direcciones IPv4 |
| SSH | 22 TCP | Tu IP pública actual de conexión a Internet |

Para SSH puedes marcar **Restringir a dirección IP** e introducir la IP pública actual de tu computadora; no es `35.169.111.143`, que pertenece al servidor. Si quieres conservar también el acceso desde la consola, habilita **Permitir SSH de navegador de Lightsail**. Mantén 3000 y 3306 cerrados a Internet. Si hay un firewall de Ubuntu activo, también debe permitir 80/443 y tu acceso SSH. La instancia necesita salida a Internet para instalar paquetes y obtener certificados.

## 3. Crear el subdominio NFC en Hostinger

Tu web sigue en `comunidaddeconductorespanama.com` y Driver Connect estará en `driverconnect.comunidaddeconductorespanama.com`.

En Hostinger, abre **Dominios → tu dominio → DNS / Nameservers → Registros DNS**. Si los servidores DNS pertenecen a otro proveedor, haz el cambio allí. Añade este registro para un nombre que todavía no esté en uso:

| Campo | Valor |
| --- | --- |
| Tipo | A |
| Nombre | driverconnect |
| Apunta a | 35.169.111.143 |
| TTL | Dejar el predeterminado |

No cambies los registros `@`, `www`, correo ni los nameservers: la web y el correo actuales los siguen necesitando. Para un servicio en AWS basta el registro DNS; no necesitas crear otra web ni contratar otro hosting en Hostinger.

Si `driverconnect` ya tiene un registro A, AAAA o CNAME, comprueba qué servicio utiliza antes de sustituirlo o añadir registros que entren en conflicto. El nuevo nombre debe apuntar únicamente al servidor que acabas de preparar. El DNS puede tardar en actualizarse; Hostinger indica que la propagación puede requerir hasta 24 horas.

En la comprobación previa, este subdominio resolvía a `145.223.124.215` y `88.223.87.195`, además de dos direcciones IPv6; ninguna era la IP de Lightsail indicada. Para esta configuración con IPv4, deja el registro A de **driverconnect** en **35.169.111.143** y retira únicamente los destinos antiguos de ese mismo subdominio, incluidos sus registros AAAA si aparecen. Si hPanel muestra un CNAME o ALIAS que genera esas direcciones, sustitúyelo por el registro A indicado. Conserva intactos los registros de la web principal y el correo.

Comprueba el resultado desde tu computadora:

```bash
dig +short driverconnect.comunidaddeconductorespanama.com A
dig +short driverconnect.comunidaddeconductorespanama.com AAAA
```

La primera consulta debe devolver **35.169.111.143** y la segunda quedar vacía para este despliegue sin IPv6. Si aún aparecen las direcciones anteriores, revisa el cambio en Hostinger o espera a que expire la caché DNS antes de comprobar el certificado HTTPS.

## 4. Subir el paquete y entrar en Ubuntu

El paquete ya está en la carpeta local del proyecto. Ejecuta estos comandos **en la terminal de tu computadora**, no en la consola SSH del navegador de AWS. El primer comando restringe los permisos de la clave para que SSH la acepte:

```bash
chmod 600 "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem"
scp -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" "/home/eroca/Documentos/ChatGPT/Tarjetas NFC/dist/driver-connect-aws.tar.gz" ubuntu@35.169.111.143:~/driver-connect-aws.tar.gz
ssh -i "/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem" ubuntu@35.169.111.143
```

En la primera conexión SSH, compara la huella del servidor con la información de la instancia antes de aceptarla. Conserva la clave privada en tu equipo. El paquete contiene el código del proyecto; no incluye `.env`, claves ni respaldos y no necesita iniciar sesión en GitHub desde la máquina.

Si aparece `Permission denied (publickey)`, revisa en **Lightsail → tu instancia → Conectar** que utilice la clave predeterminada de **us-east-1** y la imagen **Ubuntu**. El archivo se localizó por su nombre; todavía no se ha comprobado que autentique contra esa instancia. Una imagen de aplicación Bitnami utiliza otro usuario y puede tener un servidor web ya instalado; en ese caso hay que adaptar estos pasos antes de instalar.

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
- [Lightsail: conexión SSH y usuarios según la imagen](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-ssh-using-terminal.html).
- [Lightsail: asociar una IP estática](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html).
- [Lightsail: configurar el firewall](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-editing-firewall-rules.html).
- [Caddy: HTTPS automático](https://caddyserver.com/docs/automatic-https).
- [NFC Tools: escribir enlaces en tarjetas NFC](https://www.wakdev.com/en/apps/nfc-tools-android.html).
- [Google: impedir la indexación con noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
