#!/usr/bin/env bash
# Prepara un servidor Lightsail nuevo (Ubuntu 24.04), una sola vez, con el disco aparte ya adjuntado:
#   lsblk                                          → ver cómo se llama el disco aparte (ej. /dev/nvme1n1)
#   sudo bash deploy/bootstrap.sh /dev/nvme1n1
# Deja: actualizaciones de seguridad automáticas, Docker, 2 GB de swap, hora de Argentina y el disco montado en
# DATA_DIR (/mnt/data) con las carpetas de la base, los certificados y los backups. Se puede volver a correr.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Correlo con sudo." >&2; exit 1; }
disk=${1:-}
DATA_DIR=${DATA_DIR:-/mnt/data}

if [[ -z $disk || ! -b $disk ]]; then
  echo "Falta el disco aparte. Estos son los discos del servidor (el del sistema es el que tiene /):" >&2
  lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS >&2
  echo "Uso: sudo bash deploy/bootstrap.sh /dev/<disco>" >&2
  exit 1
fi
root_disk=$(lsblk -no PKNAME "$(findmnt -no SOURCE /)")
[[ $(basename "$disk") != "$root_disk" ]] || { echo "$disk es el disco del sistema: elegí el aparte." >&2; exit 1; }

echo "▶ actualizaciones de seguridad automáticas"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q && apt-get upgrade -yq
apt-get install -yq unattended-upgrades git
dpkg-reconfigure -f noninteractive unattended-upgrades
timedatectl set-timezone America/Argentina/Buenos_Aires

echo "▶ Docker"
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
usermod -aG docker "${SUDO_USER:-ubuntu}"

echo "▶ swap de 2 GB (para construir la tienda con 2 GB de RAM)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

echo "▶ disco aparte $disk → $DATA_DIR"
if ! blkid "$disk" >/dev/null 2>&1; then
  echo "  está vacío: se formatea (ext4)"
  mkfs.ext4 -q -L minigalu-datos "$disk"
else
  echo "  ya tiene datos: se usa como está (no se formatea)"
fi
uuid=$(blkid -s UUID -o value "$disk")
mkdir -p "$DATA_DIR"
grep -q "$uuid" /etc/fstab || echo "UUID=$uuid $DATA_DIR ext4 defaults,nofail 0 2" >>/etc/fstab
mountpoint -q "$DATA_DIR" || mount "$DATA_DIR"
mkdir -p "$DATA_DIR"/{postgres,caddy,backup-state,restore-check}
# 999 = usuario postgres de la imagen
chown 999:999 "$DATA_DIR/postgres"

echo
echo "✔ servidor listo. Siguiente: cerrar sesión y volver a entrar (para usar docker sin sudo) y seguir docs/DEPLOY.md"
