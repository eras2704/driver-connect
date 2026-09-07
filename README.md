# Driver Connect

Plataforma de perfiles profesionales de conductores, accesibles mediante URL y tarjetas NFC.

Repositorio privado: [eras2704/driver-connect](https://github.com/eras2704/driver-connect).

## Estado

Implementado con Next.js 16, React, TypeScript, Tailwind CSS, Prisma 7 y MySQL 8.4:

- Acceso administrativo con contraseña y sesiones revocables de ocho horas.
- Resumen, búsqueda y listado de conductores con paginación.
- Creación y edición de perfiles, canales de contacto, servicios y vehículo principal.
- Publicación y retiro de perfiles; la dirección permanece fija para conservar los enlaces NFC.
- Perfiles públicos conectados a MySQL, descarga vCard, WhatsApp, teléfono, correo y compartir, según los datos configurados.
- Docker Compose y pruebas automatizadas contra el contenedor de producción y una base MySQL desechable.

El perfil de Daniel Ríos en `/` y `/conductor/demo` es ficticio e independiente de la base. Sus canales reales siguen deshabilitados. El PDF en [docs](docs/Documentacion_Provisional_Driver_Connect_v0.1.pdf) es referencia funcional de un prototipo anterior, no una descripción de funciones ya implementadas aquí.

Pendientes: acceso y panel del conductor, carga de archivos (actualmente se aceptan enlaces HTTPS), gestión del catálogo de servicios desde el panel, despliegue en AWS y programación física de tarjetas NFC.

## Arranque con Docker

Requisitos: Docker Engine con Docker Compose v2.

1. Copiar `.env.example` a `.env`.
2. Generar tres valores distintos con `openssl rand -hex 32` y configurar `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` y `SESSION_SECRET` en `.env`.
3. Mantener `APP_ORIGIN=http://127.0.0.1:3000` para acceso local.
4. Ejecutar:

```bash
docker compose up -d --build
docker compose --profile tools run --rm admin-create
```

El segundo comando solicita usuario, nombre y contraseña oculta, con confirmación. No existe una contraseña predeterminada. La creación añade tres servicios iniciales: aeropuerto, traslados ejecutivos y recorridos por la ciudad.

Abrir [el acceso administrativo](http://127.0.0.1:3000/login-admin) usando exactamente el origen configurado. En **Conductores → Nuevo conductor**, guardar primero como borrador; activar **Publicar perfil** cuando los datos estén listos. Los canales indicados como públicos se mostrarán a cualquiera con el enlace.

Compose inicia MySQL, aplica las migraciones y luego inicia la aplicación. La base queda almacenada en el volumen `mysql_data`. `docker compose down` conserva ese volumen; la opción `-v` lo elimina y borra sus datos.

MySQL no publica puertos en el host. La aplicación escucha en `127.0.0.1:3000`; para una máquina remota usa un túnel SSH o el proxy HTTPS descrito en [la guía de AWS](docs/docker-aws.md).

## Administradores

Para crear otro administrador, repetir el comando `admin-create`. No sobrescribe cuentas existentes y no hay registro público de administradores.

Para restablecer una contraseña, ejecutar:

```bash
docker compose --profile tools run --rm admin-create pnpm admin:create --reset-password
```

Solicita el usuario y la nueva contraseña. Cierra todas las sesiones anteriores de esa cuenta. No reactiva cuentas deshabilitadas. Detalles en [administración](docs/administracion.md).

## Desarrollo sin contenedor

Requisitos: Node.js 24, pnpm 11.19.0 y MySQL para las funciones administrativas.

```bash
pnpm install --frozen-lockfile
pnpm db:generate
```

Copiar `.env.example` a `.env`, configurar `DATABASE_URL` con una base MySQL de desarrollo y definir `SESSION_SECRET` y `APP_ORIGIN`.

```bash
pnpm db:deploy
pnpm admin:create
pnpm dev --hostname 127.0.0.1
```

El perfil de demostración funciona sin MySQL. Para crear una nueva migración durante desarrollo, usar `pnpm db:migrate`; no editar migraciones que ya se aplicaron.

## Validación

```bash
pnpm lint
pnpm typecheck
pnpm db:validate
pnpm test
pnpm build
```

GitHub Actions construye las imágenes y ejecuta esas comprobaciones. Después inicia MySQL, aplica las migraciones, crea un administrador temporal y comprueba autenticación, origen de solicitudes, revocación de sesiones, formularios, publicación, vCard y exclusión de datos privados. Las pruebas de integración exigen una base desechable y una cuenta `ci-`; no se ejecutan contra datos reales. Al terminar CI elimina sus contenedores y volumen.

## Estructura

- `src/app/`: páginas y API de Next.js.
- `src/components/`: perfiles y formularios administrativos.
- `src/lib/`: autenticación, autorización, validación y acceso a MySQL.
- `scripts/create-admin.ts`: creación y recuperación de acceso por consola.
- `tests/`: pruebas unitarias y de integración.
- `prisma/`: esquema y migraciones versionadas.
- `Dockerfile` y `compose.yaml`: aplicación, migraciones, herramientas y MySQL.
- `docs/`: referencia funcional, arquitectura y despliegue.

## Versionamiento

`main` contiene la base compartida. Para un cambio nuevo:

```bash
git switch -c codex/nombre-del-cambio
git add ruta/del/archivo
git commit -m "feat: descripción del cambio"
git push -u origin codex/nombre-del-cambio
```

Abrir un pull request a `main` después de validar el cambio. No subir `.env`, claves, respaldos ni fotografías o datos reales de conductores. Revisar siempre el contenido del commit; `.gitignore` excluye las rutas habituales, pero no identifica datos sensibles en archivos arbitrarios.
