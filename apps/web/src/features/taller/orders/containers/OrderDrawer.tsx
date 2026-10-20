"use client";

import {
  type AdminOrderDetail,
  formatARS,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
} from "@mini-galu/contracts";
import {
  BadgeCheck,
  CircleCheck,
  Clock,
  Link2,
  Mail,
  MailCheck,
  Package,
  PackageCheck,
  Phone,
  Scissors,
  ShoppingBag,
  Store,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { launchWhen, longDate, relativeWhen, shortDate } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { ActionIcon } from "../components/OrderCard";
import { RefundPanel } from "../components/RefundPanel";
import { generateLabel } from "../label-action";
import { type NextAction, nextAction, type TemplateKey } from "../order-flow";

const STEP = { nuevo: 1, preparando: 2, listo: 3, en_camino: 4, entregado: 5 } as Record<string, number>;

const EVENT_ICON: Record<string, ReactNode> = {
  created: <ShoppingBag />,
  paid: <BadgeCheck />,
  mail: <MailCheck />,
  expired: <Clock />,
  refund_needed: <Clock />,
  refunded: <Undo2 />,
  status: <Package />,
};
const statusIcon = (title: string) =>
  /prepar/i.test(title) ? (
    <Scissors />
  ) : /retirar|retirado/i.test(title) ? (
    <Store />
  ) : /despach/i.test(title) ? (
    <Truck />
  ) : /entregado/i.test(title) ? (
    <CircleCheck />
  ) : /listo/i.test(title) ? (
    <PackageCheck />
  ) : (
    <Package />
  );

type Props = {
  number: string | null;
  /** Localidad del taller (Tienda y pagos → Datos de la tienda). */
  workshop: string;
  /** Cambió algo (estado, nota): el tablero se actualiza con el detalle nuevo. */
  onChanged: (o: AdminOrderDetail) => void;
  onWhatsApp: (o: AdminOrderDetail, template?: TemplateKey) => void;
  onClose: () => void;
};

/** Detalle del pedido (admin.js → renderOrder): pasos, prendas para preparar, cliente, envío, pago e historial. */
export function OrderDrawer({ number, workshop, onChanged, onWhatsApp, onClose }: Props) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const mounted = useMounted();
  const open = !!number;

  useEffect(() => {
    if (!number) return;
    let alive = true;
    setOrder(null);
    setPicked(new Set());
    adminApi
      .order(number)
      .then((o) => {
        if (!alive) return;
        setOrder(o);
        setNote(o.internalNote ?? "");
      })
      .catch((e) => toast(e instanceof ApiRequestError ? e.message : "No se pudo abrir el pedido"));
    return () => {
      alive = false;
    };
  }, [number]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const o = order;
  const nx = o ? nextAction(o) : null;
  const picking = o ? o.status === "nuevo" || o.status === "preparando" : false;

  const runNext = async (a: NonNullable<NextAction>) => {
    if (!o) return;
    if (a.kind === "whatsapp") return onWhatsApp(o, a.template);
    if (a.kind === "href") return window.open(a.href, "_blank", "noopener");
    // cerrar la preparación pide tildar todas las prendas (como el mockup)
    if (o.status === "preparando" && picked.size < o.items.length)
      return toast("Tildá todas las prendas antes de cerrar la preparación");
    setBusy(true);
    if (a.kind === "label") {
      const r = await generateLabel(o.number);
      if ("error" in r) toast(r.error);
      else {
        const updated = await adminApi.order(o.number);
        setOrder(updated);
        onChanged(updated);
        toast(`#${o.number} · Etiqueta Andreani generada`, { icon: <ActionIcon icon="printer" /> });
      }
      return setBusy(false);
    }
    try {
      const updated = await adminApi.moveOrder(o.number, a.to);
      setOrder(updated);
      onChanged(updated);
      toast(`#${o.number} · ${ORDER_STATUSES[a.to].short}`, { icon: <ActionIcon icon={a.icon} /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo cambiar el estado");
    } finally {
      setBusy(false);
    }
  };

  const refund = async (input: { restock: boolean; reason: string }) => {
    if (!o) return;
    setBusy(true);
    try {
      const r = await adminApi.refundOrder(o.number, input);
      const updated = await adminApi.order(o.number);
      setOrder(updated);
      onChanged(updated);
      toast(`#${o.number} · ${r.pending ? "Reintegro en proceso en Mercado Pago" : "Reintegrado"}`, {
        icon: <Undo2 className="i-sm" />,
      });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo hacer el reintegro");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!o || note.trim() === (o.internalNote ?? "")) return;
    try {
      await adminApi.saveOrderNote(o.number, note);
      const updated = { ...o, internalNote: note.trim() || null };
      setOrder(updated);
      toast("Nota guardada");
    } catch {
      toast("No se pudo guardar la nota");
    }
  };

  const step = o ? (STEP[o.status] ?? 0) : 0;
  const a = o?.shippingAddress;
  const paidMore = o?.payment?.paidByCustomerCents && o.payment.paidByCustomerCents > o.totalCents;
  const copyLink = (url: string) =>
    navigator.clipboard?.writeText(url).then(
      () => toast("Link de pago copiado", { icon: <Link2 className="i-sm" /> }),
      () => toast("No se pudo copiar: mantené apretado el link para copiarlo"),
    );

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar"
        className={`scrim ${open ? "is-open" : ""}`}
        id="od-scrim"
        onClick={onClose}
      />
      <aside
        className={`drawer wide ${open ? "is-open" : ""}`}
        id="od"
        aria-label="Detalle del pedido"
        aria-hidden={!open}
      >
        <div className="drawer-head" id="od-head">
          {o ? (
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <b className="display" style={{ fontSize: 26 }}>
                  #{o.number}
                </b>
                <span className={`pill-status ${ORDER_STATUSES[o.status].tone}`}>{ORDER_STATUSES[o.status].short}</span>
              </div>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {longDate(o.createdAt)}
                {mounted && relativeWhen(o.createdAt) !== shortDate(o.createdAt)
                  ? ` · ${relativeWhen(o.createdAt)}`
                  : ""}{" "}
                · desde {ORDER_CHANNELS[o.channel]}
              </span>
            </div>
          ) : (
            <span className="muted">Cargando…</span>
          )}
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="drawer-body" id="od-body">
          {o && (
            <>
              <div className="od-sec">
                <div className="od-steps">
                  {[1, 2, 3, 4, 5].map((k) => (
                    <i key={k} className={k <= step ? "on" : ""} />
                  ))}
                </div>
                <div className="row" style={{ fontSize: 12, color: "var(--cacao-2)" }}>
                  <span>Pagado</span>
                  <span>Preparando</span>
                  <span>Listo</span>
                  <span>{o.shippingMethod === "taller" ? "—" : "En camino"}</span>
                  <span>{o.shippingMethod === "taller" ? "Retirado" : "Entregado"}</span>
                </div>
              </div>

              <div className="od-sec">
                <h4>
                  {picking ? "Para preparar · tildá cada prenda" : "Prendas"}
                  <span>
                    {o.units} {o.units === 1 ? "unidad" : "unidades"}
                  </span>
                </h4>
                {o.items.map((i) => {
                  const key = `${i.slug}-${i.size}`;
                  // con algo para tildar es un label (clic en la fila tilda); si no, una fila común
                  const Row = picking ? "label" : "div";
                  return (
                    <Row className="pick" key={key}>
                      {picking ? (
                        <span className="check">
                          <input
                            type="checkbox"
                            aria-label={`${i.name} talle ${i.size} preparado`}
                            checked={picked.has(key)}
                            onChange={(e) =>
                              setPicked((s) => {
                                const n = new Set(s);
                                e.target.checked ? n.add(key) : n.delete(key);
                                return n;
                              })
                            }
                          />
                        </span>
                      ) : (
                        <span />
                      )}
                      <img src={i.imageUrl} alt="" />
                      <span>
                        <b>{i.name}</b>
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          Talle {i.size} · {i.qty} {i.qty === 1 ? "unidad" : "unidades"}
                        </span>
                      </span>
                      <span>{formatARS(i.unitPriceCents * i.qty)}</span>
                    </Row>
                  );
                })}
              </div>

              <div className="od-sec">
                <h4>Cliente</h4>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span
                    className="av"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--rosa)",
                      display: "grid",
                      placeItems: "center",
                      font: "italic 400 20px/1 var(--f-display)",
                    }}
                  >
                    {o.customer.name[0]}
                  </span>
                  <div>
                    <b>{o.customer.name}</b>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {o.email} · {o.phone}
                      {o.whatsappOptIn ? " · quiere el seguimiento por WhatsApp" : ""}
                    </div>
                  </div>
                </div>
                <div className="contact-btns">
                  <button type="button" className="btn btn-sm btn-soft" onClick={() => onWhatsApp(o)}>
                    <BrandIcon name="whatsapp" className="i-sm" /> WhatsApp
                  </button>
                  <a className="btn btn-sm btn-soft" href={`mailto:${o.email}`}>
                    <Mail className="i-sm" /> Mail
                  </a>
                  <a className="btn btn-sm btn-soft" href={`tel:${o.phone}`}>
                    <Phone className="i-sm" /> Llamar
                  </a>
                </div>
              </div>

              <div className="od-sec">
                <h4>Envío</h4>
                <dl className="kv2">
                  <dt>Método</dt>
                  <dd>{SHIPPING_METHODS[o.shippingMethod]}</dd>
                  {o.shippingMethod === "taller" ? (
                    <>
                      <dt>Retira</dt>
                      <dd>
                        {o.pickupLabel ?? "A coordinar"} · taller de {workshop}
                      </dd>
                    </>
                  ) : a ? (
                    <>
                      <dt>Dirección</dt>
                      <dd>
                        {a.street} {a.number}
                        {a.unit ? `, ${a.unit}` : ""} · {a.city}, {a.province} ({a.postalCode})
                      </dd>
                      {a.notes && (
                        <>
                          <dt>Indicaciones</dt>
                          <dd>{a.notes}</dd>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <dt>Sucursal</dt>
                      <dd>
                        {o.shippingBranch
                          ? `${o.shippingBranch.name} · ${o.shippingBranch.address}`
                          : "La más cercana al CP del cliente (a confirmar)"}
                      </dd>
                    </>
                  )}
                  {o.trackingNumber && (
                    <>
                      <dt>Andreani</dt>
                      <dd>
                        Nº {o.trackingNumber} ·{" "}
                        <a className="link" href={adminApi.labelUrl(o.number)} target="_blank" rel="noopener">
                          Imprimir etiqueta
                        </a>{" "}
                        ·{" "}
                        <a className="link" href={`/seguimiento?pedido=${o.number}`} target="_blank" rel="noopener">
                          Seguimiento
                        </a>
                      </dd>
                    </>
                  )}
                  <dt>Costo</dt>
                  <dd>
                    {o.shippingMethod === "taller"
                      ? "Sin costo"
                      : o.shippingCents
                        ? formatARS(o.shippingCents)
                        : "Gratis"}
                  </dd>
                </dl>
              </div>

              <div className="od-sec">
                <h4>Pago {o.paymentMethod !== "efectivo" && <BrandIcon name="mercadopago" className="i-sm" />}</h4>
                <dl className="kv2">
                  <dt>Medio</dt>
                  <dd>
                    {o.paymentMethod ? PAYMENT_METHODS[o.paymentMethod] : "Sin pagar"}
                    {(o.installments ?? 1) > 1 ? ` · ${o.installments} cuotas` : ""}
                  </dd>
                  <dt>Estado</dt>
                  <dd>
                    {o.status === "reembolsado" ? (
                      <span className="pill-status st-muted">Reintegrado</span>
                    ) : o.paidAt ? (
                      <span className="pill-status st-ok">
                        {o.paymentMethod === "efectivo" ? "Cobrado" : "Aprobado"}
                      </span>
                    ) : (
                      <span className="pill-status st-muted">Pendiente</span>
                    )}
                  </dd>
                  <dt>Prendas</dt>
                  <dd>{formatARS(o.subtotalCents)}</dd>
                  {o.discountCents > 0 && (
                    <>
                      <dt>Cupón {o.couponCode}</dt>
                      <dd>-{formatARS(o.discountCents)}</dd>
                    </>
                  )}
                  <dt>{o.shippingMethod === "taller" ? "Retiro" : "Envío"}</dt>
                  <dd>{o.shippingCents ? formatARS(o.shippingCents) : "Sin costo"}</dd>
                  <dt>Total</dt>
                  <dd>
                    <b>{formatARS(o.totalCents)}</b>
                  </dd>
                  {paidMore && o.payment?.paidByCustomerCents && (
                    <>
                      <dt>Pagó el cliente</dt>
                      <dd>
                        {formatARS(o.payment.paidByCustomerCents)}{" "}
                        <span className="muted" style={{ fontSize: 12 }}>
                          (con el interés de las cuotas de su tarjeta)
                        </span>
                      </dd>
                    </>
                  )}
                  {o.payment?.netCents != null && (
                    <>
                      <dt>Te queda</dt>
                      <dd>
                        {formatARS(o.payment.netCents)}{" "}
                        <span className="muted" style={{ fontSize: 12 }}>
                          (después de la comisión de MP)
                        </span>
                      </dd>
                    </>
                  )}
                  {o.payment && (
                    <>
                      <dt>Operación MP</dt>
                      <dd>{o.payment.reference}</dd>
                    </>
                  )}
                  {o.payUrl && (
                    <>
                      <dt>Link</dt>
                      <dd>
                        <button type="button" className="link" onClick={() => copyLink(o.payUrl ?? "")}>
                          Copiar link de pago
                        </button>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {o.reservedUntil
                            ? `Las prendas quedan reservadas hasta el ${launchWhen(o.reservedUntil)}. `
                            : ""}
                          A las 24 h se le manda un recordatorio por mail.
                        </div>
                      </dd>
                    </>
                  )}
                </dl>
                {o.refund && <RefundPanel key={o.number} refund={o.refund} busy={busy} onConfirm={refund} />}
              </div>

              <div className="od-sec">
                <h4>Historial</h4>
                <ul className="tl">
                  {o.events.map((e) => (
                    <li key={`${e.at}-${e.kind}-${e.title}`} className={e.auto ? "auto" : ""}>
                      <span className="d">
                        {e.kind === "status" ? statusIcon(e.title) : (EVENT_ICON[e.kind] ?? <Package />)}
                      </span>
                      <div>
                        <b>{e.title}</b>
                        {e.auto && <span className="tag-auto">auto</span>}
                        <small>
                          {e.detail ? `${e.detail} · ` : ""}
                          {mounted ? relativeWhen(e.at) : longDate(e.at)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="od-sec">
                <h4>Notas internas</h4>
                <textarea
                  className="input"
                  rows={2}
                  aria-label="Notas internas"
                  placeholder="Ej. le prometí el moño a juego, envolver con cuidado…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                />
              </div>
            </>
          )}
        </div>

        <div className="drawer-foot" id="od-foot">
          {o && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {nx && (
                <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={() => runNext(nx)}>
                  <ActionIcon icon={nx.icon} /> {nx.label}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => onWhatsApp(o)}>
                <BrandIcon name="whatsapp" className="i-sm" /> WhatsApp
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
