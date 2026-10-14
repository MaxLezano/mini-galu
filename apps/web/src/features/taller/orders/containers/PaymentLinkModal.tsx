"use client";

import {
  type AdminProduct,
  formatARS,
  PAYMENT_LINK_HOURS,
  type PaymentLinkCreated,
  PROVINCES,
  type ShippingOptions,
  type Size,
  toE164AR,
} from "@mini-galu/contracts";
import { Copy, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, useUi } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError, api } from "@/lib/api";
import { launchWhen } from "@/lib/date";
import { cover } from "@/lib/product";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Modal } from "@/ui/organisms/Modal";
import { type ContactForm, EMPTY_CONTACT, EMPTY_SHIPPING, type ShippingForm } from "../../../checkout/checkout-form";
import { fillTemplate, TEMPLATES, waLink } from "../order-flow";
import { addLine, type LinkChannel, type LinkLine, linesSubtotal, linkError, toLinkInput } from "../payment-link-form";

export const PAYMENT_LINK_MODAL = "m-link";

/**
 * Venta por Instagram o WhatsApp (PLAN §6): se cargan las prendas, el cliente y la entrega; el pedido queda
 * esperando el pago con el stock reservado 72 h y sale un link para mandarle.
 */
export function PaymentLinkModal({ onCreated }: { onCreated: () => void }) {
  const { modal, closeModal } = useUi();
  const open = modal === PAYMENT_LINK_MODAL;
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [options, setOptions] = useState<ShippingOptions | null>(null);
  const [channel, setChannel] = useState<LinkChannel>("whatsapp");
  const [lines, setLines] = useState<LinkLine[]>([]);
  const [pick, setPick] = useState<{ slug: string; size: Size | "" }>({ slug: "", size: "" });
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [ship, setShip] = useState<ShippingForm>({ ...EMPTY_SHIPPING, method: "taller" });
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<PaymentLinkCreated | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!products) adminApi.products().then(setProducts, () => setProducts([]));
    if (!options) api.shipping().then(setOptions, () => {});
  }, [open, products, options]);

  const reset = () => {
    setLines([]);
    setPick({ slug: "", size: "" });
    setContact(EMPTY_CONTACT);
    setShip({ ...EMPTY_SHIPPING, method: "taller" });
    setError(null);
    setCreated(null);
  };
  const close = () => {
    closeModal();
    if (created) reset();
  };

  const product = products?.find((p) => p.slug === pick.slug);
  const variant = product?.variants.find((v) => v.size === pick.size);
  const add = () => {
    if (!product || !variant) return;
    setLines((ls) =>
      addLine(
        ls,
        {
          slug: product.slug,
          name: product.name,
          size: variant.size,
          qty: 1,
          priceCents: product.priceCents,
          imageUrl: cover(product),
        },
        variant.stock,
      ),
    );
    setPick({ slug: "", size: "" });
    setError(null);
  };

  const submit = async () => {
    const e = linkError(lines, contact, ship);
    setError(e);
    if (e) return document.getElementById(`pl-${e.field}`)?.focus();
    setBusy(true);
    try {
      setCreated(await adminApi.createPaymentLink(toLinkInput(channel, lines, contact, ship)));
      onCreated();
    } catch (err) {
      setError({ field: "", message: err instanceof ApiRequestError ? err.message : "No se pudo crear el link" });
    } finally {
      setBusy(false);
    }
  };

  const err = (field: string) =>
    error?.field === field ? (
      <span className="field-error" role="alert">
        {error.message}
      </span>
    ) : null;
  const setC = (k: keyof ContactForm, v: string) => setContact((c) => ({ ...c, [k]: v }));
  const setS = (k: keyof ShippingForm, v: string) => setShip((s) => ({ ...s, [k]: v }));
  const message = created
    ? fillTemplate(TEMPLATES.link.body, {
        nombre: contact.firstName.trim(),
        pedido: created.number,
        seguimiento: "",
        taller: "",
        horario: "",
        link: created.payUrl,
        vence: launchWhen(created.reservedUntil),
      })
    : "";

  return (
    <Modal
      id={PAYMENT_LINK_MODAL}
      label="Nuevo link de pago"
      title={
        <>
          Link de <em>pago</em>
        </>
      }
    >
      {created ? (
        <div className="modal-body" style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0 }}>
            Listo: el pedido <b>#{created.number}</b> por <b>{formatARS(created.totalCents)}</b> quedó esperando el
            pago. Las prendas se guardan hasta el {launchWhen(created.reservedUntil)}.
          </p>
          <div className="field">
            <label htmlFor="pl-url">Link para pagar</label>
            <input className="input" id="pl-url" readOnly value={created.payUrl} onFocus={(e) => e.target.select()} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                navigator.clipboard?.writeText(created.payUrl).then(
                  () => toast("Link de pago copiado"),
                  () => toast("No se pudo copiar: seleccioná el link y copialo"),
                )
              }
            >
              <Copy className="i-sm" /> Copiar link
            </button>
            {channel === "whatsapp" && (
              <a className="btn" target="_blank" rel="noopener" href={waLink(toE164AR(contact.phone) ?? "", message)}>
                <BrandIcon name="whatsapp" className="i-sm" /> Mandar por WhatsApp
              </a>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>
            Si no paga, a las 24 h le llega un recordatorio por mail y a las {PAYMENT_LINK_HOURS} h las prendas vuelven
            a la tienda.
          </p>
          <button type="button" className="btn btn-block btn-soft" onClick={close}>
            Listo
          </button>
        </div>
      ) : (
        <div className="modal-body" style={{ display: "grid", gap: 16 }}>
          <div className="field">
            <span className="lbl">Por dónde fue la venta</span>
            <div className="pl-chips" role="group" aria-label="Canal">
              {(["whatsapp", "instagram"] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`chip ${channel === c ? "is-on" : ""}`}
                  aria-pressed={channel === c}
                  onClick={() => setChannel(c)}
                >
                  <BrandIcon name={c} className="i-sm" /> {c === "whatsapp" ? "WhatsApp" : "Instagram"}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl">Prendas</legend>
            {lines.map((l) => (
              <div className="pl-item" key={`${l.slug}-${l.size}`} style={{ marginBottom: 8 }}>
                <span className="ph">
                  <img src={l.imageUrl} alt="" />
                  <span className="q">{l.qty}</span>
                </span>
                <span>
                  <b>{l.name}</b>
                  <span className="muted">Talle {l.size}</span>
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {formatARS(l.priceCents * l.qty)}
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 28, height: 28 }}
                    aria-label={`Quitar ${l.name} talle ${l.size}`}
                    onClick={() => setLines((ls) => ls.filter((x) => x !== l))}
                  >
                    <X className="i-sm" />
                  </button>
                </span>
              </div>
            ))}
            <div className="pl-grid">
              <select
                className="input"
                id="pl-product"
                aria-label="Prenda"
                value={pick.slug}
                onChange={(e) => setPick({ slug: e.target.value, size: "" })}
              >
                <option value="">{products ? "Elegí una prenda…" : "Cargando prendas…"}</option>
                {(products ?? []).map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                aria-label="Talle"
                value={pick.size}
                disabled={!product}
                onChange={(e) => setPick((x) => ({ ...x, size: e.target.value as Size }))}
              >
                <option value="">Talle…</option>
                {product?.variants.map((v) => (
                  <option key={v.size} value={v.size} disabled={v.stock === 0}>
                    {v.size} · {v.stock ? `quedan ${v.stock}` : "agotado"}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" disabled={!variant?.stock} onClick={add}>
              <Plus className="i-sm" /> Agregar
            </button>
            {err("product")}
          </fieldset>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <legend className="lbl">Cliente</legend>
            <div className="pl-grid">
              <input
                className="input"
                id="pl-firstName"
                placeholder="Nombre"
                aria-label="Nombre"
                value={contact.firstName}
                onChange={(e) => setC("firstName", e.target.value)}
              />
              <input
                className="input"
                id="pl-lastName"
                placeholder="Apellido"
                aria-label="Apellido"
                value={contact.lastName}
                onChange={(e) => setC("lastName", e.target.value)}
              />
            </div>
            {err("firstName")}
            {err("lastName")}
            <div className="pl-grid">
              <input
                className="input"
                id="pl-phone"
                inputMode="tel"
                placeholder="Celular (11 5555-1234)"
                aria-label="Celular"
                value={contact.phone}
                onChange={(e) => setC("phone", e.target.value)}
              />
              <input
                className="input"
                id="pl-email"
                type="email"
                placeholder="Email (para el recordatorio)"
                aria-label="Email"
                value={contact.email}
                onChange={(e) => setC("email", e.target.value)}
              />
            </div>
            {err("phone")}
            {err("email")}
          </fieldset>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <legend className="lbl">Entrega</legend>
            <div className="pl-chips" role="group" aria-label="Entrega">
              {(
                [
                  ["taller", "Retira en el taller"],
                  ["domicilio", "Envío a domicilio"],
                  ["sucursal", "Envío a sucursal"],
                ] as const
              ).map(([m, label]) => (
                <button
                  type="button"
                  key={m}
                  className={`chip ${ship.method === m ? "is-on" : ""}`}
                  aria-pressed={ship.method === m}
                  onClick={() => setS("method", m)}
                >
                  {label}
                </button>
              ))}
            </div>
            {ship.method === "taller" ? (
              <div className="pl-chips" role="group" aria-label="Horario de retiro" id="pl-pickupSlot" tabIndex={-1}>
                {(options?.pickupSlots ?? []).map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`chip ${ship.pickupSlot === s.id ? "is-on" : ""}`}
                    aria-pressed={ship.pickupSlot === s.id}
                    onClick={() => setS("pickupSlot", s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="pl-grid">
                  <input
                    className="input"
                    id="pl-postalCode"
                    inputMode="numeric"
                    placeholder="Código postal"
                    aria-label="Código postal"
                    value={ship.postalCode}
                    onChange={(e) => setS("postalCode", e.target.value.toUpperCase())}
                  />
                  <select
                    className="input"
                    id="pl-province"
                    aria-label="Provincia"
                    value={ship.province}
                    onChange={(e) => setS("province", e.target.value)}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                {ship.method === "domicilio" && (
                  <>
                    <div className="pl-grid">
                      <input
                        className="input"
                        id="pl-street"
                        placeholder="Calle"
                        aria-label="Calle"
                        value={ship.street}
                        onChange={(e) => setS("street", e.target.value)}
                      />
                      <input
                        className="input"
                        id="pl-number"
                        placeholder="Altura"
                        aria-label="Altura"
                        value={ship.number}
                        onChange={(e) => setS("number", e.target.value)}
                      />
                    </div>
                    <div className="pl-grid">
                      <input
                        className="input"
                        id="pl-unit"
                        placeholder="Piso y depto (opcional)"
                        aria-label="Piso y depto"
                        value={ship.unit}
                        onChange={(e) => setS("unit", e.target.value)}
                      />
                      <input
                        className="input"
                        id="pl-city"
                        placeholder="Localidad"
                        aria-label="Localidad"
                        value={ship.city}
                        onChange={(e) => setS("city", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            {["pickupSlot", "postalCode", "province", "street", "number", "city"].map((f) => (
              <span key={f}>{err(f)}</span>
            ))}
          </fieldset>

          {error?.field === "" && (
            <span className="field-error" role="alert">
              {error.message}
            </span>
          )}
          <div className="row" style={{ alignItems: "center" }}>
            <span className="muted">
              Prendas <b style={{ color: "var(--cacao)" }}>{formatARS(linesSubtotal(lines))}</b>
              {ship.method !== "taller" ? " + envío" : ""}
            </span>
            <button type="button" className="btn" disabled={busy} onClick={submit}>
              {busy ? "Reservando…" : "Crear link de pago"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
