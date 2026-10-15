import type { HelpPageInput, HelpTopic } from "@mini-galu/contracts";

/** Datos de la tienda que aparecen en los textos de base. */
export type HelpFacts = {
  workshop: string;
  /** "$ 90.000" */
  freeShippingFrom: string;
  email: string;
};

/**
 * Textos de base de las páginas de ayuda: lo que ya dice la tienda (producto, home, Galú) y lo que pide la ley
 * (Ley 24.240 de Defensa del Consumidor y Ley 25.326 de Datos Personales). Gaby los ajusta desde el panel; lo que
 * guarda reemplaza al texto de base.
 */
export function defaultHelpPage(topic: HelpTopic, f: HelpFacts): HelpPageInput {
  return DEFAULTS[topic](f);
}

const DEFAULTS: Record<HelpTopic, (f: HelpFacts) => HelpPageInput> = {
  cambios: (f) => ({
    title: "Cambios y devoluciones",
    intro: "Si el talle no fue el justo, lo cambiamos. Tenés 30 días desde que recibís el pedido.",
    sections: [
      {
        title: "Cambios de talle",
        body: [
          "Tenés 30 días desde que recibís tu pedido para cambiar el talle de cualquier prenda.",
          "- La prenda tiene que estar sin uso, sin lavar y con su etiqueta.",
          "- El cambio está sujeto al stock del talle que necesitás. Si no queda, te ofrecemos otro modelo o una gift card por el mismo valor.",
        ].join("\n"),
      },
      {
        title: "Cómo pedir un cambio",
        body: [
          `Escribinos por WhatsApp o a ${f.email} con tu número de pedido y el talle que querés.`,
          `Coordinamos cómo nos hacés llegar la prenda: por Andreani o trayéndola al taller de ${f.workshop}.`,
        ].join("\n\n"),
      },
      {
        title: "Arrepentimiento de compra",
        body: [
          "Por la Ley 24.240 de Defensa del Consumidor, podés arrepentirte de una compra online dentro de los 10 días corridos desde que la recibís, sin dar explicaciones y sin costo.",
          `Para hacerlo, escribinos a ${f.email} con tu número de pedido. Te devolvemos el dinero por el mismo medio de pago con el que compraste.`,
        ].join("\n\n"),
      },
      {
        title: "Si algo llegó mal",
        body: "Si una prenda llegó con una falla o no es la que pediste, avisanos apenas la recibas y lo resolvemos sin costo para vos.",
      },
    ],
  }),
  "envios-y-pagos": (f) => ({
    title: "Envíos y pagos",
    intro: `Enviamos a todo el país con Andreani o lo retirás gratis por el taller. Envío gratis desde ${f.freeShippingFrom}.`,
    sections: [
      {
        title: "Envíos",
        body: [
          "- A domicilio o a una sucursal Andreani, a todo el país.",
          `- Retiro gratis en el taller de ${f.workshop}, eligiendo día y horario.`,
          `- Envío gratis en compras desde ${f.freeShippingFrom}.`,
          "",
          "El costo de envío se calcula con tu código postal: lo ves en cada prenda y en el checkout antes de pagar.",
        ].join("\n"),
      },
      {
        title: "Seguimiento",
        body: "Cuando despachamos tu pedido te avisamos con el número de seguimiento. Lo podés seguir desde “¿Dónde está mi pedido?” con tu número de pedido.",
      },
      {
        title: "Medios de pago",
        body: [
          "Pagás con Mercado Pago sin salir de la web:",
          "- Tarjeta de crédito, en cuotas (las que hay hoy se ven en cada prenda).",
          "- Tarjeta de débito.",
          "- Dinero en cuenta de Mercado Pago.",
          "- Gift card de Mini Galú: cargás el código en el checkout y se descuenta del total.",
        ].join("\n"),
      },
      {
        title: "Stock y reserva",
        body: "Vendemos solo lo que tenemos en el taller. Cuando confirmás el pedido, reservamos tus prendas por 30 minutos mientras pagás; si el pago no se completa, vuelven a la tienda.",
      },
    ],
  }),
  terminos: (f) => ({
    title: "Términos y condiciones",
    intro: "Las condiciones para comprar en la tienda online de Mini Galú.",
    sections: [
      {
        title: "Quiénes somos",
        body: `Mini Galú es una marca de prendas de diseño para niñas, de 12 meses a talle 10, hechas en nuestro taller de ${f.workshop} (CABA). Al comprar en esta web aceptás estas condiciones.`,
      },
      {
        title: "Precios y stock",
        body: [
          "- Los precios están en pesos argentinos y son los que ves al confirmar el pedido.",
          "- Vendemos solo prendas con stock. Una compra queda confirmada cuando Mercado Pago aprueba el pago.",
          "- Las fotos muestran las prendas reales; el color puede variar un poco según la pantalla.",
        ].join("\n"),
      },
      {
        title: "Pagos",
        body: "Los pagos se procesan con Mercado Pago. Mini Galú no ve ni guarda los datos de tu tarjeta.",
      },
      {
        title: "Gift cards",
        body: "Las gift cards valen 6 meses desde que se activan. Se usan en la tienda online o en el taller, en una o varias compras, hasta agotar el saldo.",
      },
      {
        title: "Cambios, devoluciones y arrepentimiento",
        body: "Están explicados en la página de Cambios y devoluciones. Tu derecho de arrepentimiento (10 días corridos desde que recibís la compra) está garantizado por la Ley 24.240.",
      },
      {
        title: "Contacto y reclamos",
        body: `Para cualquier consulta o reclamo escribinos a ${f.email}. Si no lo resolvemos, podés acudir a la Dirección Nacional de Defensa del Consumidor (argentina.gob.ar/produccion/defensadelconsumidor).`,
      },
    ],
  }),
  privacidad: (f) => ({
    title: "Política de privacidad",
    intro: "Qué datos tuyos guardamos, para qué y cómo podés pedir que los cambiemos o los borremos.",
    sections: [
      {
        title: "Qué datos guardamos",
        body: [
          "- Nombre, email y teléfono, para avisarte cómo va tu pedido.",
          "- Dirección de entrega, solo si elegís envío.",
          "- Si creás una cuenta: tus pedidos, favoritos y, si las cargás, el nombre, el talle y el cumple de tus nenas.",
          "- Si te sumás a las Cartas del taller o a un lanzamiento: tu email o tu WhatsApp.",
          "- Las charlas con Galú, para mejorar sus respuestas.",
        ].join("\n"),
      },
      {
        title: "Para qué los usamos",
        body: "Para procesar y enviar tus compras, ayudarte a elegir y, si te sumaste, contarte novedades. No vendemos ni compartimos tus datos con fines comerciales.",
      },
      {
        title: "Con quién los compartimos",
        body: [
          "Solo con quienes necesitamos para que tu compra llegue:",
          "- Mercado Pago, para procesar el pago.",
          "- Andreani, para el envío (nombre, teléfono y dirección).",
          "- El servicio que manda nuestros mails.",
        ].join("\n"),
      },
      {
        title: "Cookies",
        body: "Usamos cookies para recordar tu bolsa y tu sesión. No usamos cookies de publicidad.",
      },
      {
        title: "Tus derechos",
        body: [
          `Podés pedirnos ver, corregir o borrar tus datos escribiendo a ${f.email}. Las Cartas del taller tienen su link para darte de baja en cada envío.`,
          "El acceso a tus datos es gratuito cada seis meses o antes si tenés un interés legítimo (Ley 25.326, art. 14).",
          "La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.",
        ].join("\n\n"),
      },
    ],
  }),
};
