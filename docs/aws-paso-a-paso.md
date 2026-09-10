# Driver Connect en AWS con Ubuntu

Esta guía es para una instancia Ubuntu existente dedicada a Driver Connect. Los pasos los ejecutas tú; preparar el paquete no publica la aplicación. Si esa máquina ya sirve otras webs en los puertos 80 o 443, hay que integrar el proxy existente antes de seguir.

En los ejemplos, sustituye `TU_IP` por la **IPv4 pública** de tu instancia, `TU_CLAVE.pem` por tu clave de acceso y `driver.tudominio.com` por el nombre elegido. No uses la IPv4 privada.

## 1. Elegir la dirección del sitio

**Si ya tienes una web con dominio propio en Hostinger:** puedes conservarla y crear un subdominio para Driver Connect. Por ejemplo, tu web sigue en `tudominio.com` y Driver Connect estará en `driver.tudominio.com`.

En Hostinger, abre **Dominios → tu dominio → DNS / Nameservers → Registros DNS**. Si los servidores DNS pertenecen a otro proveedor, haz el cambio allí. Añade este registro para un nombre que todavía no esté en uso:

| Campo | Valor |
| --- | --- |
| Tipo | A |
| Nombre | driver |
| Apunta a | TU_IP |
| TTL | Dejar el predeterminado |

No cambies los registros `@`, `www`, correo ni los nameservers: la web y el correo actuales los siguen necesitando. Para un servicio en AWS basta el registro DNS; no necesitas crear otra web ni contratar otro hosting en Hostinger.

**Si no tienes dominio propio:** usa provisionalmente `driver-connect.TU_IP.sslip.io`, sustituyendo `TU_IP` por la dirección con sus puntos. No requiere registrar ni comprar un dominio. Depende de un servicio DNS externo y de conservar esa IP; es una dirección de prueba, antes de distribuir tarjetas NFC o enlaces permanentes conviene elegir el dominio definitivo.

La IP pública normal de EC2 puede cambiar después de detener e iniciar la instancia. Para una dirección estable, revisa si ya tiene una Elastic IP. Si decides asignar una, hazlo **antes** de configurar el DNS; AWS cobra por las IPv4 públicas. No cambies la IP de una máquina que sirve otros sistemas sin revisar sus dependencias.

## 2. Revisar la máquina y permitir el acceso web

En **AWS → EC2 → Instancias**, selecciona tu máquina. Comprueba que esté **En ejecución**, que tenga IPv4 pública y que pasen las comprobaciones de estado.

En **Seguridad → Grupo de seguridad → Editar reglas de entrada**, añade las reglas que falten:

| Tipo | Puerto | Origen |
| --- | --- | --- |
| HTTP | 80 TCP | 0.0.0.0/0 |
| HTTPS | 443 TCP | 0.0.0.0/0 |
| SSH | 22 TCP | Mi IP |

El acceso SSH descrito aquí es desde tu equipo con tu archivo `.pem`. No abras 3000 ni 3306 a Internet. Las reglas afectan a todas las instancias que compartan ese grupo: usa el grupo destinado a esta máquina. Si hay un firewall de Ubuntu activo, también debe permitir 80/443 y tu acceso SSH. La instancia necesita salida a Internet para instalar paquetes y obtener certificados.

## 3. Subir el paquete y entrar en Ubuntu

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

## 4. Configurar la dirección y las claves

Con tu subdominio de Hostinger:

```bash
bash scripts/configure-aws.sh driver.tudominio.com
```

O, si todavía no usas dominio propio:

```bash
bash scripts/configure-aws.sh driver-connect.TU_IP.sslip.io
```

Ejecuta **una sola** de las dos opciones, sustituyendo los ejemplos. El script genera tres claves distintas y las guarda en `.env.production`, con permisos restringidos. Si el archivo ya existe, lo conserva y se detiene: no borres ese archivo para repetir el proceso. Si la base ya tiene datos, hay que utilizar sus credenciales existentes.

## 5. Iniciar la aplicación

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml up -d --build --wait --wait-timeout 300
```

La primera ejecución puede tardar varios minutos. Compila la aplicación, inicia MySQL, aplica las migraciones y arranca Caddy para obtener y renovar HTTPS. El DNS debe apuntar a esta IP y los puertos 80/443 deben ser accesibles. El comando espera que la aplicación esté sana; la emisión del certificado puede finalizar después.

Comprueba el estado:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml ps
```

Abre `https://driver.tudominio.com` o la dirección temporal elegida. Si todavía no abre, consulta:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml logs --tail=60 caddy app migrate
```

Si aparece un error de DNS, revisa el registro A y espera su propagación. Un error de conexión o de validación del certificado suele requerir revisar IP, puertos y firewall. No ignores advertencias del navegador sobre certificados. Si falla la compilación por falta de memoria, la máquina necesita más recursos o una imagen compilada fuera de ella; no continúes con un despliegue incompleto.

## 6. Crear tu administrador

Desde la misma carpeta:

```bash
sudo docker compose --env-file .env.production -f compose.yaml -f compose.aws.yaml --profile tools run --rm admin-create
```

Escribe el usuario, tu nombre y una contraseña de al menos 12 caracteres cuando el programa los solicite. No existe una contraseña predeterminada. Entra en `https://driver.tudominio.com/login-admin`, usando tu dirección elegida.

En **Conductores → Nuevo conductor**, crea el perfil; desde su ficha configura **Gestionar acceso del conductor**. Publica el perfil cuando esté listo. La portada sigue mostrando el perfil ficticio de muestra; cada conductor real usa su propia dirección `/conductor/SU_IDENTIFICADOR`.

## 7. Comprobar reservas y calendarios

1. Abre el perfil real desde el teléfono y solicita un viaje.
2. Entra como conductor, cambia la contraseña temporal y confirma el viaje.
3. Abre el enlace privado del pasajero y guarda o suscribe el viaje.
4. En iPhone confirma la suscripción de Calendario. Desde el panel, el conductor puede habilitar la suscripción de su agenda.
5. En Android utiliza Google Calendar y pulsa Guardar para cada viaje. Esa copia no recibe cambios automáticos; la suscripción de iPhone se actualiza cuando Calendario sincroniza.

Antes de usar datos reales, configura respaldos externos de MySQL y comprueba su restauración. El volumen Docker conserva los datos entre reinicios, pero no es un respaldo. No ejecutes `docker compose down -v`: borra volúmenes. Conserva también `.env.production` de forma segura fuera del repositorio.

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
- [sslip.io: DNS y certificados](https://sslip.io/).
- [Caddy: HTTPS automático](https://caddyserver.com/docs/automatic-https).
