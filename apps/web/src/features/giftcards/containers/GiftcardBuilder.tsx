"use client";

import { creditCuotas, GIFTCARD_AMOUNTS, GIFTCARD_DESIGNS, type GiftcardDesign } from "@mini-galu/contracts";
import { Info, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAccount } from "@/features/account/account-store";
import { useInstallmentPlan } from "@/features/checkout/installments-store";
import { toast } from "@/features/shell/ui-store";
import { accountApi } from "@/lib/account-api";
import { ApiRequestError, api } from "@/lib/api";
import { longDate, toArInputs } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { GiftcardCard } from "../components/GiftcardCard";
import { deliveryLabel, EMPTY_GIFTCARD, type GiftcardForm, otherAmount, toPurchase } from "../giftcard-form";

const SWATCH: Record<GiftcardDesign, string> = {
  cacao: "var(--cacao)",
  rosa: "var(--rosa)",
  salvia: "var(--salvia-d)",
  lino: "var(--linen-2)",
};

const dayLabel = (day: string) => longDate(`${day}T12:00:00-03:00`);

/** Armado con vista previa en vivo (giftcards.html → #armala). Al pagar se va al link de pago del pedido. */
export function GiftcardBuilder() {
  const router = useRouter();
  const mounted = useMounted();
  const [f, setF] = useState<GiftcardForm>(EMPTY_GIFTCARD);
  const [busy, setBusy] = useState(false);
  const cuotas = creditCuotas(useInstallmentPlan(f.amount * 100));
  const accountStatus = useAccount((s) => s.status);
  const set = (patch: Partial<GiftcardForm>) => setF((x) => ({ ...x, ...patch }));
  const setBuyer = (patch: Partial<GiftcardForm["buyer"]>) => setF((x) => ({ ...x, buyer: { ...x.buyer, ...patch } }));

  // con cuenta: los datos de quien compra ya están
  useEffect(() => {
    if (accountStatus !== "in") return;
    accountApi
      .overview()
      .then(({ profile: p }) =>
        setF((x) =>
          x.buyer.email
            ? x
            : {
                ...x,
                buyer: {
                  email: p.email,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  phone: p.phone?.replace(/^\+549/, "") ?? "",
                },
              },
        ),
      )
      .catch(() => {});
  }, [accountStatus]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = toPurchase(f);
    if (!r.ok) return toast(r.error, { icon: <Info className="i-sm" /> });
    setBusy(true);
    try {
      const g = await api.buyGiftcard(r.value);
      router.push(`/pagar/${encodeURIComponent(g.number)}?t=${encodeURIComponent(g.accessToken)}`);
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : "No pudimos armar la gift card. Probá de nuevo.", {
        icon: <Info className="i-sm" />,
      });
      setBusy(false);
    }
  };

  const mail = f.via === "mail";
  const today = mounted ? toArInputs(new Date().toISOString()).date : undefined;

  return (
    <div className="gb">
      <form className="gb-form" id="gb-form" onSubmit={submit} noValidate>
        <div className="gb-step">
          <span className="lbl">
            <i>1</i> Diseño y monto
          </span>
          <div className="designs">
            {(Object.keys(GIFTCARD_DESIGNS) as GiftcardDesign[]).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={f.design === d}
                style={{ background: SWATCH[d] }}
                aria-label={GIFTCARD_DESIGNS[d]}
                onClick={() => set({ design: d })}
              />
            ))}
          </div>
          <div className="amounts">
            {GIFTCARD_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${!f.other && f.amount === a ? "is-on" : ""}`}
                onClick={() => set({ amount: a, other: "" })}
              >
                ${a.toLocaleString("es-AR")}
              </button>
            ))}
            <input
              className="input other"
              inputMode="numeric"
              placeholder="Otro monto"
              aria-label="Otro monto"
              value={f.other}
              onChange={(e) => {
                const o = otherAmount(e.target.value);
                set({ other: o.text, amount: o.amount });
              }}
            />
          </div>
          <small className="muted">Un vestido sale entre $28.000 y $47.000.</small>
        </div>

        <div className="gb-step">
          <span className="lbl">
            <i>2</i> Para quién
          </span>
          <div className="grid2">
            <div className="field">
              <label htmlFor="gb-to">Para</label>
              <input
                className="input"
                id="gb-to"
                maxLength={24}
                placeholder="Olivia"
                value={f.toName}
                onChange={(e) => set({ toName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="gb-from">De parte de</label>
              <input
                className="input"
                id="gb-from"
                maxLength={30}
                placeholder="La tía Sole"
                value={f.fromName}
                onChange={(e) => set({ fromName: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="gb-msg">Mensaje</label>
            <textarea
              className="input"
              id="gb-msg"
              rows={3}
              maxLength={180}
              placeholder="¡Feliz cumple, Oli! Elegí el vestido que más te guste."
              value={f.message}
              onChange={(e) => set({ message: e.target.value })}
            />
          </div>
        </div>

        <div className="gb-step">
          <span className="lbl">
            <i>3</i> Cómo y cuándo llega
          </span>
          <div className="seg" role="group" aria-label="Enviar por">
            <button type="button" aria-pressed={!mail} onClick={() => set({ via: "whatsapp", recipient: "" })}>
              <BrandIcon name="whatsapp" className="brand" /> WhatsApp
            </button>
            <button type="button" aria-pressed={mail} onClick={() => set({ via: "mail", recipient: "" })}>
              <Mail className="i-sm" /> Email
            </button>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="gb-dest">{mail ? "Mail de quien la recibe" : "WhatsApp de quien la recibe"}</label>
              <input
                className="input"
                id="gb-dest"
                type={mail ? "email" : "text"}
                inputMode={mail ? "email" : "tel"}
                placeholder={mail ? "mama@gmail.com" : "11 5555-1234"}
                value={f.recipient}
                onChange={(e) => set({ recipient: e.target.value })}
              />
            </div>
            <div className="field" hidden={!mail}>
              <label htmlFor="gb-when">Cuándo</label>
              <select
                className="input"
                id="gb-when"
                value={f.when}
                onChange={(e) => set({ when: e.target.value as GiftcardForm["when"] })}
              >
                <option value="ahora">Ahora mismo</option>
                <option value="fecha">Elegir fecha…</option>
              </select>
            </div>
          </div>
          {mail && f.when === "fecha" && (
            <div className="field">
              <label htmlFor="gb-day">Día (le llega a las 9 de la mañana)</label>
              <input
                className="input"
                id="gb-day"
                type="date"
                min={today}
                value={f.day}
                onChange={(e) => set({ day: e.target.value })}
              />
            </div>
          )}
          {!mail && (
            <small className="muted">
              Por WhatsApp se la mandás vos, cuando quieras: al pagar te llega un mail con el código y un botón que arma
              el mensaje.
            </small>
          )}
        </div>

        <div className="gb-step" style={{ border: 0, padding: 0 }}>
          <span className="lbl">
            <i>4</i> Tus datos
          </span>
          <div className="grid2">
            <div className="field">
              <label htmlFor="gb-bfirst">Nombre</label>
              <input
                className="input"
                id="gb-bfirst"
                autoComplete="given-name"
                value={f.buyer.firstName}
                onChange={(e) => setBuyer({ firstName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="gb-blast">Apellido</label>
              <input
                className="input"
                id="gb-blast"
                autoComplete="family-name"
                value={f.buyer.lastName}
                onChange={(e) => setBuyer({ lastName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="gb-bmail">Tu mail</label>
              <input
                className="input"
                id="gb-bmail"
                type="email"
                autoComplete="email"
                value={f.buyer.email}
                onChange={(e) => setBuyer({ email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="gb-bphone">Tu celular</label>
              <input
                className="input"
                id="gb-bphone"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="11 5555-1234"
                value={f.buyer.phone}
                onChange={(e) => setBuyer({ phone: e.target.value })}
              />
            </div>
          </div>
          <small className="muted">Te mandamos el comprobante y el código, por si hace falta reenviarla.</small>
        </div>
      </form>

      <aside className="gb-preview" aria-label="Así la recibe">
        <span className="eyebrow">Así la recibe</span>
        <GiftcardCard design={f.design} amountCents={f.amount * 100} toName={f.toName} />
        <div className="letter">
          <small>{deliveryLabel(f, dayLabel)}</small>
          <p>{f.message.trim() || "Tu mensaje va acá."}</p>
          {f.fromName.trim() && <span className="hand">— {f.fromName.trim()}</span>}
        </div>
        <div className="gb-total">
          <span>Total</span>
          <b>${f.amount.toLocaleString("es-AR")}</b>
        </div>
        <button type="submit" className="btn btn-lg btn-block" form="gb-form" disabled={busy}>
          <BrandIcon name="mercadopago" className="i-sm" /> {busy ? "Armando…" : "Pagar con Mercado Pago"}
        </button>
        <small className="muted" style={{ textAlign: "center" }}>
          Tarjeta de crédito{cuotas ? ` (${cuotas})` : ""}, débito o dinero en cuenta.
        </small>
      </aside>
    </div>
  );
}
