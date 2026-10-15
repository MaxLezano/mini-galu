import type { AccountOverview } from "@mini-galu/contracts";

export type AccountMenuSummary = {
  /** "Olivia (talle 4) · Emma (talle 6)"; sin nenas, la invitación a sumarlas. */
  nenas: string;
  /** Pedidos que todavía no llegaron: "1 en camino" (salvia) o "2 en preparación" (arena). */
  orders: { label: string; tone: "st-ok" | "st-warn" } | null;
  /** Saldo de las gift cards activas, en centavos (0 si no tiene). */
  giftcardCents: number;
};

const PREPARING = new Set(["nuevo", "preparando", "listo"]);

/** Lo que muestra el menú de cuenta del header (mockup `app.js` · `pop-user`). */
export function accountMenuSummary(o: AccountOverview): AccountMenuSummary {
  const nenas =
    o.children.map((c) => (c.size ? `${c.name} (talle ${c.size})` : c.name)).join(" · ") || "Sumá a tus nenas";
  const onTheWay = o.orders.filter((x) => x.status === "en_camino").length;
  const preparing = o.orders.filter((x) => PREPARING.has(x.status)).length;
  const orders = onTheWay
    ? { label: `${onTheWay} en camino`, tone: "st-ok" as const }
    : preparing
      ? { label: `${preparing} en preparación`, tone: "st-warn" as const }
      : null;
  const giftcardCents = o.giftcards
    .filter((g) => g.status === "activa")
    .reduce((sum, g) => sum + Math.max(0, g.balanceCents), 0);
  return { nenas, orders, giftcardCents };
}
