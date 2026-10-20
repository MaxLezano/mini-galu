import {
  type AdminDaySummary,
  type AdminLaunch,
  type AdminOrderSummary,
  type AutoActivity,
  formatARS,
  ORDER_STATUSES,
} from "@mini-galu/contracts";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Hourglass,
  type LucideIcon,
  Mail,
  MessageCircleHeart,
  MessageCircleQuestionMark,
  Package,
  Receipt,
  Scissors,
  Store,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { Emphasis } from "@/ui/atoms/Emphasis";
import { type LowStockRow, pctChange } from "../summary-view";

const SHIP_SHORT = {
  domicilio: "Envío a domicilio",
  sucursal: "Envío a sucursal",
  taller: "Retira en el taller",
} as const;
const PAY_SHORT = {
  credito: "Crédito",
  debito: "Débito",
  dinero_cuenta: "Dinero en cuenta",
  link: "Link de pago",
  giftcard: "Gift card",
  efectivo: "Efectivo",
} as const;

/** "Para hacer hoy": cada tarjeta lleva a los pedidos de ese paso (y la de Galú, a "Enseñale"). */
export function TodoGrid({ todo, unanswered }: { todo: AdminDaySummary["todo"]; unanswered: number }) {
  const items: [LucideIcon, number, string, string, boolean?][] = [
    [Scissors, todo.toPrepare, "pedidos para preparar", "/taller/pedidos", true],
    [Truck, todo.toShip, "para despachar", "/taller/pedidos"],
    [Store, todo.toPickup, "para retirar en el taller", "/taller/pedidos"],
    [Hourglass, todo.awaitingPayment, "links de pago sin pagar", "/taller/pedidos"],
    [MessageCircleQuestionMark, unanswered, "preguntas que Galú no supo", "/taller/galu"],
  ];
  return (
    <section aria-label="Para hacer hoy">
      <div className="todo-grid" id="todo">
        {items.map(([Icon, n, text, href, hot]) => (
          <Link key={text} className={`todo ${hot && n ? "is-hot" : ""}`} href={href}>
            <span className="ic">
              <Icon className="i-sm" />
            </span>
            <b>{n}</b>
            <span>{text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const Trend = ({ up, children }: { up: boolean; children: ReactNode }) => (
  <small className={up ? "up" : "down"}>
    {up ? <TrendingUp className="i-sm" /> : <TrendingDown className="i-sm" />} {children}
  </small>
);

export function Kpis({
  month,
  current,
  previous,
  galu,
}: {
  month: AdminDaySummary["month"];
  current: string;
  previous: string;
  /** Charlas con Galú de los últimos 7 días y cuántas terminaron en compra. */
  galu: { chats: number; bought: number };
}) {
  const pct = pctChange(month.salesCents, month.prevSalesCents);
  const ticketDiff = month.avgTicketCents - month.prevAvgTicketCents;
  return (
    <div className="kpis">
      <div className="kpi">
        <span>
          <Banknote className="i-sm" /> Ventas de {current}
        </span>
        <b>{formatARS(month.salesCents)}</b>
        {pct === null ? (
          <small className="muted">sin ventas en {previous}</small>
        ) : (
          <Trend up={pct >= 0}>
            {Math.abs(pct)}% vs {previous}
          </Trend>
        )}
      </div>
      <div className="kpi">
        <span>
          <Package className="i-sm" /> Pedidos del mes
        </span>
        <b>{month.orders}</b>
        <small className="muted">{month.returning} de clientes que vuelven</small>
      </div>
      <div className="kpi">
        <span>
          <Receipt className="i-sm" /> Ticket promedio
        </span>
        <b>{formatARS(month.avgTicketCents)}</b>
        {month.prevAvgTicketCents > 0 && month.orders > 0 ? (
          <Trend up={ticketDiff >= 0}>{formatARS(Math.abs(ticketDiff))}</Trend>
        ) : (
          <small className="muted">sin comparación con {previous}</small>
        )}
      </div>
      <div className="kpi">
        <span>
          <MessageCircleHeart className="i-sm" /> Charlas con Galú
        </span>
        <b>{galu.chats}</b>
        {galu.chats ? (
          <small className={galu.bought ? "up" : "muted"}>
            {Math.round((galu.bought / galu.chats) * 100)}% terminan en compra · 7 días
          </small>
        ) : (
          <small className="muted">ninguna en los últimos 7 días</small>
        )}
      </div>
    </div>
  );
}

export function RecentOrders({ orders, when }: { orders: AdminOrderSummary[]; when: (iso: string) => string }) {
  return (
    <section className="box">
      <div className="box-head">
        <h2>Últimos pedidos</h2>
        <Link className="link" href="/taller/pedidos" style={{ fontSize: 13 }}>
          Ver todos
        </Link>
      </div>
      <div className="recent" id="recent">
        {orders.length ? (
          orders.map((o) => {
            const st = ORDER_STATUSES[o.status];
            return (
              <Link key={o.number} className="r" href={`/taller/pedidos?pedido=${o.number}`}>
                <span className="thumbs-row">
                  {o.items.slice(0, 2).map((i) => (
                    <img key={`${i.slug}-${i.size}`} src={i.imageUrl} alt="" />
                  ))}
                </span>
                <div style={{ minWidth: 0 }}>
                  <b>
                    #{o.number} · {o.customer.name}
                  </b>
                  <small>
                    {[when(o.createdAt), SHIP_SHORT[o.shippingMethod], o.paymentMethod && PAY_SHORT[o.paymentMethod]]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                <div className="end">
                  {formatARS(o.totalCents)}
                  <span className={`pill-status ${st.tone}`}>{st.short}</span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="empty-state">
            <Embroidery />
            <b>Todavía no hay pedidos</b>
          </div>
        )}
      </div>
    </section>
  );
}

export function LaunchBanner({
  launch,
  when,
  days,
}: {
  launch: AdminLaunch | null;
  when: string | null;
  days: number | null;
}) {
  if (!launch)
    return (
      <section className="launch is-empty" aria-label="Próximo lanzamiento">
        <div>
          <span className="eyebrow is-in" style={{ color: "var(--rosa)" }}>
            Próximo lanzamiento
          </span>
          <p className="display h3" style={{ margin: "8px 0 0" }}>
            No hay ninguno <em>programado</em>
          </p>
        </div>
        <Link className="btn btn-rose" href="/taller/lanzamientos?nuevo">
          Armar un lanzamiento <ArrowRight className="i-sm" />
        </Link>
      </section>
    );
  const drafts = launch.products.filter((p) => p.status === "draft").length;
  return (
    <section className="launch" aria-label="Próximo lanzamiento">
      {launch.coverUrl ? <img src={launch.coverUrl} alt="" /> : <span className="launch-ph" />}
      <div>
        <span className="eyebrow is-in" style={{ color: "var(--rosa)" }}>
          Próximo lanzamiento · {when}
        </span>
        <p className="display h3" style={{ margin: "8px 0 0" }}>
          <Emphasis text={launch.title} />
        </p>
        <div className="stats">
          <span>
            <b>{launch.signups}</b>anotados para el aviso
          </span>
          <span>
            <b>{drafts}</b>
            {drafts === 1 ? "producto en borrador" : "productos en borrador"}
          </span>
          {days !== null && (
            <span>
              <b>{days}</b>
              {days === 1 ? "día" : "días"}
            </span>
          )}
        </div>
      </div>
      <Link className="btn btn-rose" href="/taller/lanzamientos">
        Preparar lanzamiento <ArrowRight className="i-sm" />
      </Link>
    </section>
  );
}

export function LowStockList({ rows }: { rows: LowStockRow[] }) {
  return (
    <section className="box low">
      <div className="box-head">
        <h2>Stock para revisar</h2>
        <Link className="link" href="/taller/productos" style={{ fontSize: 13 }}>
          Ver productos
        </Link>
      </div>
      <div id="low">
        {rows.length ? (
          rows.map((r) => (
            <div className="it" key={`${r.slug}-${r.size}`}>
              {r.imageUrl ? <img src={r.imageUrl} alt="" /> : <span />}
              <div>
                <b style={{ font: "400 16px/1.15 var(--f-display)" }}>{r.name}</b>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  Talle {r.size}
                  {r.waiting ? ` · ${r.waiting} ${r.waiting === 1 ? "anotado esperando" : "anotados esperando"}` : ""}
                </div>
              </div>
              <span className={`pill-status ${r.stock ? "st-warn" : "st-rose"}`}>
                {r.stock ? "Queda 1" : "Agotado"}
              </span>
            </div>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Todos los talles publicados tienen más de una unidad ♡
          </p>
        )}
      </div>
    </section>
  );
}

const FEED_ICON: Record<string, LucideIcon> = { paid: BadgeCheck, mail: Mail, refund_needed: TriangleAlert };

export function AutoFeed({ items, when }: { items: AutoActivity[]; when: (iso: string) => string }) {
  return (
    <section className="box">
      <div className="box-head">
        <h2>Lo que se hizo solo</h2>
        <Link className="link" href="/taller/automatizaciones" style={{ fontSize: 13 }}>
          Automatizaciones
        </Link>
      </div>
      <div className="feed" id="feed">
        {items.length ? (
          items.map((e) => {
            const Icon = FEED_ICON[e.kind] ?? BadgeCheck;
            return (
              <Link className="it" key={`${e.number}-${e.at}-${e.kind}`} href={`/taller/pedidos?pedido=${e.number}`}>
                <span className="ic">
                  <Icon />
                </span>
                <span>
                  {e.title} · <b>#{e.number}</b> de {e.customer}
                  {e.kind === "refund_needed" && e.detail ? `. ${e.detail}` : ""}
                </span>
                <small>{when(e.at)}</small>
              </Link>
            );
          })
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Cuando se apruebe un pago o salga un mail, aparece acá.
          </p>
        )}
      </div>
    </section>
  );
}
