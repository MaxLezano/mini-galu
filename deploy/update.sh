#!/usr/bin/env bash
# Actualiza el servidor a lo último de main: copia de la base, build y reemplazo de los contenedores (la API aplica
# las migraciones al arrancar). Corta unos segundos.
#   bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ código de main"
git -C .. fetch -q origin main
git -C .. checkout -q main
git -C .. pull -q --ff-only origin main
git -C .. log --oneline -1

if [[ -n $(docker compose ps -q --status running backup) ]]; then
  echo "▶ copia de la base antes de actualizar (por si una migración sale mal)"
  docker compose exec -T -u postgres backup mg-dump antes-de-actualizar
fi

echo "▶ build"
docker compose build --pull
echo "▶ reemplazo de los contenedores"
docker compose up -d --remove-orphans --wait
docker image prune -f >/dev/null
docker compose ps
