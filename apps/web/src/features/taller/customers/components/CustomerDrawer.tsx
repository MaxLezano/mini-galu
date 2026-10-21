import { type AdminCustomerDetail, formatARS, ORDER_STATUSES, pointsToGo } from "@mini-galu/contracts";
import { Mail, X } from "lucide-react";
import Link from "next/link";
import { shortDate } from "@/lib/date";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { SkeletonLines } from "@/ui/molecules/SkeletonLines";
import { SkeletonRows } from "@/ui/molecules/SkeletonRows";
import { inDaysLabel, whatsappHref } from "../customer-view";

type Props = {
  open: boolean;
  customer: AdminCustomerDetail | null;
  sinceLabel: (iso: string) => string;
  note: string;
  onNote: (note: string) => void;
  /** Al salir del campo se guarda la nota. */
  onSaveNote: () => void;
  onClose: () => void;
};

/** Ficha del cliente (admin-clientes.html → #cd): contacto, nenas, resumen (con los puntos), pedidos y nota del taller. */
export function CustomerDrawer({ open, customer: c, sinceLabel, note, onNote, onSaveNote, onClose }: Props) {
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar"
        className={`scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
      />
      <aside className={`drawer wide ${open ? "is-open" : ""}`} aria-label="Ficha del cliente" aria-hidden={!open}>
        <div className="drawer-head">
          {c ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="cav" style={{ width: 48, height: 48, fontSize: 22 }}>
                {(c.name || c.email)[0]?.toUpperCase()}
              </span>
              <div>
                <b className="display" style={{ fontSize: 24 }}>
                  {c.name || c.email}
                </b>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {c.city ?? "Retira en el taller"} · cliente desde {sinceLabel(c.since)}
                  {c.hasAccount ? " · con cuenta" : ""}
                </div>
              </div>
            </div>
          ) : (
            <SkeletonLines lines={2} className="skel-drawer-head" />
          )}
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            <X />
          </button>
        </div>
        {!c && (
          <div className="drawer-body">
            <SkeletonRows rows={4} thumb={false} />
          </div>
        )}
        {c && (
          <div className="drawer-body">
            <div className="od-sec">
              <div className="contact-btns">
                {c.phone && (
                  <a className="btn btn-sm btn-soft" target="_blank" rel="noopener" href={whatsappHref(c.phone)}>
                    <BrandIcon name="whatsapp" className="brand i-sm" /> {c.phone}
                  </a>
                )}
                <a className="btn btn-sm btn-soft" href={`mailto:${c.email}`}>
                  <Mail className="i-sm" /> {c.email}
                </a>
              </div>
            </div>
            <div className="od-sec">
              <h4>Nenas</h4>
              {c.children.length ? (
                <div className="cd-nenas">
                  {c.children.map((n) => {
                    const days = c.nextBirthday?.name === n.name ? c.nextBirthday.inDays : null;
                    return (
                      <div key={n.name}>
                        <b>{n.name}</b>
                        {n.size ? `Talle ${n.size}` : "Sin talle"}
                        {n.birthday ? ` · cumple ${shortDate(`${n.birthday}T12:00:00-03:00`)}` : ""}
                        <br />
                        <span className="muted">{days !== null && days <= 30 ? inDaysLabel(days) : ""}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="muted">
                  {c.hasAccount ? "Sin nenas cargadas" : "Compró sin cuenta: las nenas se cargan en Mi cuenta"}
                </span>
              )}
            </div>
            <div className="od-sec">
              <h4>Resumen</h4>
              <dl className="kv2">
                <dt>Pedidos</dt>
                <dd>{c.orders}</dd>
                <dt>Gastado</dt>
                <dd>{formatARS(c.spentCents)}</dd>
                <dt>Ticket promedio</dt>
                <dd>{c.orders ? formatARS(Math.round(c.spentCents / c.orders)) : "—"}</dd>
                <dt>Le gustan</dt>
                <dd>{c.likes.join(", ") || "—"}</dd>
                {c.points && (
                  <>
                    <dt>Puntos</dt>
                    <dd data-testid="cd-puntos">
                      {c.points.balance}
                      {c.points.rules.enabled && (
                        <span className="muted">
                          {" "}
                          ·{" "}
                          {pointsToGo(c.points.rules, c.points.balance)
                            ? `le faltan ${pointsToGo(c.points.rules, c.points.balance)} para el cupón`
                            : "le alcanza para el cupón"}
                        </span>
                      )}
                    </dd>
                    {c.points.coupons.length > 0 && (
                      <>
                        <dt>Canjes</dt>
                        <dd>
                          {c.points.coupons.map((p) => (
                            <div key={p.code}>
                              <b>{p.code}</b>{" "}
                              <span className="muted">· {p.used ? "usado" : `vence el ${shortDate(p.endsAt)}`}</span>
                            </div>
                          ))}
                        </dd>
                      </>
                    )}
                  </>
                )}
              </dl>
            </div>
            <div className="od-sec">
              <h4>Pedidos</h4>
              {c.orderList.length ? (
                <div>
                  {c.orderList.map((o) => (
                    <Link className="cd-order" key={o.number} href={`/taller/pedidos?pedido=${o.number}`}>
                      <span className="thumbs-row">
                        {o.thumbs.map((t) => (
                          <img key={t} src={t} alt="" />
                        ))}
                      </span>
                      <span style={{ flex: 1 }}>
                        <b>#{o.number}</b>{" "}
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          · {shortDate(o.createdAt)}
                        </span>
                      </span>
                      <b>{formatARS(o.totalCents)}</b>
                      <span className={`pill-status ${ORDER_STATUSES[o.status].tone}`}>
                        {ORDER_STATUSES[o.status].short}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="muted">Sin pedidos</span>
              )}
            </div>
            <div className="od-sec">
              <h4>Notas</h4>
              <textarea
                className="input"
                rows={3}
                aria-label="Notas del taller"
                placeholder="Ej. le encantan los cuellos bordados, prefiere retirar en el taller…"
                value={note}
                maxLength={2000}
                onChange={(e) => onNote(e.target.value)}
                onBlur={onSaveNote}
              />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
