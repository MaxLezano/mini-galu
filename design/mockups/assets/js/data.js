/* Mini Galú — datos de ejemplo compartidos por tienda y admin.
   En la app real salen de la API (packages/db seed + api/catalog, api/orders…). Precios en pesos. */
window.MGDATA = (() => {
  const products = [
    { slug: "romantico-rojo", name: "Set Romántico Rojo", price: 38000, col: "Fiestas", occ: ["fiesta", "navidad", "cumple"], color: ["Rojo", "#A3302B"], photos: ["romantico-rojo-1", "romantico-rojo-2", "romantico-rojo-3"], sizes: { 4: 0, 6: 0, 8: 3, 10: 2 }, waitlist: { 4: 3, 6: 5 }, fabric: "Lino lavado y algodón", desc: "Blusa romántica con cuello bordado a mano y falda jumper con bolsillos y tiradores de puntilla.", tag: "Nuevo", sold30: 9, views: 412, rating: [4.9, 12] },
    { slug: "maddie", name: "Set Maddie Bordado", price: 39000, col: "Verano 2027", occ: ["diario", "cumple", "fiesta"], color: ["Beige", "#CDB79A"], photos: ["maddie-1", "maddie-2", "maddie-3", "maddie-4", "maddie-5"], sizes: { 4: 2, 6: 3, 8: 1 }, waitlist: { 10: 2 }, fabric: "Lino y puntilla de algodón", desc: "Blusa bordada con detalle de puntilla de algodón y jumper con tirador.", tag: "Nuevo", sold30: 7, views: 380, rating: [5, 8] },
    { slug: "samanta", name: "Vestido Samanta Plumeti", price: 47000, col: "Fiestas", occ: ["fiesta", "bautismo", "casamiento", "comunion"], color: ["Blanco", "#F3EFE7"], photos: ["samanta-1", "samanta-2", "samanta-3"], sizes: { 6: 0, 8: 3, 10: 1 }, waitlist: { 6: 6 }, fabric: "Plumeti de algodón", desc: "Plumeti con volados de puntilla y alforzas en el pecho. Para los días que se recuerdan.", sold30: 6, views: 655, rating: [4.8, 9] },
    { slug: "catalina", name: "Vestido Catalina", price: 32000, col: "Verano 2027", occ: ["fiesta", "navidad", "cumple"], color: ["Rojo", "#A3302B"], photos: ["catalina-1", "catalina-2", "catalina-3"], sizes: { 2: 3, 6: 1, 8: 1, 10: 0 }, waitlist: { 10: 2 }, fabric: "Gabardina liviana", desc: "Jumper rojo con cuello bebé bordado con margaritas. Incluye moño rojo.", tag: "Incluye moño", sold30: 5, views: 298, rating: [4.9, 15] },
    { slug: "catalina-rojo", name: "Vestido Catalina Bordado", price: 34000, col: "Verano 2027", occ: ["diario", "navidad"], color: ["Rojo", "#B23A2E"], photos: ["catalina-rojo-1", "catalina-rojo-2"], sizes: { 6: 0, 8: 0, 10: 1 }, waitlist: { 6: 4, 8: 3 }, fabric: "Lino", desc: "Lino rojo con volados y ramo de margaritas bordado a mano. Amplio y fresco.", sold30: 4, views: 201, rating: [5, 4] },
    { slug: "cleo", name: "Vestido Cleo", price: 26900, was: 31900, col: "Atemporal", occ: ["diario", "fiesta"], color: ["Crema", "#EFE6D6"], photos: ["cleo-1", "cleo-2", "cleo-3"], sizes: { 2: 0, 4: 3, 6: 2, 8: 1 }, waitlist: { 2: 2 }, fabric: "Lino natural", desc: "Lino crema con cuello bebé bordado con rosas rojas.", measures: { 2: "Largo 46 · cintura 28", 4: "Largo 50 · cintura 30", 6: "Largo 53 · axila 32", 8: "Largo 58 · axila 34" }, sold30: 6, views: 344, rating: [4.7, 11] },
    { slug: "elsa", name: "Vestido Elsa", price: 28000, col: "Verano 2027", occ: ["diario", "cumple"], color: ["Salvia", "#8B9A7C"], photos: ["elsa-1", "elsa-2"], sizes: { 2: 2, 4: 2, 6: 0 }, waitlist: { 6: 3 }, fabric: "Lino lavado", desc: "Lino salvia con volados, botones de madera y flores bordadas. Vincha a juego.", tag: "Con vincha", sold30: 5, views: 276, rating: [4.9, 7] },
    { slug: "rebeca", name: "Vestido Rebeca", price: 28000, col: "Atemporal", occ: ["bautismo", "fiesta", "cumple"], color: ["Blanco", "#F7F3EC"], photos: ["rebeca-1", "rebeca-2"], sizes: { "12m": 1, 2: 2, 4: 0 }, waitlist: { 4: 2 }, fabric: "Algodón", desc: "Escote corazón, mangas globo y falda con mucho vuelo. Para girar.", sold30: 3, views: 190, rating: [5, 6] },
    { slug: "mariel", name: "Jumper Mariel Bordado", price: 28000, col: "Fiestas", occ: ["navidad", "fiesta"], color: ["Rojo", "#A3302B"], photos: ["mariel-1", "mariel-2"], sizes: { 4: 1, 6: 1 }, waitlist: {}, fabric: "Gabardina y puntilla", desc: "Jumper con volados y cuello de puntilla bordado con rosas.", sold30: 4, views: 233, rating: [4.8, 5] },
    { slug: "mono-verde", name: "Moño Verde Largo", price: 2500, col: "Accesorios", occ: ["diario", "fiesta", "regalo"], color: ["Verde", "#2F6B5A"], photos: ["mono-verde"], sizes: { "Único": 15 }, waitlist: {}, fabric: "Lino", desc: "Moño largo de lino para trenzas y semirrecogidos.", accessory: true, sold30: 11, views: 120, rating: [5, 9] },
    { slug: "corazon-pana", name: "Jumper Corazón de Pana", price: 36000, col: "Otoño · Invierno 26", occ: ["diario"], color: ["Canela", "#9A5A36"], photos: ["hero-bosque"], sizes: { 2: 0, 4: 0, 6: 0 }, waitlist: { 2: 4, 4: 9, 6: 7 }, fabric: "Pana fina", desc: "Jumper de pana con bolsillo corazón bordado con florcitas.", draft: true, sold30: 0, views: 0, rating: [0, 0] },
  ];

  const customers = {
    lucia: { name: "Lucía Fernández", city: "CABA", phone: "11 5555-1234", email: "lucia@gmail.com", nenas: [["Olivia", 6, "14 nov"], ["Emma", 2, "3 mar"]], since: "may 2026" },
    carla: { name: "Carla Méndez", city: "Rosario", phone: "341 555-8899", email: "carla.mendez@gmail.com", nenas: [["Juana", 10, "2 dic"]], since: "jul 2026" },
    romina: { name: "Romina Paz", city: "CABA", phone: "11 4444-7788", email: "romi.paz@hotmail.com", nenas: [["Mía", 4, "21 oct"]], since: "ago 2026" },
    sol: { name: "Sol Acosta", city: "La Plata", phone: "221 555-0101", email: "sol.acosta@gmail.com", nenas: [["Alma", 6, "9 ene"]], since: "mar 2026" },
    valeria: { name: "Valeria Gómez", city: "Córdoba", phone: "351 555-2323", email: "vale.gomez@gmail.com", nenas: [["Catalina", 8, "30 oct"]], since: "oct 2026" },
    mariana: { name: "Mariana Ríos", city: "Mendoza", phone: "261 555-4545", email: "marianarios@gmail.com", nenas: [["Lola", 2, "15 feb"], ["Isabella", "12m", "1 nov"]], since: "sep 2026" },
    julieta: { name: "Julieta Sosa", city: "Mar del Plata", phone: "223 555-6767", email: "juli.sosa@gmail.com", nenas: [["Martina", 4, "8 ago"]], since: "jun 2026" },
    agustina: { name: "Agustina López", city: "Tigre", phone: "11 3333-9090", email: "agus.lopez@gmail.com", nenas: [["Renata", 2, "19 oct"]], since: "sep 2026" },
    florencia: { name: "Florencia Díaz", city: "CABA", phone: "11 2222-1212", email: "flor.diaz@gmail.com", nenas: [["Emilia", 4, "5 abr"]], since: "abr 2026" },
    camila: { name: "Camila Torres", city: "Neuquén", phone: "299 555-3434", email: "cami.torres@gmail.com", nenas: [["Sofía", 10, "27 jul"]], since: "may 2026" },
    paula: { name: "Paula Benítez", city: "Salta", phone: "387 555-5656", email: "pau.benitez@gmail.com", nenas: [["Victoria", 4, "12 dic"]], since: "oct 2026" },
    natalia: { name: "Natalia Ruiz", city: "Bahía Blanca", phone: "291 555-7878", email: "nati.ruiz@gmail.com", nenas: [["Clara", 6, "18 nov"]], since: "oct 2026" },
  };

  // status: esperando_pago · nuevo · preparando · listo · en_camino · entregado
  const orders = [
    { id: "MG-1046", c: "paula", when: "hace 2 h", date: "6 oct", status: "esperando_pago", items: [["elsa", "4", 1]], ship: ["domicilio", 8900], pay: ["link", null], channel: "WhatsApp", note: "Link de pago enviado por WhatsApp" },
    { id: "MG-1045", c: "natalia", when: "hace 5 h", date: "5 oct", status: "esperando_pago", items: [["cleo", "6", 1]], ship: ["sucursal", 6400], pay: ["link", null], channel: "Instagram", note: "Venta por DM de Instagram" },
    { id: "MG-1044", c: "valeria", when: "hace 25 min", date: "6 oct", status: "nuevo", items: [["samanta", "8", 1]], ship: ["domicilio", 8900], pay: ["credito", 6], channel: "Web" },
    { id: "MG-1043", c: "lucia", when: "hace 1 h", date: "6 oct", status: "nuevo", items: [["romantico-rojo", "8", 1], ["mono-verde", "Único", 1]], ship: ["domicilio", 5900], pay: ["debito", 1], channel: "Web" },
    { id: "MG-1041", c: "carla", when: "ayer", date: "5 oct", status: "preparando", items: [["samanta", "10", 1]], ship: ["sucursal", 6400], pay: ["dinero_cuenta", 1], channel: "Web" },
    { id: "MG-1040", c: "romina", when: "ayer", date: "5 oct", status: "listo", items: [["cleo", "4", 1]], ship: ["taller", 0], pay: ["credito", 3], channel: "Web" },
    { id: "MG-1039", c: "mariana", when: "4 oct", date: "4 oct", status: "listo", items: [["catalina", "2", 1], ["rebeca", "12m", 1]], ship: ["domicilio", 9800], pay: ["credito", 6], channel: "Galú", tracking: "360002418775401" },
    { id: "MG-1042", c: "lucia", when: "2 oct", date: "2 oct", status: "en_camino", items: [["maddie", "6", 1], ["mono-verde", "Único", 1]], ship: ["domicilio", 0], pay: ["credito", 6], channel: "Web", tracking: "360002418775320" },
    { id: "MG-1038", c: "julieta", when: "1 oct", date: "1 oct", status: "en_camino", items: [["mariel", "4", 1]], ship: ["domicilio", 8400], pay: ["dinero_cuenta", 1], channel: "Web", tracking: "360002418775188" },
    { id: "MG-1037", c: "agustina", when: "30 sep", date: "30 sep", status: "en_camino", items: [["elsa", "2", 1]], ship: ["sucursal", 4900], pay: ["debito", 1], channel: "Galú", tracking: "360002418775102" },
    { id: "MG-1036", c: "florencia", when: "26 sep", date: "26 sep", status: "entregado", items: [["maddie", "4", 1]], ship: ["taller", 0], pay: ["credito", 3], channel: "Web" },
    { id: "MG-1035", c: "camila", when: "24 sep", date: "24 sep", status: "entregado", items: [["romantico-rojo", "10", 1]], ship: ["domicilio", 10900], pay: ["credito", 6], channel: "Instagram", tracking: "360002418774870" },
    { id: "MG-1034", c: "sol", when: "22 sep", date: "22 sep", status: "entregado", items: [["catalina", "6", 1]], ship: ["domicilio", 7400], pay: ["giftcard", 1], channel: "Web", tracking: "360002418774802" },
  ];

  const statuses = [
    { key: "esperando_pago", label: "Esperando pago", short: "Esperando pago", tone: "st-muted", icon: "hourglass" },
    { key: "nuevo", label: "Nuevos", short: "Nuevo", tone: "st-rose", icon: "inbox" },
    { key: "preparando", label: "Preparando", short: "Preparando", tone: "st-warn", icon: "scissors" },
    { key: "listo", label: "Listos para despachar", short: "Listo", tone: "st-sand", icon: "package-check" },
    { key: "en_camino", label: "En camino", short: "En camino", tone: "st-ok", icon: "truck" },
    { key: "entregado", label: "Entregados", short: "Entregado", tone: "st-done", icon: "circle-check" },
  ];

  const payLabel = { credito: "Tarjeta de crédito", debito: "Tarjeta de débito", dinero_cuenta: "Dinero en cuenta MP", link: "Link de pago MP", giftcard: "Gift card" };
  const shipLabel = { domicilio: "Andreani a domicilio", sucursal: "Andreani a sucursal", taller: "Retiro en el taller" };

  const conversations = [
    { who: "Valeria G.", when: "hace 32 min", result: ["receipt", "Terminó en el pedido <b>#MG-1044</b> · $55.900"], outcome: "compra", msgs: [["me", "Hola! tenés el Samanta en talle 8?"], ["bot", "¡Sí! Del Vestido Samanta Plumeti quedan 3 en talle 8."], ["me", "Genial, y cuánto tarda a Córdoba?"], ["bot", "Con Andreani a domicilio llega entre el lunes 12 y el martes 13. Costo: $8.900."], ["me", "Listo lo compro"]] },
    { who: "Anónima", when: "hace 1 h", outcome: "sin_respuesta", msgs: [["me", "Hacen vestidos de comunión a medida?"], ["bot", "Mmm, eso no lo sé todavía. ¿Querés que te pase con Gaby por WhatsApp?"]] },
    { who: "Mariana R.", when: "4 oct", result: ["receipt", "Terminó en el pedido <b>#MG-1039</b> · $69.800"], outcome: "compra", msgs: [["me", "Busco algo para el bautismo de mi bebé de 1 año"], ["bot", "Para bautismo te recomiendo el Vestido Rebeca: queda 1 en talle 12 meses."], ["me", "Y algo para la hermana de 2?"], ["bot", "El Vestido Catalina tiene 3 en talle 2 y combina en estilo."]] },
    { who: "Anónima", when: "3 oct", outcome: "aviso", result: ["bell-ring", "Quedó anotada para el <b>talle 6</b> del Samanta"], msgs: [["me", "El Samanta en talle 6 cuándo vuelve?"], ["bot", "No queda talle 6 por ahora. ¿Te aviso por WhatsApp cuando vuelva?"], ["me", "Sí porfa"]] },
    { who: "Anónima", when: "3 oct", outcome: "sin_respuesta", msgs: [["me", "Tienen talle 12?"], ["bot", "Los talles van de 12 meses a 10 años. ¿Querés ver lo que hay en talle 10?"]] },
  ];

  const automations = [
    { on: true, icon: "badge-check", title: "Pago aprobado", when: "Mercado Pago confirma un pago", does: ["Descuenta stock", "Mueve el pedido a Nuevos", "WhatsApp + mail de confirmación al cliente", "Te avisa a vos"], runs: 31, channel: ["whatsapp", "mail"] },
    { on: true, icon: "printer", title: "Etiqueta generada", when: "generás la etiqueta Andreani", does: ["Pasa el pedido a Listos", "Guarda el número de seguimiento"], runs: 24, channel: [] },
    { on: true, icon: "truck", title: "Despachado", when: "Andreani informa que retiró el paquete", does: ["Pasa a En camino", "Le manda el link de seguimiento"], runs: 22, channel: ["whatsapp"] },
    { on: true, icon: "house", title: "Entregado", when: "Andreani informa la entrega", does: ["Cierra el pedido", "A los 3 días pide una foto o reseña"], runs: 19, channel: ["whatsapp"] },
    { on: true, icon: "store", title: "Listo para retirar", when: "un pedido con retiro en el taller está listo", does: ["Le avisa con dirección y horarios"], runs: 6, channel: ["whatsapp"] },
    { on: true, icon: "bell-ring", title: "Volvió un talle", when: "cargás stock de un talle con lista de espera", does: ["Avisa a todas las anotadas, en orden"], runs: 8, channel: ["whatsapp", "mail"] },
    { on: true, icon: "link", title: "Link de pago sin pagar", when: "pasan 24 h desde que mandaste un link de pago", does: ["Le manda un recordatorio amable", "A las 72 h libera el stock"], runs: 5, channel: ["whatsapp"] },
    { on: false, icon: "shopping-bag", title: "Bolsa abandonada", when: "alguien deja prendas en la bolsa 24 h", does: ["Mail recordatorio con las fotos"], runs: 0, channel: ["mail"] },
    { on: true, icon: "cake", title: "Se acerca un cumple", when: "faltan 15 días para el cumple de una nena registrada", does: ["Mail con modelos en su talle"], runs: 4, channel: ["mail"] },
    { on: true, icon: "triangle-alert", title: "Stock bajo", when: "un talle queda en 1", does: ["Te avisa para que decidas si coser más"], runs: 12, channel: [] },
  ];

  return { products, customers, orders, statuses, payLabel, shipLabel, conversations, automations };
})();
