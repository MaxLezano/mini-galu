/* Mini Galú — Panel del taller (admin): armazón, detalle de pedido, plantillas de WhatsApp, links de pago y lista de preparación.
   Simulado en el navegador; en la app real: api/orders, api/payments (Mercado Pago), api/shipping (Andreani), api/notifications. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  document.addEventListener("mg:ready", () => {
    const { D, bySlug, img, money, icon, brand, toast, openModal, closeModals, BOW } = MG;
    const page = document.body.dataset.adm;

    /* ---------------------------------------------------------------- helpers de dominio */
    const cust = (o) => D.customers[o.c];
    const subtotal = (o) => o.items.reduce((a, [s, , q]) => a + bySlug[s].price * q, 0);
    const total = (o) => subtotal(o) + o.ship[1];
    const status = (k) => D.statuses.find((s) => s.key === k);
    const units = (o) => o.items.reduce((a, [, , q]) => a + q, 0);
    const shipIcon = { domicilio: "truck", sucursal: "store", taller: "house" };
    const shipShort = { domicilio: "Domicilio", sucursal: "Sucursal", taller: "Retira" };
    const payShort = { credito: "Crédito", debito: "Débito", dinero_cuenta: "Dinero en cuenta", link: "Link MP", giftcard: "Gift card" };
    const flowIdx = { esperando_pago: 0, nuevo: 1, preparando: 2, listo: 3, en_camino: 4, entregado: 5 };
    const counts = () => Object.fromEntries(D.statuses.map((s) => [s.key, D.orders.filter((o) => o.status === s.key).length]));
    const lowStock = () => D.products.filter((p) => !p.draft).flatMap((p) => Object.entries(p.sizes).filter(([, n]) => n <= 1).map(([s, n]) => ({ p, s, n })));
    const changed = () => { renderSideCounts(); document.dispatchEvent(new CustomEvent("adm:changed")); };

    function nextAction(o) {
      const taller = o.ship[0] === "taller";
      return {
        esperando_pago: { label: "Reenviar link de pago", icon: "send", wa: "recordatorio" },
        nuevo: { label: "Empezar a preparar", icon: "scissors", to: "preparando" },
        preparando: taller ? { label: "Marcar listo para retirar", icon: "package-check", to: "listo", auto: "Se avisó al cliente que puede pasar a retirar" } : { label: "Generar etiqueta Andreani", icon: "printer", to: "listo", auto: "Etiqueta generada y número de seguimiento guardado" },
        listo: taller ? { label: "Marcar como retirado", icon: "circle-check", to: "entregado" } : { label: "Marcar despachado", icon: "truck", to: "en_camino", auto: "Se le mandó el link de seguimiento por WhatsApp" },
        en_camino: { label: "Ver seguimiento", icon: "external-link", href: `seguimiento.html?pedido=${o.id}` },
        entregado: { label: "Pedir reseña", icon: "star", wa: "resena" },
      }[o.status];
    }

    function moveOrder(o, to, silent) {
      if (!to || o.status === to) return;
      o.status = to;
      if (to === "listo" && o.ship[0] !== "taller" && !o.tracking) o.tracking = "3600024187" + Math.floor(10000 + Math.random() * 89999);
      o.when = "recién";
      const msgs = { preparando: "Pedido en preparación", listo: o.ship[0] === "taller" ? "Listo para retirar · se avisó al cliente" : "Etiqueta Andreani generada", en_camino: "Despachado · se envió el seguimiento por WhatsApp", entregado: "Pedido cerrado", nuevo: "Pago registrado · stock descontado" };
      if (!silent) toast(`#${o.id} · ${msgs[to] || status(to).label}`, status(to).icon);
      changed();
    }

    function timeline(o) {
      const c = cust(o);
      const pay = D.payLabel[o.pay[0]] + (o.pay[1] > 1 ? ` · ${o.pay[1]} cuotas` : "");
      const ev = [];
      const i = flowIdx[o.status];
      if (i >= 5) ev.push(["circle-check", "Entregado", "Andreani informó la entrega", true]);
      if (i >= 4) ev.push(["truck", "Despachado", `WhatsApp a ${c.name.split(" ")[0]} con el seguimiento`, true]);
      if (i >= 3) ev.push(o.ship[0] === "taller" ? ["store", "Listo para retirar", "Se avisó por WhatsApp con dirección y horarios", true] : ["printer", "Etiqueta Andreani generada", o.tracking ? `Nº ${o.tracking}` : "", false]);
      if (i >= 2) ev.push(["scissors", "En preparación", "Gaby", false]);
      if (i >= 1) ev.push(["badge-check", "Pago aprobado por Mercado Pago", `${pay} · stock descontado · mail y WhatsApp de confirmación`, true]);
      ev.push([o.channel === "Galú" ? "message-circle-heart" : o.channel === "Instagram" ? "instagram" : o.channel === "WhatsApp" ? "whatsapp" : "shopping-bag", i === 0 ? "Link de pago generado y enviado" : `Pedido creado desde ${o.channel}`, o.note || o.date, i === 0]);
      return ev.map(([ic, t, s, auto]) => `<li class="${auto ? "auto" : ""}"><span class="d">${ic === "instagram" || ic === "whatsapp" ? brand(ic) : icon(ic)}</span><div><b>${t}</b>${auto ? '<span class="tag-auto">auto</span>' : ""}<small>${s}</small></div></li>`).join("");
    }

    /* ---------------------------------------------------------------- armazón */
    const nav = [
      ["Día a día", [["admin.html", "resumen", "layout-dashboard", "Resumen"], ["admin-pedidos.html", "pedidos", "inbox", "Pedidos", "pedidos"], ["admin-lanzamientos.html", "lanzamientos", "calendar-heart", "Lanzamientos"]]],
      ["Tienda", [["admin-productos.html", "productos", "shirt", "Productos", "stock"], ["admin-clientes.html", "clientes", "users", "Clientes"], ["admin-galu.html", "galu", "message-circle-heart", "Galú", "galu"]]],
      ["Ajustes", [["admin-automatizaciones.html", "automatizaciones", "workflow", "Automatizaciones"], ["admin-tienda.html", "tienda", "store", "Tienda y pagos"]]],
    ];
    const side = `<aside class="adm-side" id="adm-side">
      <a class="logo" href="admin.html"><span class="bow">${BOW}</span>Mini Galú<small>taller</small></a>
      <nav aria-label="Panel">${nav.map(([h, items]) => `<h6>${h}</h6>` + items.map(([href, key, ic, label, cnt]) => `<a href="${href}" ${page === key ? 'aria-current="page"' : ""}>${icon(ic, "i-sm")}${label}${cnt ? `<span class="n" data-count="${cnt}"></span>` : ""}</a>`).join("")).join("")}</nav>
      <div class="who"><span class="av">G</span><div><b>Gaby</b><br><span style="opacity:.6">Dueña</span></div><a href="index.html" aria-label="Ver la tienda">${icon("external-link", "i-sm")}</a></div>
    </aside><div class="scrim adm-scrim" id="adm-scrim"></div>`;
    const top = `<header class="adm-top">
      <button class="icon-btn burger" id="burger" aria-label="Abrir menú">${icon("menu")}</button>
      <div class="adm-search"><span>${icon("search", "i-sm")}</span><input id="gsearch" placeholder="Buscar pedido, cliente o prenda…" autocomplete="off" aria-label="Buscar"><kbd>/</kbd><div class="search-pop" id="search-pop"></div></div>
      <span class="spacer"></span>
      <div class="bell-wrap"><button class="icon-btn" id="bell" aria-label="Notificaciones">${icon("bell")}<span class="badge" id="bell-n" data-n="0"></span></button><div class="notif" id="notif"></div></div>
      <a class="btn btn-sm btn-ghost store-link" href="index.html">${icon("eye", "i-sm")}<span>Ver tienda</span></a>
    </header>`;
    const tabbar = `<nav class="adm-tabbar" aria-label="Accesos rápidos">
      <a href="admin.html" ${page === "resumen" ? 'aria-current="page"' : ""}>${icon("layout-dashboard")}Resumen</a>
      <a href="admin-pedidos.html" ${page === "pedidos" ? 'aria-current="page"' : ""}>${icon("inbox")}Pedidos<span class="n" data-count="pedidos"></span></a>
      <a href="admin-lanzamientos.html" ${page === "lanzamientos" ? 'aria-current="page"' : ""}>${icon("calendar-heart")}Lanzar</a>
      <a href="admin-productos.html" ${page === "productos" ? 'aria-current="page"' : ""}>${icon("shirt")}Productos</a>
      <button id="more" aria-label="Más secciones">${icon("menu")}Más</button>
    </nav>`;

    const content = $("#adm-page");
    const shell = document.createElement("div");
    shell.className = "adm";
    shell.innerHTML = side + `<div class="adm-main">${top}</div>`;
    content.before(shell);
    $(".adm-main", shell).append(content);
    document.body.insertAdjacentHTML("beforeend", tabbar + overlays());

    function renderSideCounts() {
      const c = counts();
      const vals = { pedidos: c.nuevo + c.preparando, stock: new Set(lowStock().filter((x) => x.n === 1).map((x) => x.p.slug)).size, galu: D.conversations.filter((x) => x.outcome === "sin_respuesta").length };
      $$("[data-count]").forEach((el) => { const v = vals[el.dataset.count]; el.textContent = v || ""; el.hidden = !v; });
      renderNotif();
    }

    // menú lateral en celular
    const sideToggle = (on) => { $("#adm-side").classList.toggle("is-open", on); $("#adm-scrim").classList.toggle("is-open", on); };
    $("#burger").addEventListener("click", () => sideToggle(true));
    $("#more").addEventListener("click", () => sideToggle(true));
    $("#adm-scrim").addEventListener("click", () => sideToggle(false));

    // notificaciones
    function renderNotif() {
      const items = [
        ...D.orders.filter((o) => o.status === "nuevo").map((o) => ["inbox", `Pedido nuevo #${o.id}`, `${cust(o).name} · ${money(total(o))}`, o.when, `order:${o.id}`]),
        ...D.orders.filter((o) => o.status === "esperando_pago").map((o) => ["hourglass", `#${o.id} sin pagar`, `Link enviado a ${cust(o).name.split(" ")[0]} por ${o.channel}`, o.when, `order:${o.id}`]),
        ...D.conversations.filter((x) => x.outcome === "sin_respuesta").map((x) => ["message-circle-question", "Galú no supo responder", `“${x.msgs[0][1]}”`, x.when, "href:admin-galu.html"]),
        ...lowStock().filter((x) => x.n === 1).slice(0, 2).map(({ p, s }) => ["triangle-alert", `Queda 1 en talle ${s}`, p.name, "", "href:admin-productos.html"]),
      ];
      $("#bell-n").textContent = items.length; $("#bell-n").dataset.n = items.length;
      $("#notif").innerHTML = `<div class="row" style="padding:8px 10px"><b>Novedades</b><button class="link" style="font-size:12px" id="notif-read">Marcar como leídas</button></div>` + items.map(([ic, t, s, w, go]) => `<button class="it" data-go="${go}"><span class="ic">${icon(ic, "i-sm")}</span><span><b>${t}</b><small>${s}${w ? " · " + w : ""}</small></span></button>`).join("");
    }
    $("#bell").addEventListener("click", (e) => { e.stopPropagation(); $("#notif").classList.toggle("is-open"); });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".bell-wrap")) $("#notif").classList.remove("is-open");
      if (!e.target.closest(".adm-search")) $("#search-pop").classList.remove("is-open");
      const go = e.target.closest("[data-go]");
      if (go) {
        const [k, v] = go.dataset.go.split(":");
        $("#notif").classList.remove("is-open"); $("#search-pop").classList.remove("is-open");
        if (k === "order") openOrder(v); else if (k === "href") location.href = v;
      }
      if (e.target.closest("#notif-read")) { $("#bell-n").dataset.n = "0"; $("#bell-n").textContent = ""; }
      const oo = e.target.closest("[data-open-order]");
      if (oo && !e.target.closest("input, .stepper-n, [data-act], a[href]")) openOrder(oo.dataset.openOrder);
    });

    // búsqueda global
    $("#gsearch").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) return $("#search-pop").classList.remove("is-open");
      const os = D.orders.filter((o) => `${o.id} ${cust(o).name} ${cust(o).city}`.toLowerCase().includes(q)).slice(0, 4);
      const cs = Object.values(D.customers).filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3);
      const ps = D.products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 4);
      $("#search-pop").innerHTML = (os.length ? `<h6>Pedidos</h6>` + os.map((o) => `<button data-go="order:${o.id}">${icon(status(o.status).icon, "i-sm")}<span><b>#${o.id}</b> · ${cust(o).name}</span><span class="pill-status ${status(o.status).tone}" style="margin-left:auto">${status(o.status).short}</span></button>`).join("") : "")
        + (cs.length ? `<h6>Clientes</h6>` + cs.map((c) => `<a href="admin-clientes.html">${icon("user-round", "i-sm")}${c.name} <span class="muted" style="margin-left:auto">${c.city}</span></a>`).join("") : "")
        + (ps.length ? `<h6>Productos</h6>` + ps.map((p) => `<a href="admin-productos.html?edit=${p.slug}"><img src="${img(p)}" alt="">${p.name}<span class="muted" style="margin-left:auto">${money(p.price)}</span></a>`).join("") : "")
        || `<p class="muted" style="padding:10px;margin:0;font-size:13.5px">Sin resultados para “${q}”.</p>`;
      $("#search-pop").classList.add("is-open");
    });
    document.addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $("#gsearch").focus(); } });

    /* ---------------------------------------------------------------- overlays compartidos */
    function overlays() {
      return `<div class="scrim" id="od-scrim"></div>
      <aside class="drawer wide" id="od" aria-label="Detalle del pedido" aria-hidden="true"><div class="drawer-head" id="od-head"></div><div class="drawer-body" id="od-body"></div><div class="drawer-foot" id="od-foot"></div></aside>
      <div class="modal" id="m-wa" role="dialog" aria-label="Mensaje por WhatsApp"><div class="modal-head"><h3 class="display h3" style="margin:0">Escribirle por <em>WhatsApp</em></h3><button class="icon-btn" data-modal-close aria-label="Cerrar">${icon("x")}</button></div><div class="modal-body" id="wa-body"></div></div>
      <div class="modal" id="m-pick" role="dialog" aria-label="Lista de preparación" style="width:min(680px, calc(100vw - 24px))"><div class="modal-head"><h3 class="display h3" style="margin:0">Lista de <em>preparación</em></h3><button class="icon-btn no-print" data-modal-close aria-label="Cerrar">${icon("x")}</button></div><div class="modal-body" id="pick-body"></div></div>`;
    }

    /* ---------------------------------------------------------------- detalle de pedido */
    let current = null;
    function openOrder(id) {
      const o = D.orders.find((x) => x.id === id); if (!o) return;
      current = o;
      renderOrder();
      $("#od").classList.add("is-open"); $("#od-scrim").classList.add("is-open"); $("#od").setAttribute("aria-hidden", "false");
    }
    const closeOrder = () => { $("#od").classList.remove("is-open"); $("#od-scrim").classList.remove("is-open"); $("#od").setAttribute("aria-hidden", "true"); };
    $("#od-scrim").addEventListener("click", closeOrder);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeOrder(); sideToggle(false); } });

    function renderOrder() {
      const o = current, c = cust(o), st = status(o.status), nx = nextAction(o), i = flowIdx[o.status];
      $("#od-head").innerHTML = `<div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b class="display" style="font-size:26px">#${o.id}</b><span class="pill-status ${st.tone}">${st.short}</span></div><span class="muted" style="font-size:12.5px">${o.date} · ${o.when} · desde ${o.channel}</span></div><button class="icon-btn" id="od-x" aria-label="Cerrar">${icon("x")}</button>`;
      const picking = ["nuevo", "preparando"].includes(o.status);
      $("#od-body").innerHTML = `
        <div class="od-sec"><div class="od-steps">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
          <div class="row" style="font-size:12px;color:var(--cacao-2)"><span>Pagado</span><span>Preparando</span><span>Listo</span><span>En camino</span><span>Entregado</span></div></div>
        <div class="od-sec"><h4>${picking ? "Para preparar · tildá cada prenda" : "Prendas"}<span>${units(o)} ${units(o) === 1 ? "unidad" : "unidades"}</span></h4>
          ${o.items.map(([s, size, q]) => { const p = bySlug[s]; return `<label class="pick">${picking ? '<span class="check"><input type="checkbox" data-pick></span>' : "<span></span>"}<img src="${img(p)}" alt=""><span><b>${p.name}</b><span class="muted" style="font-size:12.5px">Talle ${size} · ${p.color[0]}${q > 1 ? ` · x${q}` : ""}</span></span><b>${money(p.price * q)}</b></label>`; }).join("")}
        </div>
        <div class="od-sec"><h4>Cliente</h4>
          <div style="display:flex;gap:12px;align-items:center"><span class="av" style="width:44px;height:44px;border-radius:50%;background:var(--rosa);display:grid;place-items:center;font:italic 400 20px/1 var(--f-display)">${c.name[0]}</span><div><b>${c.name}</b><div class="muted" style="font-size:12.5px">${c.city} · cliente desde ${c.since} · ${D.orders.filter((x) => x.c === o.c).length} pedidos</div></div></div>
          <div class="contact-btns"><button class="btn btn-sm btn-soft" data-wa-open>${brand("whatsapp", "brand i-sm")} WhatsApp</button><a class="btn btn-sm btn-soft" href="mailto:${c.email}">${icon("mail", "i-sm")} Mail</a><a class="btn btn-sm btn-soft" href="tel:${c.phone}">${icon("phone", "i-sm")} ${c.phone}</a></div>
          ${c.nenas.length ? `<div class="muted" style="font-size:12.5px">Nenas: ${c.nenas.map(([n, t, b]) => `${n} (talle ${t}, cumple ${b})`).join(" · ")}</div>` : ""}
        </div>
        <div class="od-sec"><h4>Envío</h4><dl class="kv2">
          <dt>Método</dt><dd>${D.shipLabel[o.ship[0]]}</dd>
          <dt>${o.ship[0] === "taller" ? "Retira en" : "Dirección"}</dt><dd>${o.ship[0] === "taller" ? "Taller · Villa Crespo" : o.ship[0] === "sucursal" ? `Sucursal Andreani ${c.city}` : `${o.c === "lucia" ? "Gurruchaga 1234, 3° B · " : ""}${c.city}`}</dd>
          ${o.tracking ? `<dt>Seguimiento</dt><dd>${o.tracking} · <a class="link" href="seguimiento.html?pedido=${o.id}">ver</a></dd>` : ""}
          <dt>Costo</dt><dd>${o.ship[1] ? money(o.ship[1]) : "Gratis"}</dd></dl>
          ${o.tracking && o.status === "listo" ? `<button class="btn btn-sm btn-ghost" data-act="label" style="justify-self:start">${icon("printer", "i-sm")} Imprimir etiqueta</button>` : ""}
        </div>
        <div class="od-sec"><h4>Pago ${brand("mercadopago", "brand i-sm")}</h4><dl class="kv2">
          <dt>Medio</dt><dd>${D.payLabel[o.pay[0]]}${o.pay[1] > 1 ? ` · ${o.pay[1]} cuotas sin interés` : ""}</dd>
          <dt>Estado</dt><dd>${o.status === "esperando_pago" ? '<span class="pill-status st-muted">Pendiente</span>' : '<span class="pill-status st-ok">Aprobado</span>'}</dd>
          <dt>Prendas</dt><dd>${money(subtotal(o))}</dd><dt>Envío</dt><dd>${o.ship[1] ? money(o.ship[1]) : "Gratis"}</dd>
          <dt>Total</dt><dd><b>${money(total(o))}</b></dd>
          ${o.status !== "esperando_pago" ? `<dt>Te queda</dt><dd>${money(total(o) * 0.9271)} <span class="muted" style="font-size:12px">(después de la comisión de MP, estimado)</span></dd><dt>Operación MP</dt><dd>#${(88213000000 + parseInt(o.id.slice(3)) * 7919).toString()}</dd>` : `<dt>Link</dt><dd>mpago.la/${o.id.slice(3)}Kq8 · <button class="link" data-act="copy">copiar</button><div class="muted" style="font-size:12px;margin-top:4px">Se generó solo con el pedido y se reenvía automático a las 24 h si no paga.</div></dd>`}
        </dl></div>
        <div class="od-sec"><h4>Historial</h4><ul class="tl">${timeline(o)}</ul></div>
        <div class="od-sec"><h4>Notas internas</h4><textarea class="input" rows="2" placeholder="Ej. le prometí el moño a juego, envolver con cuidado…">${o.internal || ""}</textarea></div>`;
      $("#od-foot").innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${nx.href ? `<a class="btn" style="flex:1" href="${nx.href}">${icon(nx.icon, "i-sm")} ${nx.label}</a>` : `<button class="btn" style="flex:1" id="od-next" ${o.status === "nuevo" || o.status === "preparando" ? "" : ""}>${icon(nx.icon, "i-sm")} ${nx.label}</button>`}<button class="btn btn-ghost" data-wa-open>${brand("whatsapp", "brand i-sm")}</button></div>${nx.auto ? `<span class="muted" style="font-size:12px;display:flex;gap:6px;align-items:center">${icon("workflow", "i-sm")} Automático: ${nx.auto.toLowerCase()}.</span>` : ""}`;
      $("#od-x").onclick = closeOrder;
      $("#od-next")?.addEventListener("click", () => {
        if (nx.wa) return openWA(o, nx.wa);
        if (o.status === "preparando") {
          const all = $$("[data-pick]"); if (all.length && all.some((x) => !x.checked)) { toast("Tildá todas las prendas antes de cerrar la preparación", "list-checks"); return; }
        }
        moveOrder(o, nx.to); renderOrder();
      });
      $$("[data-wa-open]").forEach((b) => (b.onclick = () => openWA(o)));
      $("[data-act=label]")?.addEventListener("click", () => toast("Etiqueta Andreani descargada (PDF 10×15)", "printer"));
      $("[data-act=copy]")?.addEventListener("click", () => toast("Link de pago copiado", "link"));
    }

    /* ---------------------------------------------------------------- WhatsApp */
    const TPL = {
      pago: ["Pago recibido", "Hola {n}! Recibimos el pago de tu pedido #{id}. Ya lo estamos preparando en el taller. Te avisamos cuando salga ✿"],
      despacho: ["Pedido despachado", "{n}, tu pedido #{id} ya salió con Andreani. Lo podés seguir acá: minigalu.com.ar/seguimiento?pedido={id}"],
      retiro: ["Listo para retirar", "Hola {n}! Tu pedido #{id} está listo para retirar en el taller (Villa Crespo). Horarios: lunes a sábado de 10 a 13 h."],
      recordatorio: ["Recordatorio de pago", "Hola {n}, te dejo de nuevo el link para pagar tu pedido #{id}: mpago.la/{code}. Podés pagar con tarjeta de crédito, débito o dinero en cuenta. Te lo guardamos hasta el jueves."],
      resena: ["Pedir reseña", "Hola {n}! ¿Cómo le quedó? Si nos mandás una foto nos alegra el día. Y si querés dejar una reseña: minigalu.com.ar/resena/{id}"],
      libre: ["Mensaje libre", "Hola {n}! "],
    };
    function openWA(o, key) {
      const c = cust(o);
      key = key || { esperando_pago: "recordatorio", nuevo: "pago", preparando: "pago", listo: o.ship[0] === "taller" ? "retiro" : "despacho", en_camino: "despacho", entregado: "resena" }[o.status];
      const fill = (t) => t.replaceAll("{n}", c.name.split(" ")[0]).replaceAll("{id}", o.id).replaceAll("{code}", o.id.slice(3) + "Kq8");
      const draw = () => {
        const txt = fill(TPL[key][1]);
        $("#wa-body").innerHTML = `<div class="tpls">${Object.entries(TPL).map(([k, [t, b]]) => `<button class="tpl" data-tpl="${k}" aria-pressed="${k === key}"><b>${t}</b><small>${fill(b).slice(0, 72)}…</small></button>`).join("")}</div>
          <div class="field"><label for="wa-txt">Mensaje para ${c.name} · ${c.phone}</label><textarea class="input" id="wa-txt" rows="4">${txt}</textarea></div>
          <div class="wa-preview"><div class="wa-bubble" id="wa-prev">${txt}<small>ahora ✓✓</small></div></div>
          <a class="btn btn-block" id="wa-go" target="_blank" rel="noopener" href="https://wa.me/549${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(txt)}">${brand("whatsapp", "brand i-sm")} Abrir WhatsApp</a>
          <p class="muted" style="font-size:12px;margin:0;text-align:center">Con WhatsApp Business conectado, estos mensajes salen solos según las automatizaciones.</p>`;
        $$("[data-tpl]").forEach((b) => (b.onclick = () => { key = b.dataset.tpl; draw(); }));
        $("#wa-txt").oninput = (e) => { $("#wa-prev").innerHTML = e.target.value + "<small>ahora ✓✓</small>"; $("#wa-go").href = `https://wa.me/549${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(e.target.value)}`; };
      };
      draw();
      openModal("m-wa");
    }

    /* ---------------------------------------------------------------- lista de preparación */
    function openPicking(list) {
      list = list || D.orders.filter((o) => ["nuevo", "preparando"].includes(o.status));
      const agg = {};
      list.forEach((o) => o.items.forEach(([s, sz, q]) => { const k = s + "|" + sz; agg[k] = agg[k] || { s, sz, q: 0, ids: [] }; agg[k].q += q; agg[k].ids.push(o.id); }));
      $("#pick-body").innerHTML = `<p class="muted" style="margin:0">${list.length} pedidos · ${Object.values(agg).reduce((a, x) => a + x.q, 0)} prendas. Agrupado por modelo y talle.</p>
        <div class="tbl-wrap"><table class="t"><thead><tr><th></th><th>Prenda</th><th>Talle</th><th class="num">Cant.</th><th>Pedidos</th></tr></thead><tbody>${Object.values(agg).map(({ s, sz, q, ids }) => `<tr><td class="check"><label class="check"><input type="checkbox"></label></td><td><div class="pp"><img src="${img(bySlug[s])}" alt=""><b>${bySlug[s].name}</b></div></td><td><span class="sz">${sz}</span></td><td class="num"><b>${q}</b></td><td style="font-size:12.5px">${ids.map((i) => "#" + i).join(", ")}</td></tr>`).join("")}</tbody></table></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap" class="no-print"><button class="btn" id="pick-print">${icon("printer", "i-sm")} Imprimir</button><button class="btn btn-ghost" data-modal-close>Cerrar</button></div>`;
      $("#pick-print").onclick = () => { document.body.classList.add("print-modal"); window.print(); setTimeout(() => document.body.classList.remove("print-modal"), 500); };
      openModal("m-pick");
    }

    renderSideCounts();
    window.ADM = { D, cust, subtotal, total, status, units, shipIcon, shipShort, payShort, nextAction, moveOrder, openOrder, openWA, openPicking, lowStock, changed, counts };
    document.dispatchEvent(new CustomEvent("adm:ready"));
  });
})();
