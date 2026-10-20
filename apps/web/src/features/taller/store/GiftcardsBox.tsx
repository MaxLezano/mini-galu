import { type AdminGiftcards, formatARS } from "@mini-galu/contracts";
import { monthYear } from "@/lib/date";
import { GiftcardValidity } from "./GiftcardValidity";

/** Gift cards (admin-tienda.html): lo vendido, el saldo que falta usar y cada tarjeta activa. */
export function GiftcardsBox({ data, months }: { data: AdminGiftcards; months: number }) {
  return (
    <section className="box" id="giftcards">
      <div className="box-head">
        <h2>Gift cards</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          {data.sold} {data.sold === 1 ? "vendida" : "vendidas"}
        </span>
      </div>
      <GiftcardValidity initial={months} />
      <div className="kpis" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
        <div className="kpi" style={{ background: "var(--linen)", boxShadow: "none" }}>
          <span>Vendido</span>
          <b>{formatARS(data.soldCents)}</b>
        </div>
        <div className="kpi" style={{ background: "var(--linen)", boxShadow: "none" }}>
          <span>Saldo sin usar</span>
          <b>{formatARS(data.unusedCents)}</b>
        </div>
      </div>
      {data.cards.length ? (
        <div className="tbl-wrap">
          <table className="t stack">
            <thead>
              <tr>
                <th>Código</th>
                <th>Para</th>
                <th className="num">Saldo</th>
                <th>Vence</th>
              </tr>
            </thead>
            <tbody>
              {data.cards.map((c) => (
                <tr key={c.code}>
                  <td>
                    <b>{c.code}</b>
                  </td>
                  <td data-l="Para">
                    {c.toName} (de {c.fromName})
                  </td>
                  <td className="num" data-l="Saldo">
                    {formatARS(c.balanceCents)}
                  </td>
                  <td data-l="Vence">{c.expired ? "Vencida" : monthYear(c.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Todavía no se vendió ninguna gift card.
        </p>
      )}
      <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>
        Para cobrar con una gift card en el taller o en un link de pago: Pedidos → Link de pago → “Gift card”.
      </p>
    </section>
  );
}
