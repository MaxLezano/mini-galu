import { formatARS, type MonthlyReport, ORDER_CHANNELS, reportChange, reportSize } from "@mini-galu/contracts";
import { Banknote, Package, Receipt, Shirt } from "lucide-react";
import Link from "next/link";
import { Trend } from "../../summary/components/SummaryBlocks";
import { barWidth } from "../report-view";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Change({ cur, prev, previous }: { cur: number; prev: number; previous: string }) {
  const pct = reportChange(cur, prev);
  if (pct === null) return <small className="muted">sin ventas en {previous}</small>;
  return (
    <Trend up={pct >= 0}>
      {Math.abs(pct)}% vs {previous}
    </Trend>
  );
}

/** admin-reporte.html → .kpis */
export function ReportKpis({
  sales,
  month,
  previous,
}: {
  sales: MonthlyReport["sales"];
  month: string;
  previous: string;
}) {
  return (
    <div className="kpis">
      <div className="kpi">
        <span>
          <Banknote className="i-sm" /> Ventas de {month}
        </span>
        <b>{formatARS(sales.cents)}</b>
        <Change cur={sales.cents} prev={sales.prevCents} previous={previous} />
      </div>
      <div className="kpi">
        <span>
          <Package className="i-sm" /> Pedidos
        </span>
        <b>{sales.orders}</b>
        <small className="muted">{sales.returning} de clientes que vuelven</small>
      </div>
      <div className="kpi">
        <span>
          <Receipt className="i-sm" /> Ticket promedio
        </span>
        <b>{formatARS(sales.avgTicketCents)}</b>
        <Change cur={sales.avgTicketCents} prev={sales.prevAvgTicketCents} previous={previous} />
      </div>
      <div className="kpi">
        <span>
          <Shirt className="i-sm" /> Prendas vendidas
        </span>
        <b>{sales.units}</b>
        <small className="muted">sin las devueltas</small>
      </div>
    </div>
  );
}

/** admin-reporte.html → Lo más vendido */
export function TopProducts({ top }: { top: MonthlyReport["top"] }) {
  return (
    <section className="box" aria-label="Lo más vendido">
      <div className="box-head">
        <h2>Lo más vendido</h2>
        <Link className="link" href="/taller/productos" style={{ fontSize: 13 }}>
          Ver productos
        </Link>
      </div>
      {top.length ? (
        <div className="tbl-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Prenda</th>
                <th className="num">Unidades</th>
                <th className="num">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p) => (
                <tr key={p.slug}>
                  <td>
                    <b>{p.name}</b>
                    <div className="top-sizes">
                      {p.sizes.map((s) => `${reportSize(s.size)} × ${s.units}`).join(" · ")}
                    </div>
                  </td>
                  <td className="num">{p.units}</td>
                  <td className="num">{formatARS(p.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-note">Este mes no se vendieron prendas.</p>
      )}
    </section>
  );
}

type ShareRow = { key: string; label: string; value: number; shown: string; note?: string };

/** Filas con barra contra la mayor (canales y talles). */
function Shares({ rows }: { rows: ShareRow[] }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <div className="shares">
      {rows.map((r) => (
        <div className="share" key={r.key}>
          <span>{r.label}</span>
          <span className="bar">
            <i style={{ width: `${barWidth(r.value, max)}%` }} />
          </span>
          <b>
            {r.shown}
            {r.note && <small>{r.note}</small>}
          </b>
        </div>
      ))}
    </div>
  );
}

/** admin-reporte.html → Por dónde entraron */
export function Channels({ channels }: { channels: MonthlyReport["channels"] }) {
  return (
    <section className="box" aria-label="Por dónde entraron">
      <div className="box-head">
        <h2>Por dónde entraron</h2>
      </div>
      {channels.length ? (
        <Shares
          rows={channels.map((c) => ({
            key: c.channel,
            label: ORDER_CHANNELS[c.channel],
            value: c.cents,
            shown: formatARS(c.cents),
            note: plural(c.orders, "pedido", "pedidos"),
          }))}
        />
      ) : (
        <p className="empty-note">Sin pedidos pagados este mes.</p>
      )}
    </section>
  );
}

/** admin-reporte.html → Talles agotados (hoy) */
export function SoldOut({ sizes }: { sizes: MonthlyReport["soldOut"] }) {
  return (
    <section className="box soldout" aria-label="Talles agotados">
      <div className="box-head">
        <h2>Talles agotados</h2>
        <Link className="link" href="/taller/productos" style={{ fontSize: 13 }}>
          Cargar stock
        </Link>
      </div>
      {sizes.length ? (
        sizes.map((s) => (
          <div className="it" key={`${s.slug}-${s.size}`}>
            <div>
              <b style={{ font: "400 16px/1.15 var(--f-display)" }}>{s.name}</b>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {reportSize(s.size)} ·{" "}
                {s.waiting ? `${plural(s.waiting, "anotado", "anotados")} esperando` : "sin anotados"}
              </div>
            </div>
            <span className="pill-status st-rose">Agotado</span>
          </div>
        ))
      ) : (
        <p className="empty-note">No hay talles agotados ♡</p>
      )}
    </section>
  );
}

/** admin-reporte.html → Talles más vendidos */
export function TopSizes({ sizes }: { sizes: MonthlyReport["sizes"] }) {
  return (
    <section className="box" aria-label="Talles más vendidos">
      <div className="box-head">
        <h2>Talles más vendidos</h2>
      </div>
      {sizes.length ? (
        <Shares
          rows={sizes.map((s) => ({ key: s.size, label: reportSize(s.size), value: s.units, shown: String(s.units) }))}
        />
      ) : (
        <p className="empty-note">Este mes no se vendieron prendas.</p>
      )}
    </section>
  );
}
