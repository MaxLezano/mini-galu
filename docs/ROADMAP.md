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
- ✅ Footer con newsletter (la suscripción se guarda: "Cartas del taller", fase 6), medios de pago, Andreani
- ✅ Toast con foto de la prenda
- ✅ Detalles de taller: aguja que cose los dobladillos, cinta métrica, prenda que vuela a la bolsa, etiquetas que se balancean, pespuntes al hover, puntadas al guardar favorito, moños que se atan, bordados que florecen, textura de lino
- ✅ `prefers-reduced-motion` y `?static` apagan todas las animaciones
- ✅ View Transitions entre páginas, con la foto que viaja de la tarjeta a la ficha (ver fase 9)
- ✅ Popover de cuenta ("Hola, Lucía", nenas, pedidos en camino, saldo gift card): ver fase 9

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
- ✅ "Para mis nenas" (con sesión): un toque filtra por el talle de cada nena
- ✅ Modo lista de cumple (`?lista=<link de la nena>`, desde "Agregar prendas" de la lista): se tocan las prendas
  con su talle, "Ya está en la lista" en las que estaban, y se suman todas juntas

### Ficha (`producto.html`)
- ✅ Galería con miniaturas, contador, zoom que sigue al mouse, paginación en celular
- ✅ Talles con stock ("¡Última!", "Quedan 2", "Avisame"), tabla de medidas por modelo (`#medidas` abre la tabla)
- ✅ Calculadora de talle (edad + altura vs. tabla del modelo)
- ✅ **Avisame cuando vuelva** por talle y **Avisame cuando salga** para borradores → `waitlist_entries` con posición en la fila
- ✅ Precio, descuento, 6 cuotas, favoritos, chips "Preguntale a Galú" contextuales
- ✅ Detalles, tela y cuidados, envíos; "Cómo se hizo"; reseñas con distribución y % de "talle justo"; completá el look
- ✅ Barra fija en celular (Galú y contacto suben para no taparla)
- ✅ Calculá tu envío: cotiza con la API (Andreani si está conectado; si no, la tabla del panel) la bolsa más la
  prenda, con la sucursal que atiende el CP; si la API no responde, estima con la tabla local
- ✅ Sumar a una lista de cumple (elegir la nena; sin sesión, a ingresar y vuelve)

### Galú (demo con reglas sobre el stock real)
- ✅ Moño flotante con pista, panel, sugerencias, saludo contextual en la ficha, tarjetas con "Agregar"
- ✅ Responde talles, stock, precios, cuotas, envíos, ocasiones, regalos, colores, presupuesto, a medida
- ✅ "¿Dónde está mi pedido?": sin modelo, Galú detecta el número en el mensaje (MG-1042, "mg 1042", "#1042", solo el
  número o el de Andreani) y responde con el estado real del seguimiento público (`/tracking/:code`) y el link
- ✅ LLM + tools (fase 7) · ✅ "enseñale" desde el panel (fase 7)

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
- ✅ Fotos: AVIF/WebP en varios tamaños (sharp, ver fase 9) · recorte 3:4 al subir (solo prendas; centrado en la prenda
  con `attention` de sharp, respeta el EXIF del celular; la que ya es 3:4 no se recomprime; portada y lanzamientos quedan
  como vienen)
- ✅ Resumen del día y notificaciones (campana) → fase 4
- ✅ `admin-lanzamientos`: crear/editar/programar/borrar borradores, "usar de base", portada (elegir o subir), prendas,
  cuenta regresiva en la home, texto para redes con copiar, vista previa, `?nuevo` abre el editor; la API publica sola las
  prendas a la hora indicada (scheduler cada 60 s)
- ✅ Lanzamientos: aviso a los anotados 1 h antes (regla "Aviso de lanzamiento" de Automatizaciones, ver fase 6)
- ✅ Lanzamientos: "vendidas el primer día" en los que ya salieron (unidades de pedidos pagos en las 24 h desde que
  se publicó; sin cancelados ni reembolsados)
- ✅ Lanzamientos: "favoritos" del próximo (veces que guardaron sus prendas). En el adelanto la ficha muestra el
  corazón al lado de "Avisame cuando salga" y pide ingresar o crear cuenta, así cada favorito queda en el servidor;
  en "Mi cuenta" la prenda aparece recién cuando sale
- ✅ Lanzamientos: "visitas al adelanto" en el próximo (y en los que ya salieron): cuenta propia, sin Umami ni
  cookies. Suma quien ve la sección del lanzamiento en la home (40 % en pantalla) o abre la ficha de una prenda que
  todavía no salió; una por visitante y día (hash de IP + navegador + día con el secreto del servidor, tabla
  `launch_visits`). No cuentan buscadores ni vistas previas de links, la cuenta del taller ni las capturas (`?static`)
- ✅ `admin-tienda`: portada editable con vista previa en vivo, foto (elegir o subir), barra de anuncios, resumen del
  próximo lanzamiento
- ✅ `admin-tienda`: Mercado Pago y cupones (fase 3); envíos, horarios de retiro y paquete (fase 5); gift cards (fase 8)

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
- ✅ Galú consulta el plan real (tool `cuotas`, por prenda o monto, con el tope del panel) y solo promete cuotas sin
  interés si Mercado Pago las confirma · ✅ Galú sin modelo (reglas) también: "¿cuánto sale…?" y "¿en cuántas
  cuotas…?" responden con el plan de la prenda (o la ficha que se mira) · ✅ "Envíos, cambios y pagos" de la ficha y
  la gift card dicen las cuotas reales del monto (sin plan, no prometen cuotas). La home queda genérica ("Pagás en
  cuotas"); el megamenú no habla de cuotas
- ✅ "Tus datos" sin sesión: "Continuar con Google" (si la API tiene Google configurado), "¿Tenés cuenta? Ingresá" y
  "o como invitada"; al volver, la bolsa de invitada se suma a la de la cuenta y se completan datos y dirección
  predeterminada (fase 8) · ✅ gift card en el checkout (fase 8)
- ✅ Mail "Recibimos tu pago" (Mailpit en local) · ✅ WhatsApp (fase 6) · ✅ pedidos en el panel (fase 4)

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
- ✅ "Generar etiqueta Andreani" y seguimiento (ver fase 5)
- ✅ "Te queda (después de la comisión de MP)" en el pago del detalle: el neto real que acreditó Mercado Pago, no un
  estimado. La API de Orders no lo informa: se busca el pago aprobado de la orden en la de Payments
  (`external_reference` + referencia `ORDER_MP`; dinero en cuenta lo trae en el pago). Se pregunta la primera vez que
  se abre el pedido y queda en `payments.net_cents`; sin dato (simulado, reintegrado o MP no responde) no se muestra.
  Probado en el sandbox: $10.000 con tarjeta → $9.590
- ✅ Resumen (`/taller`, el panel abre acá): tareas del día, ventas del mes contra el anterior, pedidos y clientes que
  vuelven, ticket promedio, ventas por semana / por mes (barras, tooltip, tabla, mejor período, promedio y
  proyección), últimos pedidos, próximo lanzamiento, stock para revisar y "lo que se hizo solo" (historial real)
- ✅ En el resumen: "preguntas que Galú no supo" (lleva a Enseñale) y "Charlas con Galú" de 7 días con el % que
  termina en compra (`GET /admin/assistant/overview`); link a Automatizaciones
- ✅ Contadores en el menú (pedidos para preparar, productos con la última unidad), campana de novedades (pedidos
  nuevos, links sin pagar, última unidad; "marcar como leídas") y búsqueda global con pedidos y productos ("/")
- ✅ "Galú no supo responder" en la campana (las 3 más preguntadas; vuelve a sonar si la preguntan otra vez) y
  contador de pendientes en "Galú" del menú
- ✅ Búsqueda de clientes en la búsqueda global (por nombre o mail; se piden al abrirla) → abre la ficha en
  `/taller/clientes?cliente=…` (la ficha queda en la URL: "atrás" y recargar funcionan)
- ✅ Links de pago: venta por Instagram/WhatsApp cargada en el panel (prendas, cliente, entrega); el pedido queda
  "esperando pago" con el stock reservado 72 h y el cliente paga en `/pagar/MG-…?t=…` con el mismo Brick del
  checkout. Copiar link o mandarlo por WhatsApp; "Reenviar link de pago" como siguiente paso; recordatorio por mail
  a las 24 h (una vez) y a las 72 h el stock vuelve a la tienda
- ✅ Recordatorio por WhatsApp (con WhatsApp conectado, fase 6) · links que crea Galú: no está en los
  mockups · reembolsar desde el panel: hecho (fase 10, "Reintegro desde el panel")

## Fase 5 · Envíos (`seguimiento.html`) · terminada
- ✅ FakeAndreani: número de seguimiento, etiqueta PDF 10×15 (marcada de prueba) y eventos que avanzan con el reloj
  (retirado, centro de distribución, en tránsito, a reparto / en sucursal, entregado); `FAKE_ANDREANI_SPEED` acelera
- ✅ "Generar etiqueta Andreani" en el panel (pasa a listo, guarda el número, abre el PDF); "Imprimir etiqueta" y
  "Seguimiento" en el detalle; en camino con etiqueta, el siguiente paso es "Ver seguimiento"
- ✅ "Etiquetas" en la barra de la selección (mockup `admin-pedidos.html`): genera las que faltan de los pedidos en
  preparación o listos y abre todas en un solo PDF 10×15 (una por hoja); dice cuántos quedaron sin etiqueta y, si
  todos se retiran en el taller, "Ninguno de esos pedidos va por Andreani"
- ✅ Consulta de envíos cada 10 min: retirado por Andreani → en camino, entregado → entregado (historial automático y
  OrderStatusChanged para las automatizaciones)
- ✅ Seguimiento público `/seguimiento?pedido=` por número de pedido o de Andreani: recorrido con camión, registro,
  paquete, entrega; casos en camino, retiro en el taller, sin pagar (con el token, botón "Pagar ahora") y entregado.
  Sin la calle ni el apellido (página pública)
- ✅ Retiro en sucursal Andreani con las sucursales reales del CP (API pública): la opción muestra la sucursal que
  atiende el CP (como el mockup) y se puede elegir otra; queda en el pedido, el panel, el mail y el seguimiento
- ✅ "Tienda y pagos → Envíos": estado de Andreani, paquete por defecto, origen y remitente
- ✅ AndreaniGateway + AndreaniRates (API REST: login, alta de orden v2, etiqueta PDF, trazas v3 y tarifas) con tests;
  se activan con `ANDREANI_*` en el `.env` · `pnpm andreani:check` · ⏳ probarlo contra QA cuando Andreani dé las
  credenciales
- ✅ Envío gratis desde un monto, formas de entrega y horarios de retiro editables: hecho en la fase 10 ("Entregas y
  cambios desde el panel") · 🟡 sucursal en un mapa → más adelante (hoy se elige de la lista de sucursales del CP)
- ✅ Interruptor "Avisos por WhatsApp" en el seguimiento (con el token del pedido) y aviso de despacho por WhatsApp · "Probá con" del mockup era
  solo demo

## Fase 6 · Automatizaciones (`admin-automatizaciones.html`) · terminada (WhatsApp listo, espera las credenciales)
- ✅ Módulo `automations`: reglas activables con mensaje editable (vista previa e "insertar dato"), registro de lo
  que se hizo solo, métricas del mes (mensajes, tiempo ahorrado, ventas por avisos de talle, links recuperados),
  canales y "Enviarme una prueba"
- ✅ Pago aprobado (mail con el texto de la regla) · despachado con link de seguimiento · listo para retirar con el
  horario · pedido de reseña a los 3 días de entregado · volvió un talle (mail a los anotados, en orden) · link de
  pago sin pagar (24 h) · stock bajo (aviso en el panel)
- ✅ Mails con el marco del taller (Mailpit en local); cada aviso queda en el historial del pedido
- ✅ Aviso de lanzamiento (regla nueva: el mockup solo tenía el interruptor "Avisar a los anotados 1 hora antes" en
  el editor del lanzamiento): falta 1 h (o menos, si se programó sobre la hora) para un lanzamiento programado con el
  aviso prendido y sin publicar → mail a cada anotado de la home, una vez, con la hora, hasta 3 prendas con foto y el
  link al adelanto; el mensaje se edita y la regla se pausa como las otras. Los anotados por WhatsApp quedan esperando
  (un aviso en el registro)
- ✅ WhatsApp Business (Cloud API): ver "Avisos por WhatsApp" en "Orden de lo que sigue"; ⏳ conectarlo con las
  credenciales de Meta (sin ellas, en producción los anotados solo por WhatsApp quedan esperando) · ✅ Resend en producción (fase 10)
- ✅ Se acerca un cumple: 15 días antes del cumple de cada nena de "Mis nenas" (con talle), mail con 3 prendas
  con stock en su talle, link al catálogo filtrado y el cupón "Mail de cumpleaños" vigente; una vez por cumple, desde
  las 9 (al cargar la nena, en el momento). El cupón de cumple solo vale con el email que recibió el aviso (45 días)
- ✅ Bolsa abandonada: si alguien con cuenta deja la bolsa 24 h sin tocar (hasta 7 días), mail de 9 a 21 con
  las fotos de lo que sigue con stock (hasta 3) y el link a su bolsa (ingresar → checkout); una vez por cada vez que
  la deja. No sale si tiene un pedido esperando el pago (de eso se ocupa el recordatorio del link)
- ✅ Newsletter "Cartas del taller": suscripción desde el pie (mail de bienvenida), baja en un clic con el link de
  cada carta, y en Tienda y pagos: suscriptos, CSV, escribir una carta, mandarse una prueba y enviarla a todos

## Fase 7 · Galú (`admin-galu.html`)
- ✅ Módulo `assistant`: `LlmProvider` con Ollama en local (`OLLAMA_URL`, por defecto `qwen3:4b`) y Claude en
  producción (`ANTHROPIC_API_KEY`, por defecto `claude-haiku-5-5`); sin ninguno, la tienda responde por reglas como antes
- ✅ Tools sobre los casos de uso: `buscar_prendas` (talle, ocasión, color, precio, texto), `ver_prenda` (por slug o
  nombre; sin borradores), `talle_para` (edad/altura, la misma calculadora de la ficha), `seguir_pedido` (sin calle ni
  apellido), `cotizar_envio` y `cuotas` (plan real de Mercado Pago); el modelo no inventa datos y las prendas
  consultadas salen como tarjetas con "Agregar"
- ✅ Respuesta por SSE (`POST /assistant/chat`): el texto aparece de a pedazos; sabe qué ficha se está mirando; límite
  de 30 preguntas cada 10 min por IP y 500 caracteres por mensaje
- 🟡 pgvector → con 11 prendas alcanzan los filtros del catálogo; se suma si crece el catálogo o para buscar en lo que
  Gaby le enseña (Claude no tiene embeddings: haría falta otro proveedor)
- ✅ Conversaciones (`/taller/galu`): cada charla con modelo se guarda (id del navegador + cuenta o bolsa de
  invitada); "Compró" si se pagó un pedido de esa cuenta o bolsa hasta 3 días después; KPIs de 7 días contra la
  semana anterior. Charlas demo en el seed
- ✅ "Enseñale": la tool `no_lo_se` anota lo que no sabe; las preguntas pendientes se agrupan (mismas palabras sin
  tildes ni signos); lo que Gaby responde (`AssistantFact`) entra en las instrucciones de Galú y se puede olvidar
- ✅ Ajustes: derivar a WhatsApp, ofrecer gift card sin talle, solo prendas con stock (búsquedas y tarjetas) y tono
- ✅ "Pidieron aviso de talle": la tool `avisar_talle` anota el email o WhatsApp en la lista de espera del talle
  agotado (el mismo caso de uso que la ficha); el KPI cuenta los avisos de 7 días, la charla queda "Pidió aviso" y
  muestra "Quedó en la lista de espera"
- ✅ Las charlas por reglas (sin modelo, o con la API caída a mitad de la charla) se guardan igual
  (`POST /assistant/log`, a nombre de la cuenta o la bolsa): texto plano de la respuesta + nombres de las tarjetas, y
  lo que no supo va a "Enseñale" (lo enseñado lo usa recién con un modelo)

## Fase 8 · Cuenta (`cuenta.html`, `ingresar.html`, `giftcards.html`, `admin-clientes.html`)
- ✅ Modelo de datos: `user` (nombre y apellido separados, email verificado, foto, rol, teléfono E.164 + país,
  documento, newsletter, aceptación de términos), `addresses` (varias por clienta, una predeterminada, observaciones
  para la entrega) y `children` ("Mis nenas": nombre, cumple, talle, altura)
- ✅ Regla de contraseña (8+, mayúscula, minúscula, número y especial) en contracts, en la API (alta, cambio y
  recuperación) y en el seed
- ✅ Better Auth (email + Google opcional), "Mis nenas", pedidos, favoritos sincronizados, lista de cumple compartible
- ✅ Gift cards (`giftcards.html` y la pestaña de Mi cuenta): diseño, monto, mensaje y vista previa en vivo; se pagan
  como un pedido de tipo gift card en el link de pago; al aprobarse se activan con un código `GALU-XXXX-XXXX` (6 meses)
  y le llegan por mail a quien la recibe (ahora o ese día a las 9) o, por WhatsApp, quien compra la manda con el botón
  de su mail. Consulta de saldo, campo "Gift card" en el checkout (descuenta del total; si cubre todo, el pedido queda
  pagado sin Mercado Pago) y el saldo se descuenta una sola vez al pagarse el pedido
- ✅ Usar una gift card en el taller: el link de pago del panel suma el canal "En el taller" (venta presencial, sin
  entrega) y un campo "Gift card" con "Ver saldo". Si cubre todo, la venta queda pagada sin Mercado Pago (y, en el
  taller, entregada); si no, el link cobra la diferencia y el saldo se descuenta al pagarse. "Gift cards" en Tienda y
  pagos: vendido, saldo sin usar (sin las vencidas) y cada tarjeta con su saldo y vencimiento
- ✅ **Cobro en efectivo en el taller** (sin mockup; mismos chips del link de pago): en una venta "En el taller",
  "Cómo paga" elige efectivo o link de Mercado Pago. En efectivo la venta queda pagada y entregada en el momento
  (medio "Efectivo", historial "Cobrado en efectivo en el taller"; con gift card, se cobra en efectivo la diferencia).
  El mail "Recibimos tu pago" de una venta del taller no habla de preparar ni de seguimiento. Reintegrarla no pasa por
  Mercado Pago: el panel dice que se devuelve en mano y el mail al cliente, "en efectivo, en el taller"
- ✅ Clientes en el panel: todo el que compró (con o sin cuenta, por mail) y las cuentas, con nenas, próximo cumple,
  pedidos y gastado; filtros (cumple en 30 días, volvieron a comprar, nuevas del mes), búsqueda, ficha con
  contacto, resumen ("le gustan" por colección), pedidos y nota del taller; exportar CSV

## Seguridad del panel — obligatorio antes del deploy (fase 10) · hecho
- ✅ **Verificación en dos pasos** (plugin `twoFactor` de Better Auth): "Seguridad" en el panel activa la app
  autenticadora con QR (o clave a mano), confirma con el primer código y muestra 8 códigos de respaldo; el ingreso pide
  el código (o uno de respaldo) y puede recordar el dispositivo 30 días. Con `REQUIRE_ADMIN_2FA` (por defecto en
  producción) la API no deja usar el panel sin 2FA y la web manda a activarla.
- ✅ **Límite de intentos**: rate limit por IP de Better Auth en producción (10 ingresos por minuto) y bloqueo por cuenta
  tras 8 fallos en 15 min, con aviso por mail a la cuenta; la respuesta es igual exista o no el email.
- ✅ El panel vive en `/taller` del mismo dominio (sin subdominio), sin links desde la tienda y con `noindex`;
  la API exige sesión con rol admin en todo `/admin/*`.

## Revisión de seguridad (QA, octubre 2026)
- ✅ **Pedidos y gift cards por mail solo con el mail confirmado**: "Mi cuenta" juntaba los pedidos hechos sin
  ingresar y las gift cards (con su código) por el mail de la cuenta aunque no estuviera confirmado: con una cuenta
  nueva a nombre del mail de otra persona se veían sus pedidos y se podían gastar sus gift cards. Ahora sin confirmar
  solo se ven los de la cuenta, y "Mis datos" lo explica
- ✅ **Gift card que cubre todo, usada en dos pedidos a la vez**: el segundo salía pagado sin que nadie pagara (solo
  quedaba una línea en el historial). Ahora el saldo se descuenta antes de dar el pedido por pagado y, si ya no
  alcanza, el pedido se cancela y libera el stock (checkout, cambio de cupón en el paso de pago y venta del taller).
  Cambiar el cupón con la gift card y dejar el total en $0 ya no deja el pedido trabado esperando un pago de $0
- ✅ **Topes por IP que no se podían saltear**: la IP salía del primer `X-Forwarded-For`, que manda el cliente (Render
  no lo limpia); ahora `cf-connecting-ip` o el último salto. Topes nuevos (producción, cada 10 min): crear pedido
  (15, reservaba todo el stock 30 min con bolsas nuevas), gift cards (30), seguimiento (60, los números son
  correlativos), cartas (10, mandaban la bienvenida a cualquier mail), avisos de talle (20), lanzamientos (60) y
  cuotas (120); la caché de cuotas ya no crece sin tope
- ✅ **Fotos sin metadatos**: las que ya venían en 3:4 y las de portada/lanzamientos se guardaban tal cual, con el GPS
  del celular en el original público; ahora todas se vuelven a codificar
- ✅ CSV de clientes y de cartas sin fórmulas de Excel (un nombre `=HYPERLINK(…)` se ejecutaba al abrirlo)
- ✅ `?volver=/\otro.com` en ingresar mandaba a otro sitio (`lib/safe-path.ts`, también en el panel)
- ✅ Cabeceras: la tienda y el panel no se muestran en iframes ajenos (clickjacking), `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`; la API con `secureHeaders` y JSON de hasta 256 KB en las rutas públicas
- ✅ Un id que no es UUID (`/me/children/abc`) da 404 en vez de 500
- ⏳ Decidir con Gaby: pedir confirmar el mail antes de poder ingresar (Better Auth `requireEmailVerification`). Hoy
  una cuenta sin confirmar se puede usar; si alguien la crea con el mail de otra persona, Better Auth no la vincula a
  Google (bien), pero la dueña real no puede entrar con Google hasta recuperar la contraseña
- ✅ **Total del pedido solo con el token**: el seguimiento por número (o código Andreani) sigue mostrando recorrido,
  prendas, localidad y "Lucía F.", pero el total (y el monto de "Te falta pagar") solo con el token del pedido.
  Lo llevan los links "Seguir mi pedido" del mail "Recibimos tu pago", del aviso de despacho, del pago aprobado del
  checkout y del link de pago (`trackingPath` de contracts)

## Fase 9 · Pulido / Fase 10 · Deploy
- ✅ Páginas de ayuda (`/ayuda/cambios`, `envios-y-pagos`, `terminos`, `privacidad`; sin mockup propio, con el lenguaje
  de seguimiento y la ficha): navegación entre temas, índice "En esta página", contacto (Galú, WhatsApp, mail) y links
  a términos y privacidad en el pie. Texto de base con lo que ya dice la tienda (30 días, Andreani, retiro, cuotas,
  envío gratis); "Páginas de ayuda" en Tienda y pagos edita título, bajada y apartados (párrafos y listas con "- "),
  y vuelve al texto de base
- ⏳ Que Gaby revise los textos
- ✅ **Sin botón de arrepentimiento ni textos legales**: se sacaron la página, los links, la API
  (`POST /revocations`), el aviso del panel (campana, tarjeta y detalle), los mails y la tabla `order_revocations`
  (migración `0026`); la ayuda ya no lleva arrepentimiento, Defensa del Consumidor, la leyenda de la AAIP ni
  "Si algo llegó mal". Los reintegros desde el panel siguen
- ✅ **Reintegro desde el panel** (sin mockup; apartado Pago del detalle del pedido): "Reintegrar el pago" muestra qué
  vuelve y por dónde (el total por Mercado Pago, al mismo medio; lo usado de una gift card, a su saldo), si las prendas
  vuelven al stock (tildado si todavía no salieron del taller) y un motivo para el historial. Mercado Pago devuelve el
  total (`POST /v1/orders/{id}/refund` para tarjetas, `/v1/payments/{id}/refunds` para dinero en cuenta, con clave de
  idempotencia; si ya estaba devuelto se da por hecho) y recién entonces el pedido pasa a "reembolsado" (stock y
  vendidas en la misma transacción), queda la línea en el historial y le llega un mail al cliente. Si Mercado Pago no
  puede (sin saldo, más de 180 días) el pedido queda como estaba y el panel dice qué revisar. También sirve para el pago
  que llegó con la reserva vencida y sin stock, y para la compra de una gift card (solo si nadie la usó: se anula).
  Sin el pago registrado (pedidos viejos) avisa que se haga desde Mercado Pago. Los pagos simulados ya no repiten id
  al reiniciar la API (pisaban el pago de otro pedido). Queda afuera: reintegros parciales, devolver el uso del cupón
  y enterarse de un reintegro hecho desde la cuenta de Mercado Pago
- ✅ SEO: `metadataBase` con `NEXT_PUBLIC_SITE_URL`, Open Graph (es_AR) y canonical en inicio, catálogo (los filtros
  apuntan a `/catalogo`), ficha, gift cards y ayuda; `robots.txt` (sin panel, cuenta ni pasos de compra) y
  `sitemap.xml` (páginas públicas y cada prenda publicada, con foto); JSON-LD `OnlineStore` en el inicio y `Product`
  (precio en ARS, stock, puntaje) + migas en la ficha. El adelanto de un lanzamiento (borrador) lleva `noindex`
- ✅ Menú de cuenta del header (mockup `app.js` · `pop-user`): saludo con las nenas y su talle, Mis nenas, Mis pedidos
  (pill "N en camino" o "N en preparación"), Favoritos (cantidad), Lista de cumple, Gift cards (saldo de las activas;
  lleva a la pestaña de la cuenta), Mis datos y Salir. Se pide el resumen al abrirlo; en Mi cuenta solo cambia de pestaña
- ✅ Imágenes AVIF/WebP con `srcset`: al subir una foto, `ResponsiveImageStorage` (decorador del `ImageStorage`) guarda
  variantes de 320, 640, 960, 1440 y 1920 px en AVIF y WebP con sharp (orientación EXIF, sin agrandar, sin metadatos);
  las que faltan (fotos del seed o subidas antes) se generan la primera vez que se piden a `/media`. Los nombres
  (`a.webp` → `a@640.avif`) salen de `contracts/media.ts`; la tienda usa `ui/atoms/Picture` (`<picture>` con `sizes`)
  en las fotos grandes y `imageThumb` (WebP de 320) en las miniaturas. El hero baja de 207 KB a 61 KB
- ✅ View Transitions (mockup `@view-transition` + `[data-vt]`): al navegar, la página que se va se desenfoca y la
  nueva sube (`<ViewTransition>` de React en el `template.tsx` de la tienda y del panel, `features/shell/PageTransition`);
  el header queda quieto. Al tocar la foto o el nombre de una tarjeta, la foto viaja a la primera de la ficha
  (`product-hero`, se nombra al hacer clic y se suelta al llegar). Sin animación con `prefers-reduced-motion` o `?static`
- ✅ a11y WCAG 2.1 AA (`tests/e2e/a11y.spec.ts`, axe-core en celular y escritorio): inicio, catálogo, ficha, gift cards,
  ingresar, cuenta nueva, seguimiento, ayuda, bolsa, checkout, Galú, menú móvil y las 9 pantallas del panel. Tokens
  oscurecidos para llegar a 4.5:1 (`--cacao-3` #756860, `--canela` #A95E3A, `--salvia-d` #57654B; también en los
  mockups y el mail); lanzamientos pasados apagados sin opacidad en el texto; foto de la bolsa con nombre; las tarjetas
  del tablero ya no se anuncian como botón (no había arrastre con teclado); títulos del pie en orden (`h2.ft-h`)
- ✅ Arrastrar con el mouse las filas con scroll horizontal (sugerencias y tarjetas de Galú, tabs, chips, tablas,
  tablero): `features/shell/drag-scroll.ts`, en la tienda y el panel; si hubo arrastre no se dispara el click
- ✅ Fotos del hero y del lookbook de vuelta (los selectores `> img` no veían el `<img>` dentro de `<picture>`)
- 🟡 Lighthouse (build de producción, local): escritorio 97–99 en rendimiento y 99–100 en accesibilidad y SEO;
  celular 99–100 en accesibilidad y SEO y **rendimiento 78–79** (antes 66–78). Hecho: miniaturas `lazy`, `/media` con
  cache `immutable`, `preconnect` a la API; `content-visibility: auto` (`.cv-auto`) en las secciones de abajo del
  inicio y la ficha y en el pie (inicio con CPU ×4: layerize 540 → 99 ms, objetos de layout 2269 → 1222; las animaciones
  de lo que no se ve tampoco se pintan); los anclas (`#lanzamiento`, `#resenas`) se reacomodan al llegar
  (`settleAnchor` en `craft.ts`) y `?static` lo apaga para las capturas; el texto del hero entra con CSS sin esperar
  al JS (antes, con hidratación lenta, el LCP era la bajada a los ~3 s). Medido y descartado: montar menú, buscador,
  mega menú y Galú al abrirlos (casi sin efecto en layout/capas), el grano y las animaciones infinitas (solo
  `transform`/`opacity`, van por el compositor), sacar el preload de Fraunces/Caveat (empeora FCP y suma CLS) y recortar
  ejes de Fraunces (118 → 106 KB; SOFT/WONK/pesos se usan todos). El LCP simulado (5.5–6 s; real 0.4 s, 0.4–0.6 s con
  CPU ×4) lo dominan los bytes a 1.6 Mbps: 363 KB de fuentes variables (−1.9 s si no estuvieran) y ~190 KB de
  React/Next (−1.4 s). ⏳ Bajar de ahí pide resignar diseño (fuentes estáticas o menos ejes): decisión de Gaby
- ✅ **Entregas y cambios desde el panel** ("Tienda y pagos" → `#entregas`, módulo `policies` de la API, guardado en
  `content_blocks["policies"]`; sin nada guardado rigen las de base): días para cambiar el talle (ficha, inicio,
  checkout, gift cards, mails, ayuda y Galú), formas de entrega prendidas/apagadas (el checkout solo ofrece y acepta las
  prendidas), horarios de retiro por día ("10 a 13, 16 a 19"), envío gratis sí/no y desde qué monto (bolsa, ficha,
  checkout, ayuda, Galú) (las tarifas por zona se sacaron: Andreani cotiza con Andreani, ver abajo). Los textos
  de base de la ayuda siguen las políticas; si Gaby editó esas páginas, el panel le avisa que las revise
- ✅ Apartados de la ayuda que se apagan sin borrarlos ("Visible"); cualquiera se puede apagar o quitar (ya no hay
  apartado "Obligatorio") mientras quede uno visible
- ✅ "Tienda y pagos" en dos columnas que apilan sus cajas sin huecos (Mercado Pago, Entregas, Cupones, Gift cards
  y Páginas de ayuda · Envíos, Portada, Lanzamientos y Cartas); en celular, una sola
- ✅ La cinta de novedades llena pantallas anchas (2560+): los mensajes se repiten en cada vuelta, a la misma velocidad
- ✅ Tablero de pedidos enfocable con el teclado aunque esté vacío (axe: región con scroll sin nada enfocable)
- ✅ **Build de la API**: `pnpm --filter @mini-galu/api build` (esbuild, `apps/api/build.mjs`) arma `dist/main.js` con
  los paquetes del monorepo adentro (`sharp` queda afuera, es nativo) y `dist/migrate.js` con las migraciones copiadas
  en `dist/drizzle` (no necesita el monorepo para migrar). `start` corre el bundle con node; los e2e (local sin
  `pnpm dev` y CI) usan ese mismo bundle
- ✅ **Validación del entorno**: la API no arranca con la configuración rota y dice todo lo que falta de una vez. En
  producción exige `BETTER_AUTH_SECRET` (32+), Mercado Pago completo, `PUBLIC_API_URL` y `WEB_ORIGIN` con https, SMTP
  que no sea Mailpit y con usuario/clave, y avisa de Andreani o Google cargados a medias (`config.test.ts`)
- ✅ **Mails con Resend**: con `RESEND_API_KEY` todos los mails (pedidos, avisos, cartas, gift cards, cuenta) salen
  por la API de Resend (`ResendMailer`, sin SDK); sin la clave, SMTP (Mailpit en local y CI). Reintenta ante el
  límite por segundo (429, respeta `retry-after`) y fallas de Resend; un error de datos (dominio sin verificar) no se
  reintenta. En producción alcanza con Resend o un SMTP con credenciales. ⏳ Verificar el dominio en Resend (DNS)
- ✅ **Fotos en R2/S3**: con `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` y
  `MEDIA_PUBLIC_URL` (`S3_REGION`, por defecto `auto` para R2) las fotos del panel y sus variantes AVIF/WebP se suben
  al bucket (`S3ImageStorage`, firma SigV4 propia sin SDK, probada con el ejemplo de AWS; `Content-Type` y cache
  `immutable`; reintenta fallas 5xx) y la tienda las baja de su dominio público; sin bucket, disco y `/media` como
  antes. En producción el bucket es obligatorio (el disco del servidor se pierde al redeployar).
  `pnpm --filter @mini-galu/api media:upload [carpeta…]` sube las fotos que ya están en disco (seed o subidas antes)
  con sus variantes, sin tocar la base (las rutas no cambian). La web abre la conexión a `NEXT_PUBLIC_MEDIA_URL`
- ✅ **Deploy listo para cargar** ([DEPLOY.md](DEPLOY.md)): `apps/api/Dockerfile` (bundle + solo `sharp`, usuario
  `node`; al arrancar migra y levanta la API; toma `PORT`), `render.yaml` (Blueprint de Render desde `main`, `/health`,
  secreto de auth generado), Vercel con root `apps/web`, Neon (la API saca el `channel_binding` de su URL, que
  postgres.js mandaría como parámetro de sesión), R2 y Resend. Tienda y API en el mismo dominio: `COOKIE_DOMAIN` pone la
  cookie de sesión en `minigalu.com.ar` y la API no arranca en producción con hosts que no la compartan.
  `node dist/admin.js` crea la cuenta del taller sin correr el seed. El paquete `db` ya no busca la raíz del monorepo
  al importarse (el bundle fallaba fuera del repo). La CI construye la imagen y la arranca en modo producción sobre una
  base vacía (migra, `/health`, catálogo, cuenta del taller)
- ⏳ Webhook de Mercado Pago de producción y el resto de la puesta en marcha: ver "Deploy en AWS Lightsail" abajo

## Deploy en AWS Lightsail (todo en un lugar, ~US$16/mes) · listo para cargar
Decisión: un solo servidor Lightsail con Docker en vez de Render + Vercel + Neon + R2 + Resend
([ADR 0004](adr/0004-produccion-en-un-servidor-lightsail.md)). Lo que importa es **no perder pedidos ni datos**:
copia continua de la base fuera del servidor, restauración probada sola y avisos por mail. Guía en
[DEPLOY.md](DEPLOY.md); precios oficiales y plan de gastos en [COSTOS.md](COSTOS.md).
- ✅ Imagen Docker de la tienda (`apps/web/Dockerfile`, Next standalone con `NEXT_STANDALONE=1`)
- ✅ `deploy/docker-compose.yml`: Caddy (HTTPS automático, `www` redirige), tienda, API, Postgres 17 y backups, con
  reinicio automático, chequeos de salud y logs rotados. La tienda le habla a la API por adentro de la red (alias de
  Caddy) y los topes por IP siguen viendo la IP del cliente
- ✅ Base en un disco aparte (`DATA_DIR`, Lightsail block storage) que sobrevive al servidor
- ✅ Copia continua (WAL-G → bucket privado, `archive_timeout` 60 s): como mucho 1 minuto de atraso y se vuelve a
  cualquier momento de los últimos 30 días. Una base vacía nunca pisa el historial (`WALG_PREVENT_WAL_OVERWRITE`)
- ✅ Copia completa diaria (3:30) y `pg_dump` diario (4:00), 30 diarias + 12 mensuales, y uno antes de cada actualización
- ✅ Prueba de restauración semanal automática (domingos 5:00): restaura en una base aparte, compara pedidos, clientes y
  productos con la real, lee la última copia lógica y manda "Prueba de restauración OK"
- ✅ Avisos por mail (SES, cada 5 min): tienda o API caídas 10 min, base caída, cambios que no suben al bucket (falla o
  más de 5 esperando), copias de más de 27 h, prueba de más de 8 días, disco al 85%; repite cada 6 h y avisa "Resuelto".
  El servidor entero caído lo avisa la alarma de Lightsail
- ✅ Scripts: `deploy/bootstrap.sh` (Docker, swap, actualizaciones automáticas, disco), `deploy/update.sh` (copia +
  build + reemplazo) y `deploy/restore.sh` (a la última copia o a una hora)
- ✅ Pruebas sin AWS en la CI: `deploy/test/backups.sh` (rclone como bucket, Mailpit) y `deploy/test/stack.sh` (stack
  completo con HTTPS en `*.localhost`; reemplaza al job "Imagen de la API")
- ✅ **Portada de base**: en una base de producción nueva (sin seed) la tienda daba 500 en todas las páginas y el panel no
  podía guardar la portada. Ahora rige una portada de base sin fotos (`content/domain/home.ts`) y la home oculta lo
  vacío (colecciones, novedades, fotos del taller, lookbook, grilla de Instagram); el hero sin foto va sobre cacao
- ⏳ Crear la cuenta de AWS, el servidor, los buckets, SES y el dominio: pasos 1 a 10 de [DEPLOY.md](DEPLOY.md)
- ✅ **Sin datos fijos del seed en la tienda**: el pie lista las colecciones con prendas (como el mega menú); "Guía de
  talles" y "Tabla de medidas" (pie, mega menú, filtros del catálogo) llevan a la tabla de una prenda real (sin prendas,
  no se muestran); las fotos de "El taller" se eligen en **Portada de la tienda** (grande y chica, con su descripción;
  las dos o ninguna, y sin fotos la sección va solo con el texto); los avatares del lanzamiento son prendas de esa
  colección; la charla de ejemplo de Galú arma ocasión, talle y stock con el catálogo de ese momento
  (`features/home/home-picks.ts`) y la sugerencia "¿Cuánto sale el …?" nombra una prenda con stock

## Próximas tareas (pedidas por Gaby, sin mockup)
- ✅ **Reseñas reales** (módulo `reviews`). `/resena/MG-xxxx?t=…` (token del pedido, sin cuenta): por cada prenda
  de un pedido entregado, estrellas, texto, talle (opcional) y una foto (opcional; se vuelve a codificar en WebP
  sin metadatos: nada de GPS). Una por prenda; firma "Lucía F." y la ciudad del envío a domicilio. Se llega desde
  el botón "Dejar mi reseña" del mail "¿Cómo le quedó? ♡", Mi cuenta → pedidos ("Dejar reseña") y el WhatsApp
  "Pedir reseña" del detalle del pedido en el panel (lleva el link). Llegan **para revisar**; en `/taller/resenas`
  (número en el menú) Gaby las publica u oculta y elige las de **"Lo que dicen las familias"** (solo publicadas;
  ocultarla la saca del inicio). Ficha, home y estrellas de las tarjetas cuentan solo las publicadas; la foto del
  cliente se ve en la ficha y en la cinta de la home (si no subió, la de la prenda). Las del seed siguen siendo demo
  (publicadas; las cortas, en el inicio).
- ✅ **Puntos por reseñas** (módulo `points`; reemplaza el cupón `RESENA10` del mockup: uno por reseña era mucha
  pérdida y cualquiera que compraba una vez ya tenía el descuento). Solo suman las reseñas, y **cuando Gaby las
  publica** (evento `ReviewPublished`, una vez por reseña; ocultarla después no los saca): base 10 puntos, 20 con foto.
  Van al mail del pedido (sirve sin cuenta). Con 100 puntos el cliente canjea en **Mi cuenta → Puntos** (solo con el
  mail confirmado) un cupón personal `PUNTOS-XXXXX` de 10% que vale 60 días: un solo uso, solo con ese mail, no se
  lista en Cupones (columna `coupons.email`); si el cupón no se genera, los puntos vuelven. Dos canjes a la vez no
  gastan el mismo saldo (lock por mail). Todo se edita en la caja **"Puntos por reseñas"** de Tienda y pagos (se
  prende/apaga; muestra cuántas reseñas hacen falta por cupón). La página `/resena` cuenta cuánto suma cada reseña,
  el saldo y, si alcanza, lleva a canjear; el mail "¿Cómo le quedó? ♡" suma la regla. El público "Después de dejar una
  reseña" de los cupones se sacó (migración `0027`: si había uno, queda pausado).
  - ✅ **Mail "Sumaste N puntos ♡"**: regla nueva **"Sumó puntos"** en Automatizaciones (se pausa y el mensaje se
    edita: `{nombre}`, `{prenda}`, `{puntos}`, `{saldo}`). Cuando una reseña publicada suma (evento `PointsEarned`),
    le cuenta lo que sumó, el saldo y cuánto le falta (o que ya puede canjear); "Ver mis puntos" pasa por ingresar y
    vuelve a Mi cuenta → Puntos. Una vez por reseña; queda en el historial del pedido
  - ✅ **Puntos en la ficha del cliente** (panel → Clientes): saldo, cuánto le falta para el cupón y sus canjes
    (código, usado o vencimiento). Con los puntos apagados se ve solo si tiene saldo o canjes
- ✅ `transiciones.spec` en celular fallaba a veces contra `next dev`: React anima recién cuando llega la página y
  la primera visita compila la ruta (más de 5 s). El test pide antes la ficha y el inicio y espera hasta 15 s.
- ✅ **QA responsive (octubre 2026)**: barrido de la tienda y el panel en 320, 360, 375, 414, 600, 768, 820, 1024,
  1280, 1440, 1920 y 2560 (desborde horizontal, elementos fuera de pantalla, texto cortado, consola) más los estados
  abiertos (menú, buscador, bolsa, filtros, guía de talles, Galú, checkout completo, cuenta, seguimiento, reseña,
  link de pago). Sin desbordes en la tienda. Arreglado: la portada en celular bajaba la foto de 640 px y la estiraba
  (`sizes` según el alto); en iOS los campos van a 16 px (con menos, Safari agranda la página al tocarlos); botones
  largos parten en dos líneas en pantallas de 420 o menos (en Seguridad se salían de la tarjeta a 320); "¿Qué estás
  buscando?" ya no se corta en celular; al agregar desde la ficha se abre la bolsa sin el toast (tapaba "Ir a
  pagar"); el checkout con la bolsa vacía no muestra el resumen en $0
- ✅ **Suscriptores** (`/taller/suscriptores`, módulo `subscribers` de la API, solo para ver). Tres pestañas con lo
  más nuevo arriba: **Cartas del taller** (mail, desde dónde se sumó, suscripto o de baja; el CSV sigue en
  "Exportar cartas"), **Anotados a un lanzamiento** (cuál y cuándo sale) y **Aviso de talle** (prenda y talle). Cada
  fila dice si sigue esperando o ya se le avisó, busca por contacto, nombre, prenda o lanzamiento, y tiene el botón
  para escribirle (mail o WhatsApp). Si el mail o el WhatsApp coincide con una cuenta o un pedido, muestra el nombre y
  lleva a su ficha en Clientes.
- ✅ **Todo lo de la tienda sale de "Tienda y pagos"** (revisión QA de datos fijos). Un solo ajuste
  (`StorePolicies` de contracts, `content_blocks["policies"]`) que leen la API (checkout, envíos, ayuda, gift cards,
  Galú, mails, automatizaciones) y la tienda (`useStoreInfo` / `storeInfo`); cada caja del panel guarda solo lo suyo.
  - **Datos de la tienda** (caja nueva): WhatsApp, email, Instagram, localidad y provincia del taller. Pie, barra de
    contacto, ayuda, checkout, seguimiento, Galú, mails (también como *Reply-To*), SEO, "Seguinos" de la home y el
    panel de pedidos. Base: 381 319-5264 · mini.galu.store@gmail.com · San Miguel de Tucumán.
  - **Formas de entrega**: Andreani a domicilio, Andreani a sucursal, **Acordar envío**, Retiro en el taller y
    **Cadete** (solo en los CP de la ciudad del taller; base 4000, desde $3.000), cada una prendible. Acordar y
    cadete se eligen en el checkout, guardan la dirección, no se cobran en la web y el pedido arranca con "Coordinar el
    envío" por WhatsApp (sin etiqueta de Andreani). Sin tabla de precios por zona: Andreani cotiza con Andreani; sin
    credenciales, simulado en local y CI, y en producción no se ofrece. Si Andreani no responde no hay precio
    inventado: se pide elegir otra entrega.
  - **Vigencia de las gift cards** (caja Gift cards): vencimiento, /giftcards y términos. Base: 2 meses.
  - **Páginas de ayuda con variables** (`{dias_cambio}`, `{meses_gift_card}`, `{email}`, `{whatsapp}`, `{taller}`,
    `{provincia}`, `{horario_retiro}`): el panel muestra la variable y la tienda el valor de ese momento.
  - "Tienda y pagos" como la dejó Gaby es la base del seed; los e2e que tocan ajustes devuelven lo que había.
- ✅ **Galú sin IA, más completo** (sin modelo por costo: la tienda responde por reglas, `galu-engine.tsx`).
  - **Lo enseñado responde sin modelo**: antes que las reglas, la tienda pregunta `GET /assistant/taught?q=…` y la
    API busca en lo que Gaby enseñó (`matchTaught`: la misma pregunta escrita distinto o una con casi todas sus
    palabras, sin plurales ni relleno; si nada se parece lo suficiente, siguen las reglas). Las respuestas pueden
    llevar `{whatsapp}`, `{email}`, `{dias_cambio}`, `{horario_retiro}`… (las de ayuda), también con modelo.
  - **Biblioteca editable**: en "Lo que ya sabe" cada respuesta se corrige (lápiz → "Corregí la respuesta") o se
    olvida; si la pregunta cambia y estaba pendiente, deja de estarlo.
  - **Temas nuevos con el catálogo y Tienda y pagos**: telas y cuidados (de la prenda que se mira, con los cuidados de
    la ficha, o las telas del catálogo), colores reales del catálogo, colecciones, lo más nuevo, cambios de talle
    (días de Tienda y pagos + ayuda) y retiro en el taller (horarios). Todo filtra por talle si se lo dicen.
    "Rojo" o "bordado" ya no se toman como el nombre de una prenda.
  - Lo que siga sin saber va a "Enseñale" como hasta ahora.

- ✅ **Carga con skeletons en toda la web (tienda y panel)**. Al navegar ya no queda la pantalla anterior: cada ruta
  tiene su `loading.tsx` con la forma de lo que viene (inicio con el hero, catálogo, ficha, ayuda, checkout y link de
  pago, Mi cuenta, gift cards y listas; ingresar, seguimiento, reseña y baja con forma de formulario; una sección
  genérica para el panel). El inicio pasó al grupo `(shop)/(inicio)` para que su skeleton no envuelva a las demás.
  - Piezas en `ui/`: `atoms/Skeleton` (lino con un brillo que pasa), `molecules/SkeletonLines`, `SkeletonCard(s)`,
    `SkeletonRows` y `organisms/Loading` (anuncia "Cargando…"). Fundido corto y demorado para que una carga rápida no
    parpadee; quietos con `prefers-reduced-motion` y `?static`.
  - La foto del skeleton de la ficha se llama `product-hero`: la de la tarjeta sigue viajando aunque la ficha no llegó.
  - En el cliente: Mi cuenta (datos de la sesión), los cajones de pedido y cliente del panel y "Sumar a la lista".
    La bolsa (localStorage) y Galú (tres puntitos) ya mostraban algo mientras tanto.
  - `CraftEffects` espera a que React hidrate la página (llega por streaming dentro del Suspense del `loading.tsx`) y
    observa el contenedor del `<main>`, que ahora se reemplaza.
  - Con streaming, un `notFound()` (ficha, tema de ayuda, lista… que no existe) ya no puede responder 404: sale 200
    con `<meta name="robots" content="noindex">`, como documenta Next. El título de la página llega con ella (durante
    el skeleton queda vacío)
  - e2e `carga.spec.ts` con conexión lenta (CDP): se ve el skeleton, nunca junto a la página anterior, y después el
    contenido. `next dev` no prefetchea: en producción el skeleton sale al instante (el `loading.tsx` se prefetchea)
- ✅ **Panel sin transición de página**: desde la view transition de la tienda (15/10) cada cambio de sección en
  `/taller` sumaba ~0,7 s (la página vieja se desenfocaba y la nueva subía) y se veía la captura congelada de la
  anterior. Los mockups del panel no la tienen: se sacó su `template.tsx` (la tienda la conserva) y un e2e lo cuida

## Antes del lanzamiento con clientes reales (Gaby monotributista)
- ✅ **Factura electrónica automática** (módulo `invoicing`, puerto `InvoiceIssuer`): al aprobarse el pago se emite
  la factura C (consumidor final, concepto productos) y va adjunta al "Recibimos tu pago"; al reintegrar, la nota de
  crédito C (con la factura asociada) va adjunta al aviso del reintegro. Se emite de a una (ARCA numera en orden).
  - `ArcaIssuer`: WSAA (TRA firmado como CMS con `node-forge`; el ticket de 12 h se guarda en `arca_tokens` para
    sobrevivir reinicios) + WSFEv1 (`FECompUltimoAutorizado`, `FECAESolicitar`, `FECompConsultar`). Variables
    `ARCA_*` (paso 9 de [DEPLOY.md](DEPLOY.md)). Sin ellas: `SimulatedIssuer` en local y CI (el PDF dice "sin validez
    fiscal") y `NoIssuer` en producción (no se inventa un CAE: queda sin facturar y el panel avisa)
  - Si ARCA no contesta: pendiente, se reintenta sola (1, 5, 15, 30 min y después cada hora) y le llega sola al
    cliente cuando se emite. El número intentado se guarda antes de pedir el CAE: si la respuesta se perdió, al
    reintentar se consulta y se recupera (no se emite otra). Rechazo de ARCA o 3 intentos fallidos → "Con error" en el
    detalle (con "Reintentar con ARCA") y en la campana
  - PDF A4 (`pdf-lib` + QR de la RG 4892 con `qrcode`), desde `/admin/invoices/:id/pdf`. Montos con centavos
    (`formatARSExact`)
  - Qué se factura: los pedidos de prendas por su total (la gift card es un medio de pago); la compra de una gift card
    no (es un vale: se factura al canjearla). ⏳ Confirmarlo con el contador de Gaby
  - Las ventas fuera de la web (mayoristas en puerta) se facturan a mano
  - ⏳ Probarlo contra homologación de ARCA con un certificado de prueba (WSASS) y después en producción
- ✅ **Botón de arrepentimiento** (Res. 424/2020, Ley 24.240): link quieto en la cinta (primera pantalla), en el pie y
  en la ayuda de cambios; `/arrepentimiento` sin cuenta, con número de pedido y mail (mismo error si no coinciden, tope
  por IP). Da un código `ARR-` en pantalla y por mail (si la vuelve a pedir, el mismo), lo anota en el historial y el
  taller lo ve en la campana, la tarjeta y el detalle (fuera de los 10 días se registra igual, marcada); el reintegro
  se hace desde Pago. Recuperado de `4c967d6` con la migración `0029_order_revocations`
- ✅ **Datos fiscales en la tienda**: cargables desde "Datos de la tienda" (nombre o razón social, domicilio,
  Ingresos Brutos, inicio de actividades; el CUIT es el de `ARCA_CUIT` y el panel lo muestra sin dejar editarlo), se
  imprimen en las facturas y el pie muestra nombre, CUIT y domicilio (solo lo cargado). **Data Fiscal** (formulario
  960): Gaby pega el link o el HTML que da ARCA (se queda con el link de `qr.afip/arca.gob.ar`) y el pie muestra el QR
  (SVG con `qrcode`, sin imagen de ARCA) que abre el formulario. ⏳ Cargar el link real cuando Gaby lo saque en ARCA
- ✅ **Textos legales en la ayuda** (texto de base; Gaby los puede ajustar desde el panel):
  - Términos: arrepentimiento (Ley 24.240, art. 34: 10 días corridos, sin costo, con el botón), garantía legal de 6
    meses (art. 11), factura por mail y reclamos en la Ventanilla Federal Única de Defensa del Consumidor
  - Privacidad (Ley 25.326): responsable, con quién se comparten los datos (Mercado Pago, Andreani, ARCA, mails, Galú,
    AWS en San Pablo), cuánto se guardan, derechos (acceso en 10 días corridos, corrección o borrado en 5 hábiles),
    acceso gratis cada 6 meses y la leyenda de la AAIP
  - Variable `{responsable}`: nombre, CUIT y domicilio de "Datos de la tienda" (sin cargar, "Mini Galú")
  - Los `https://…` del texto de ayuda son links. El pie suma "Defensa de las y los consumidores: para reclamos
    ingresá acá" (formulario de la Ventanilla Federal Única, `CONSUMER_CLAIMS_URL` de contracts)
  - ⏳ Que lo revise el contador o un abogado de Gaby. ⏳ Inscribir la base de clientes en el Registro Nacional de
    Bases de Datos de la AAIP

## QA completo (octubre 2026, segunda vuelta) · en curso
- ✅ **Fluidez en equipos modestos**: con el procesador 4× más lento (Chrome) el inicio iba a ~30 cuadros por segundo
  aun quieto. Ahora 60 en reposo y al scrollear (inicio, catálogo, ficha y ayuda; 375 y 1440), sin cambios a la vista:
  - El grano de papel ya no usa `mix-blend-mode` (con su alfa la diferencia es de 1/255 por canal) y no obliga a
    recomponer toda la pantalla en cada cuadro
  - La cinta de anuncios, el sello y la flecha del hero y los puntos del lookbook se congelan fuera de la pantalla
    (`pauseOffscreen`); la cinta de reseñas corre solo mientras se ve
  - El fondo oscuro de la bolsa y los cajones (`.scrim`) se oculta cerrado: su desenfoque se calculaba igual
  - Los skeletons de un modal o cajón cerrado (ej. "Sumar a una lista" en la ficha) no animan
- ✅ **Entrada del hero fluida**: la foto entraba con un `filter: blur` animado a pantalla completa (~15 cuadros por
  segundo en una pantalla de 3437 px; con la placa de video sin usar, peor). Ahora la foto solo escala y el desenfoque
  lo da su miniatura de 320 px agrandada encima, que se desvanece (y se ve mientras baja la foto grande). El sello que
  gira rota un `span` y no el `svg` (Chrome anima un svg en el hilo principal: un layout por cuadro). Con la placa,
  ~60 cuadros por segundo a 3437 px; con el procesador 6× más lento, ~50 en celular, compu y pantalla ancha
- ✅ **Pagos con el Brick real (sandbox de Mercado Pago)**: APRO aprueba con mail y factura, OTHE rechaza y se
  reintenta en el mismo pedido, CONT queda en revisión. Arreglado en el camino:
  - El rechazo no se mostraba (el mensaje solo llegaba al Brick simulado) y el Brick quedaba trabado en "procesando":
    ahora el aviso se ve y se puede reintentar (checkout y link de pago)
  - El botón "Pagar" pasaba al azul de Mercado Pago al tocarlo: hover y presionado con los colores del taller
  - Un pago en revisión dejaba vencer la reserva a los 30 minutos (la prenda volvía a la venta mientras Mercado Pago
    decidía): ahora queda reservada hasta 72 h y se anota "Pago en revisión" en el historial
  - Respaldo del webhook: cada 10 minutos se vuelve a consultar a Mercado Pago lo que sigue en revisión (última
    semana). Si un aviso se pierde (servidor caído, actualización) el pedido igual se resuelve
- ✅ **Dinero en cuenta (sandbox)**: el Brick abre Mercado Pago en otra pestaña y la de la tienda quedaba con
  "Pagar" trabado; si además el aviso no llegaba y el cliente cerraba Mercado Pago sin volver, la tienda nunca se
  enteraba y a los 30 minutos cancelaba un pedido cobrado. Ahora la pestaña dice "Seguí en la pestaña de Mercado
  Pago" y pregunta cada 4 s (`/checkout/orders/:n/check`, la API busca el pago por la referencia del pedido) y muestra
  la confirmación sola; la consulta de respaldo también busca así los pedidos sin pagar o vencidos de la última semana
- ✅ **Reintegros con el sandbox**: tarjeta (API de Orders) reintegrada en Mercado Pago, nota de crédito C y mail
  con la nota. Si Mercado Pago no deja reintegrar, el error queda fijo en el detalle (antes era un aviso que se iba
  solo). ⏳ Dinero en cuenta: el sandbox responde 401 "Unauthorized use of live credentials" al reintegrar por la API
  de Payments con el usuario de prueba; probarlo con las credenciales de Gaby
- ✅ **Factura de lo pagado con gift card**: se facturaba solo lo cobrado por Mercado Pago (gift card $2.100 + tarjeta
  $400 → factura de $400 con renglones que sumaban $2.500) y un pedido pagado entero con gift card no se facturaba.
  Ahora la factura es por la venta entera (`invoiceTotal`) y la forma de pago dice "Gift card $12.000,00 + Tarjeta
  de crédito"
- ✅ Gift cards con el Brick real: compra (mails a quien compra y a quien recibe), canje total y parcial (el Brick
  cobra solo la diferencia). Con la gift card cubriendo todo ya no se arma el Brick (pedía la preferencia de un
  pedido pagado: 409)
- ✅ Link de pago con el Brick real: aprobado, rechazado con reintento y "ya está pagado" al volver a abrirlo. El
  Brick se arma en el navegador (en el servidor rompía el render del link: `getComputedStyle`)
- ✅ Arrepentimiento con una compra del sandbox: código por mail, campana y detalle del panel, reintegro y nota de
  crédito
- ✅ Ciclo del pedido a domicilio: preparar, etiqueta Andreani (simulada), despachado con número de seguimiento y mail
  "Tu pedido ya salió"
- ✅ Galú sin modelo (Ollama apagado) sigue con las reglas. Arreglado: "¿qué vestidos tenés en talle 8?" contestaba
  por una prenda cuyo slug empezaba con "vestido"; ahora un tipo de prenda no nombra un modelo
- ✅ Alta de una prenda desde el panel (foto, talles, stock, publicar), compra con el sandbox y talle agotado con
  "Avisame". Cuenta: alta, confirmar el mail, datos precargados en el checkout, compra y "Pedidos" con seguimiento
- ✅ Catálogo: antes de hidratar, el botón activo de "Vista" (texto claro) quedaba sobre lino, casi invisible (lo
  detectó axe en el CI, que es más lento): ahora lleva su fondo hasta que el JS ubica la perilla
- ✅ Bolsa: dos sincronizaciones a la vez (dos pestañas, ingresar con la bolsa abierta) fallaban con "Algo salió mal"
  por clave duplicada; ahora se hacen de a una por bolsa
- ✅ La aguja de la costura ensanchaba la página un instante al salir por la derecha
- ✅ Ficha en compu: antes de que arrancara Swiper las miniaturas quedaban en fila detrás de la ficha
- ✅ e2e que tomaban el `<main>` del skeleton junto con el de la página (ajustes, reseñas)

## Orden de lo que sigue (decidido el 22/10/2026)
1. ✅ **QA completo** de punta a punta: panel (como Gaby) y tienda (con y sin cuenta, todos los medios de pago). Ver
   "QA completo (octubre 2026, segunda vuelta)". Salieron estas tareas:
   1. ✅ **Anular un pedido sin pagar** desde el panel (un link de pago armado por error dejaba las prendas
      reservadas 72 h). En el detalle de un pedido que espera pago, "Anular pedido" con motivo: las prendas vuelven a
      la tienda en la misma transacción, queda "Anulado por el taller" en el historial y sale del tablero. El link
      dice "Este link se anuló" (el comprobante distingue `cancelledBy`: taller o vencimiento). Un pagado no se anula:
      se reintegra. Si Mercado Pago estaba revisando un pago y se aprueba igual, vuelve a reservar o avisa para
      reintegrar (como un pago que llega con la reserva vencida). `POST /admin/orders/:n/cancel`, e2e en `taller.spec`
   2. ✅ **Cambio de talle** desde el detalle de un pedido pagado: por prenda, otro talle del mismo modelo con stock
      (cuántas unidades, si la devuelta vuelve al stock y motivo). En una transacción sale el talle nuevo y vuelve el
      devuelto (el renglón se separa si cambia una de varias); mismo precio, sin plata ni factura nueva. Queda "Cambio
      de talle" en el historial y le llega un mail al cliente. `POST /admin/orders/:n/exchange`, e2e en `taller.spec`.
      El envío del talle nuevo de un pedido ya entregado se coordina por WhatsApp (sin etiqueta Andreani nueva)
   3. ✅ **Devoluciones parciales**: en el detalle de un pedido de prendas pagado, "Devolver algunas prendas" (cuántas
      de cada una, si vuelven al stock y motivo). Vuelve su precio menos su parte del cupón (el envío no); lo pagado con
      gift card vuelve a su saldo en la misma proporción y el resto por Mercado Pago con monto parcial (o en efectivo).
      Las unidades se apartan antes de pedirle la plata a Mercado Pago (dos clics no devuelven dos veces) y quedan
      marcadas: no se cambian ni se vuelven a devolver. Una nota de crédito C por cada devolución (si la factura
      todavía no se emitió, la nota la espera), mail al cliente con la nota y el resumen de ventas sin lo devuelto.
      Después, "Reintegrar lo que queda" devuelve el resto con su nota. `POST /admin/orders/:n/return`, e2e en
      `taller.spec`
   4. ✅ **Casilla de las Cartas del taller desmarcada** al crear la cuenta: la Ley 25.326 pide consentimiento
      expreso (decidido el 22/10/2026). Cambiados el registro y el mockup `ingresar.html`; con Google ya entraba sin
      suscribir. e2e en `account.spec`
2. ✅ Meta (lo que no depende de terceros ya está; falta probarlo con las cuentas de Gaby):
   1. ✅ **Feed de Instagram** en la grilla de la portada: con `INSTAGRAM_ACCESS_TOKEN` (Instagram API with Instagram
      Login, `graph.instagram.com/v26.0/me/media`) las últimas 6 publicaciones (del video, su miniatura; del carrusel,
      la primera foto) y cada una abre su posteo. El programador las trae cada hora y renueva el token cada semana
      (dura 60 días; el renovado se guarda en `content_blocks["instagram"]`, y si Gaby pone otro en el `.env`, rige
      ese). La tienda lee lo guardado (una caída de Instagram no demora la portada); si falla, queda el feed anterior
      hasta 2 días (las URL del CDN vencen). Sin token, las fotos del seed. Cómo sacar el token: "Feed de Instagram" en
      [DEPLOY.md](DEPLOY.md). ⏳ Probarlo con la cuenta de Gaby (pasarla a profesional si no lo es)
   2. ✅ **Avisos por WhatsApp** (Cloud API, `graph.facebook.com/v26.0/<número>/messages`): con `WHATSAPP_TOKEN` y
      `WHATSAPP_PHONE_NUMBER_ID`, cada aviso es una plantilla aprobada con el texto de la regla adentro
      (`aviso_pedido`, utilidad: pago aprobado, despachado, listo para retirar, pedido de reseña y recordatorio del
      link de pago; `aviso_novedad`, marketing: volvió un talle y lanzamiento). Los de un pedido salen por mail **y
      además** por WhatsApp si el cliente lo pidió (el mail es el respaldo; en el panel cuentan una vez); los anotados
      que dejaron su WhatsApp reciben la novedad por ahí. Si Meta no lo acepta, queda "Con aviso" en el registro con
      su código. Interruptor "Avisos por WhatsApp" en el seguimiento (con el token del pedido), "Tu WhatsApp" en
      "Enviarme una prueba" y el canal "Conectado". Sin credenciales: en local y CI simulado (a Mailpit,
      `<número>@whatsapp.simulado`); en producción, sin conectar (solo mail). Plantillas y token: "Avisos por
      WhatsApp" en [DEPLOY.md](DEPLOY.md). ⏳ Probarlo con el número de prueba de Meta y después con el del taller
      (ver la coexistencia con la app WhatsApp Business) · ⏳ webhook de estados de Meta (saber si un mensaje no
      llegó): hoy alcanza con que el mail salga siempre
3. ⏳ AWS (pasos 1 a 10 de [DEPLOY.md](DEPLOY.md)) cuando estén las credenciales de Mercado Pago y Andreani de Gaby,
   para probar la web con pagos y envíos reales. Después, el reporte mensual
4. ⏳ Lo que revisan Gaby, su contador y su abogado: al final, con la web en producción
- ✅ Opcional: **sucursales Andreani en un mapa**. En el checkout, debajo de "¿En qué sucursal lo retirás?", un plano
  con las sucursales del CP (teselas de OpenStreetMap llevadas a los tonos de la tienda con un filtro, sin librería
  de mapas ni claves): tocar un pin elige la sucursal y el selector dice a cuántos km está cada una de la del CP
  (`ShippingBranch` trae `lat`, `lng` y `km`). Sin coordenadas, sin mapa. Lógica en `checkout/branch-map.ts` (Vitest),
  e2e en `checkout.spec`. No está en el mockup `checkout.html`

## Ideas para después (de IDEAS.md)
- No se hacen: Google Merchant. Fotos de clientes: solo en las reseñas
- Muy a futuro (cuando la web ande sola): costos por prenda, stock de materiales y, con eso, varias usuarias con
  permisos. Club Mini Galú: solo si sale la idea
- Sin decidir: cupones automáticos, referidos, "talles que crecen", PWA del panel con push (instalar el panel en el
  celular y recibir avisos de pedidos), Umami (estadísticas de visitas sin cookies)
- Backups: hechos (ver "Deploy en AWS Lightsail")
