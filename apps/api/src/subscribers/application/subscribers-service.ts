import type { AdminSubscriberRow, AdminSubscribers, ContactChannel } from "@mini-galu/contracts";
import { contactKey } from "../domain/contact";
import type { KnownPerson, SubscribersReadModel } from "./ports";

type Who = Pick<AdminSubscriberRow, "name" | "customerEmail">;

/**
 * Suscriptores (panel, solo para ver): quiénes se anotaron a las cartas, a un lanzamiento o a un aviso de talle, con
 * el nombre del cliente cuando el contacto coincide con una cuenta o un pedido.
 */
export class SubscribersService {
  constructor(private readonly read: SubscribersReadModel) {}

  async list(): Promise<AdminSubscribers> {
    const [cartas, lanzamientos, talles, people] = await Promise.all([
      this.read.letterSubscribers(),
      this.read.launchSignups(),
      this.read.sizeAlerts(),
      this.read.knownPeople(),
    ]);
    const who = directory(people);
    const signed = (r: { channel: ContactChannel; contact: string; notifiedAt: Date | null }) => ({
      channel: r.channel,
      contact: r.contact,
      ...who(r.channel, r.contact),
      status: r.notifiedAt ? ("avisado" as const) : ("activo" as const),
      statusAt: r.notifiedAt?.toISOString() ?? null,
    });
    return {
      cartas: newest(cartas).map((r) => ({
        id: r.id,
        channel: "email" as const,
        contact: r.email,
        ...who("email", r.email),
        createdAt: r.createdAt.toISOString(),
        status: r.unsubscribedAt ? "baja" : "activo",
        statusAt: r.unsubscribedAt?.toISOString() ?? null,
        source: r.source,
      })),
      lanzamientos: newest(lanzamientos).map((r) => ({
        id: r.id,
        ...signed(r),
        createdAt: r.createdAt.toISOString(),
        launch: { ...r.launch, startsAt: r.launch.startsAt.toISOString() },
      })),
      talles: newest(talles).map((r) => ({
        id: r.id,
        ...signed(r),
        createdAt: r.createdAt.toISOString(),
        product: r.product,
        size: r.size,
      })),
    };
  }
}

const newest = <T extends { createdAt: Date }>(rows: T[]) =>
  [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

/** Busca por mail o WhatsApp; si hay varios (cuenta y pedidos), gana el dato más reciente. */
function directory(people: KnownPerson[]): (channel: ContactChannel, contact: string) => Who {
  const byKey = new Map<string, KnownPerson>();
  for (const p of [...people].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    for (const k of [contactKey("email", p.email), p.phone && contactKey("whatsapp", p.phone)]) if (k) byKey.set(k, p);
  }
  return (channel, contact) => {
    const k = contactKey(channel, contact);
    const p = k ? byKey.get(k) : undefined;
    return { name: p?.name.trim() || null, customerEmail: p?.email ?? null };
  };
}
