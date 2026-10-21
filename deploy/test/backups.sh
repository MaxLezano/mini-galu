#!/usr/bin/env bash
# Prueba de punta a punta de los backups (local y CI), con rclone como bucket y Mailpit para los avisos:
#  1. primera copia al arrancar + cambios archivados   2. prueba de restauración (con su mail)
#  3. volver a un momento exacto (PITR)                 4. el bucket se cae → aviso → vuelve → "Resuelto"
#   bash deploy/test/backups.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash en Windows: que no convierta /state/… en rutas de Windows
cd "$(dirname "$0")/.."

dc() { docker compose -p mg-backups-prueba --env-file test/test.env -f docker-compose.yml -f test/compose.test.yml "$@"; }
psql_() { dc exec -T postgres psql -XAtq -U minigalu -d minigalu -v ON_ERROR_STOP=1 -c "$1"; }
step() { echo; echo "▶ $*"; }
fail() { echo "✘ $*"; dc logs --tail 80 backup postgres; exit 1; }
# (sin tildes en la búsqueda: en Git Bash la consulta no viaja en UTF-8)
mails() { curl -fsS -G "http://localhost:18025/api/v1/search" --data-urlencode "query=$1" | grep -o '"messages_count":[0-9]*' | cut -d: -f2; }
wait_for() { # wait_for <segundos> <descripción> <comando…>
  local secs=$1 what=$2
  shift 2
  for _ in $(seq 1 "$secs"); do "$@" >/dev/null 2>&1 && return 0; sleep 1; done
  fail "no pasó: $what"
}
# condiciones que wait_for reintenta (con "$(…)" directo se evaluarían una sola vez)
archived() { [[ $(psql_ "select archived_count > $1 from pg_stat_archiver") == t ]]; }
is_true() { [[ $(psql_ "$1" 2>/dev/null) == t ]]; }
has_mail() { (($(mails "$1") >= 1)); }

trap 'dc --profile restore down -v --remove-orphans >/dev/null 2>&1 || true' EXIT
dc --profile restore down -v --remove-orphans >/dev/null 2>&1 || true

step "construir y levantar base + backups"
dc build -q postgres
dc up -d postgres backup mailpit
wait_for 120 "primera copia completa al arrancar" dc exec -T backup test -f /state/ok-base-backup
wait_for 60 "primera copia lógica al arrancar" dc exec -T backup test -f /state/ok-dump

step "datos de prueba y cambios archivados"
psql_ "create table orders (id serial primary key, created_at timestamptz not null default now());
       create table \"user\" (id serial primary key, created_at timestamptz not null default now());
       create table products (id serial primary key, created_at timestamptz not null default now());
       insert into orders (created_at) select now() - interval '1 hour' from generate_series(1, 5);
       insert into \"user\" (created_at) values (now() - interval '1 hour');
       insert into products (created_at) values (now() - interval '1 hour');"
before=$(psql_ "select archived_count from pg_stat_archiver")
psql_ "select pg_switch_wal()" >/dev/null
wait_for 60 "Postgres sube el WAL al bucket" archived "$before"

step "prueba de restauración (mg-restore-check)"
dc exec -T backup gosu postgres mg-restore-check || fail "mg-restore-check"
wait_for 20 "mail de prueba OK" has_mail 'subject:Prueba subject:OK'

step "volver a un momento exacto (PITR)"
psql_ "insert into orders (id) values (1001)"
sleep 2
moment=$(psql_ "select to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD HH24:MI:SS')")
sleep 2
psql_ "insert into orders (id) values (1002)"
before=$(psql_ "select archived_count from pg_stat_archiver")
psql_ "select pg_switch_wal()" >/dev/null
wait_for 60 "WAL con los pedidos 1001 y 1002 en el bucket" archived "$before"
dc stop backup postgres
dc --profile restore run --rm restore "$moment" || fail "mg-restore"
dc up -d postgres
wait_for 120 "la base restaurada termina de recuperar" is_true "select not pg_is_in_recovery()"
[[ $(psql_ "select count(*) from orders where id = 1001") == 1 ]] || fail "falta el pedido de antes del momento"
[[ $(psql_ "select count(*) from orders where id = 1002") == 0 ]] || fail "quedó el pedido de después del momento"
echo "  1001 está, 1002 no: volvió a las $moment"

step "el bucket se cae: aviso y después 'Resuelto'"
dc up -d backup
wait_for 60 "backup arranca de nuevo" dc exec -T backup bash -c 'grep -qa supercronic /proc/[0-9]*/cmdline'
dc stop minio
psql_ "insert into orders default values; select pg_switch_wal();" >/dev/null
wait_for 60 "Postgres registra la falla al archivar" is_true "select failed_count > 0 from pg_stat_archiver"
dc exec -T backup gosu postgres mg-health || true
wait_for 20 "mail de aviso" has_mail 'subject:"puede guardar los cambios"'
dc start minio
wait_for 90 "Postgres vuelve a archivar" is_true "select last_archived_time > last_failed_time from pg_stat_archiver"
dc exec -T backup gosu postgres mg-health || true
wait_for 20 "mail de resuelto" has_mail 'subject:Resuelto subject:archivo'

echo
echo "✔ backups: copia, restauración, PITR y avisos andan"
