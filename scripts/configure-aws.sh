#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")/.."

if [[ $# != 1 ]]; then
  echo 'Uso: bash scripts/configure-aws.sh driver-connect.TU-IP.sslip.io' >&2
  exit 1
fi

site_host=${1,,}
if [[ ${#site_host} -gt 253 || ! "$site_host" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]]; then
  echo 'Indica solo el nombre del sitio: sin https://, puerto, espacios ni rutas.' >&2
  exit 1
fi
if [[ -e .env.production || -L .env.production ]]; then
  echo 'Ya existe .env.production. Se conserva para no cambiar las claves de la base ni de las sesiones.' >&2
  exit 1
fi

mysql_password=$(openssl rand -hex 32)
mysql_root_password=$(openssl rand -hex 32)
session_secret=$(openssl rand -hex 32)
umask 077
set -o noclobber
{
  printf 'APP_ORIGIN=https://%s\n' "$site_host"
  printf 'MYSQL_PASSWORD=%s\n' "$mysql_password"
  printf 'MYSQL_ROOT_PASSWORD=%s\n' "$mysql_root_password"
  printf 'SESSION_SECRET=%s\n' "$session_secret"
} > .env.production
printf 'Configuración creada para https://%s. Las claves quedan guardadas solo en .env.production.\n' "$site_host"
