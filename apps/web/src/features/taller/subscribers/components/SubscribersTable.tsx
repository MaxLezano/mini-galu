import type { SubscriberStatus } from "@mini-galu/contracts";
import { Mail } from "lucide-react";
import Link from "next/link";
import { shortDate } from "@/lib/date";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { type AnyRow, contactHref, type SubscriberTab, sizeLabel, sourceLabel } from "../subscribers-view";

const STATUS: Record<SubscriberStatus, [string, string]> = {
  activo: ["st-ok", "Esperando"],
  avisado: ["st-muted", "Avisado"],
  baja: ["st-muted", "De baja"],
};

const WHAT: Record<SubscriberTab, string> = { cartas: "Desde", lanzamientos: "Lanzamiento", talles: "Prenda" };

type Props = { tab: SubscriberTab; rows: AnyRow[]; empty: string };

/** Tabla de una lista de Suscriptores (mismas clases que la tabla de admin-clientes.html). */
export function SubscribersTable({ tab, rows, empty }: Props) {
  if (!rows.length)
    return (
      <p className="muted" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  return (
    <div className="tbl-wrap">
      <table className="t stack adm-sub">
        <thead>
          <tr>
            <th>Contacto</th>
            <th>{WHAT[tab]}</th>
            <th>Se anotó</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const [tone, label] = STATUS[r.status];
            const shownStatus = tab === "cartas" && r.status === "activo" ? "Suscripto" : label;
            return (
              <tr key={r.id}>
                <td className="full">
                  <div className="adm-sub-who">
                    <b>{r.name ?? r.contact}</b>
                    <small className="muted">
                      {r.name && `${r.contact} · `}
                      {r.customerEmail ? (
                        <Link href={`/taller/clientes?cliente=${encodeURIComponent(r.customerEmail)}`}>
                          Ver cliente
                        </Link>
                      ) : (
                        "Todavía no compró"
                      )}
                    </small>
                  </div>
                </td>
                <td data-l={WHAT[tab]}>
                  {"product" in r ? (
                    <span>
                      <b>{r.product.name}</b> · {sizeLabel(r.size)}
                    </span>
                  ) : "launch" in r ? (
                    <span>
                      <b>{r.launch.title}</b> · {shortDate(r.launch.startsAt)}
                    </span>
                  ) : (
                    sourceLabel(r.source)
                  )}
                </td>
                <td data-l="Se anotó">{shortDate(r.createdAt)}</td>
                <td data-l="Estado">
                  <span className={`pill-status ${tone}`}>
                    {shownStatus}
                    {r.statusAt ? ` · ${shortDate(r.statusAt)}` : ""}
                  </span>
                </td>
                <td>
                  <a
                    className="icon-btn"
                    href={contactHref(r.channel, r.contact)}
                    target={r.channel === "whatsapp" ? "_blank" : undefined}
                    rel="noopener"
                    aria-label={`Escribirle a ${r.name ?? r.contact}`}
                  >
                    {r.channel === "whatsapp" ? <BrandIcon name="whatsapp" /> : <Mail className="i-sm" />}
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
