# Deploy

Producción: **tienda en Vercel**, **API en Render** (Docker), **base en Neon**, **fotos en Cloudflare R2** y **mails
por Resend**. Todo con planes gratis para arrancar. Se deploya desde `main` (ver "Git" en `CLAUDE.md`).

```
minigalu.com.ar        → Vercel   (apps/web, Next.js)
api.minigalu.com.ar    → Render   (apps/api/Dockerfile: migra y arranca)
fotos.minigalu.com.ar  → R2       (bucket público de las fotos)
                         Neon     (Postgres 17, DATABASE_URL)
```

Tienda y API **tienen que compartir dominio** (`minigalu.com.ar` y `api.minigalu.com.ar`): la cookie de sesión la pone
la API y el servidor de la tienda la tiene que ver. Con `*.vercel.app` y `*.onrender.com` el panel y la cuenta no
andan; la API no arranca así (pide `COOKIE_DOMAIN`).

## 1. Base de datos (Neon)

1. neon.tech → proyecto nuevo, Postgres 17, región **AWS US East 1 (N. Virginia)** (al lado de Render).
2. Copiar la connection string (la directa o la "pooled", las dos andan) → `DATABASE_URL`. Viene con
   `sslmode=require&channel_binding=require`; se deja así (la API saca `channel_binding`, que postgres.js no usa).
3. Las migraciones las corre la API sola en cada deploy (`node dist/migrate.js` antes de arrancar).

El plan gratis de Neon suspende la base a los 5 min sin uso; la primera consulta después tarda ~1 s más.

## 2. Fotos (Cloudflare R2)

1. Cloudflare → R2 → bucket nuevo (ej. `mini-galu-fotos`).
2. Bucket → Settings → **Custom Domain** → `fotos.minigalu.com.ar` → `MEDIA_PUBLIC_URL=https://fotos.minigalu.com.ar`.
3. R2 → Manage API tokens → token con "Object Read & Write" solo para ese bucket → `S3_ACCESS_KEY_ID` y
   `S3_SECRET_ACCESS_KEY`. `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_BUCKET` el nombre.
4. Si ya hay fotos en disco (las del seed o subidas en local): `pnpm --filter @mini-galu/api media:upload` con esas
   variables en el `.env` local.

## 3. Mails (Resend)

resend.com → Domains → `minigalu.com.ar` → cargar los registros DNS que pide (SPF, DKIM) y esperar "Verified".
API Keys → clave con permiso de envío → `RESEND_API_KEY`. Sin el dominio verificado, Resend rechaza los mails.

## 4. API (Render)

1. render.com → New → **Blueprint** → este repo. Lee `render.yaml`: servicio Docker `mini-galu-api` desde `main`,
   chequeo en `/health`, `BETTER_AUTH_SECRET` generado por Render.
2. Completar las variables que pide (`sync: false`):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | la de Neon |
   | `PUBLIC_API_URL` | `https://api.minigalu.com.ar` |
   | `WEB_ORIGIN` | `https://minigalu.com.ar` |
   | `COOKIE_DOMAIN` | `minigalu.com.ar` |
   | `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` | Mercado Pago → Tus integraciones → credenciales **de producción** |
   | `MP_WEBHOOK_SECRET` | Mercado Pago → Webhooks (ver abajo) |
   | `RESEND_API_KEY` | la de Resend |
   | `S3_*`, `MEDIA_PUBLIC_URL` | los de R2 |
   | `ANTHROPIC_API_KEY` | opcional: sin ella Galú responde por reglas |

   Opcionales (ver `.env.example`): `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `ANDREANI_*`.
3. Settings → Custom Domains → `api.minigalu.com.ar` (Render da el CNAME y el certificado).
4. Si falta o está mal alguna variable, el deploy falla y el log dice **todas** las que faltan juntas.

**Plan gratis**: Render duerme el servicio a los 15 min sin pedidos y tarda ~1 min en despertar. Mientras duerme no
corren las tareas programadas (publicar lanzamientos, liberar reservas vencidas, seguimiento de envíos, avisos). Sirve
para probar; para abrir la tienda, plan **Starter** (no duerme) cambiando `plan: starter` en `render.yaml`.

## 5. Cuenta del taller

Una sola vez, desde Render → el servicio → **Shell**:

```bash
ADMIN_EMAIL=gaby@minigalu.com.ar ADMIN_PASSWORD='…' ADMIN_NAME='Gaby' node dist/admin.js
```

Crea la cuenta (o le cambia la contraseña si ya existe) y no toca nada más. **No correr el seed en producción**: borra
el catálogo y siembra reseñas y anotadas de demo. Al entrar a `/taller` el panel pide activar la verificación en dos
pasos (en producción es obligatoria). El catálogo se carga desde el panel.

Sin acceso a la Shell (plan gratis), lo mismo desde la compu con la `DATABASE_URL` de Neon:

```bash
pnpm --filter @mini-galu/api build
DATABASE_URL='postgres://…neon.tech/…' ADMIN_EMAIL=… ADMIN_PASSWORD='…' node apps/api/dist/admin.js
```

## 6. Tienda (Vercel)

1. vercel.com → Add New → Project → este repo. **Root Directory: `apps/web`** (Vercel detecta Next.js y pnpm).
2. Settings → Git → Production Branch: `main`.
3. Environment Variables (Production):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://api.minigalu.com.ar` |
   | `NEXT_PUBLIC_SITE_URL` | `https://minigalu.com.ar` (SEO: canonical, sitemap, Open Graph) |
   | `NEXT_PUBLIC_MEDIA_URL` | `https://fotos.minigalu.com.ar` |

   Las `NEXT_PUBLIC_*` quedan en el build: si cambian, redeployar.
4. Settings → Domains → `minigalu.com.ar` (y `www` redirigiendo).

Los deploys de preview (ramas y PRs) no ven la sesión ni pasan el CORS de la API de producción: sirven para mirar la
tienda, no el panel ni el checkout.

## 7. Mercado Pago

Tus integraciones → la aplicación → **Webhooks** → modo producción:

- URL: `https://api.minigalu.com.ar/payments/webhook`
- Evento: **Pagos**
- La "clave secreta" que muestra → `MP_WEBHOOK_SECRET` en Render.

## 8. Probar antes de anunciar

1. `https://api.minigalu.com.ar/health` → `{"ok":true}`.
2. Entrar a `/taller`, activar los dos pasos, cargar un producto con foto (tiene que verse desde `fotos.…`).
3. Comprar algo barato con una tarjeta real y reintegrarlo desde el panel (Pedidos → el pedido → "Reintegrar el pago").
4. Llega el mail "Recibimos tu pago" (Resend → Logs).
5. Crear una cuenta de cliente, cerrar sesión, volver a entrar.
6. El número de WhatsApp de `apps/web/src/lib/site.ts` todavía es de ejemplo: cambiarlo antes de abrir.

## Imagen de la API

`apps/api/Dockerfile` (contexto: la raíz del repo). Arma el bundle (`pnpm --filter @mini-galu/api build`) e instala
solo `sharp` en la imagen final; corre como usuario `node`. Al arrancar: `node dist/migrate.js && node dist/main.js`.
Toma el puerto de `PORT` (Render, Fly) o `API_PORT`. Sirve igual en Fly.io u otro host de contenedores. La CI la
construye y la arranca en modo producción sobre una base vacía en cada push.

```bash
docker build -f apps/api/Dockerfile -t mini-galu-api .
docker run --env-file .env.produccion -p 4000:4000 mini-galu-api
```
