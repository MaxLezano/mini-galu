"use client";

import {
  type AccountGiftcard,
  type AccountProfile,
  formatARS,
  GIFTCARD_AMOUNTS,
  type GiftcardDesign,
} from "@mini-galu/contracts";
import { Info, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { ApiRequestError, api } from "@/lib/api";
import { longDateYear } from "@/lib/date";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { GiftcardCard } from "../components/GiftcardCard";
import { EMPTY_GIFTCARD, toPurchase } from "../giftcard-form";

/** En la cuenta van los tres diseños del mockup (cuenta.html → #p-giftcards). */
const DESIGNS: [GiftcardDesign, string, string][] = [
  ["cacao", "Cacao", "var(--cacao)"],
  ["rosa", "Rosa", "var(--rosa)"],
  ["salvia", "Salvia", "var(--salvia-d)"],
];

/** Pestaña "Gift cards" de Mi cuenta: las que tiene (compradas o recibidas) y el armado corto. */
export function AccountGiftcards({ profile, cards }: { profile: AccountProfile; cards: AccountGiftcard[] }) {
  const router = useRouter();
  const [design, setDesign] = useState<GiftcardDesign>("cacao");
  const [amount, setAmount] = useState(20_000);
  const [toName, setToName] = useState("");
  const [dest, setDest] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = cards.filter((c) => c.status === "activa" && c.balanceCents > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.phone) return toast("Cargá tu celular en Mis datos para comprar una gift card");
    const mail = dest.includes("@");
    const r = toPurchase({
      ...EMPTY_GIFTCARD,
      design,
      amount,
      toName,
      fromName: profile.firstName,
      message,
      via: mail ? "mail" : "whatsapp",
      recipient: dest,
      buyer: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone?.replace(/^\+549/, "") ?? "",
      },
    });
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

  return (
    <>
      <div className="panel-head">
        <span className="eyebrow is-in">Gift cards</span>
        <h1 className="display h2">
          Regalá <em>a elección</em>
        </h1>
        <p className="lead" style={{ margin: 0 }}>
          Ideal cuando no sabés el talle. Llega por mail o WhatsApp con tu mensaje y se usa en la web.
        </p>
      </div>
      <div className="gc-wrap">
        <div>
          <GiftcardCard design={design} amountCents={amount * 100} toName={toName} />
          {active.map((c) => (
            <div className="my-gc" key={c.code}>
              <Wallet className="i-sm" />
              <span>
                {c.mine === "recibi" ? "Tenés una gift card activa" : `Le regalaste a ${c.toName}`}:{" "}
                <code>{c.code}</code> · saldo <b>{formatARS(c.balanceCents)}</b>
                {c.expiresAt ? ` · vence el ${longDateYear(c.expiresAt)}` : ""}.
                {c.mine === "recibi" ? " Se carga en el checkout." : ""}
              </span>
            </div>
          ))}
        </div>
        <form style={{ display: "grid", gap: 16 }} onSubmit={submit} noValidate>
          <div className="field">
            <span className="lbl">Diseño</span>
            <div className="designs">
              {DESIGNS.map(([d, label, bg]) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={design === d}
                  style={{ background: bg }}
                  aria-label={label}
                  onClick={() => setDesign(d)}
                />
              ))}
            </div>
          </div>
          <div className="field">
            <span className="lbl">Monto</span>
            <div className="amounts">
              {GIFTCARD_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`chip ${amount === a ? "is-on" : ""}`}
                  onClick={() => setAmount(a)}
                >
                  ${a.toLocaleString("es-AR")}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="gc-name">Para</label>
            <input
              className="input"
              id="gc-name"
              maxLength={24}
              placeholder="Olivia"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="gc-dest">WhatsApp o email de quien la recibe</label>
            <input
              className="input"
              id="gc-dest"
              placeholder="11 5555-1234 o mama@gmail.com"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="gc-msg">Mensaje</label>
            <textarea
              className="input"
              id="gc-msg"
              rows={3}
              maxLength={180}
              placeholder="¡Feliz cumple! Elegí lo que más te guste"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-lg" disabled={busy}>
            <BrandIcon name="mercadopago" className="i-sm" /> Pagar ${amount.toLocaleString("es-AR")} con Mercado Pago
          </button>
          <span className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
            Tarjeta de crédito, débito o dinero en cuenta.
          </span>
        </form>
      </div>
    </>
  );
}
