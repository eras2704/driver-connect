# Perfiles NFC: Hostinger + AWS Lightsail con Ubuntu

Esta máquina Ubuntu de Lightsail ya aloja una API. Su contenedor `server-caddy-1` ocupa los puertos 80 y 443. Esta guía utiliza ese mismo proxy mediante `compose.shared-proxy.yaml`; no arranques el segundo Caddy de `compose.aws.yaml` en esta máquina. Si acabas de recibir el error «port is already allocated», sigue [la corrección breve](resolver-puerto-80.md).

El resultado será: **tarjeta NFC → perfil del conductor → contacto o solicitud de viaje**. Tu web actual permanece en Hostinger; Driver Connect funciona en AWS bajo el subdominio `nfc`. Cada tarjeta guarda la dirección de un conductor, no la portada de muestra.

El subdominio para los perfiles es **nfc.comunidaddeconductorespanama.com**. **Conserva `driverconnect.comunidaddeconductorespanama.com` y su ALIAS: ya lo utiliza una API existente.** La IP proporcionada es **35.169.111.143**, del recurso **StaticIp-1** en Lightsail, región **us-east-1**. La clave está en `/home/eroca/Documentos/LightsailDefaultKey-us-east-1.pem`. Los comandos ya incluyen estos datos; el contenido de la clave nunca se copia al proyecto ni al servidor.

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

Tu web sigue en `comunidaddeconductorespanama.com`; la API existente conserva `driverconnect.comunidaddeconductorespanama.com`. Los perfiles de este proyecto usarán **nfc.comunidaddeconductorespanama.com**.

El error `IN ALIAS must not be used with A on the same name` significa que Hostinger rechaza añadir un registro A donde ya existe un ALIAS. La indicación anterior de sustituir los destinos de `driverconnect` queda retirada: **no borres ni cambies su ALIAS, CNAME, A o AAAA**, porque sirven a la API existente.

En Hostinger, abre **Dominios → comunidaddeconductorespanama.com → DNS / Nameservers → Registros DNS**. Si los servidores DNS pertenecen a otro proveedor, haz el cambio allí. Añade este registro para el nombre nuevo:

| Campo | Valor |
| --- | --- |
| Tipo | A |
| Nombre | nfc |
| Apunta a | 35.169.111.143 |
| TTL | Dejar el predeterminado |

Escribe únicamente **nfc** en Nombre. Conserva los registros de `driverconnect`, `@`, `www`, correo y los nameservers. Basta el registro DNS para conectar el subdominio al servidor externo; no necesitas crear un sitio adicional en el constructor de Hostinger.

La consulta DNS previa no devolvió registros A, AAAA ni CNAME para `nfc`. Comprueba también que ese nombre esté libre en hPanel antes de añadirlo: una respuesta DNS vacía no garantiza que no exista alguna configuración pendiente. Si aparece otro conflicto, no elimines registros de un servicio existente para resolverlo.

Comprueba el resultado desde tu computadora:

```bash
dig +short nfc.comunidaddeconductorespanama.com A
dig +short nfc.comunidaddeconductorespanama.com AAAA
```

La primera consulta debe devolver **35.169.111.143** y la segunda quedar vacía para este despliegue sin IPv6. Hostinger indica que la propagación puede requerir hasta 24 horas. Espera a que el nombre resuelva correctamente antes de comprobar el certificado HTTPS.

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
```

Docker y Compose ya están instalados en esta máquina. Conserva esa instalación y los contenedores de la API.

## 5. Configurar la dirección y las claves

Con tu subdominio de Hostinger:

```bash
bash scripts/configure-aws.sh nfc.comunidaddeconductorespanama.com
```

El comando ya contiene el nuevo subdominio. El script genera tres claves distintas y las guarda en `.env.production`, con permisos restringidos. Si el archivo ya existe, lo conserva y se detiene: no borres ese archivo para repetir el proceso. Si la base ya tiene datos, hay que utilizar sus credenciales existentes.

**Si ya configuraste el proyecto con la dirección anterior**, abre este archivo desde la carpeta `~/driver-connect` de la máquina Ubuntu:

```bash
nano .env.production
```

Cambia únicamente la línea `APP_ORIGIN` para que quede así:

```dotenv
APP_ORIGIN=https://nfc.comunidaddeconductorespanama.com
```

Guarda con **Ctrl+O**, **Enter** y sal con **Ctrl+X**. Conserva las otras claves. Al ejecutar el siguiente paso, Compose recreará la aplicación con la nueva dirección. El proxy existente se configura mediante el script específico. Estos ajustes corresponden al proyecto Driver Connect que estás instalando; no modifiques los archivos de la API existente.

## 6. Iniciar Driver Connect con el proxy existente

La red Docker `server_frontend` ya conecta el Caddy existente con la API. Este archivo conecta también la aplicación de Driver Connect, con el nombre único `driver-connect-web`; MySQL permanece en la red interna del proyecto.

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --build --wait --wait-timeout 300
sudo python3 scripts/add-caddy-site.py
```

Si la aplicación ya está construida y solo estás resolviendo el conflicto de puertos, utiliza `--no-build` en lugar de `--build`, como indica [la corrección breve](resolver-puerto-80.md).

El script comprueba la aplicación y el acceso desde el proxy, conserva el contenido de `/opt/ccpd/server/Caddyfile`, valida la configuración completa y crea una copia de respaldo privada antes de añadir el bloque NFC. Después recarga `server-caddy-1` mediante Caddy. Si la recarga falla, intenta restaurar y recargar la configuración anterior; informa si esa recuperación también falla. No borra ni detiene los contenedores de la API y no añade bloques duplicados al repetirlo.

El DNS debe apuntar a la IP de Lightsail. Caddy obtiene y renueva el certificado del nuevo nombre cuando puede validarlo; la emisión puede tardar después de la recarga. Abre `https://nfc.comunidaddeconductorespanama.com` y comprueba también que tu API siga funcionando. La portada muestra el perfil de muestra; cada tarjeta llevará la dirección de su propio conductor.

Si todavía no abre:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml ps
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml logs --tail=60 app migrate
sudo docker logs --tail=60 server-caddy-1
```

Si aparece un error DNS o de certificado, comprueba el registro A y los puertos 80/443. Si falla la compilación por memoria, revisa los recursos o construye la imagen fuera de la máquina. No reinicies ni detengas el proxy de la API para liberar los puertos.

## 7. Crear el administrador y los conductores

Desde la misma carpeta:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml --profile tools run --rm admin-create
```

Escribe el usuario, tu nombre y una contraseña de al menos 12 caracteres cuando el programa los solicite. No existe una contraseña predeterminada. Entra en `https://nfc.comunidaddeconductorespanama.com/login-admin`.

1. En **Conductores → Nuevo conductor**, completa los datos del conductor.
2. Elige su **Dirección del perfil**, por ejemplo `daniel-rios`. Esta parte de la dirección queda fija después de crear el perfil.
3. Asigna los servicios, completa el vehículo y guarda.
4. Desde su ficha, abre **Gestionar acceso del conductor** y crea su usuario con contraseña temporal. Necesita una cuenta activa y servicios asignados para recibir solicitudes.
5. Activa **Publicar perfil** cuando los datos estén listos.
6. Abre **Ver perfil** y copia la dirección completa. Por ejemplo: `https://nfc.comunidaddeconductorespanama.com/conductor/daniel-rios`.

El conductor entra en `https://nfc.comunidaddeconductorespanama.com/login-conductor` y cambia su contraseña temporal. Su panel permite gestionar el perfil y las reservas.

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
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml build
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml run --rm migrate
sudo docker compose --env-file .env.production -f compose.yaml -f compose.shared-proxy.yaml up -d --wait --wait-timeout 300
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
