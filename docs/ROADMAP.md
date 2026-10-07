# Mini Galú — Roadmap y cobertura de los mockups

Checklist de **todo lo que proponen los mockups** (`design/mockups/`) y las ideas (`IDEAS.md`), con el estado de cada cosa en la app.
Regla: nada de los mockups se descarta en silencio. Si algo cambia, se anota acá con el porqué.

✅ hecho · 🟡 parcial (ver nota) · ⏳ pendiente (fase indicada)

## Fase 1 · Base ✅

- ✅ Monorepo pnpm + Turborepo (`apps/web`, `apps/api`, `packages/*`)
- ✅ docker-compose: Postgres 17 + pgvector (puerto **5433**), Mailpit, Ollama (perfil `ai`)
- ✅ Tokens de diseño 1:1 con los mockups (`packages/design-tokens`) + tema Tailwind v4
- ✅ Contratos zod compartidos (`packages/contracts`), precios en centavos
- ✅ Drizzle: schema, migraciones versionadas, seed con los productos reales
- ✅ Biome, Husky + commitlint (conventional commits), CI (lint, tipos, unit, e2e)
- ✅ Playwright: e2e en celular y escritorio + script de capturas en 375 / 820 / 1440 / 2560

## Fase 2 · Catálogo ✅

Lo que quedó marcado ⏳/🟡 depende de otras fases y está asignado a la fase correspondiente.

### Layout de la tienda (`app.js`)
- ✅ Cinta de anuncios (editable desde `content_blocks.home.announcements`)
- ✅ Header transparente sobre el hero que se vuelve sólido al scrollear
- ✅ Mega menú "Tienda": colecciones con cantidad, talles, ocasiones, recién salidas, pie con Galú / gift card / tabla de medidas
- ✅ "Lanzamiento" con los días que faltan
- ✅ Buscador con atajo `/`, sugerencias y resultados en vivo; vacío → "Preguntale a Galú"
- ✅ Popover "¿Dónde está mi pedido?" (busca por número → `/seguimiento`)
- ✅ Menú móvil completo
- ✅ Bolsa lateral: cantidades con tope de stock, quitar, barra de envío gratis ($90.000), vacía con bordado
- ✅ Contacto: barra lateral en escritorio / botón desplegable en celular
- ✅ Footer con newsletter (🟡 la suscripción se guarda en la fase 6), medios de pago, Andreani
- ✅ Toast con foto de la prenda
- ✅ Detalles de taller: aguja que cose los dobladillos, cinta métrica, prenda que vuela a la bolsa, etiquetas que se balancean, pespuntes al hover, puntadas al guardar favorito, moños que se atan, bordados que florecen, textura de lino
- ✅ `prefers-reduced-motion` y `?static` apagan todas las animaciones
- 🟡 View Transitions entre páginas: CSS listo; en Next falta habilitar `<ViewTransition>` (foto que viaja de la tarjeta a la ficha) → fase 9
- 🟡 Popover de cuenta ("Hola, Lucía", nenas, pedidos en camino, saldo gift card): hoy muestra "Ingresar" → fase 8

### Home (`index.html`)
- ✅ Hero con título editable (`*énfasis*`), Ken Burns, sello giratorio, CTA a Galú
- ✅ Manifiesto con pespunte bajo "borda a mano"
- ✅ Colecciones en arco (títulos editables, "Próximamente" en la del lanzamiento)
- ✅ Carrusel "Lo nuevo de la semana" (Swiper, orden editable)
- ✅ Lanzamiento: cuenta regresiva, aviso por WhatsApp o email **guardado en la base**, contador de anotados
- ✅ El taller, lookbook con "+" (borrador → "Avisame cuando salga"), reseñas en cinta arrastrable, teaser de Galú con stock real, Instagram, perks

### Catálogo (`catalogo.html`)
- ✅ Pestañas por colección con tinta animada, título según colección
- ✅ Filtros: talle, ocasión, color, precio, solo con stock, limpiar; chips activos; contador en el botón
- ✅ Atajos `?talle=`, `?ocasion=`, `?q=` (entiende "vestido rojo talle 6"), `?col=`, `?view=lookbook`; la URL refleja los filtros
- ✅ Orden: nuevos, precio, más vendidos (`units_sold`)
- ✅ Vista Tienda / Lookbook, hoja de filtros en celular, tarjeta promo de Galú, cierre de grilla que completa la fila, vacío
- ✅ Tarjeta: segunda foto al hover, etiquetas (−%, Últimas, Nuevo…), favorito, agregar rápido por talle
- ⏳ "Para mis nenas" (filtro por el talle de cada nena) → fase 8
- ⏳ Modo lista de cumple (`?lista=Emma`: elegir prendas y sumarlas) → fase 8

### Ficha (`producto.html`)
- ✅ Galería con miniaturas, contador, zoom que sigue al mouse, paginación en celular
- ✅ Talles con stock ("¡Última!", "Quedan 2", "Avisame"), tabla de medidas por modelo (`#medidas` abre la tabla)
- ✅ Calculadora de talle (edad + altura vs. tabla del modelo)
- ✅ **Avisame cuando vuelva** por talle y **Avisame cuando salga** para borradores → `waitlist_entries` con posición en la fila
- ✅ Precio, descuento, 6 cuotas, favoritos, chips "Preguntale a Galú" contextuales
- ✅ Detalles, tela y cuidados, envíos; "Cómo se hizo"; reseñas con distribución y % de "talle justo"; completá el look
- ✅ Barra fija en celular (Galú y contacto suben para no taparla)
- 🟡 Calculá tu envío: estimación local como el mockup → cotización Andreani real en la fase 5
- ⏳ Sumar a lista de cumple (hoy lleva a ingresar) → fase 8

### Galú (demo con reglas sobre el stock real)
- ✅ Moño flotante con pista, panel, sugerencias, saludo contextual en la ficha, tarjetas con "Agregar"
- ✅ Responde talles, stock, precios, cuotas, envíos, ocasiones, regalos, colores, presupuesto, a medida
- 🟡 "¿Dónde está mi pedido?": pide el número → con pedidos reales en la fase 5
- ⏳ LLM + tools + "enseñale" → fase 7

### Panel del taller (fase 2)
- ✅ Ingreso del taller (`/taller/ingresar`): Better Auth email + contraseña, sin registro público; la cuenta la crea el seed
  (adelantado de la fase 8; Google y cuentas de clientes siguen en la fase 8)
- ✅ Armazón del panel: menú lateral (secciones futuras marcadas con su fase), búsqueda `/`, barra inferior en celular, salir
- ✅ `admin-productos`: KPIs, filtros (todos, publicados, borradores, stock bajo, agotados), búsqueda, orden, tabla con talles
  y stock, lista de espera por talle, publicar/ocultar
- ✅ Editor: fotos (subir, quitar, ordenar arrastrando o con flechas; la primera es la portada), datos, ocasiones, cuidados,
  etiqueta, accesorio, talles y stock con medidas, guardar borrador / publicar
- ✅ Volvió un talle: al cargar stock de un talle con anotadas, el editor lo avisa y la API publica `StockReplenished`
  (el envío del aviso es la fase 6)
- 🟡 Fotos: se guardan como se suben → recorte 3:4 y AVIF/WebP en varios tamaños (sharp) en la fase 9
- ⏳ Resumen del día y notificaciones (campana) → fase 4
- ✅ `admin-lanzamientos`: crear/editar/programar/borrar borradores, "usar de base", portada (elegir o subir), prendas,
  cuenta regresiva en la home, texto para redes con copiar, vista previa, `?nuevo` abre el editor; la API publica sola las
  prendas a la hora indicada (scheduler cada 60 s)
- ⏳ Lanzamientos: envío del aviso a anotados 1 h antes → fase 6; "visitas al adelanto" → fase 9 (Umami);
  "favoritos" → fase 8; "vendidas el primer día" → fase 4
- ✅ `admin-tienda`: portada editable con vista previa en vivo, foto (elegir o subir), barra de anuncios, resumen del
  próximo lanzamiento
- ⏳ `admin-tienda`: Mercado Pago y cupones → fase 3; envíos, horarios de retiro y paquete → fase 5; gift cards → fase 8

## Fase 3 · Checkout (`checkout.html`)
- ⏳ 3 pasos; Andreani domicilio / sucursal / retiro en el taller con turnos
- ⏳ Mercado Pago Payment Brick: crédito (cuotas), débito, dinero en cuenta; gift card como saldo; pantalla de éxito
- ⏳ Bolsa de invitada en la API (cookie) + merge al loguear; webhook con firma e idempotencia

## Fase 4 · Panel de pedidos (`admin.html`, `admin-pedidos.html`)
- ⏳ Resumen: tareas del día, métricas, ventas por semana, últimos pedidos, lanzamiento, stock, registro automático
- ⏳ Tablero arrastrable por estado, lista con selección múltiple, lista de preparación imprimible
- ⏳ Detalle con siguiente paso en un clic, picking con tilde, plantillas de WhatsApp
- ⏳ Links de pago automáticos (reserva 72 h, recordatorio a las 24 h)
- ⏳ Búsqueda global (`/`) y notificaciones; `taller.css` ya está copiado

## Fase 5 · Envíos (`seguimiento.html`)
- ⏳ FakeAndreani (cotiza por CP, etiqueta, eventos) + AndreaniAdapter
- ⏳ Seguimiento público `/seguimiento?pedido=` (casos del mockup: en camino, retiro, sin pagar, entregado)

## Fase 6 · Automatizaciones (`admin-automatizaciones.html`)
- ⏳ Reglas activables (pago aprobado, etiqueta, despachado, entregado, listo para retirar, volvió un talle, link sin pagar, bolsa abandonada, cumple, stock bajo)
- ⏳ Editor de mensajes con vista previa, registro; mail (Mailpit) + WhatsApp en modo prueba
- ⏳ Newsletter "Cartas del taller"

## Fase 7 · Galú (`admin-galu.html`)
- ⏳ `LlmProvider` (Ollama local → Claude Haiku en prod), tools sobre casos de uso, pgvector
- ⏳ Conversaciones, "enseñale" (`AssistantFact`), ajustes

## Fase 8 · Cuenta (`cuenta.html`, `ingresar.html`, `giftcards.html`, `admin-clientes.html`)
- ✅ Modelo de datos: `user` (nombre y apellido separados, email verificado, foto, rol, teléfono E.164 + país,
  documento, newsletter, aceptación de términos), `addresses` (varias por clienta, una predeterminada, observaciones
  para la entrega) y `children` ("Mis nenas": nombre, cumple, talle, altura)
- ✅ Regla de contraseña (8+, mayúscula, minúscula, número y especial) en contracts, en la API (alta, cambio y
  recuperación) y en el seed
- ⏳ Better Auth (email + Google), "Mis nenas", pedidos, favoritos sincronizados, lista de cumple compartible
- ⏳ Gift cards con diseño elegible y vista previa, consulta de saldo
- ⏳ Clientes en el panel: nenas, cumples próximos, ficha con pedidos

## Seguridad del panel — obligatorio antes del deploy (fase 10)
- ⏳ **Verificación en dos pasos** para las cuentas admin (TOTP con app autenticadora + códigos de respaldo;
  plugin `twoFactor` de Better Auth). Sin 2FA activado, el panel no se habilita en producción.
- ⏳ **Límite de intentos de login**: bloqueo temporal por IP y por cuenta tras varios intentos fallidos (rate limit de
  Better Auth en `/sign-in/email` + aviso por mail a la cuenta), mensajes que no revelan si el email existe.
- ✅ El panel vive en `/taller` del mismo dominio (sin subdominio), sin links desde la tienda y con `noindex`;
  la API exige sesión con rol admin en todo `/admin/*`.

## Fase 9 · Pulido / Fase 10 · Deploy
- ⏳ a11y AA, Lighthouse ≥ 90, SEO, imágenes AVIF/WebP con `srcset` (sharp), View Transitions, páginas de ayuda
- ⏳ Vercel + Render/Fly + Neon; build de la API (hoy corre con `tsx`)

## Ideas para después (de IDEAS.md)
Cupones automáticos, bolsa abandonada, feed Instagram/Facebook Shops, Google Merchant, fotos de clientes, referidos,
Club Mini Galú, "talles que crecen", PWA del panel con push, etiquetas en lote, reporte mensual, costos por prenda,
stock de materiales, varias usuarias con permisos, Umami, backups.
