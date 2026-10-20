import type {
  AdminLaunchSignup,
  AdminLetterSubscriber,
  AdminSizeAlert,
  AdminSubscriberRow,
  AdminSubscribers,
  ContactChannel,
} from "@mini-galu/contracts";
import { stripAccents } from "../../../lib/product";

/** Pestañas de /taller/suscriptores. */
export const SUBSCRIBER_TABS = [
  ["cartas", "Cartas del taller"],
  ["lanzamientos", "Anotados a un lanzamiento"],
  ["talles", "Aviso de talle"],
] as const;
export type SubscriberTab = (typeof SUBSCRIBER_TABS)[number][0];

export type AnyRow = AdminLetterSubscriber | AdminLaunchSignup | AdminSizeAlert;

/** Los que siguen anotados (sin avisar ni dados de baja). */
export const activeCount = (rows: AdminSubscriberRow[]) => rows.filter((r) => r.status === "activo").length;

export function tabCounts(s: AdminSubscribers): Record<SubscriberTab, number> {
  return { cartas: activeCount(s.cartas), lanzamientos: activeCount(s.lanzamientos), talles: activeCount(s.talles) };
}

/** Busca por contacto, nombre, prenda o lanzamiento (sin tildes). `pending`: solo los activos. */
export function filterRows<T extends AnyRow>(rows: T[], q: string, pending: boolean): T[] {
  const needle = stripAccents(q.trim());
  return rows.filter((r) => {
    if (pending && r.status !== "activo") return false;
    if (!needle) return true;
    const what = "product" in r ? r.product.name : "launch" in r ? r.launch.title : "";
    return stripAccents(`${r.contact} ${r.name ?? ""} ${what}`).includes(needle);
  });
}

/**
 * Link para escribirle: mailto, o wa.me con el número que dejó (en la tienda se escribe libre; si son los 10 dígitos
 * de un celular argentino, se le agrega el 549).
 */
export function contactHref(channel: ContactChannel, contact: string): string {
  if (channel === "email") return `mailto:${contact}`;
  const digits = contact.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `549${digits}` : digits}`;
}

/** "T4", o "Cualquier talle" si se anotó al modelo antes de que saliera. */
export const sizeLabel = (size: string | null) => (size ? `T${size}` : "Cualquier talle");

const SOURCES: Record<string, string> = { footer: "Pie de la tienda", cuenta: "Mi cuenta", registro: "Al registrarse" };
export const sourceLabel = (source: string) => SOURCES[source] ?? source;
