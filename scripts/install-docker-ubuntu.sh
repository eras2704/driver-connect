#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID != 0 ]]; then
  echo 'Ejecuta: sudo bash scripts/install-docker-ubuntu.sh' >&2
  exit 1
fi
source /etc/os-release
if [[ "$ID" != ubuntu || ! "$VERSION_ID" =~ ^(22\.04|24\.04|26\.04)$ ]]; then
  echo 'Este instalador requiere Ubuntu 22.04, 24.04 o 26.04.' >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl openssl
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  echo 'Docker y Compose ya están instalados; se conserva la instalación.'
  exit 0
fi
if command -v docker >/dev/null; then
  echo 'Existe Docker sin el plugin Compose. Revisa esa instalación antes de sustituir paquetes.' >&2
  exit 1
fi

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker compose version
