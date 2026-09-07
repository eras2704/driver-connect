# Arquitectura prevista

La implementación empieza desde cero. Esta base no contiene usuarios ni credenciales iniciales, y no habilita acceso a datos personales.

## Componentes

- Aplicación Next.js 16 con App Router, TypeScript y Tailwind CSS.
- Prisma ORM 7 con MySQL 8.4. El esquema inicial contiene `Driver`, `Vehicle`, `Service`, `AdminUser` y `DriverUser`.
- Docker Compose administra la aplicación, una tarea de migración y MySQL con volumen persistente.
- Destino previsto: una máquina virtual en AWS, pendiente de seleccionar y configurar.

## Rutas previstas, todavía no implementadas

| Área | Ruta | Acceso previsto |
| --- | --- | --- |
| Perfil del conductor | `/conductor/[slug]` | Público, sólo campos autorizados |
| Acceso administrativo | `/login-admin` | Formulario de autenticación |
| Administración | `/admin` | Sesión administrativa validada |
| Acceso del conductor | `/login-conductor` | Formulario de autenticación |
| Panel del conductor | `/panel` | Sesión validada, sólo datos propios |

La tarjeta NFC guardará únicamente una URL pública estable. No guardará credenciales ni datos personales adicionales.

## Decisiones para la implementación funcional

Definir los campos editables por el conductor, el proceso de aprobación de imágenes y cambios, y las reglas para publicación de datos de contacto. Implementar contraseñas con hash, sesiones firmadas, caducidad, revocación, protección de formularios y autorización en el servidor antes de habilitar áreas privadas.

Los campos de estado y verificación de conductores, vehículos y cuentas comienzan desactivados. Los identificadores internos, contraseñas y registros privados no deben serializarse hacia perfiles públicos.

El modelo permite varios vehículos por conductor y una cuenta privada por conductor. Validar estas decisiones antes de incorporar datos reales. Las migraciones posteriores deben conservar el historial; no se debe editar una migración ya aplicada.
