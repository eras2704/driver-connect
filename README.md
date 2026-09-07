# Driver Connect

Base inicial de una plataforma de perfiles profesionales de conductores, accesibles mediante URL y tarjetas NFC.

Repositorio privado: [eras2704/driver-connect](https://github.com/eras2704/driver-connect).

## Estado

Proyecto iniciado desde cero. Incluye Next.js 16, React, TypeScript, Tailwind CSS, esquema inicial de Prisma 7 para MySQL, Docker Compose y una página de preparación. Todavía no implementa perfiles, sesiones, paneles, formularios, carga de imágenes ni programación NFC. La aplicación inicial no realiza consultas a MySQL.

El PDF en [docs](docs/Documentacion_Provisional_Driver_Connect_v0.1.pdf) es una referencia funcional de un prototipo anterior; sus componentes marcados como funcionales no representan el estado de este código.

## Arranque con Docker

Requisitos: Docker Engine con Docker Compose v2.

1. Copiar `.env.example` a `.env`.
2. Generar tres valores distintos con `openssl rand -hex 32` y configurar `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` y `SESSION_SECRET` en `.env`.
3. Ejecutar `docker compose up -d --build`.
4. Consultar `docker compose ps` y abrir `http://localhost:3000`.

Compose inicia MySQL, aplica las migraciones y luego inicia la aplicación. La base queda almacenada en el volumen `mysql_data`. `docker compose down` conserva ese volumen; la opción `-v` lo elimina y borra sus datos.

MySQL no publica puertos en el host. La aplicación escucha en `127.0.0.1:3000`; para una máquina remota usa un túnel SSH o el proxy HTTPS descrito en [la guía de AWS](docs/docker-aws.md).

## Desarrollo sin contenedor

Requisitos: Node.js 24 y pnpm 11.19.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

La página inicial funciona sin MySQL. Para trabajar con migraciones, copia `.env.example` a `.env`, configura `DATABASE_URL` con una base MySQL de desarrollo y ejecuta `pnpm db:migrate`.

```bash
pnpm lint
pnpm typecheck
pnpm db:validate
pnpm build
```

## Estructura

- `src/app/`: aplicación Next.js y estilos.
- `prisma/`: modelo de datos y migraciones versionadas.
- `prisma.config.ts`: configuración de las herramientas de Prisma.
- `Dockerfile` y `compose.yaml`: aplicación, migraciones y MySQL.
- `docs/`: referencia funcional y guía de despliegue.

## Versionamiento

`main` contiene la base compartida. Para un cambio nuevo:

```bash
git switch -c codex/nombre-del-cambio
git add ruta/del/archivo
git commit -m "feat: descripción del cambio"
git push -u origin codex/nombre-del-cambio
```

Abre un pull request a `main` después de validar el cambio. No subas `.env`, claves, respaldos de MySQL ni fotografías o datos reales de conductores; están excluidos donde corresponde por `.gitignore`.

## Próxima etapa

Implementar acceso administrativo y sesiones firmadas, después gestión de conductores y perfiles públicos. El cliente de base de datos en ejecución requerirá configurar el adaptador MySQL de Prisma. Ver [arquitectura prevista](docs/arquitectura.md).
