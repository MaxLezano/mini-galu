#!/usr/bin/env bash
# Vuelve la base a como estaba, desde el bucket de backups:
#   bash deploy/restore.sh                      → hasta el último cambio guardado (servidor nuevo o disco perdido)
#   bash deploy/restore.sh "2026-10-21 15:00"   → como estaba a esa hora, hora de Argentina (ej. después de borrar algo)
# En un servidor NUEVO se corre ANTES del primer `docker compose up` (si no, arranca una base vacía).
# La base de antes no se borra: queda en DATA_DIR/postgres/antes-de-restaurar-<fecha>.
set -euo pipefail
cd "$(dirname "$0")"
target=${1:-}

echo "Esto apaga la tienda unos minutos y reemplaza la base por la del bucket${target:+, como estaba el $target}."
read -rp "¿Seguir? Escribí si: " ok
[[ $ok == si ]] || exit 1

docker compose build -q postgres
docker compose stop web api backup postgres 2>/dev/null || true
docker compose --profile restore run --rm restore ${target:+"$target"}

echo "▶ prendiendo la base: aplica los cambios guardados"
docker compose up -d postgres
until docker compose exec -T postgres sh -c 'psql -XAtq -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select not pg_is_in_recovery()"' 2>/dev/null | grep -q t; do
  sleep 3
done
docker compose exec -T postgres sh -c 'psql -XAtq -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) || '"' pedidos, el último del '"' || coalesce(max(created_at)::text, '"'-'"') from orders"'

echo "▶ levantando todo"
docker compose up -d --wait
echo "▶ copia completa nueva (la restauración empieza una línea de tiempo nueva)"
docker compose exec -T -u postgres backup mg-base-backup
echo "✔ listo"
