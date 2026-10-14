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
- ✅ Resumen del día y notificaciones (campana) → fase 4
- ✅ `admin-lanzamientos`: crear/editar/programar/borrar borradores, "usar de base", portada (elegir o subir), prendas,
  cuenta regresiva en la home, texto para redes con copiar, vista previa, `?nuevo` abre el editor; la API publica sola las
  prendas a la hora indicada (scheduler cada 60 s)
- ⏳ Lanzamientos: envío del aviso a anotados 1 h antes → fase 6; "visitas al adelanto" → fase 9 (Umami);
  "favoritos" → fase 8; "vendidas el primer día" → fase 4
- ✅ `admin-tienda`: portada editable con vista previa en vivo, foto (elegir o subir), barra de anuncios, resumen del
  próximo lanzamiento
- ⏳ `admin-tienda`: Mercado Pago y cupones → fase 3; envíos, horarios de retiro y paquete → fase 5; gift cards → fase 8

## Fase 3 · Checkout (`checkout.html`) ✅ (falta el webhook en el sandbox)
- ✅ Bolsa en la API: cookie de invitada `mg_cart`, merge con la cuenta al ingresar y con la bolsa vieja del navegador;
  se ajusta sola si baja el stock o se despublica una prenda
- ✅ 3 pasos con el diseño del mockup (stepper, pasos cerrados con resumen y "Editar", resumen plegable en celular)
- ✅ Datos: email, nombre, apellido (separado: lo pide Andreani), celular normalizado a +54 9…, seguimiento por WhatsApp
- ✅ Envío: a domicilio (calle, altura, piso, localidad, indicaciones), sucursal y retiro en el taller con franjas
  (desde mañana, lun–vie 10–13 / 16–19, sáb 10–13); envío gratis desde $90.000
- ✅ Pedido con número MG-1001…, precios congelados y **stock reservado 30 min** (se libera solo cada minuto); si se
  vuelve a pedir desde la misma bolsa, el anterior se cancela
- ✅ Pago: puerto `PaymentGateway` → `MercadoPagoGateway` (Payment Brick con los colores del taller: crédito, débito y
  dinero en cuenta) y `SimulatedGateway` (local/CI, mismo aspecto que el mockup; APRO/OTHE/CONT/FUND)
- ✅ Webhook `/payments/webhook` con firma `x-signature`, estado consultado a MP, idempotente por pago; monto que no
  coincide no aprueba. Pago aprobado → pedido "nuevo", bolsa vacía, cupón usado, `PaymentApproved`
- ✅ Pago que llega después de vencer la reserva: se vuelve a reservar si hay stock; si no, `PaymentNeedsRefund`
- ✅ Cupones: porcentaje, monto fijo, envío gratis; mínimo, vencimiento, usos, uno por cliente, primera compra y
  anotados al lanzamiento; panel `admin-tienda` → Cupones (crear, editar, pausar, borrar)
- ✅ Panel `admin-tienda` → Mercado Pago: medios activos, cuotas sin interés (1/3/6), modo según credenciales
- ✅ Pantalla de éxito con moño, confeti y pasos según el envío; "pago en revisión" para pendientes
- ✅ Probado en el sandbox de Mercado Pago (API de **Orders**, la vigente; la de Payments se discontinúa): APRO
  aprueba, OTHE/FUND/SECU/CALL rechazan con su motivo, CONT queda en revisión; preferencia de dinero en cuenta OK.
  En prueba el email del pagador tiene que ser de un usuario de prueba (`test_user_<id>@testuser.com`)
- ⏳ Webhook en el sandbox: necesita URL pública (cloudflared) y `MP_WEBHOOK_SECRET`
- 🟡 Los logos dentro del Brick (Mercado Pago, tarjetas) los dibuja Mercado Pago a color: no se pueden pasar a monocromo
- 🟡 Sucursal Andreani: hoy se cotiza por tabla y se confirma la sucursal por mensaje → elegirla en el mapa en la fase 5
- 🟡 "12 cuotas fijas con CFT" del mockup: las muestra el Brick real según la cuenta; el simulado ofrece 1/3/6
- ✅ Cuotas reales: la API consulta a Mercado Pago los planes de Visa y Mastercard por monto (caché 1 h). La tienda
  dice "N cuotas sin interés" solo si TODOS los bancos las dan sin recargo; si no, "Hasta N cuotas con Mercado Pago".
  El panel define cuántas cuotas se ofrecen (1/3/6/12); las sin interés se activan en la cuenta de Mercado Pago
- ✅ Resumen del checkout con la cuota elegida: con los primeros dígitos de la tarjeta se consulta su plan (cuota,
  total con interés y CFT) y al elegir las cuotas en el Brick el resumen muestra cuánto se paga. El SDK no avisa la
  cuota elegida: se lee del radio `installments` del formulario (si Mercado Pago lo cambia, se ve el plan completo)
- 🟡 Megamenú y Galú ya no mencionan cuotas sin interés (el mockup las mostraba fijas); Galú podría consultar el plan
  real en la fase 7
- ⏳ "Continuar con Google" y datos guardados → fase 8 · gift card como saldo → fase 8
- ✅ Mail "Recibimos tu pago" (Mailpit en local) · ⏳ WhatsApp → fase 6 · ✅ pedidos en el panel (fase 4)

## Fase 4 · Panel de pedidos (`admin.html`, `admin-pedidos.html`) · terminada
- ✅ `admin-pedidos`: tablero por estado arrastrable (dnd-kit, mouse y táctil), lista con chips por estado, búsqueda,
  filtros por canal y envío, selección múltiple con "Avanzar estado" y "Preparación" en lote
- ✅ Lista de preparación imprimible agrupada por modelo y talle
- ✅ Detalle: pasos, prendas para preparar con tilde (no se cierra la preparación sin tildar todo), cliente con
  WhatsApp/mail/llamar, envío o retiro con horario, pago (operación MP y lo que pagó el cliente con el interés),
  historial automático (creado, pago aprobado, mail enviado, cambios de estado) y notas internas
- ✅ Siguiente paso en un clic con las reglas del flujo en la API (no se vuelve a "esperando pago"; un retiro no pasa
  por "en camino"); cada cambio publica `OrderStatusChanged` (las automatizaciones avisarán en la fase 6)
- ✅ Plantillas de WhatsApp (pago recibido, despachado, listo para retirar, pedir reseña, libre) que abren wa.me
- ✅ Canal de cada pedido (web, Instagram, WhatsApp, Galú) en la base; hoy todo entra por la web
- 🟡 "Generar etiqueta Andreani" y seguimiento → fase 5 (hoy: "Marcar listo para despachar" / "Marcar entregado")
- 🟡 "Te queda después de la comisión de MP": no se estima (sería un dato inventado)
- ✅ Resumen (`/taller`, el panel abre acá): tareas del día, ventas del mes contra el anterior, pedidos y clientes que
  vuelven, ticket promedio, ventas por semana / por mes (barras, tooltip, tabla, mejor período, promedio y
  proyección), últimos pedidos, próximo lanzamiento, stock para revisar y "lo que se hizo solo" (historial real)
- 🟡 En el resumen: "preguntas que Galú no supo" y "charlas con Galú" → fase 7; link a Automatizaciones → fase 6
- ✅ Contadores en el menú (pedidos para preparar, productos con la última unidad), campana de novedades (pedidos
  nuevos, links sin pagar, última unidad; "marcar como leídas") y búsqueda global con pedidos y productos ("/")
- 🟡 Búsqueda de clientes → fase 8; "Galú no supo responder" en la campana → fase 7
- ✅ Links de pago: venta por Instagram/WhatsApp cargada en el panel (prendas, cliente, entrega); el pedido queda
  "esperando pago" con el stock reservado 72 h y el cliente paga en `/pagar/MG-…?t=…` con el mismo Brick del
  checkout. Copiar link o mandarlo por WhatsApp; "Reenviar link de pago" como siguiente paso; recordatorio por mail
  a las 24 h (una vez) y a las 72 h el stock vuelve a la tienda
- 🟡 Recordatorio por WhatsApp → fase 6 · links que crea Galú → fase 7 · reembolsar desde el panel → fase 10 (hoy un
  pago sin stock queda marcado en el historial y en "lo que se hizo solo")

## Fase 5 · Envíos (`seguimiento.html`)
- ⏳ FakeAndreani (cotiza por CP, etiqueta, eventos) + AndreaniAdapter
- ⏳ Seguimiento público `/seguimiento?pedido=` (casos del mockup: en camino, retiro, sin pagar, entregado)

## Fase 6 · Automatizaciones (`admin-automatizaciones.html`)
- ⏳ Reglas activables (pago aprobado, etiqueta, despachado, entregado, listo para retirar, volvió un talle, link sin pagar, bolsa abandonada, cumple, stock bajo)
- ✅ Adelantado: módulo `notifications` con puerto `Mailer` (SMTP → Mailpit en local) y el mail "Recibimos tu pago"
  (evento `PaymentApproved`, una vez por pedido) con prendas, totales, cupón, envío o retiro y link de seguimiento
- ⏳ Editor de mensajes con vista previa, registro; resto de los mails + WhatsApp en modo prueba; Resend en producción
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
