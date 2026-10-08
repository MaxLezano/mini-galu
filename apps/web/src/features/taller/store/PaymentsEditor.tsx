"use client";

import type { AdminPayments, PaymentSettings } from "@mini-galu/contracts";
import { Check, CreditCard, Layers, Link2, WalletCards } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

const MODE: Record<AdminPayments["mode"], { title: string; text: string; pill: string; tone: string }> = {
  simulado: {
    title: "Sin cuenta conectada",
    text: "Modo simulado: el checkout cobra de mentira (titular APRO aprueba, OTHE rechaza). Para probar con Mercado Pago, cargá las credenciales de prueba en el .env de la API.",
    pill: "Simulado",
    tone: "st-muted",
  },
  prueba: {
    title: "Cuenta conectada",
    text: "Modo prueba: los pagos son de mentira, con tarjetas de prueba de Mercado Pago.",
    pill: "Prueba",
    tone: "st-warn",
  },
  produccion: {
    title: "Cuenta conectada",
    text: "Producción: los pagos son reales y se acreditan en tu cuenta.",
    pill: "Activa",
    tone: "st-ok",
  },
};

/** Mercado Pago — admin-tienda.html → #pagos. El modo sale de las credenciales (no se cambia desde acá). */
export function PaymentsEditor({ initial }: { initial: AdminPayments }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const mode = MODE[data.mode];

  const save = async (next: PaymentSettings) => {
    const prev = data;
    setData({ ...data, settings: next });
    setBusy(true);
    try {
      setData(await adminApi.savePayments(next));
      toast("Cambio guardado", { icon: <Check className="i-sm" /> });
    } catch (e) {
      setData(prev);
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };
  const s = data.settings;
  const toggle = (k: "credito" | "debito" | "dinero_cuenta", label: string) => (
    <input
      className="tog"
      type="checkbox"
      aria-label={label}
      checked={s[k]}
      disabled={busy}
      onChange={(e) => save({ ...s, [k]: e.target.checked })}
    />
  );

  return (
    <section className="box" id="pagos">
      <div className="box-head">
        <h2>Mercado Pago</h2>
        <span className={`pill-status ${mode.tone}`}>{mode.pill}</span>
      </div>
      <div className="stack">
        <div className="conn">
          <span className="ic">
            <BrandIcon name="mercadopago" />
          </span>
          <div>
            <b>{mode.title}</b>
            <span className="muted">{mode.text}</span>
          </div>
        </div>
        <div>
          <div className="pm">
            <span className="ic">
              <CreditCard className="i-sm" />
            </span>
            <div>
              <b>Tarjeta de crédito</b>
              <small>Visa, Mastercard, American Express, Naranja y más</small>
            </div>
            {toggle("credito", "Crédito")}
          </div>
          <div className="pm">
            <span className="ic">
              <Layers className="i-sm" />
            </span>
            <div>
              <b>Cuotas en el checkout</b>
              <small>
                Cuántas cuotas se ofrecen. Si son con o sin interés lo define tu cuenta de Mercado Pago (las cuotas sin
                interés se activan allá y las pagás vos): la tienda solo dice “sin interés” cuando Mercado Pago lo
                confirma.
              </small>
            </div>
            <select
              className="input"
              style={{ width: "auto", height: 38, fontSize: 13 }}
              aria-label="Cuotas en el checkout"
              value={s.maxInstallments}
              disabled={busy}
              onChange={(e) => save({ ...s, maxInstallments: Number(e.target.value) as 1 | 3 | 6 | 12 })}
            >
              <option value={1}>Solo en un pago</option>
              <option value={3}>Hasta 3</option>
              <option value={6}>Hasta 6</option>
              <option value={12}>Hasta 12</option>
            </select>
          </div>
          <div className="pm">
            <span className="ic">
              <WalletCards className="i-sm" />
            </span>
            <div>
              <b>Tarjeta de débito</b>
              <small>Visa Débito, Maestro, Cabal</small>
            </div>
            {toggle("debito", "Débito")}
          </div>
          <div className="pm">
            <span className="ic">
              <BrandIcon name="mercadopago" />
            </span>
            <div>
              <b>Dinero en cuenta de Mercado Pago</b>
              <small>Se paga con el saldo de Mercado Pago, sin tarjeta</small>
            </div>
            {toggle("dinero_cuenta", "Dinero en cuenta")}
          </div>
          <div className="pm">
            <span className="ic">
              <Link2 className="i-sm" />
            </span>
            <div>
              <b>Links de pago automáticos</b>
              <small>
                Si un pago queda pendiente, el pedido genera su link y se reenvía. El stock se reserva 72 h.
              </small>
            </div>
            {/* TODO(fase 4 · orders): links de pago desde el tablero */}
            <span className="pill-status st-muted">Fase 4</span>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
          La comisión y el plazo de acreditación los elegís en tu cuenta de Mercado Pago. Cada pago aprobado mueve solo
          el pedido a “Nuevos”. Avisos de pago: <code style={{ fontSize: 11.5 }}>{data.webhookUrl}</code>
        </p>
      </div>
    </section>
  );
}
