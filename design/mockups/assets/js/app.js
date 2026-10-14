/* Mini Galú — mockups de la tienda: layout compartido, bolsa, favoritos, contacto y asistente "Galú".
   Todo es simulado en el navegador; en la app real lo resuelven api/catalog, api/cart y api/assistant. */
(() => {
  const D = window.MGDATA;
  const IMG = "assets/img/";
  const WA = "https://wa.me/5491100000000";
  const IG = "https://www.instagram.com/minigalumodainfantil/";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const params = new URLSearchParams(location.search);
  // sesión de ejemplo: arranca con Lucía logueada; "Salir" la cierra e "Ingresar" la vuelve a abrir
  const auth = {
    logged: () => store.get("mg-auth-v1", true),
    login() { store.set("mg-auth-v1", true); },
    logout() { store.set("mg-auth-v1", false); },
  };

  /* ------------------------------------------------------------------ datos */
  const products = D.products.filter((p) => !p.draft);
  const bySlug = Object.fromEntries(D.products.map((p) => [p.slug, p]));
  const img = (p, n = 1) => IMG + p.photos[Math.min(n, p.photos.length) - 1] + ".webp";
  const stockOf = (p) => Object.values(p.sizes).reduce((a, b) => a + b, 0);
  const sizesIn = (p) => Object.entries(p.sizes).filter(([, s]) => s > 0).map(([k]) => k);
  const cuota = (n) => money(n / 6);

  /* ------------------------------------------------------------------ íconos */
  const icon = (n, cls = "") => `<i data-lucide="${n}" class="${cls}" aria-hidden="true"></i>`;
  const BRAND = {
    whatsapp: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
    instagram: '<path d="M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.295.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.006 3.259.021 3.667.083 4.947.061 1.277.264 2.148.563 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.669 1.074-1.338 1.379-2.129.296-.763.497-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.298 1.33 20.628.921 19.838.617 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.561-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.06-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.245-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.244 2.228.408.561.216.96.475 1.382.895.422.419.682.818.9 1.379.166.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.006 3.203-.006 3.584-.061 4.848-.051 1.17-.245 1.805-.408 2.23-.216.56-.476.96-.896 1.381-.419.422-.818.681-1.378.9-.422.165-1.058.362-2.226.418-1.266.06-1.645.072-4.85.079-3.204.007-3.582-.006-4.848-.061M16.953 5.586a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.838 12.012c.007 3.403 2.771 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.157-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A3.999 3.999 0 0 1 8 12.008"/>',
    mercadopago: '<path d="M11.115 16.479a.93.927 0 0 1-.939-.886c-.002-.042-.006-.155-.103-.155-.04 0-.074.023-.113.059-.112.103-.254.206-.46.206a.816.814 0 0 1-.305-.066c-.535-.214-.542-.578-.521-.725.006-.038.007-.08-.02-.11l-.032-.03h-.034c-.027 0-.055.012-.093.039a.788.786 0 0 1-.454.16.7.699 0 0 1-.253-.05c-.708-.27-.65-.928-.617-1.126.005-.041-.005-.072-.03-.092l-.05-.04-.047.043a.728.726 0 0 1-.505.203.73.728 0 0 1-.732-.725c0-.4.328-.722.732-.722.364 0 .675.27.721.63l.026.195.11-.165c.01-.018.307-.46.852-.46.102 0 .21.016.316.05.434.13.508.52.519.68.008.094.075.1.09.1.037 0 .064-.024.083-.045a.746.744 0 0 1 .54-.225c.128 0 .263.03.402.09.69.293.379 1.158.374 1.167-.058.144-.061.207-.005.244l.027.013h.02c.03 0 .07-.014.134-.035.093-.032.235-.08.367-.08a.944.942 0 0 1 .94.93.936.934 0 0 1-.94.928zm7.302-4.171c-1.138-.98-3.768-3.24-4.481-3.77-.406-.302-.685-.462-.928-.533a1.559 1.554 0 0 0-.456-.07c-.182 0-.376.032-.58.095-.46.145-.918.505-1.362.854l-.023.018c-.414.324-.84.66-1.164.73a1.986 1.98 0 0 1-.43.049c-.362 0-.687-.104-.81-.258-.02-.025-.007-.066.04-.125l.008-.008 1-1.067c.783-.774 1.525-1.506 3.23-1.545h.085c1.062 0 2.12.469 2.24.524a7.03 7.03 0 0 0 3.056.724c1.076 0 2.188-.263 3.354-.795a9.135 9.11 0 0 0-.405-.317c-1.025.44-2.003.66-2.946.66-.962 0-1.925-.229-2.858-.68-.05-.022-1.22-.567-2.44-.57-.032 0-.065 0-.096.002-1.434.033-2.24.536-2.782.976-.528.013-.982.138-1.388.25-.361.1-.673.186-.979.185-.125 0-.35-.01-.37-.012-.35-.01-2.115-.437-3.518-.962-.143.1-.28.203-.415.31 1.466.593 3.25 1.053 3.812 1.089.157.01.323.027.491.027.372 0 .744-.103 1.104-.203.213-.059.446-.123.692-.17l-.196.194-1.017 1.087c-.08.08-.254.294-.14.557a.705.703 0 0 0 .268.292c.243.162.677.27 1.08.271.152 0 .297-.015.43-.044.427-.095.874-.448 1.349-.82.377-.296.913-.672 1.323-.782a1.494 1.49 0 0 1 .37-.05.611.61 0 0 1 .095.005c.27.034.533.125 1.003.472.835.62 4.531 3.815 4.566 3.846.002.002.238.203.22.537-.007.186-.11.352-.294.466a.902.9 0 0 1-.484.15.804.802 0 0 1-.428-.124c-.014-.01-1.28-1.157-1.746-1.543-.074-.06-.146-.115-.22-.115a.122.122 0 0 0-.096.045c-.073.09.01.212.105.294l1.48 1.47c.002 0 .184.17.204.395.012.244-.106.447-.35.606a.957.955 0 0 1-.526.171.766.764 0 0 1-.42-.127l-.214-.206a21.035 20.978 0 0 0-1.08-1.009c-.072-.058-.148-.112-.221-.112a.127.127 0 0 0-.094.038c-.033.037-.056.103.028.212a.698.696 0 0 0 .075.083l1.078 1.198c.01.01.222.26.024.511l-.038.048a1.18 1.178 0 0 1-.1.096c-.184.15-.43.164-.527.164a.8.798 0 0 1-.147-.012c-.106-.018-.178-.048-.212-.089l-.013-.013c-.06-.06-.602-.609-1.054-.98-.059-.05-.133-.11-.21-.11a.128.128 0 0 0-.096.042c-.09.096.044.24.1.293l.92 1.003a.204.204 0 0 1-.033.062c-.033.044-.144.155-.479.196a.91.907 0 0 1-.122.007c-.345 0-.712-.164-.902-.264a1.343 1.34 0 0 0 .13-.576 1.368 1.365 0 0 0-1.42-1.357c.024-.342-.025-.99-.697-1.274a1.455 1.452 0 0 0-.575-.125c-.146 0-.287.025-.42.075a1.153 1.15 0 0 0-.671-.564 1.52 1.515 0 0 0-.494-.085c-.28 0-.537.08-.767.242a1.168 1.165 0 0 0-.903-.43 1.173 1.17 0 0 0-.82.335c-.287-.217-1.425-.93-4.467-1.613a17.39 17.344 0 0 1-.692-.189 4.822 4.82 0 0 0-.077.494l.67.157c3.108.682 4.136 1.391 4.309 1.525a1.145 1.142 0 0 0-.09.442 1.16 1.158 0 0 0 1.378 1.132c.096.467.406.821.879 1.003a1.165 1.162 0 0 0 .415.08c.09 0 .179-.012.266-.034.086.22.282.493.722.668a1.233 1.23 0 0 0 .457.094c.122 0 .241-.022.355-.063a1.373 1.37 0 0 0 1.269.841c.37.002.726-.147.985-.41.221.121.688.341 1.163.341.06 0 .118-.002.175-.01.47-.059.689-.24.789-.382a.571.57 0 0 0 .048-.078c.11.032.234.058.373.058.255 0 .501-.086.75-.265.244-.174.418-.424.444-.637v-.01c.083.017.167.026.251.026.265 0 .527-.082.773-.242.48-.31.562-.715.554-.98a1.28 1.279 0 0 0 .978-.194 1.04 1.04 0 0 0 .502-.808 1.088 1.085 0 0 0-.16-.653c.804-.342 2.636-1.003 4.795-1.483a4.734 4.721 0 0 0-.067-.492 27.742 27.667 0 0 0-5.049 1.62zm5.123-.763c0 4.027-5.166 7.293-11.537 7.293-6.372 0-11.538-3.266-11.538-7.293 0-4.028 5.165-7.293 11.539-7.293 6.371 0 11.537 3.265 11.537 7.293zm.46.004c0-4.272-5.374-7.755-12-7.755S.002 7.277.002 11.55L0 12.004c0 4.533 4.695 8.203 11.999 8.203 7.347 0 12-3.67 12-8.204z"/>',
  };
  BRAND.google = '<path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>';
  const brand = (n, cls = "brand") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${BRAND[n]}</svg>`;
  const BOW = '<svg class="foco" viewBox="-14 -14 619 682" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M199 528c-12-30-56-80-82-126-26-46-28-110-4-163 28-62 94-110 176-110 94 0 168 56 180 134 10 66-28 120-70 165-28 30-46 64-52 100"/><path pathLength="1" d="M199 530c50-3 100-4 150-6"/><path pathLength="1" class="filamento" d="M266 524c-6-50-28-94-50-140-18-38-20-86 6-94 28-8 50 28 60 62 10-36 34-74 60-68 28 7 28 56 2 86-20 22-40 28-44 62-4 32-4 64-6 96"/><path pathLength="1" d="M202 566c50-3 100-4 152 1M206 598c46-3 92-2 140 1M214 606c40 6 80 14 116 24-30 4-62 6-96 11 22 4 44 8 66 14"/><path pathLength="1" d="M303 6c1 16 2 32 3 48M116 52c11 15 22 30 32 45M484 70c-11 12-22 24-32 35M7 211c16 3 32 7 47 12M535 236c16-4 32-9 48-14"/></svg>';
  // flor bordada (puntadas) para estados vacíos
  const EMB = `<svg class="emb" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <g stroke-dasharray="3 4">${[0, 60, 120, 180, 240, 300].map((r) => `<path transform="rotate(${r} 60 46)" d="M60 44c-7-8-8-22 0-28 8 6 7 20 0 28Z"/>`).join("")}</g>
    <circle cx="60" cy="46" r="5" fill="currentColor" stroke="none" opacity=".8"/>
    <path stroke-dasharray="3 4" d="M60 56c0 18 2 34 0 56M60 84c-8-8-18-10-24-6 6 8 16 10 24 6Z"/>
    <path stroke-dasharray="3 4" d="M60 96c8-8 18-9 24-5-6 8-16 9-24 5Z"/></svg>`;

  /* ------------------------------------------------------------------ card de producto */
  function card(p, opts = {}) {
    const total = stockOf(p);
    const tags = [];
    if (p.was) tags.push(`<span class="label-tag is-sale">-${Math.round((1 - p.price / p.was) * 100)}%</span>`);
    else if (total > 0 && total <= 2) tags.push('<span class="label-tag is-last">Últimas</span>');
    else if (p.tag) tags.push(`<span class="label-tag">${p.tag}</span>`);
    const sizes = Object.entries(p.sizes).map(([s, n]) => `<button class="size-dot ${n ? "" : "is-out"}" data-add="${p.slug}" data-size="${s}" aria-label="Agregar talle ${s}">${s}</button>`).join("");
    return `<article class="p-card ${opts.arch ? "arch" : ""} ${opts.cls || ""}" ${opts.reveal !== false ? "data-reveal" : ""} style="--d:${((opts.i || 0) % 4) * 0.07}s">
      <div class="p-frame">
        <a class="p-media" href="producto.html?p=${p.slug}" data-vt aria-label="${p.name}">
          <img src="${img(p, 1)}" alt="${p.name}" loading="lazy">
          ${p.photos.length > 1 ? `<img class="alt" src="${img(p, 2)}" alt="" loading="lazy">` : ""}
        </a>
        <div class="tags">${tags.join("")}</div>
        <button class="fav ${favs.has(p.slug) ? "is-on" : ""}" data-fav="${p.slug}" aria-label="Guardar en favoritos">${icon("heart", "i-sm")}</button>
        <button class="quick-toggle" data-quick aria-label="Agregar rápido">${icon("shopping-bag", "i-sm")}</button>
        <div class="p-quick"><small>Agregar talle</small>${sizes}</div>
      </div>
      <div class="p-info">
        <div><h3 class="p-name"><a href="producto.html?p=${p.slug}" data-vt>${p.name}</a></h3>
          <div class="p-meta"><span class="swatch" style="background:${p.color[1]}"></span>${p.col}</div></div>
        <div class="price">${p.was ? `<s>${money(p.was)}</s>` : ""}${money(p.price)}${p.price > 10000 ? `<small>6 × ${cuota(p.price)}</small>` : ""}</div>
      </div>
    </article>`;
  }

  /* ------------------------------------------------------------------ estado: bolsa y favoritos */
  let cart = store.get("mg-cart-v2", [{ slug: "maddie", size: "6", qty: 1 }, { slug: "mono-verde", size: "Único", qty: 1 }]).filter((it) => bySlug[it.slug]);
  const favs = new Set(store.get("mg-favs-v2", ["samanta", "elsa"]));
  const FREE_SHIP = 90000;
  const cartTotal = () => cart.reduce((a, it) => a + bySlug[it.slug].price * it.qty, 0);
  const cartCount = () => cart.reduce((a, it) => a + it.qty, 0);
  const saveCart = () => { store.set("mg-cart-v2", cart); renderCart(); document.dispatchEvent(new CustomEvent("mg:cart")); };

  function addToCart(slug, size, opts = {}) {
    const from = opts.from;
    const p = bySlug[slug];
    size = String(size ?? sizesIn(p)[0]);
    const max = p.sizes[size] || 0;
    const hit = cart.find((it) => it.slug === slug && it.size === size);
    if (hit && hit.qty >= max) return toast(`Tenemos ${max} en talle ${size} y ya están en tu bolsa`, "info");
    hit ? hit.qty++ : cart.push({ slug, size, qty: 1 });
    saveCart();
    const b = $("#cart-badge");
    if (b) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
    flyToBag(from);
    toast(`<img src="${img(p)}" alt=""><span><b>${p.name}</b> · talle ${size} a la bolsa</span>`, null);
    if (opts.open) setTimeout(openDrawer, from && !still() ? 850 : 0); // abre la bolsa cuando la prenda llegó
  }

  function renderCart() {
    const badge = $("#cart-badge");
    if (badge) { badge.textContent = cartCount(); badge.dataset.n = cartCount(); }
    const body = $("#drawer-items");
    if (!body) return;
    body.innerHTML = cart.length ? cart.map((it, i) => {
      const p = bySlug[it.slug];
      return `<div class="line-item"><a href="producto.html?p=${p.slug}"><img src="${img(p)}" alt=""></a>
        <div><h4>${p.name}</h4><div class="muted" style="font-size:13px">Talle ${it.size} · ${p.color[0]}</div>
        <div style="display:flex;align-items:center"><div class="qty"><button data-q="${i}" data-d="-1" aria-label="Menos">${icon("minus", "i-sm")}</button><span>${it.qty}</span><button data-q="${i}" data-d="1" aria-label="Más">${icon("plus", "i-sm")}</button></div><button class="rm" data-rm="${i}">Quitar</button></div></div>
        <b>${money(p.price * it.qty)}</b></div>`;
    }).join("")
      : `<div class="empty-state">${EMB}<div class="hand" style="font-size:32px">Tu bolsa está vacía</div><p class="muted" style="margin:0 0 8px">Pero el taller está lleno de cosas lindas.</p><a class="btn" href="catalogo.html">Ver catálogo</a></div>`;
    const t = cartTotal();
    $("#drawer-total").textContent = money(t);
    $("#drawer-foot").hidden = !cart.length;
    $("#drawer-ship").hidden = !cart.length;
    const left = FREE_SHIP - t;
    $("#ship-msg").innerHTML = left > 0 ? `Te faltan <b>${money(left)}</b> para el <b>envío gratis</b>` : "¡Tenés <b>envío gratis</b> con Andreani!";
    $("#ship-bar").style.width = Math.min(100, (t / FREE_SHIP) * 100) + "%";
  }

  /* ------------------------------------------------------------------ nenas y listas de cumple (compartido entre páginas) */
  // nena: [nombre, edad, talle, altura cm, cumple "14 de noviembre", nota]
  const NENAS0 = [["Olivia", 5, "6", 112, "14 de noviembre", "faltan 39 días"], ["Emma", 2, "2", 88, "3 de marzo", ""]];
  const WISH0 = { Olivia: [["maddie", "6", "regalado", "La abuela Marta"], ["elsa", "6", "libre"], ["mono-verde", "Único", "libre"], ["romantico-rojo", "8", "libre"]] };
  const nenas = {
    all: () => store.get("mg-nenas-v1", NENAS0),
    save: (l) => { store.set("mg-nenas-v1", l); document.dispatchEvent(new CustomEvent("mg:nenas")); },
  };
  const wishes = {
    all: () => store.get("mg-wish-v1", WISH0),
    of: (n) => wishes.all()[n] || [],
    save: (n, list) => { const w = wishes.all(); w[n] = list; store.set("mg-wish-v1", w); document.dispatchEvent(new CustomEvent("mg:wish")); },
    add(n, slug, size) {
      const l = wishes.of(n);
      if (l.some(([s, t]) => s === slug && String(t) === String(size))) return false;
      wishes.save(n, [...l, [slug, String(size), "libre"]]);
      return true;
    },
  };

  // Elegir a qué nena va una prenda. Sin sesión → ingresar; sin nenas → hay que cargar una primero.
  function wishPick(slug, size) {
    if (!auth.logged()) { location.href = "ingresar.html?volver=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return; }
    const list = nenas.all(), p = bySlug[slug];
    let m = document.getElementById("m-wish-pick");
    if (!m) { document.body.insertAdjacentHTML("beforeend", '<div class="modal" id="m-wish-pick" role="dialog" aria-label="Sumar a una lista de cumple"></div>'); m = document.getElementById("m-wish-pick"); }
    m.innerHTML = `<div class="modal-head"><h3 class="display h3" style="margin:0">Sumar a la <em>lista de cumple</em></h3><button class="icon-btn" data-modal-close aria-label="Cerrar">${icon("x")}</button></div>
      <div class="modal-body">
        <div class="wp-item"><img src="${img(p)}" alt=""><span><b>${p.name}</b><small>${size ? `Talle ${size} · ` : ""}${money(p.price)}</small></span></div>
        ${list.length ? `<span class="lbl" style="font-size:12.5px;font-weight:600;color:var(--cacao-2)">¿Para quién?</span><div class="wp-nenas">${list.map(([n, , t, , b]) => `<button class="wp-nena" data-wish-to="${n}"><i>${n[0]}</i><span><b>${n}</b><small>Talle ${t} · cumple el ${b}</small></span>${icon("plus", "i-sm")}</button>`).join("")}</div>`
        : `<div class="empty-state" style="padding:12px 0">${EMB}<div class="hand" style="font-size:28px">Primero sumá a tu nena</div><p class="muted" style="margin:0 0 6px">La lista de cumple se arma para una nena: su talle, su cumple y lo que le gusta.</p><a class="btn" href="cuenta.html#nenas">Agregar nena</a></div>`}
      </div>`;
    drawIcons();
    m.onclick = (e) => {
      const b = e.target.closest("[data-wish-to]"); if (!b) return;
      const ok = wishes.add(b.dataset.wishTo, slug, size || sizesIn(p)[0] || "Único");
      closeModals();
      toast(ok ? `<img src="${img(p)}" alt=""><span><b>${p.name}</b> sumado a la lista de ${b.dataset.wishTo} · <a class="link" href="cuenta.html#lista" style="color:inherit">ver lista</a></span>` : `Ya está en la lista de ${b.dataset.wishTo}`, ok ? null : "list-checks");
    };
    openModal("m-wish-pick");
  }

  /* ------------------------------------------------------------------ navegación */
  const COLS = [["Verano 2027", "Verano 2027"], ["Fiestas", "Fiestas y ceremonias"], ["Atemporal", "Atemporal"], ["Accesorios", "Accesorios"]];
  const SIZES = ["12m", "2", "4", "6", "8", "10"];
  const OCC = [["cumple", "Cumple"], ["bautismo", "Bautismo"], ["casamiento", "Casamiento"], ["navidad", "Navidad"], ["diario", "Día a día"]];
  const LAUNCH = new Date("2026-10-18T10:00:00-03:00").getTime();
  const live = () => products.filter((p) => p.status !== "draft");

  function mega() {
    const feat = live().filter((p) => p.tag === "Nuevo").slice(0, 2);
    return `<div class="mega" id="mega-tienda" role="region" aria-label="Tienda">
      <div class="wrap mega-grid">
        <div><h6>Colecciones</h6><ul class="mega-list">
          <li><a href="catalogo.html"><span>Todo el taller</span><small>${live().length}</small></a></li>
          ${COLS.map(([c, label]) => `<li><a href="catalogo.html?col=${encodeURIComponent(c)}"><span>${label}</span><small>${live().filter((p) => p.col === c).length}</small></a></li>`).join("")}
          <li><a href="index.html#lanzamiento"><span>Otoño · Invierno</span><span class="pill-status st-warn">Sale el 18/10</span></a></li>
        </ul></div>
        <div><h6>Por talle</h6><div class="mega-sizes">${SIZES.map((t) => `<a class="chip" href="catalogo.html?talle=${t}">${t === "12m" ? "12 m" : t}</a>`).join("")}</div>
          ${auth.logged() ? `<h6>Para tus nenas</h6><div class="mega-nenas">${nenas.all().map(([n, , t]) => `<a href="catalogo.html?talle=${t}"><i>${n[0]}</i>${n} · talle ${t}</a>`).join("") || `<a href="cuenta.html#nenas"><i>+</i>Sumá a tu nena</a>`}</div>` : ""}
          <h6>Por ocasión</h6><div class="mega-occ">${OCC.map(([k, v]) => `<a href="catalogo.html?ocasion=${k}">${v}</a>`).join("")}</div></div>
        <div class="mega-feat"><h6>Recién salidas del taller</h6><div>${feat.map((p) => `<a href="producto.html?p=${p.slug}" class="mf-card"><span class="mf-img"><img src="${img(p)}" alt="" loading="lazy"></span><b>${p.name}</b><small>${money(p.price)} · 6 cuotas sin interés</small></a>`).join("")}</div></div>
      </div>
      <div class="wrap mega-foot"><span class="hand">¿no sabés el talle?</span><button class="link" data-open-galu>Preguntale a Galú</button><i class="dot-sep"></i><a class="link" href="giftcards.html">Regalá una gift card</a><i class="dot-sep"></i><a class="link" href="producto.html?p=cleo#medidas">Tabla de medidas</a></div>
    </div>`;
  }

  function searchPanel() {
    return `<div class="search-ov" id="search-ov" role="dialog" aria-label="Buscar" aria-hidden="true">
      <div class="so-sheet"><div class="wrap">
        <form class="so-form" id="so-form" action="catalogo.html">${icon("search")}<input id="so-q" name="q" type="search" autocomplete="off" placeholder="¿Qué estás buscando?" aria-label="Buscar en la tienda"><kbd>esc</kbd><button type="button" class="icon-btn" data-so-close aria-label="Cerrar">${icon("x")}</button></form>
        <div class="so-sugs"><span class="eyebrow">Lo más buscado</span><div>${["vestido rojo", "bautismo", "plumeti", "talle 6", "moño", "lino"].map((q) => `<button type="button" class="chip" data-so-q="${q}">${q}</button>`).join("")}</div></div>
        <div class="so-res" id="so-res"></div>
      </div></div>
    </div>`;
  }

  function searchResults(q) {
    q = q.trim().toLowerCase();
    const sz = q.match(/talle\s*(\d+|12\s*m)/);
    const size = sz ? sz[1].replace(/\s/g, "") : "";
    const words = q.replace(/talle\s*(\d+|12\s*m)/, "").split(/\s+/).filter(Boolean);
    const list = !q ? live().filter((p) => p.tag === "Nuevo" || p.sold30 > 6).slice(0, 4) : live().filter((p) => {
      const hay = `${p.name} ${p.desc} ${p.fabric} ${p.color[0]} ${p.occ.join(" ")} ${p.col}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return words.every((w) => hay.includes(w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/(es|s)$/, ""))) && (!size || p.sizes[size] > 0);
    }).slice(0, 6);
    const head = q ? (list.length ? `${list.length} ${list.length === 1 ? "prenda" : "prendas"}` : "Nada con eso todavía") : "Lo nuevo y lo más vendido";
    return `<div class="so-head"><span class="eyebrow">${head}</span>${q && list.length ? `<a class="link" href="catalogo.html?q=${encodeURIComponent(q)}">Ver todo en el catálogo ${icon("arrow-right", "i-sm")}</a>` : ""}</div>
      ${list.length ? `<div class="so-grid">${list.map((p) => {
        const st = stockOf(p), av = sizesIn(p);
        return `<a class="so-item" href="producto.html?p=${p.slug}"><img src="${img(p)}" alt="" loading="lazy"><span><b>${p.name}</b><small>${money(p.price)}</small><small class="${st ? "ok" : "out"}">${st ? (av.length > 1 ? `Talles ${av.join(" · ")}` : "En stock") : "Sin stock · avisame"}</small></span></a>`;
      }).join("")}</div>` : `<div class="so-empty"><span class="hand">mmm…</span><p class="muted">Probá con otra palabra o preguntale a Galú: sabe todo lo que hay en el taller.</p><button class="btn btn-sm btn-rose" data-open-galu data-q="${q.replace(/"/g, "")}">${icon("message-circle-heart", "i-sm")} Preguntale a Galú</button></div>`}`;
  }

  function initNav(hdr) {
    // cuenta regresiva del lanzamiento en el menú
    const days = Math.ceil((LAUNCH - Date.now()) / 864e5);
    $$("[data-launch-count]").forEach((el) => { el.textContent = days > 1 ? `${days} días` : days === 1 ? "mañana" : "¡hoy!"; el.hidden = days < 0; });

    // mega menú: se abre al pasar el mouse (con un respiro para no parpadear), o tocando en pantallas táctiles
    const item = $('[data-nav="tienda"]');
    if (item) {
      const top = item.querySelector(".nav-top"); let tm;
      const set = (open) => { clearTimeout(tm); item.classList.toggle("is-open", open); top.setAttribute("aria-expanded", open); hdr.classList.toggle("mega-open", open); };
      const hover = matchMedia("(hover: hover)").matches;
      if (hover) {
        item.addEventListener("mouseenter", () => { clearTimeout(tm); tm = setTimeout(() => set(true), 90); });
        item.addEventListener("mouseleave", () => { clearTimeout(tm); tm = setTimeout(() => set(false), 200); });
      }
      top.addEventListener("click", (e) => { if (!hover && !item.classList.contains("is-open")) { e.preventDefault(); set(true); } });
      top.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); set(true); item.querySelector(".mega a").focus(); } });
      item.addEventListener("focusout", (e) => { if (!item.contains(e.relatedTarget)) set(false); });
      item.addEventListener("click", (e) => { if (e.target.closest(".mega a, [data-open-galu]")) set(false); });
      document.addEventListener("click", (e) => { if (!item.contains(e.target)) set(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && item.classList.contains("is-open")) { set(false); top.focus(); } });
    }

    // popovers de seguimiento y cuenta
    const pops = $$("[data-pop]");
    const closePops = (except) => pops.forEach((b) => { if (b !== except) { b.setAttribute("aria-expanded", false); b.parentElement.classList.remove("is-open"); } });
    pops.forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const o = !b.parentElement.classList.contains("is-open");
      closePops(b); b.parentElement.classList.toggle("is-open", o); b.setAttribute("aria-expanded", o);
    }));
    // se cierra al tocar afuera o al elegir una opción (en Mi cuenta las opciones solo cambian de pestaña, sin recargar)
    document.addEventListener("click", (e) => { if (!e.target.closest(".nav-pop") || e.target.closest(".nav-pop a")) closePops(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePops(); });
    $("[data-track]")?.addEventListener("submit", (e) => { e.preventDefault(); location.href = `seguimiento.html?pedido=${encodeURIComponent(e.target.querySelector("input").value.trim().toUpperCase())}`; });

    document.addEventListener("mg:favs", () => { const n = $("#fav-n"); if (n) n.textContent = favs.size || ""; });

    // buscador
    const ov = $("#search-ov"), q = $("#so-q"), res = $("#so-res");
    if (!ov || !$("#search-btn")) return;
    const draw = () => { res.innerHTML = searchResults(q.value); drawIcons(); };
    const openS = () => { ov.classList.add("is-open"); ov.setAttribute("aria-hidden", false); document.body.classList.add("search-open"); draw(); setTimeout(() => q.focus(), 80); };
    const closeS = () => { ov.classList.remove("is-open"); ov.setAttribute("aria-hidden", true); document.body.classList.remove("search-open"); };
    $("#search-btn").addEventListener("click", openS);
    q.addEventListener("input", draw);
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest("[data-so-close]")) return closeS();
      const c = e.target.closest("[data-so-q]");
      if (c) { q.value = c.dataset.soQ; draw(); q.focus(); }
      if (e.target.closest("[data-open-galu]")) closeS();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && ov.classList.contains("is-open")) closeS();
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openS(); }
    });
  }

  /* ------------------------------------------------------------------ layout compartido */
  function header() {
    const page = document.body.dataset.page;
    const over = document.body.dataset.header === "over";
    const cur = (p) => (page === p ? 'aria-current="page"' : "");
    const items = ["Envíos a todo el país con Andreani", "Hasta 6 cuotas sin interés con Mercado Pago", "Diseños propios, bordados a mano", "Talles 12 meses a 10 años", "Envío gratis desde $90.000"];
    return `
    <div class="announce" role="region" aria-label="Novedades"><div class="marquee">${[0, 1].map((k) => `<div ${k ? 'aria-hidden="true"' : ""}>${items.map((t) => `<span>${t}</span><i class="dot"></i>`).join("")}</div>`).join("")}</div></div>
    <header class="site-header ${over ? "is-over" : ""}" id="site-header">
      <nav class="wrap nav" aria-label="Principal">
        <div class="nav-links">
          <div class="nav-item" data-nav="tienda">
            <a href="catalogo.html" class="nav-top" aria-haspopup="true" aria-expanded="false" ${cur("catalogo")}>Tienda ${icon("chevron-down", "i-sm nav-chev")}</a>
            ${mega()}
          </div>
          <a href="catalogo.html?view=lookbook">Lookbook</a>
          <a href="index.html#lanzamiento" class="nav-launch">Lanzamiento <span class="nav-count" data-launch-count></span></a>
          <a href="giftcards.html" ${cur("giftcards")}>Gift cards</a>
        </div>
        <button class="icon-btn menu-btn" id="menu-btn" aria-label="Abrir menú" aria-expanded="false">${icon("menu")}</button>
        <a href="index.html" class="logo" aria-label="Mini Galú, inicio"><span class="bow">${BOW}</span>Mini Galú</a>
        <div class="nav-actions">
          <button class="icon-btn" id="search-btn" aria-label="Buscar (atajo /)" data-tip="Buscar">${icon("search")}</button>
          <div class="nav-pop-wrap hide-m">
            <button class="icon-btn" data-pop="track" aria-label="Seguir mi pedido" aria-expanded="false" data-tip="Seguir mi pedido">${icon("truck")}</button>
            <div class="nav-pop" id="pop-track">
              <b class="pop-title">¿Dónde está mi pedido?</b>
              <a class="pop-order" href="seguimiento.html?pedido=MG-1042"><img src="assets/img/maddie-1.webp" alt=""><span><b>#MG-1042</b><small>En camino · llega el jueves 8</small></span>${icon("chevron-right", "i-sm")}</a>
              <form class="pop-form" data-track><input class="input" placeholder="Otro pedido (ej. MG-1040)" aria-label="Número de pedido" required><button class="btn btn-sm">Buscar</button></form>
            </div>
          </div>
          ${!auth.logged() ? `<a class="nav-login hide-m" href="ingresar.html">${icon("user-round", "i-sm")} Ingresar</a>` : `<div class="nav-pop-wrap hide-m">
            <button class="icon-btn" data-pop="user" aria-label="Mi cuenta" aria-expanded="false" data-tip="Mi cuenta">${icon("user-round")}</button>
            <div class="nav-pop pop-user" id="pop-user">
              <div class="pop-hi"><span class="av">L</span><span><b>Hola, Lucía</b><small>${nenas.all().map(([n, , t]) => `${n} (talle ${t})`).join(" · ") || "Sumá a tus nenas"}</small></span></div>
              <a href="cuenta.html#nenas">${icon("baby", "i-sm")} Mis nenas</a>
              <a href="cuenta.html#pedidos">${icon("package", "i-sm")} Mis pedidos <span class="pill-status st-ok">1 en camino</span></a>
              <a href="cuenta.html#favoritos">${icon("heart", "i-sm")} Favoritos <small class="muted" id="fav-n">${favs.size || ""}</small></a>
              <a href="cuenta.html#lista">${icon("list-checks", "i-sm")} Lista de cumple</a>
              <a href="giftcards.html">${icon("gift", "i-sm")} Gift cards <small class="muted">saldo $12.500</small></a>
              <a href="cuenta.html#datos">${icon("user-round", "i-sm")} Mis datos</a>
              <hr class="seam"><a href="index.html" class="muted" data-logout>${icon("log-out", "i-sm")} Salir</a>
            </div>
          </div>`}
          <button class="icon-btn" id="cart-btn" aria-label="Abrir bolsa">${icon("shopping-bag")}<span class="badge" id="cart-badge" data-n="0">0</span></button>
        </div>
      </nav>
    </header>
    <div class="mnav" id="mnav"><div class="wrap">
      <form class="mnav-search" action="catalogo.html">${icon("search", "i-sm")}<input name="q" type="search" placeholder="Buscá “vestido rojo”, “bautismo”…" aria-label="Buscar"></form>
      <a class="big" href="catalogo.html">Todo el taller <small>${live().length}</small></a>
      ${COLS.map(([c, label]) => `<a class="big" href="catalogo.html?col=${encodeURIComponent(c)}">${label} <small>${live().filter((p) => p.col === c).length}</small></a>`).join("")}
      <div class="mnav-sizes"><span class="eyebrow">Por talle</span><div>${SIZES.map((t) => `<a class="chip" href="catalogo.html?talle=${t}">${t === "12m" ? "12 m" : t}</a>`).join("")}</div></div>
      <a class="big" href="index.html#lanzamiento">Lanzamiento <span class="nav-count" data-launch-count></span></a>
      <a class="big" href="catalogo.html?view=lookbook">Lookbook ${icon("arrow-right")}</a>
      <a class="big" href="giftcards.html">Gift cards ${icon("arrow-right")}</a>
      <div class="mnav-small"><a href="seguimiento.html">${icon("truck", "i-sm")} Seguir mi pedido</a>${auth.logged() ? `<a href="cuenta.html">${icon("user-round", "i-sm")} Mi cuenta</a><a href="cuenta.html#favoritos">${icon("heart", "i-sm")} Favoritos</a><a href="index.html" data-logout>${icon("log-out", "i-sm")} Salir</a>` : `<a href="ingresar.html">${icon("user-round", "i-sm")} Ingresar o crear cuenta</a>`}<a href="#" data-open-galu>${icon("message-circle-heart", "i-sm")} Preguntale a Galú</a></div>
      <div class="mnav-foot"><a class="btn btn-sm btn-ghost" href="${WA}">${brand("whatsapp", "brand i-sm")} WhatsApp</a><a class="btn btn-sm btn-ghost" href="${IG}">${brand("instagram", "brand i-sm")} Instagram</a></div>
    </div></div>`;
  }

  function footer() {
    return `<footer class="site-footer hem-top">
      <div class="wrap footer-grid">
        <div>
          <a href="index.html" class="logo" style="color:var(--linen)"><span class="bow">${BOW}</span>Mini Galú</a>
          <p style="opacity:.75;max-width:36ch;margin:22px 0">Prendas de diseño para niñas, de 12 meses a talle 10. Cada modelo se corta, se cose y se borda a mano en nuestro taller.</p>
          <div class="social"><a href="${IG}" aria-label="Instagram">${brand("instagram")}</a><a href="${WA}" aria-label="WhatsApp">${brand("whatsapp")}</a><a href="mailto:hola@minigalu.com.ar" aria-label="Email">${icon("mail")}</a></div>
        </div>
        <div><h5>Tienda</h5><ul><li><a href="catalogo.html">Catálogo</a></li><li><a href="catalogo.html?col=Verano%202027">Verano 2027</a></li><li><a href="catalogo.html?col=Fiestas">Fiestas</a></li><li><a href="catalogo.html?col=Accesorios">Accesorios</a></li><li><a href="giftcards.html">Gift cards</a></li></ul></div>
        <div><h5>Ayuda</h5><ul><li><a href="seguimiento.html">Seguir mi pedido</a></li><li><a href="producto.html?p=cleo#medidas">Guía de talles</a></li><li><a href="#">Cambios y devoluciones</a></li><li><a href="#">Envíos y pagos</a></li><li><a href="#" data-open-galu>Hablar con Galú</a></li></ul></div>
        <div><h5>Cartas del taller</h5><p style="opacity:.75;font-size:14px;margin:0 0 14px">Enterate de los lanzamientos antes que en Instagram. Una carta por mes, prometido.</p>
          <form class="nl-form" data-nl><input class="input" type="email" required placeholder="tu@email.com" aria-label="Email"><button class="btn btn-light">Sumarme</button></form></div>
      </div>
      <div class="wrap">
        <div class="footer-bottom"><span>© 2025 Mini Galú · Marca registrada</span><div class="pay-logos"><span>${brand("mercadopago")} Mercado Pago</span><span>${icon("credit-card", "i-sm")} Crédito y débito</span><span>${icon("truck", "i-sm")} Andreani</span></div></div>
      </div>
    </footer>`;
  }

  function overlays() {
    return `${searchPanel()}<div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" aria-label="Tu bolsa" aria-hidden="true">
      <div class="drawer-head"><h2 class="display h3">Tu <em>bolsa</em></h2><button class="icon-btn" data-close aria-label="Cerrar">${icon("x")}</button></div>
      <div style="padding:16px 24px 0" class="ship-progress" id="drawer-ship"><span id="ship-msg"></span><div class="bar"><i id="ship-bar"></i></div></div>
      <div class="drawer-body" id="drawer-items"></div>
      <div class="drawer-foot" id="drawer-foot">
        <div class="row"><span class="muted">Subtotal</span><b style="font-size:20px" id="drawer-total"></b></div>
        <a class="btn btn-block" href="checkout.html">Ir a pagar ${icon("arrow-right")}</a>
        <div class="row muted" style="font-size:12px;justify-content:center;gap:16px;flex-wrap:wrap"><span style="display:inline-flex;gap:6px;align-items:center">${brand("mercadopago", "brand i-sm")} Pago seguro con Mercado Pago</span><span style="display:inline-flex;gap:6px;align-items:center">${icon("truck", "i-sm")} Andreani</span></div>
      </div>
    </aside>
    <nav class="contact-rail" aria-label="Contacto">
      <a href="${WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${brand("whatsapp")}<span>Escribinos por WhatsApp</span></a>
      <a href="${IG}" target="_blank" rel="noopener" aria-label="Instagram">${brand("instagram")}<span>@minigalumodainfantil</span></a>
      <a class="hide-m" href="mailto:hola@minigalu.com.ar" aria-label="Email">${icon("mail")}<span>hola@minigalu.com.ar</span></a>
      <hr><a class="hide-m" href="seguimiento.html" aria-label="Seguir mi pedido">${icon("package-search")}<span>Seguir mi pedido</span></a>
      <button class="cr-toggle" id="cr-toggle" aria-label="Contacto" aria-expanded="false">${icon("phone")}</button>
    </nav>
    <div class="galu-fab" id="galu-fab">
      <button class="galu-orb" data-open-galu aria-label="Abrir asistente Galú">${BOW}</button>
      <div class="galu-hint"><button class="x" data-hint-x aria-label="Cerrar">${icon("x", "i-sm")}</button><b>¡Hola! Soy Galú</b>¿Te ayudo a encontrar el talle o un vestido para un cumple?</div>
    </div>
    <section class="galu" id="galu" aria-label="Asistente Galú" aria-hidden="true" role="dialog">
      <div class="galu-head hem-bottom">
        <div class="avatar">${BOW}</div>
        <div><h3>Galú</h3><p>Responde con el stock real del taller</p></div>
        <button class="icon-btn close" data-close-galu aria-label="Cerrar">${icon("x")}</button>
      </div>
      <div class="galu-body" id="galu-body" aria-live="polite"></div>
      <div class="galu-sugs" id="galu-sugs"></div>
      <form class="galu-form" id="galu-form"><input id="galu-input" placeholder="Preguntame por talles, stock, envíos…" autocomplete="off" aria-label="Mensaje"><button aria-label="Enviar">${icon("send-horizontal")}</button></form>
      <div class="galu-note">¿Algo más? <a class="link" href="${WA}">Escribile a Gaby por WhatsApp</a></div>
    </section>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  }

  /* ------------------------------------------------------------------ asistente Galú (demo con reglas; en la app real: LLM + tools) */
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const galu = {
    started: false,
    sugs: ["¿Qué hay en talle 6?", "Algo para un cumple", "¿Cuánto sale el Samanta?", "Regalo para una nena de 3", "¿Dónde está mi pedido?"],
    say(html, cls = "bot") {
      const el = document.createElement("div");
      el.className = "msg " + cls;
      el.innerHTML = html;
      $("#galu-body").append(el);
      $("#galu-body").scrollTop = 1e6;
      return el;
    },
    cards(list, size) {
      if (!list.length) return;
      galu.say(list.map((p) => {
        const s = size && p.sizes[size] ? size : sizesIn(p)[0];
        const n = p.sizes[s];
        return `<div class="mini-card"><a href="producto.html?p=${p.slug}"><img src="${img(p)}" alt="${p.name}"></a><div><b>${p.name}</b><div class="muted">${money(p.price)}</div>
        <div class="stock">${n === 1 ? "¡Queda 1!" : `${n} en stock`} · talle ${s}</div><button class="btn" data-add="${p.slug}" data-size="${s}">Agregar</button></div></div>`;
      }).join(""), "cards");
    },
    async reply(q) {
      galu.say(escapeHtml(q), "me");
      const t = galu.say('<span class="typing"><i></i><i></i><i></i></span>');
      t.style.padding = "0";
      await new Promise((r) => setTimeout(r, 650 + Math.random() * 450));
      t.remove();
      galu.answer(norm(q));
    },
    answer(q) {
      const ctx = document.body.dataset.page === "producto" ? bySlug[params.get("p")] || bySlug["romantico-rojo"] : null;
      const named = products.find((p) => q.includes(norm(p.name).split(" ").slice(-1)[0]) || q.includes(p.slug.split("-")[0]));
      const sizeM = q.match(/talle\s*(\d{1,2}|12\s?m)|(\d{1,2})\s*anos?/);
      const size = sizeM ? (sizeM[1] ? sizeM[1].replace(/\s/g, "") : String(Math.max(2, Math.min(10, +sizeM[2] + (+sizeM[2] % 2))))) : null;
      const target = named || (/(este|esta|el vestido|lo tenes|viene|cuanto sale|hay talle)/.test(q) ? ctx : null);

      if (/pedido|seguimiento|llega|andreani|donde esta|mi compra/.test(q) && !/cuanto|costo|sale el envio/.test(q)) {
        galu.say("Encontré tu último pedido <b>#MG-1042</b>. Está <b>en camino con Andreani</b> y llega el <b>jueves 8 de octubre</b>.");
        galu.say(`<a class="link" href="seguimiento.html">Ver el recorrido completo</a>`);
        return;
      }
      if (/envio|enviar|mandan|codigo postal/.test(q)) {
        galu.say("Enviamos a todo el país con <b>Andreani</b> (a domicilio o a sucursal) o podés retirar gratis por el taller. Desde <b>$90.000</b> el envío es gratis. Si me pasás tu código postal te digo cuánto sale.");
        return;
      }
      if (/cuotas|como pago|pagar|tarjeta|mercado pago|debito|credito/.test(q) && !(target && /cuanto|sale/.test(q))) {
        galu.say("Pagás con <b>Mercado Pago</b> sin salir de la web: <b>tarjeta de crédito</b> (hasta 6 cuotas sin interés), <b>débito</b> o <b>dinero en cuenta</b>.");
        return;
      }
      if (target && /precio|cuanto|sale|cuesta|vale/.test(q)) {
        galu.say(`El <b>${target.name}</b> está <b>${money(target.price)}</b>${target.was ? ` (antes ${money(target.was)})` : ""}. Con tarjeta de crédito lo pagás en <b>6 cuotas sin interés de ${cuota(target.price)}</b>.`);
        galu.cards([target]);
        return;
      }
      if (target) {
        if (size) {
          const n = target.sizes[size] || 0;
          galu.say(n ? `¡Sí! Del <b>${target.name}</b> hay <b>${n}</b> en talle ${size}${n === 1 ? ". Es la última." : "."}` : `Del <b>${target.name}</b> no queda talle ${size}. Sí tengo: <b>${sizesIn(target).join(", ")}</b>. Si querés, te aviso por WhatsApp cuando vuelva.`);
          if (!n) galu.cards(products.filter((p) => p !== target && p.sizes[size] > 0 && p.occ.some((o) => target.occ.includes(o))).slice(0, 3), size);
          else galu.cards([target], size);
        } else {
          galu.say(`El <b>${target.name}</b> (${target.fabric.toLowerCase()}) está en talles <b>${sizesIn(target).join(", ")}</b>.`);
          galu.cards([target]);
        }
        return;
      }
      if (/regalo|regalar|sobrina|ahijada|nieta/.test(q)) {
        const list = products.filter((p) => !p.accessory && (!size || p.sizes[size] > 0)).sort((a, b) => a.price - b.price).slice(0, 3);
        galu.say(`¡Qué lindo regalo! ${size ? `Para talle <b>${size}</b> ` : ""}te recomiendo estos. Si no sabés el talle, una <b>gift card</b> nunca falla.`);
        galu.cards(list, size);
        galu.say(`<a class="link" href="giftcards.html">Ver gift cards</a>`);
        return;
      }
      if (/cumple|fiesta|casamiento|bautismo|comunion|navidad|evento/.test(q)) {
        const occ = ["casamiento", "bautismo", "comunion", "navidad", "cumple"].find((o) => q.includes(o)) || "fiesta";
        const list = products.filter((p) => p.occ.includes(occ) && stockOf(p) && (!size || p.sizes[size] > 0));
        galu.say(`Para ${occ === "fiesta" ? "una fiesta" : occ === "cumple" ? "un cumple" : occ === "navidad" ? "Navidad" : "un " + occ} estos son mis favoritos${size ? ` con stock en talle ${size}` : ""}:`);
        galu.cards(list.slice(0, 4), size);
        return;
      }
      if (size) {
        const list = products.filter((p) => p.sizes[size] > 0);
        galu.say(list.length ? `En <b>talle ${size}</b> tengo <b>${list.length} modelos</b> disponibles ahora:` : `En talle ${size} no queda nada por ahora. ¿Te aviso cuando llegue la próxima tanda?`);
        galu.cards(list, size);
        return;
      }
      if (/a medida|personaliz|encargo|bordar (un|el) nombre/.test(q)) {
        galu.say(`Por ahora no hacemos prendas a medida ni por encargo. Si me contás para qué ocasión es, te muestro lo que hay en su talle, o <a class="link" href="${WA}">le escribís a Gaby</a> y lo charlan.`);
        return;
      }
      if (/talle|medida|tabla|altura/.test(q)) {
        galu.say("Los talles van por edad (talle 4 ≈ 4 años), pero cada modelo tiene su <b>tabla de medidas</b>. Decime la <b>edad</b> o la <b>altura</b> de la nena y te digo cuál le va.");
        return;
      }
      const color = ["rojo", "blanco", "salvia", "verde", "beige", "crema"].find((c) => q.includes(c));
      if (color) {
        const list = products.filter((p) => norm(p.color[0]).includes(color) || (color === "verde" && p.color[0] === "Salvia"));
        galu.say(`En <b>${color}</b> tengo estos:`);
        galu.cards(list);
        return;
      }
      if (/barato|economico|menos de|presupuesto|oferta|descuento/.test(q)) {
        galu.say("Estas son las opciones más accesibles. El <b>Vestido Cleo</b> está con descuento:");
        galu.cards([...products].sort((a, b) => a.price - b.price).slice(0, 4));
        return;
      }
      if (/gift|giftcard|tarjeta de regalo/.test(q)) { galu.say(`Tenemos gift cards de $10.000 a $50.000. Llegan por mail con tu mensaje. <a class="link" href="giftcards.html">Comprar una</a>`); return; }
      if (/hola|buenas|hey|buen dia/.test(q)) { galu.say("¡Hola! ¿Para quién estás buscando? Contame la edad y la ocasión y te armo opciones."); return; }
      galu.say(`Eso todavía no lo sé. Puedo ayudarte con <b>talles, stock, precios, envíos</b> o a <b>elegir un look</b>. Para otras consultas, <a class="link" href="${WA}">escribile a Gaby</a>.`);
    },
    open(q) {
      $("#galu").classList.add("is-open");
      $("#galu").setAttribute("aria-hidden", "false");
      $("#galu-fab").classList.add("is-hidden");
      document.body.classList.add("galu-open");
      if (!galu.started) {
        galu.started = true;
        const ctx = document.body.dataset.page === "producto" ? bySlug[params.get("p")] || bySlug["romantico-rojo"] : null;
        galu.say(ctx ? `¡Hola! Veo que estás mirando el <b>${ctx.name}</b>. ¿Querés saber si hay tu talle?`
          : "¡Hola! Soy <b>Galú</b>, la asistente del taller.<br>Te ayudo a encontrar talle, ver stock, elegir un regalo o seguir tu pedido.");
        $("#galu-sugs").innerHTML = (ctx ? ["¿Hay talle 8?", "¿Cuánto sale?", "Mi nena tiene 5 años", "¿Cómo pago?"] : galu.sugs).map((s) => `<button class="chip">${s}</button>`).join("");
      }
      if (q) galu.reply(q);
      else if (matchMedia("(hover: hover)").matches) setTimeout(() => $("#galu-input").focus(), 300);
    },
    close() {
      if (!$("#galu")) return;
      $("#galu").classList.remove("is-open");
      $("#galu").setAttribute("aria-hidden", "true");
      $("#galu-fab").classList.remove("is-hidden");
      document.body.classList.remove("galu-open");
    },
  };
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ------------------------------------------------------------------ utilidades */
  let toastT;
  function toast(html, ico = "check") {
    const t = $("#toast");
    if (!t) return;
    t.innerHTML = (ico ? `<span class="ico">${icon(ico, "i-sm")}</span>` : "") + (html.trim().startsWith("<") ? html : `<span>${html}</span>`);
    t.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-on"), 2800);
  }
  function openDrawer() { $("#drawer").classList.add("is-open"); $("#scrim").classList.add("is-open"); $("#drawer").setAttribute("aria-hidden", "false"); }
  function closeDrawer() { $("#drawer")?.classList.remove("is-open"); $("#scrim")?.classList.remove("is-open"); $("#drawer")?.setAttribute("aria-hidden", "true"); }
  function openModal(id) {
    const m = document.getElementById(id); if (!m) return;
    let s = $(".modal-scrim");
    if (!s) { s = document.createElement("div"); s.className = "scrim modal-scrim"; document.body.append(s); s.addEventListener("click", closeModals); }
    m.classList.add("is-open"); s.classList.add("is-open");
  }
  function closeModals() { $$(".modal.is-open").forEach((m) => m.classList.remove("is-open")); $(".modal-scrim")?.classList.remove("is-open"); }

  // Costuras: la primera vez que un dobladillo entra en pantalla, una aguja lo cose de izquierda a derecha.
  const NEEDLE = '<svg viewBox="0 0 34 10" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M2.2 3.3C.9 3.6.9 6.4 2.2 6.7L8.5 6.3 33.4 5.1V4.9L8.5 3.7ZM3.2 5a1.5.6 0 1 0 3 0 1.5.6 0 1 0-3 0Z"/><path d="M9 4.45 29 4.92" stroke="#fff" stroke-opacity=".55" stroke-width=".5" stroke-linecap="round"/></svg>';
  function sewSeams() {
    const still = document.documentElement.classList.contains("static") || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) return;
    const SPEED = 862; // px por segundo
    const ease = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
    // Una S acostada: la aguja sube, baja y se hunde bajo el hilo (la "tela"), y vuelve a salir.
    const WAVE = 280, AMP = 5, K = (Math.PI * 2) / WAVE;
    function sew(run, host, side, rtl) {
      const W = host.clientWidth, svg = run.firstElementChild, dist = W + 80;
      const T = Math.min(2350, Math.max(910, (dist / SPEED) * 1000)), t0 = performance.now();
      const set = (l, r) => { host.style.setProperty("--sl-" + side, l); host.style.setProperty("--sr-" + side, r); };
      (function frame(now) {
        const t = Math.min(1, (now - t0) / T);
        const d = dist * (0.7 * t + 0.3 * ease(t));          // casi constante, con arranque y frenada suaves
        const x = rtl ? W + 40 - d : d - 40;
        const y = AMP * Math.sin(K * d);
        const slope = (rtl ? -1 : 1) * AMP * K * Math.cos(K * d);
        const r = Math.atan(slope) * 180 / Math.PI * 1.1;   // la aguja sigue la curva
        svg.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(1)}deg)${rtl ? " scaleX(-1)" : ""}`;
        svg.style.opacity = Math.min(1, t * 20, (1 - t) * 14);
        const c = Math.max(0, Math.min(W, x));
        rtl ? set(c + "px", "0px") : set("0px", W - c + "px");
        if (t < 1) requestAnimationFrame(frame);
        else { set("0px", "0px"); run.remove(); }
      })(t0);
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      sew(e.target, e.target.parentElement, e.target.classList.contains("top") ? "top" : "bottom", e.target.dataset.rtl === "1");
    }), { threshold: 1, rootMargin: "0px 0px -18% 0px" });
    // las costuras se alternan: una de izquierda a derecha, la siguiente de derecha a izquierda
    let n = 0;
    $$("main .hem-top, main .hem-bottom, .site-footer.hem-top").forEach((host) => ["top", "bottom"].forEach((side) => {
      if (!host.classList.contains("hem-" + side)) return;
      host.classList.add("sew-" + side);
      host.insertAdjacentHTML("beforeend", `<span class="sew-run ${side}" data-rtl="${n++ % 2}" aria-hidden="true">${NEEDLE}</span>`);
      io.observe(host.lastElementChild);
    }));
  }

  /* ------------------------------------------------------------------ detalles de taller */
  const still = () => document.documentElement.classList.contains("static") || matchMedia("(prefers-reduced-motion: reduce)").matches;

  function craft() {

    // moños que se atan y bordados que florecen al aparecer
    $$(".logo .bow, .manifest-bow, .badge-rot .core, .gc .bow, .end-tile .emb").forEach((el) => el.classList.add("draw"));
    $$("svg.emb").forEach((svg) => { svg.classList.add("bloom"); [...svg.querySelectorAll("path, circle")].forEach((p, k) => p.style.setProperty("--k", k)); });
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add(e.target.classList.contains("eyebrow") ? "is-in" : "is-drawn"); io.unobserve(e.target); } }), { threshold: 0.3 });
    $$(".draw, svg.emb, .eyebrow").forEach((el) => (still() ? el.classList.add("is-in", "is-drawn") : io.observe(el)));

    // cinta métrica: progreso de lectura (solo en la tienda)
    if (document.body.dataset.layout !== "bare" && !still()) {
      document.body.insertAdjacentHTML("beforeend", '<div class="tape" aria-hidden="true"><i></i><b></b></div>');
      const tape = $(".tape"); let raf;
      const upd = () => { const max = document.documentElement.scrollHeight - innerHeight; const p = max > 0 ? scrollY / max : 0; tape.style.setProperty("--p", (p * innerWidth).toFixed(1) + "px"); tape.classList.toggle("is-on", p > 0.002); };
      addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(upd); }, { passive: true });
      addEventListener("resize", upd); upd();
    }
  }

  // estallido de puntadas alrededor de un botón (favoritos)
  function stitchBurst(el) {
    if (still()) return;
    const r = el.getBoundingClientRect(), b = document.createElement("span");
    b.className = "stitch-burst"; b.style.left = r.left + r.width / 2 + "px"; b.style.top = r.top + r.height / 2 + "px";
    b.innerHTML = Array.from({ length: 10 }, (_, k) => `<i style="--a:${k * 36}deg"></i>`).join("");
    document.body.append(b); setTimeout(() => b.remove(), 800);
  }

  // la prenda vuela en arco hasta la bolsa
  function flyToBag(src) {
    const bag = $("#cart-btn");
    if (!src || !bag || still()) return;
    const a = src.getBoundingClientRect(), z = bag.getBoundingClientRect();
    if (!a.width) return;
    const w = Math.min(120, a.width * .5), h = w * 1.3;
    const f = document.createElement("div");
    f.className = "fly"; f.style.cssText = `left:${a.left + a.width / 2 - w / 2}px;top:${a.top + a.height / 2 - h / 2}px;width:${w}px;height:${h}px`;
    f.innerHTML = `<img src="${src.currentSrc || src.src}" alt="">`;
    document.body.append(f);
    const dx = z.left + z.width / 2 - (a.left + a.width / 2), dy = z.top + z.height / 2 - (a.top + a.height / 2);
    const lift = Math.min(-80, dy - 140);
    f.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", borderRadius: "14px", opacity: 1 },
      { transform: `translate(${dx * .45}px, ${lift}px) scale(.7) rotate(-10deg)`, borderRadius: "40%", opacity: 1, offset: .45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(8deg)`, borderRadius: "50%", opacity: .4 },
    ], { duration: 900, easing: "cubic-bezier(.45,.05,.35,1)" }).onfinish = () => {
      f.remove(); bag.classList.remove("catch"); void bag.offsetWidth; bag.classList.add("catch");
    };
  }

  // títulos y encabezados de cualquier página entran suave al aparecer, como en la Home
  function autoReveal() {
    const skip = "[data-reveal], .split, .hero, .modal, .drawer, .galu, .done-ov, .mega, .search-ov, .mnav, .nav-pop, .adm-side, .adm-top, .msg";
    $$(".panel-head, .section-head > div, .cat-hero > div, .tr-hero > *, .co-head, .page-head, h1.display, h2.display").forEach((el) => {
      if (el.closest(skip) || el.querySelector("[data-reveal]")) return;
      el.setAttribute("data-reveal", "");
    });
  }

  function observeReveal(root = document) {
    if (document.documentElement.classList.contains("static")) { $$("[data-reveal], .split", root).forEach((el) => el.classList.add("is-in")); return; }
    // Chrome descuenta el clip-path del área visible: un elemento con máscara cerrada nunca "entra".
    // Por eso las máscaras se disparan observando a su contenedor.
    const targets = new Map();
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { (targets.get(e.target) || []).forEach((el) => el.classList.add("is-in")); targets.delete(e.target); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
    $$("[data-reveal]:not(.is-in), .split:not(.is-in)", root).forEach((el) => {
      const t = el.dataset.reveal === "mask" ? el.parentElement : el;
      targets.set(t, [...(targets.get(t) || []), el]);
      io.observe(t);
    });
  }

  // Lucide: reemplaza <i data-lucide> también en contenido que se renderiza después
  let iconRaf;
  const drawIcons = () => { cancelAnimationFrame(iconRaf); iconRaf = requestAnimationFrame(() => window.lucide?.createIcons({ attrs: { "stroke-width": 1.6 } })); };

  // una transición de vista que se corta (ej. se cambia de pestaña mientras navega) no es un error: se ignora
  // en modo captura (?static) no hay transiciones entre páginas
  if (params.has("static")) { addEventListener("pagereveal", (e) => e.viewTransition?.skipTransition()); addEventListener("pageswap", (e) => e.viewTransition?.skipTransition()); }
  addEventListener("unhandledrejection", (e) => { if (/Transition was (aborted|skipped)/.test(e.reason?.message || "")) e.preventDefault(); });

  /* ------------------------------------------------------------------ init */
  // páginas que necesitan sesión: sin sesión van a ingresar y vuelven después
  if (/cuenta\.html/.test(location.pathname) && !auth.logged()) location.replace("ingresar.html?volver=" + encodeURIComponent("cuenta.html" + location.hash));
  document.addEventListener("DOMContentLoaded", () => {
    if (params.has("static")) document.documentElement.classList.add("static");
    const bare = document.body.dataset.layout === "bare";
    if (!bare) {
      document.body.insertAdjacentHTML("afterbegin", header());
      document.body.insertAdjacentHTML("beforeend", footer() + overlays());
    } else if (!$("#toast")) document.body.insertAdjacentHTML("beforeend", '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
    $$("[data-icon]").forEach((el) => (el.outerHTML = icon(el.dataset.icon, el.className)));
    $$("[data-brand]").forEach((el) => (el.outerHTML = brand(el.dataset.brand, ("brand " + el.className).trim())));
    $$("[data-bow]").forEach((el) => (el.innerHTML = BOW));
    $$("[data-emb]").forEach((el) => (el.innerHTML = EMB));
    renderCart();
    try { if (sessionStorage.getItem("mg-hint") || params.has("static")) $("#galu-fab")?.classList.add("no-hint"); } catch {}
    setTimeout(() => $("#galu-fab")?.classList.add("no-hint"), 12000);

    const hdr = $("#site-header");
    if (hdr) {
      const onScroll = () => hdr.classList.toggle("is-solid", scrollY > 40 || document.body.classList.contains("menu-open"));
      onScroll();
      addEventListener("scroll", onScroll, { passive: true });
      initNav(hdr);
    }

    // alto real del panel de talles, para que la etiqueta de las tarjetas en arco suba justo hasta arriba de él
    const measureQuick = (e) => { const c = e.target.closest?.(".p-card.arch"); const q = c?.querySelector(".p-quick"); if (q) c.style.setProperty("--qh", q.offsetHeight + "px"); };
    document.addEventListener("pointerover", measureQuick, { passive: true });
    document.addEventListener("focusin", measureQuick);
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a");
      if (!t) { if (e.target.id === "scrim") closeDrawer(); return; }
      if (t.id === "cart-btn") return openDrawer();
      if (t.id === "cr-toggle") { const o = $(".contact-rail").classList.toggle("is-open"); t.setAttribute("aria-expanded", o); t.innerHTML = icon(o ? "x" : "phone"); return; }
      if (t.id === "menu-btn") {
        const open = !$("#mnav").classList.contains("is-open");
        $("#mnav").classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
        t.setAttribute("aria-expanded", open);
        t.innerHTML = icon(open ? "x" : "menu");
        hdr?.classList.toggle("is-solid", open || scrollY > 40);
        return;
      }
      if (t.closest("#mnav") && t.tagName === "A" && $("#mnav").classList.contains("is-open")) $("#menu-btn")?.click(); // cierra el menú al elegir
      if (t.matches("[data-logout]")) { e.preventDefault(); auth.logout(); try { sessionStorage.setItem("mg-flash", "Cerraste sesión. ¡Hasta pronto!"); } catch {} location.href = "index.html"; return; }
      if (t.matches("[data-close]")) return closeDrawer();
      if (t.matches("[data-hint-x]")) { $("#galu-fab").classList.add("no-hint"); try { sessionStorage.setItem("mg-hint", "1"); } catch {} return; }
      if (t.matches("[data-open-galu]")) { e.preventDefault(); return galu.open(t.dataset.q); }
      if (t.matches("[data-close-galu]")) return galu.close();
      if (t.matches("[data-modal-open]")) { e.preventDefault(); return openModal(t.dataset.modalOpen); }
      if (t.matches("[data-modal-close]")) return closeModals();
      if (t.matches("[data-quick]")) { e.preventDefault(); const c = t.closest(".p-card"); $$(".p-card.is-quick").forEach((x) => x !== c && x.classList.remove("is-quick")); return c.classList.toggle("is-quick"); }
      if (t.dataset.add) { e.preventDefault(); t.closest(".p-card")?.classList.remove("is-quick"); return addToCart(t.dataset.add, t.dataset.size, { from: t.closest(".p-card")?.querySelector(".p-media img") }); }
      if (t.dataset.fav) {
        e.preventDefault();
        const on = !favs.has(t.dataset.fav);
        on ? favs.add(t.dataset.fav) : favs.delete(t.dataset.fav);
        store.set("mg-favs-v2", [...favs]);
        $$(`[data-fav="${t.dataset.fav}"]`).forEach((b) => b.classList.toggle("is-on", on));
        document.dispatchEvent(new CustomEvent("mg:favs"));
        if (on) stitchBurst(t);
        return toast(on ? "Guardado en favoritos" : "Quitado de favoritos", "heart");
      }
      if (t.dataset.q !== undefined && t.closest("#drawer-items")) {
        const it = cart[+t.dataset.q];
        const max = bySlug[it.slug].sizes[it.size] || 0;
        if (+t.dataset.d > 0 && it.qty >= max) return toast(`No hay más stock en talle ${it.size}`, "info");
        it.qty += +t.dataset.d;
        if (it.qty < 1) cart.splice(+t.dataset.q, 1);
        return saveCart();
      }
      if (t.dataset.rm !== undefined) { cart.splice(+t.dataset.rm, 1); return saveCart(); }
      if (t.closest("#galu-sugs") && t.matches(".chip")) return galu.reply(t.textContent);
      if (t.matches("[data-vt]")) { // la foto "viaja" a la ficha de producto
        const im = t.closest(".p-card")?.querySelector(".p-media img") || t.querySelector("img");
        if (im) { $$(".pdp-main img").forEach((x) => (x.style.viewTransitionName = "none")); im.style.viewTransitionName = "product-hero"; }
      }
    });
    document.addEventListener("submit", (e) => {
      if (e.target.id === "galu-form") {
        e.preventDefault();
        const v = $("#galu-input").value.trim();
        if (v) { $("#galu-input").value = ""; galu.reply(v); }
      }
      if (e.target.matches("[data-nl]")) { e.preventDefault(); e.target.innerHTML = '<span class="hand" style="color:var(--rosa);font-size:26px">¡Gracias! Te escribimos pronto.</span>'; }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); galu.close(); closeModals(); } });
    addEventListener("pageshow", () => $$("[style*='view-transition-name']").forEach((el) => { if (!el.closest(".pdp-main")) el.style.viewTransitionName = ""; }));

    document.dispatchEvent(new CustomEvent("mg:ready"));
    try { const f = sessionStorage.getItem("mg-flash"); if (f) { sessionStorage.removeItem("mg-flash"); setTimeout(() => toast(f, "heart"), 500); } } catch {}
    autoReveal();
    observeReveal();
    sewSeams();
    craft();
    drawIcons();
    new MutationObserver((ms) => { if (ms.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.("i[data-lucide]") || n.querySelector?.("i[data-lucide]"))))) drawIcons(); }).observe(document.body, { childList: true, subtree: true });
  });

  window.MG = { nenas, wishes, wishPick, auth, store, flyToBag, D, products, bySlug, img, money, cuota, card, icon, brand, BOW, EMB, WA, IG, addToCart, stockOf, sizesIn, observeReveal, toast, openDrawer, openModal, closeModals, galu, cart: () => cart, cartTotal, favs, saveCart, params, drawIcons };
})();
