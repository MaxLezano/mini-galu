#!/usr/bin/env bash
# Prueba del stack de producción completo (local y CI): build de las imágenes, Caddy con HTTPS → tienda y API,
# migraciones, cuenta del taller y la tienda que le pide datos a la API por adentro de la red.
#   bash deploy/test/stack.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."

dc() { docker compose -p mg-stack-prueba --env-file test/stack.env -f docker-compose.yml -f test/compose.test.yml -f test/compose.stack.yml "$@"; }
# get <host> <ruta> [opciones de curl]
get() { curl -ksS --max-time 20 --resolve "$1:18443:127.0.0.1" "${@:3}" "https://$1:18443$2"; }
fail() { echo "✘ $*"; dc ps; dc logs --tail 60 caddy web api; exit 1; }
wait_for() {
  local secs=$1 what=$2
  shift 2
  for _ in $(seq 1 "$secs"); do "$@" >/dev/null 2>&1 && return 0; sleep 1; done
  fail "no pasó: $what"
}

trap 'dc --profile off down -v --remove-orphans >/dev/null 2>&1 || true' EXIT
dc --profile off down -v --remove-orphans >/dev/null 2>&1 || true

echo "▶ build y arranque (caddy, tienda, API, base, backups)"
dc --profile off build -q web api postgres
dc --profile off up -d caddy web api postgres backup mailpit minio
wait_for 240 "la tienda y la API sanas" dc --profile off up -d --wait --no-recreate web api

echo "▶ HTTPS por Caddy"
get api.tienda.localhost /health | grep -q '"ok":true' || fail "/health de la API"
home=$(get tienda.localhost /) || fail "la home no responde"
grep -q "Mini Galú" <<<"$home" || fail "la home no trae la tienda"
# el código HTTP va al final de la respuesta (sin -o /dev/null, que el curl de Windows no entiende)
catalog=$(get tienda.localhost /catalogo -w '%{http_code}') || fail "el catálogo no responde"
[[ ${catalog: -3} == 200 ]] || fail "el catálogo (la tienda le pide los productos a la API): HTTP ${catalog: -3}"
get www.tienda.localhost / -w '\n%{http_code} %{redirect_url}' | tail -n 1 | grep -q "^301 https://tienda.localhost" ||
  fail "www no redirige"

echo "▶ cuenta del taller (node dist/admin.js)"
dc --profile off exec -T api node dist/admin.js >/dev/null || fail "crear la cuenta del taller"

echo "▶ backups andando junto al resto"
wait_for 120 "primera copia completa" dc --profile off exec -T backup test -f /state/ok-base-backup

echo
echo "✔ stack: HTTPS, tienda, API, base y backups andan juntos"
