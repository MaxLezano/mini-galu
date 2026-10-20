import { type AdminOrderSummary, formatARS, ORDER_STATUSES, type OrderStatus } from "@mini-galu/contracts";
import { CreditCard } from "lucide-react";
import type { ComponentProps } from "react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { nextAction } from "../order-flow";
import { ActionIcon, OrderCard, SHIP_SHORT, ShipIcon } from "./OrderCard";

const PAY_SHORT = {
  credito: "Crédito",
  debito: "Débito",
  dinero_cuenta: "Dinero en cuenta",
  link: "Link MP",
  giftcard: "Gift card",
  efectivo: "Efectivo",
} as const;

type CardProps = Omit<ComponentProps<typeof OrderCard>, "order">;

type Props = {
  orders: AdminOrderSummary[];
  /** Conteo por estado para los chips (de todos los pedidos, sin filtrar por estado). */
  counts: Record<string, number>;
  status: OrderStatus | "";
  compact: boolean;
  selecting: boolean;
  selected: Set<string>;
  cardProps: (o: AdminOrderSummary) => CardProps;
  onStatus: (s: OrderStatus | "") => void;
  onSelectAll: (on: boolean) => void;
};

const Pill = ({ s }: { s: OrderStatus }) => (
  <span className={`pill-status ${ORDER_STATUSES[s].tone}`}>{ORDER_STATUSES[s].short}</span>
);

/** Vista lista — admin-pedidos.html → renderList(): tabla en escritorio, tarjetas en celular. */
export function OrdersList({
  orders,
  counts,
  status,
  compact,
  selecting,
  selected,
  cardProps,
  onStatus,
  onSelectAll,
}: Props) {
  const chips: [OrderStatus | "", string][] = [
    ["", "Todos"],
    ...(Object.keys(ORDER_STATUSES) as OrderStatus[])
      .filter((k) => k !== "cancelado" && k !== "reembolsado")
      .map((k) => [k, ORDER_STATUSES[k].label] as [OrderStatus, string]),
  ];
  const empty = (
    <div className="empty-state">
      <Embroidery />
      <b>No hay pedidos con estos filtros</b>
    </div>
  );

  return (
    <section className="box" id="list-box">
      <div className="status-chips" style={{ marginBottom: 14 }}>
        {chips.map(([k, label]) => (
          <button
            type="button"
            key={k || "todos"}
            className={`chip ${status === k ? "is-on" : ""}`}
            onClick={() => onStatus(k)}
          >
            {label} <span className="count">{k ? (counts[k] ?? 0) : counts.all}</span>
          </button>
        ))}
      </div>
      {compact ? (
        <div className={`mlist ${selecting ? "selecting" : ""}`} id="list">
          {orders.length
            ? orders.map((o) => (
                <OrderCard key={o.number} {...cardProps(o)} order={o} statusPill={<Pill s={o.status} />} />
              ))
            : empty}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="t stack" id="list">
            <thead>
              <tr>
                <th className="check">
                  <label className="check">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos"
                      checked={orders.length > 0 && orders.every((o) => selected.has(o.number))}
                      onChange={(e) => onSelectAll(e.target.checked)}
                    />
                  </label>
                </th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Prendas</th>
                <th className="num">Total</th>
                <th>Pago</th>
                <th>Envío</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const p = cardProps(o);
                const nx = nextAction(o);
                return (
                  <tr
                    key={o.number}
                    className={`clickable ${selected.has(o.number) ? "is-sel" : ""}`}
                    onClick={(e) => !(e.target as HTMLElement).closest("button, input, label") && p.onOpen()}
                  >
                    <td className="check">
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={selected.has(o.number)}
                          aria-label={`Seleccionar #${o.number}`}
                          onChange={(e) => p.onSelect(e.target.checked)}
                        />
                      </label>
                    </td>
                    <td>
                      <b>#{o.number}</b>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.when ?? ""}
                      </div>
                    </td>
                    <td className="full" data-l="Cliente">
                      {o.customer.name}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {o.customer.city ?? ""}
                      </div>
                    </td>
                    <td className="hide-s">
                      <span className="thumbs-row">
                        {o.items.map((i) => (
                          <img key={`${i.slug}-${i.size}`} src={i.imageUrl} alt="" />
                        ))}
                      </span>
                    </td>
                    <td className="num" data-l="Total">
                      <b>{formatARS(o.totalCents)}</b>
                    </td>
                    <td data-l="Pago">
                      <span className="meta-ico">
                        {o.paymentMethod === "link" ? (
                          <BrandIcon name="mercadopago" />
                        ) : (
                          <CreditCard className="i-sm" />
                        )}{" "}
                        {o.paymentMethod ? PAY_SHORT[o.paymentMethod] : "Sin pagar"}
                        {(o.installments ?? 1) > 1 ? ` · ${o.installments}c` : ""}
                      </span>
                    </td>
                    <td data-l="Envío">
                      <span className="meta-ico">
                        <ShipIcon method={o.shippingMethod} /> {SHIP_SHORT[o.shippingMethod]}
                      </span>
                    </td>
                    <td data-l="Estado">
                      <Pill s={o.status} />
                    </td>
                    <td className="full">
                      {nx && (
                        <button type="button" className="btn btn-xs btn-soft" onClick={() => p.onNext(nx)}>
                          <ActionIcon icon={nx.icon} /> {nx.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!orders.length && (
              <tbody>
                <tr>
                  <td colSpan={9}>{empty}</td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
