import type { ContactChannel } from "./catalog";

/** activo: sigue anotado · avisado: ya le llegó el aviso (talle o lanzamiento) · baja: se dio de baja de las cartas. */
export type SubscriberStatus = "activo" | "avisado" | "baja";

/** Lo común a las tres listas de Suscriptores (panel, solo para ver). */
export type AdminSubscriberRow = {
  id: string;
  channel: ContactChannel;
  contact: string;
  /** Nombre de la cuenta o del último pedido con ese mail o WhatsApp; null si no compró ni tiene cuenta. */
  name: string | null;
  /** Mail con el que se abre su ficha en Clientes (null si no es cliente). */
  customerEmail: string | null;
  createdAt: string;
  status: SubscriberStatus;
  /** Cuándo se avisó o se dio de baja. */
  statusAt: string | null;
};

/** "Cartas del taller": desde dónde se sumó. */
export type AdminLetterSubscriber = AdminSubscriberRow & { source: string };

export type AdminLaunchSignup = AdminSubscriberRow & { launch: { id: string; title: string; startsAt: string } };

/** "Avisame cuando vuelva": por talle, o por modelo (size null) si todavía no salió. */
export type AdminSizeAlert = AdminSubscriberRow & {
  product: { id: string; name: string; slug: string };
  size: string | null;
};

/** /taller/suscriptores: las tres listas, de la más nueva a la más vieja. */
export type AdminSubscribers = {
  cartas: AdminLetterSubscriber[];
  lanzamientos: AdminLaunchSignup[];
  talles: AdminSizeAlert[];
};
