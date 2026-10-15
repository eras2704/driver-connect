# Autenticación RSA con MySQL

Si el conector devuelve `ER_CANNOT_RETRIEVE_RSA_KEY`, el servidor requiere autenticación completa y el cliente no tiene su clave pública. En la red privada de Docker, se puede habilitar explícitamente `allowPublicKeyRetrieval=true` en los parámetros de `DATABASE_URL`. La aplicación y el worker usan la misma configuración de conexión.

La opción permanece deshabilitada por defecto. También se puede habilitar con `MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL=true`, usando el overlay `compose.mysql-rsa.yaml` como cuarto archivo después de los overlays de proxy y calendario. Este overlay no cambia DATABASE_URL, redes, contraseñas ni puertos. Para bases en redes no confiables usar TLS verificado o una clave pública fijada. No es necesario cambiar la contraseña, el plugin de autenticación o los permisos del usuario MySQL.

Respaldar primero la configuración privada. Agregar el parámetro conservando los existentes y sin imprimir la URL. Si Compose define DATABASE_URL directamente, aplicar el parámetro en esa definición; modificar solo `.env.production` no cambia una definición literal de Compose. Compilar las imágenes con el código actualizado y recrear app y calendar-worker. Verificar `/api/health`, estado de los contenedores y sincronización. No reiniciar la base compartida.
