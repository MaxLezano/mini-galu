import type { AccountOverview } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { accountMenuSummary } from "./account-menu";

const base = { children: [], orders: [], giftcards: [] } as unknown as AccountOverview;
const order = (status: string) => ({ number: "MG-1", status, createdAt: "", totalCents: 0, items: [] });
const card = (status: string, balanceCents: number) => ({
  code: null,
  amountCents: balanceCents,
  balanceCents,
  toName: "",
  status,
  expiresAt: null,
  mine: "recibi",
});

describe("accountMenuSummary", () => {
  it("sin nenas, pedidos ni gift cards invita a sumar nenas", () => {
    expect(accountMenuSummary(base)).toEqual({ nenas: "Sumá a tus nenas", orders: null, giftcardCents: 0 });
  });

  it("lista las nenas con su talle (si lo tienen)", () => {
    const o = {
      ...base,
      children: [
        { name: "Olivia", size: "4" },
        { name: "Emma", size: null },
      ],
    } as AccountOverview;
    expect(accountMenuSummary(o).nenas).toBe("Olivia (talle 4) · Emma");
  });

  it("los pedidos en camino ganan a los que se preparan; los entregados no cuentan", () => {
    const o = {
      ...base,
      orders: [order("en_camino"), order("preparando"), order("entregado")],
    } as unknown as AccountOverview;
    expect(accountMenuSummary(o).orders).toEqual({ label: "1 en camino", tone: "st-ok" });
    const p = { ...base, orders: [order("nuevo"), order("listo"), order("cancelado")] } as unknown as AccountOverview;
    expect(accountMenuSummary(p).orders).toEqual({ label: "2 en preparación", tone: "st-warn" });
  });

  it("suma solo el saldo de las gift cards activas", () => {
    const o = {
      ...base,
      giftcards: [card("activa", 12_500_00), card("activa", 2_000_00), card("esperando_pago", 50_000_00)],
    } as unknown as AccountOverview;
    expect(accountMenuSummary(o).giftcardCents).toBe(14_500_00);
  });
});
