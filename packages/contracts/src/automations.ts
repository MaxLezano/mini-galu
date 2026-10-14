import { z } from "zod";

/** Canales por los que sale un aviso. "panel": te avisa a vos (campana), no al cliente. */
export type AutomationChannel = "mail" | "whatsapp" | "panel";

type RuleDef = {
  title: string;
  /** "Cuando …" */
  when: string;
  does: string[];
  channels: AutomationChannel[];
  /** Mensaje al cliente (null: la regla no le escribe a nadie). */
  message: string | null;
  /** Datos que se pueden insertar en el mensaje. */
  vars: string[];
  /** Si la regla todavía no puede funcionar, en qué fase llega. */
  phase: string | null;
  /** Reglas que son parte del flujo del pedido: no se pueden pausar. */
  locked?: boolean;
};

/** Las reglas del taller (admin-automatizaciones.html → data.js automations). */
export const AUTOMATION_RULES = {
  pago_aprobado: {
    title: "Pago aprobado",
    when: "Mercado Pago confirma un pago",
    does: ["Descuenta stock", "Mueve el pedido a Nuevos", "Mail de confirmación al cliente", "Te avisa a vos"],
    channels: ["mail", "whatsapp"],
    message: "Hola {nombre}! Recibimos el pago de tu pedido #{pedido}. Ya lo estamos preparando en el taller ✿",
    vars: ["nombre", "pedido"],
    phase: null,
  },
  etiqueta: {
    title: "Etiqueta generada",
    when: "generás la etiqueta Andreani",
    does: ["Pasa el pedido a Listos", "Guarda el número de seguimiento"],
    channels: [],
    message: null,
    vars: [],
    phase: null,
    locked: true,
  },
  despachado: {
    title: "Despachado",
    when: "Andreani informa que retiró el paquete",
    does: ["Pasa a En camino", "Le manda el link de seguimiento"],
    channels: ["mail", "whatsapp"],
    message: "{nombre}, tu pedido #{pedido} ya salió con Andreani. Seguilo acá: {link_seguimiento}",
    vars: ["nombre", "pedido", "link_seguimiento"],
    phase: null,
  },
  entregado: {
    title: "Entregado",
    when: "Andreani informa la entrega (o lo marcás entregado)",
    does: ["Cierra el pedido", "A los 3 días pide una foto o reseña"],
    channels: ["mail", "whatsapp"],
    message: "Hola {nombre}! ¿Cómo le quedó? Si nos mandás una foto nos alegra el día ♡",
    vars: ["nombre", "pedido"],
    phase: null,
  },
  listo_retirar: {
    title: "Listo para retirar",
    when: "un pedido con retiro en el taller está listo",
    does: ["Le avisa con dirección y horario"],
    channels: ["mail", "whatsapp"],
    message: "Hola {nombre}! Tu pedido #{pedido} está listo para retirar en el taller ({taller}). {horario}",
    vars: ["nombre", "pedido", "taller", "horario"],
    phase: null,
  },
  volvio_talle: {
    title: "Volvió un talle",
    when: "cargás stock de un talle con lista de espera",
    does: ["Avisa a todos los anotados, en orden"],
    channels: ["mail", "whatsapp"],
    message: "Hola! Volvió el talle {talle} del {prenda}. Está acá: {link_producto}",
    vars: ["talle", "prenda", "link_producto"],
    phase: null,
  },
  link_sin_pagar: {
    title: "Link de pago sin pagar",
    when: "pasan 24 h desde que mandaste un link de pago",
    does: ["Le manda un recordatorio amable", "A las 72 h libera el stock"],
    channels: ["mail", "whatsapp"],
    message: "Hola {nombre}, te dejo de nuevo el link para pagar tu pedido #{pedido}: {link_pago}",
    vars: ["nombre", "pedido", "link_pago"],
    phase: null,
  },
  bolsa_abandonada: {
    title: "Bolsa abandonada",
    when: "alguien con cuenta deja prendas en la bolsa 24 h",
    does: ["Mail recordatorio con las fotos"],
    channels: ["mail"],
    message: "Hola {nombre}! Te quedaron prendas en la bolsa. Todavía hay stock en tu talle: {link_bolsa}",
    vars: ["nombre", "link_bolsa"],
    phase: "Fase 8",
  },
  cumple: {
    title: "Se acerca un cumple",
    when: "faltan 15 días para el cumple de una nena registrada",
    does: ["Mail con modelos en su talle"],
    channels: ["mail"],
    message: "Hola {nombre}! Se viene el cumple de {nena}. Te dejamos ideas en talle {talle}: {link_catalogo}",
    vars: ["nombre", "nena", "talle", "link_catalogo"],
    phase: "Fase 8",
  },
  stock_bajo: {
    title: "Stock bajo",
    when: "un talle publicado queda en 1",
    does: ["Te avisa para que decidas si coser más"],
    channels: ["panel"],
    message: null,
    vars: [],
    phase: null,
  },
} as const satisfies Record<string, RuleDef>;

export type AutomationKey = keyof typeof AUTOMATION_RULES;
export const AUTOMATION_KEYS = Object.keys(AUTOMATION_RULES) as AutomationKey[];

/** Datos de ejemplo para la vista previa y el "Enviarme una prueba". */
export const AUTOMATION_SAMPLE: Record<string, string> = {
  nombre: "Lucía",
  pedido: "MG-1043",
  link_seguimiento: "minigalu.com.ar/seguimiento?pedido=MG-1043",
  talle: "6",
  prenda: "Vestido Samanta",
  link_producto: "minigalu.com.ar/producto/vestido-samanta",
  link_pago: "minigalu.com.ar/pagar/MG-1043",
  link_bolsa: "minigalu.com.ar/checkout",
  nena: "Olivia",
  link_catalogo: "minigalu.com.ar/catalogo?talle=6",
  taller: "Villa Crespo",
  horario: "Te esperamos el Jue 8 · 10 a 13 h.",
};

/** "{nombre}" → valor; lo que no se conoce queda como está (se ve en la vista previa). */
export const fillMessage = (text: string, vars: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all);

export const RuleUpdateSchema = z
  .object({
    on: z.boolean().optional(),
    message: z.string().trim().min(1, "Escribí el mensaje").max(600).optional(),
  })
  .refine((v) => v.on !== undefined || v.message !== undefined, "Nada para cambiar");
export type RuleUpdate = z.infer<typeof RuleUpdateSchema>;

export const AutomationTestSchema = z.object({ email: z.email("Revisá el email") });

export type AdminAutomationRule = {
  key: AutomationKey;
  on: boolean;
  /** El mensaje actual (el editado o el de fábrica). */
  message: string | null;
  /** Veces que se usó este mes. */
  runs: number;
};

export type AutomationRun = {
  id: string;
  rule: AutomationKey;
  /** "#MG-1044 · Valeria Gómez" · "Set Maddie T6" */
  subject: string;
  detail: string;
  channel: AutomationChannel;
  status: "ok" | "warn";
  at: string;
};

export type AdminAutomations = {
  rules: AdminAutomationRule[];
  channels: {
    mail: "conectado";
    whatsapp: "sin_conectar";
    mercadopago: "simulado" | "prueba" | "produccion";
    andreani: "simulado" | "qa" | "produccion";
  };
  stats: {
    /** Mensajes a clientes este mes, por canal. */
    sent: { mail: number; whatsapp: number };
    /** Ventas después de un aviso de talle (14 días, mismo mail y prenda). */
    waitlistSalesCents: number;
    waitlistSales: number;
    /** Links de pago con recordatorio este mes, y cuántos se pagaron después. */
    remindedLinks: number;
    recoveredLinks: number;
  };
  runs: AutomationRun[];
};
