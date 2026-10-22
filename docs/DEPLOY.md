# Deploy

Producción: **un servidor de AWS Lightsail** con Docker, más dos buckets (fotos y backups) y SES para los mails. Todo en
AWS, ~US$16 por mes ([COSTOS.md](COSTOS.md)). Por qué así: [ADR 0004](adr/0004-produccion-en-un-servidor-lightsail.md).
Se deploya desde `main` (ver "Git" en `CLAUDE.md`).

```
minigalu.com.ar, api.minigalu.com.ar ──► Lightsail (Ubuntu 24.04, 2 GB) · deploy/docker-compose.yml
                                           Caddy (HTTPS) ─► tienda (Next) · API (Hono)
                                           Postgres 17 ─── disco aparte /mnt/data
                                           backup: copias, prueba de restauración, avisos
fotos  ──► bucket público de Lightsail      (las sube la API)
copias ──► bucket privado de Lightsail      (WAL-G: cada cambio al minuto + copias diarias)
mails  ──► Amazon SES                       (pedidos, cartas y avisos)
```

Lo que no se puede perder (pedidos, clientes, catálogo, ajustes) está en tres lugares: la base en el disco aparte,
el bucket de backups (como mucho 1 minuto de atraso) y los snapshots diarios de Lightsail. Detalle en
[Backups y avisos](#backups-y-avisos).

## 1. Cuenta de AWS

1. aws.amazon.com → crear la cuenta (tarjeta en dólares) y activar la verificación en dos pasos del usuario raíz.
2. **Billing → Budgets → Create budget**: presupuesto mensual de **US$20** con aviso por mail al 80% y al 100%.
3. Todo lo que sigue va en la región **São Paulo (sa-east-1)**.

## 2. Servidor

En lightsail.aws.amazon.com:

1. **Create instance** → São Paulo → Linux → **Ubuntu 24.04 LTS** → plan **US$12** (2 GB, 2 vCPU, 60 GB) → nombre
   `mini-galu`.
2. **Networking → Attach static IP** (gratis mientras esté conectada).
3. **Networking → IPv4 Firewall**: dejar SSH (22) y HTTP (80) y agregar **HTTPS (443)**.
4. **Snapshots → Automatic snapshots: On** (hora: 6:00; guarda los últimos 7).
5. **Storage → Create disk**: misma zona que el servidor, **8 GB**, nombre `mini-galu-datos` → **Attach** al
   servidor. Ahí vive la base: si el servidor se rompe, el disco se conecta a uno nuevo.
6. En el disco: **Automatic snapshots: On** también.
7. **Metrics → Alarms** del servidor: agregar "Status check failures ≥ 1 durante 5 minutos" y "CPU ≥ 90% durante
   30 minutos", con aviso por mail (la primera vez pide confirmar el mail de contacto). Esto avisa si el servidor
   entero se cae (los avisos de adentro no pueden).

## 3. Buckets

**Storage → Create bucket** (São Paulo, plan de 5 GB), dos veces:

| Bucket | Acceso | Para |
|---|---|---|
| `mini-galu-fotos` | **Permissions → All objects are public and read-only** | `S3_BUCKET`, fotos de la tienda |
| `mini-galu-backups` | **Private** (como viene) | `BACKUP_BUCKET`, copias de la base |

En cada uno: **Permissions → Access keys → Create access key** (la clave secreta se ve una sola vez). Las del de
fotos van a `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`; las del de backups, a `BACKUP_ACCESS_KEY_ID`/
`BACKUP_SECRET_ACCESS_KEY`. Cada clave solo sirve para su bucket.

`MEDIA_PUBLIC_URL` es la "Bucket URL" que muestra el bucket de fotos (`https://mini-galu-fotos.s3.sa-east-1.amazonaws.com`).

## 4. Dominio

1. Lightsail → **Domains & DNS → Create DNS zone** → `minigalu.com.ar`.
2. En NIC Argentina (nic.ar), delegar el dominio a los 4 servidores de nombres que muestra la zona.
3. En la zona, registros **A** al IP fijo: `@`, `www` y `api`.

Hasta que la delegación propague (minutos a horas), Caddy no puede sacar los certificados: `docker compose logs caddy`
lo muestra y reintenta solo.

## 5. Mails (Amazon SES)

1. SES (São Paulo) → **Identities → Create identity → Domain** → `minigalu.com.ar` con DKIM. Copiar los 3 registros
   CNAME a la zona DNS de Lightsail y esperar "Verified".
2. **Account dashboard → Request production access** (sin esto, SES solo manda a mails verificados a mano). Contar
   que son mails de pedidos de una tienda y cartas a suscriptos que se pueden dar de baja. Tarda ~1 día.
3. **SMTP settings → Create SMTP credentials** → `SMTP_USER` y `SMTP_PASS`. `SMTP_HOST` es el que muestra esa
   pantalla (`email-smtp.sa-east-1.amazonaws.com`).

## 6. Instalar

Por SSH (Lightsail → Connect, o `ssh ubuntu@<ip>` con la clave que da Lightsail):

```bash
# clave para que el servidor baje el repo (privado), solo lectura
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 && cat ~/.ssh/id_ed25519.pub
# → GitHub: el repo → Settings → Deploy keys → Add (sin permiso de escritura)
git clone git@github.com:MaxLezano/mini-galu.git && cd mini-galu

lsblk                                          # el disco de 8 GB (ej. nvme1n1)
sudo bash deploy/bootstrap.sh /dev/nvme1n1     # Docker, swap, hora de Argentina, disco en /mnt/data
exit                                           # volver a entrar para usar docker sin sudo
```

```bash
cd mini-galu/deploy
cp .env.example .env && nano .env              # completar (ver la tabla de abajo)
docker compose up -d --build                   # la primera vez tarda ~10 min (construye tienda y API)
docker compose ps                              # todo "healthy"
docker compose logs backup                     # "copia completa: lista" (la primera copia de la base)
```

| Variable | De dónde sale |
|---|---|
| `WEB_HOST`, `API_HOST`, `COOKIE_DOMAIN` | el dominio (`minigalu.com.ar`, `api.minigalu.com.ar`, `minigalu.com.ar`) |
| `ACME_EMAIL`, `ALERT_EMAIL` | el mail donde llegan los avisos (puede ser el mismo; varios separados por coma) |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BACKUP_*`, `S3_*`, `MEDIA_PUBLIC_URL` | los buckets (paso 3) |
| `SMTP_*` | SES (paso 5) |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` | Mercado Pago → Tus integraciones → credenciales **de producción** |
| `MP_WEBHOOK_SECRET` | Mercado Pago → Webhooks (paso 8) |
| `ARCA_*` | factura electrónica (paso 9) |
| `ANDREANI_*`, `GOOGLE_*`, `ANTHROPIC_API_KEY` | opcionales (ver `.env.example`) |

Si falta o está mal alguna variable, la API no arranca y `docker compose logs api` dice **todas** las que faltan.

**Fotos que ya existen** (las de `local-assets` o subidas en local): desde la compu, con `S3_*` y `MEDIA_PUBLIC_URL`
del bucket de fotos en el `.env` local, `pnpm --filter @mini-galu/api media:upload`.

## 7. Cuenta del taller

```bash
docker compose exec -e ADMIN_EMAIL=gaby@minigalu.com.ar -e ADMIN_PASSWORD='…' -e ADMIN_NAME='Gaby' api node dist/admin.js
```

Crea la cuenta (o le cambia la contraseña) y no toca nada más. **No correr el seed en producción**: borra el
catálogo y siembra datos de demo. Al entrar a `/taller` el panel pide activar la verificación en dos pasos
(obligatoria en producción). Catálogo, portada (Tienda y pagos → Portada) y datos de contacto (Tienda y pagos →
Datos de la tienda) se cargan desde el panel; mientras no haya portada, la tienda muestra una de base sin fotos.

## 8. Mercado Pago

Tus integraciones → la aplicación → **Webhooks** → modo producción:

- URL: `https://api.minigalu.com.ar/payments/webhook`
- Evento: **Pagos**
- La "clave secreta" que muestra → `MP_WEBHOOK_SECRET` en `deploy/.env` y `docker compose up -d` para aplicarla.

## 9. Factura electrónica (ARCA)

Cada pago aprobado emite una factura C (y cada reintegro, su nota de crédito C) por el web service de ARCA. Sin
`ARCA_*` la tienda vende igual, pero los pedidos quedan **sin facturar** y la campana del panel lo avisa; cuando se
carga, los pendientes se emiten solos. Con la clave fiscal de Gaby (nivel 3):

1. En la compu, la clave privada y el pedido de certificado (el CUIT sin guiones):
   ```bash
   openssl genrsa -out arca.key 2048
   openssl req -new -key arca.key -subj "/C=AR/O=Mini Galu/CN=minigalu/serialNumber=CUIT 20123456786" -out arca.csr
   ```
2. ARCA → **Administración de Certificados Digitales** → agregar el alias `minigalu`, subir `arca.csr` y bajar el
   certificado (`arca.crt`).
3. ARCA → **Administrador de Relaciones de Clave Fiscal** → nueva relación → servicio **Facturación Electrónica**
   (WSFE) → representante: el certificado `minigalu`.
4. ARCA → **Administración de puntos de venta y domicilios** → alta de un punto de venta **Factura Electrónica -
   Monotributo - Web Services** (no sirve el de "Comprobantes en línea"). Su número → `ARCA_PUNTO_VENTA`.
5. En `deploy/.env`: `ARCA_CUIT`, `ARCA_PUNTO_VENTA` y el certificado y la clave en una línea:
   `ARCA_CERT=` con lo que da `awk '{printf "%s\n", $0}' arca.crt` (igual `ARCA_KEY` con `arca.key`).
   `docker compose up -d` y `docker compose logs api` dice `[facturas] ARCA produccion, punto de venta N`.
6. Tienda y pagos → **Datos de la tienda** → datos fiscales (nombre, domicilio, Ingresos Brutos e inicio de
   actividades): van impresos en cada factura.

`arca.key` no se sube a ningún lado (ni al repo): guardarla junto a las demás claves. Para probar antes con ARCA de
verdad sin facturar en serio: certificado de homologación (**WSASS**, en ARCA) y `ARCA_ENV=homologacion` en el `.env`
local.

### Feed de Instagram (opcional)

Sin token, la portada muestra el título y "Seguinos" de Instagram, sin fotos. Con él, las últimas 6
publicaciones del taller (cada una abre su posteo); se actualizan cada hora. Hace falta que la cuenta de Instagram
sea **profesional** (empresa o creador).

1. developers.facebook.com → **Crear app** → caso de uso "Administrar mensajes y contenido en Instagram" (sirve
   después para WhatsApp en la misma cuenta de Meta).
2. **Roles de la app** → **Evaluadores de Instagram** → agregar `minigalumodainfantil`; en Instagram (Configuración
   → Apps y sitios web → Invitaciones de evaluador) aceptar.
3. La app → Instagram → **Configuración de la API con el inicio de sesión de Instagram** → **Generar token** junto a
   la cuenta → iniciar sesión → copiar.
4. `INSTAGRAM_ACCESS_TOKEN=` en `deploy/.env` y `docker compose up -d`. `docker compose logs api` dice
   `[instagram] la grilla de la portada muestra el feed`.

El token dura 60 días y la API lo renueva sola cada semana (guarda el renovado en la base). Si pasa más de 60 días
apagada o Gaby cambia la contraseña de Instagram, el token vence: la grilla se oculta y hay que
generar otro (paso 3) y reemplazarlo en el `.env`.

## 10. Probar antes de anunciar

1. `https://api.minigalu.com.ar/health` → `{"ok":true}`.
2. Entrar a `/taller`, activar los dos pasos, cargar un producto con foto (tiene que verse desde el bucket).
3. Comprar algo barato con una tarjeta real y reintegrarlo desde el panel (Pedidos → el pedido → "Reintegrar el pago").
4. Llega el mail "Recibimos tu pago" con la factura adjunta (el QR del PDF abre el comprobante en ARCA); al
   reintegrarlo, la nota de crédito.
5. Crear una cuenta de cliente, cerrar sesión, volver a entrar.
6. Tienda y pagos → Datos de la tienda: WhatsApp, mail e Instagram reales.
7. `docker compose exec -u postgres backup mg-restore-check` → llega el mail "Prueba de restauración OK".

## Día a día

```bash
cd ~/mini-galu/deploy
bash update.sh                     # lo último de main: copia de la base, build y reemplazo (corta unos segundos)
docker compose ps                  # estado de cada servicio
docker compose logs -f --tail 100 api        # (o web, caddy, postgres, backup)
```

El sistema se actualiza solo (parches de seguridad de Ubuntu). Una vez por mes: `sudo apt upgrade` y, si lo pide,
`sudo reboot` (los contenedores vuelven solos).

**Si una actualización sale mal**: `git -C .. checkout <commit-anterior>` y `docker compose up -d --build`. Si una
migración rompió datos, la copia de antes de actualizar está en el bucket (`dumps/antes-de-actualizar/`) y también se
puede volver a la hora previa con `restore.sh` (abajo).

## Backups y avisos

| Qué | Cuándo | Dónde | Cuánto se guarda |
|---|---|---|---|
| Cada cambio de la base (WAL-G) | al minuto | bucket de backups `wal-g/` | 30 días: se vuelve a **cualquier momento** |
| Copia completa (WAL-G) | todos los días 3:30 | bucket `wal-g/basebackups_005/` | 30 |
| Copia lógica (`pg_dump`) | todos los días 4:00 y antes de cada `update.sh` | bucket `wal-g/dumps/` | 30 diarias + 12 mensuales |
| Prueba de restauración | domingos 5:00 | se restaura en una base aparte y se compara | mail "Prueba de restauración OK" |
| Snapshot del servidor y del disco | todos los días 6:00 | Lightsail | 7 |

**Avisos por mail** (`ALERT_EMAIL`, cada 5 minutos, `deploy/postgres/bin/mg-health`): tienda o API sin responder
10 minutos, base caída, la base no puede subir los cambios al bucket, copia completa o lógica de más de 27 horas,
prueba de restauración de más de 8 días, disco al 85%. Repite cada 6 horas mientras siga y manda "Resuelto" cuando
vuelve. Si el servidor entero se cae, avisa la alarma de Lightsail (paso 2.7).

### Restaurar

- **Se borró algo por error** (un producto, un pedido): `bash deploy/restore.sh "2026-10-21 15:00"` con una hora de
  antes del error (hora de Argentina). La tienda corta unos minutos; la base de antes queda en
  `/mnt/data/postgres/antes-de-restaurar-<fecha>`.
- **Se rompió el servidor pero el disco está bien**: servidor nuevo (paso 2), conectarle el disco `mini-galu-datos`,
  `sudo bash deploy/bootstrap.sh /dev/<disco>` (no lo formatea porque ya tiene datos), copiar el `.env` y
  `docker compose up -d --build`. O crear el servidor desde el último snapshot automático.
- **Se perdió todo el servidor y el disco**: servidor y disco nuevos, `bootstrap.sh`, el mismo `.env`, y **antes de
  `docker compose up`**: `bash deploy/restore.sh` (restaura hasta el último cambio guardado). Después,
  `docker compose up -d --build`. Si por error arranca una base vacía, no pisa las copias (WAL-G no sobrescribe) y
  llega el aviso; se corrige con `restore.sh`.
- **Mirar datos viejos en la compu**: bajar un `.dump` del bucket (Lightsail → bucket → Objects) y
  `pg_restore -d <base-local> archivo.dump`.

Para probar todo esto sin AWS (también lo corre la CI): `bash deploy/test/backups.sh` (copias, restauración, volver a
una hora y avisos) y `bash deploy/test/stack.sh` (el stack completo con HTTPS).

## Imágenes

- `apps/web/Dockerfile`: Next en modo standalone (`NEXT_STANDALONE=1`). Las `NEXT_PUBLIC_*` se graban en el build:
  si cambia el dominio o el bucket de fotos, `docker compose up -d --build`.
- `apps/api/Dockerfile`: el bundle de la API más `sharp`. Al arrancar migra (`node dist/migrate.js`) y levanta.
- `deploy/postgres/Dockerfile`: Postgres 17 + WAL-G + supercronic; corre la base y el servicio `backup`.

Las tres se construyen en el servidor (`update.sh`). Con 2 GB de RAM el build de la tienda usa la swap que deja
`bootstrap.sh`.

## Alternativa sin servidor propio

`render.yaml` (API en Render) + tienda en Vercel + base en Neon + fotos en R2 + mails con Resend sigue funcionando
(la API acepta `RESEND_API_KEY` y cualquier bucket S3), pero cuesta más para lo mismo (Render Starter, Vercel Pro) y los
backups quedan a cargo de cada proveedor.
