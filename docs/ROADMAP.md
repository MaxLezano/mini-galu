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
- 🟡 Calculá tu envío: estimación local como el mockup → cotización Andreani real en la fase 5
- ✅ Sumar a una lista de cumple (elegir la nena; sin sesión, a ingresar y vuelve)

### Galú (demo con reglas sobre el stock real)
- ✅ Moño flotante con pista, panel, sugerencias, saludo contextual en la ficha, tarjetas con "Agregar"
- ✅ Responde talles, stock, precios, cuotas, envíos, ocasiones, regalos, colores, presupuesto, a medida
- 🟡 "¿Dónde está mi pedido?": pide el número → con pedidos reales en la fase 5
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
- 🟡 Fotos: ✅ AVIF/WebP en varios tamaños (sharp, ver fase 9) · ⏳ recorte 3:4 al subir
- ✅ Resumen del día y notificaciones (campana) → fase 4
- ✅ `admin-lanzamientos`: crear/editar/programar/borrar borradores, "usar de base", portada (elegir o subir), prendas,
  cuenta regresiva en la home, texto para redes con copiar, vista previa, `?nuevo` abre el editor; la API publica sola las
  prendas a la hora indicada (scheduler cada 60 s)
- ⏳ Lanzamientos: envío del aviso a anotados 1 h antes → fase 6; "visitas al adelanto" → fase 9 (Umami);
  "favoritos" → fase 8; "vendidas el primer día" → fase 4
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

## Fase 5 · Envíos (`seguimiento.html`) · terminada
- ✅ FakeAndreani: número de seguimiento, etiqueta PDF 10×15 (marcada de prueba) y eventos que avanzan con el reloj
  (retirado, centro de distribución, en tránsito, a reparto / en sucursal, entregado); `FAKE_ANDREANI_SPEED` acelera
- ✅ "Generar etiqueta Andreani" en el panel (pasa a listo, guarda el número, abre el PDF); "Imprimir etiqueta" y
  "Seguimiento" en el detalle; en camino con etiqueta, el siguiente paso es "Ver seguimiento"
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
- 🟡 Envío gratis desde un monto, formas de entrega y horarios de retiro editables → fase 10 · sucursal en un mapa →
  más adelante
- 🟡 Interruptor "Avisos por WhatsApp" en el seguimiento y aviso de despacho → fase 6 · "Probá con" del mockup era
  solo demo

## Fase 6 · Automatizaciones (`admin-automatizaciones.html`) · terminada (WhatsApp espera credenciales)
- ✅ Módulo `automations`: reglas activables con mensaje editable (vista previa e "insertar dato"), registro de lo
  que se hizo solo, métricas del mes (mensajes, tiempo ahorrado, ventas por avisos de talle, links recuperados),
  canales y "Enviarme una prueba"
- ✅ Pago aprobado (mail con el texto de la regla) · despachado con link de seguimiento · listo para retirar con el
  horario · pedido de reseña a los 3 días de entregado · volvió un talle (mail a los anotados, en orden) · link de
  pago sin pagar (24 h) · stock bajo (aviso en el panel)
- ✅ Mails con el marco del taller (Mailpit en local); cada aviso queda en el historial del pedido
- 🟡 WhatsApp Business: "sin conectar" hasta tener las credenciales de Meta (los anotados solo por WhatsApp quedan
  esperando) · ✅ Resend en producción (fase 10)
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
  apellido) y `cotizar_envio`; el modelo no inventa datos y las prendas consultadas salen como tarjetas con "Agregar"
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
- 🟡 Las charlas por reglas (sin modelo) no se guardan; "Pidieron aviso de talle" no se mide (el aviso se pide en
  la ficha, no en la charla) y quedó "Le enseñaste" en su lugar; sin contador de pendientes en el menú

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
- 🟡 La diferencia de una venta en el taller se cobra con el link de Mercado Pago (no hay registro de efectivo)
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

## Fase 9 · Pulido / Fase 10 · Deploy
- ✅ Páginas de ayuda (`/ayuda/cambios`, `envios-y-pagos`, `terminos`, `privacidad`; sin mockup propio, con el lenguaje
  de seguimiento y la ficha): navegación entre temas, índice "En esta página", contacto (Galú, WhatsApp, mail) y links
  a términos y privacidad en el pie. Texto de base con lo que ya dice la tienda (30 días, Andreani, retiro, cuotas,
  envío gratis) y la ley (arrepentimiento de 10 días, Ley 25.326 y leyenda de la AAIP); "Páginas de ayuda" en Tienda y
  pagos edita título, bajada y apartados (párrafos y listas con "- "), y vuelve al texto de base
- ⏳ Que Gaby revise los textos (y, antes del deploy, términos y privacidad con quien la asesore)
- ✅ **Botón de arrepentimiento** (Res. SCI 424/2020; sin mockup, lenguaje de seguimiento y ayuda): link quieto a la
  derecha de la barra de novedades (primera pantalla de todas las páginas), en el pie y en el apartado de la ayuda.
  `/arrepentimiento` pide número de pedido, mail de la compra y motivo opcional, sin cuenta; da al instante un código
  `ARR-XXXXXX` (una solicitud por pedido: si se repite, el mismo código) y lo manda por mail, con aviso al mail de la
  tienda. Mismo error si el pedido no existe o el mail no coincide; no aplica a pedidos sin pagar o cancelados; fuera
  de los 10 días desde la entrega igual se registra, marcada. Tope de 20 por IP cada 10 min en producción. En el panel:
  campana, etiqueta en la tarjeta, aviso en el detalle e historial (módulo `orders`, tabla `order_revocations`).
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
  checkout, ayuda, Galú) y tarifas por zona AMBA/centro/resto (las usa el checkout sin Andreani y la ficha). Los textos
  de base de la ayuda siguen las políticas; si Gaby editó esas páginas, el panel le avisa que las revise
- ✅ Apartados de la ayuda que se apagan sin borrarlos ("Visible"); el de **arrepentimiento** en Cambios queda
  bloqueado ("Obligatorio": Ley 24.240 y Res. SCI 424/2020) y la API no deja guardar la página sin él visible
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
- ⏳ Docker + Render/Fly + Vercel + Neon · guía de deploy

## Ideas para después (de IDEAS.md)
Cupones automáticos, feed Instagram/Facebook Shops, Google Merchant, fotos de clientes, referidos,
Club Mini Galú, "talles que crecen", PWA del panel con push, etiquetas en lote, reporte mensual, costos por prenda,
stock de materiales, varias usuarias con permisos, Umami, backups.
