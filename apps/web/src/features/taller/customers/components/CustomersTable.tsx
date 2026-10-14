import { type AdminCustomer, formatARS } from "@mini-galu/contracts";
import { Cake } from "lucide-react";
import { shortDate } from "@/lib/date";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { inDaysLabel, whatsappHref } from "../customer-view";

const AVATAR = ["", "s", "l"];

type Props = {
  customers: AdminCustomer[];
  /** "oct 2026" a partir del ISO. */
  sinceLabel: (iso: string) => string;
  onOpen: (email: string) => void;
};

/** Tabla de clientes (admin-clientes.html → #ct). */
export function CustomersTable({ customers, sinceLabel, onOpen }: Props) {
  if (!customers.length)
    return (
      <p className="muted" style={{ margin: 0 }}>
        No hay clientes con ese filtro.
      </p>
    );
  return (
    <div className="tbl-wrap">
      <table className="t stack">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Nenas</th>
            <th className="num">Pedidos</th>
            <th className="num">Gastado</th>
            <th>Próximo cumple</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => {
            const soon = !!c.nextBirthday && c.nextBirthday.inDays <= 30;
            return (
              <tr key={c.email} className="clickable" onClick={() => onOpen(c.email)}>
                <td className="full">
                  <div className="pp" style={{ minWidth: 0 }}>
                    <span className={`cav ${AVATAR[i % 3]}`}>{(c.name || c.email)[0]?.toUpperCase()}</span>
                    <div>
                      <b>{c.name || c.email}</b>
                      <small>
                        {c.city ?? "Retira en el taller"} · desde {sinceLabel(c.since)}
                      </small>
                    </div>
                  </div>
                </td>
                <td className="full">
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.children.map((n) => (
                      <span className="nena-chip" key={n.name}>
                        {n.name}
                        {n.size ? ` · T${n.size}` : ""}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="num" data-l="Pedidos">
                  {c.orders}
                </td>
                <td className="num" data-l="Gastado">
                  <b>{c.spentCents ? formatARS(c.spentCents) : "—"}</b>
                </td>
                <td data-l="Cumple">
                  {c.nextBirthday ? (
                    <span className={`bd ${soon ? "soon" : ""}`}>
                      <Cake className="i-sm" /> {c.nextBirthday.name} ·{" "}
                      {shortDate(`${c.nextBirthday.date}T12:00:00-03:00`)}
                      {soon ? ` · ${inDaysLabel(c.nextBirthday.inDays)}` : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {c.phone && (
                    <a
                      className="icon-btn"
                      href={whatsappHref(c.phone)}
                      target="_blank"
                      rel="noopener"
                      aria-label={`WhatsApp a ${c.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BrandIcon name="whatsapp" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
