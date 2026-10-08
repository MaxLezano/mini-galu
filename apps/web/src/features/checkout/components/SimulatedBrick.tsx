import { type CheckoutPaymentMethod, formatARS } from "@mini-galu/contracts";
import { CreditCard, FlaskConical, Lock, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

export type SimulatedCard = {
  method: "credito" | "debito";
  holderName: string;
  installments: number;
  last4: string;
};

type Props = {
  methods: Record<CheckoutPaymentMethod, boolean>;
  maxInstallments: number;
  totalCents: number;
  busy: boolean;
  error: string | null;
  onPayCard: (card: SimulatedCard) => void;
  onPayWallet: () => void;
};

const METHOD_LIST = [
  { id: "credito", title: "Tarjeta de crédito", icon: <CreditCard className="i-sm" /> },
  { id: "debito", title: "Tarjeta de débito", icon: <WalletCards className="i-sm" /> },
  { id: "dinero_cuenta", title: "Dinero en cuenta de Mercado Pago", icon: <BrandIcon name="mercadopago" /> },
] as const;

/**
 * Pago simulado: mismo aspecto que el Brick del mockup, para desarrollo local sin cuenta de Mercado Pago.
 * Como las tarjetas de prueba de MP, el nombre del titular decide el resultado (APRO, OTHE, CONT, FUND).
 */
export function SimulatedBrick({ methods, maxInstallments, totalCents, busy, error, onPayCard, onPayWallet }: Props) {
  const available = METHOD_LIST.filter((m) => methods[m.id]);
  const [method, setMethod] = useState<CheckoutPaymentMethod>(available[0]?.id ?? "credito");
  const [number, setNumber] = useState("4509 9535 6623 3704");
  const [exp, setExp] = useState("11/29");
  const [cvv, setCvv] = useState("123");
  const [dni, setDni] = useState("30123456");
  const [holder, setHolder] = useState("APRO");
  const [cuotas, setCuotas] = useState(1);
  const digits = number.replace(/\D/g, "").padEnd(16, "•");
  // simulado: sin tasas reales, se muestran las cuotas sin prometer interés (el real lo calcula Mercado Pago)
  const plans = [1, 3, 6, 12].filter((n) => n <= maxInstallments);
  const subtitle: Record<CheckoutPaymentMethod, string> = {
    credito: maxInstallments > 1 ? `Hasta ${maxInstallments} cuotas` : "En un pago",
    debito: "Se debita en el momento",
    dinero_cuenta: "Pagás con tu saldo sin cargar la tarjeta",
  };

  const pay = () => {
    if (method === "dinero_cuenta") return onPayWallet();
    onPayCard({
      method,
      holderName: holder,
      installments: method === "credito" ? cuotas : 1,
      last4: digits.slice(12, 16),
    });
  };

  return (
    <>
      <div className="mp-brick">
        <div className="mp-head">
          <span className="mp-logo">
            <BrandIcon name="mercadopago" />
            Mercado Pago
          </span>
          <span className="muted" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <ShieldCheck className="i-sm" /> Pago protegido
          </span>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }}>
          <FlaskConical className="i-sm" /> Modo simulado: no se cobra nada. Titular APRO aprueba, OTHE rechaza, CONT
          queda en revisión.
        </p>
        {available.map((m) => (
          <label className="option" key={m.id}>
            <input type="radio" name="pay" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
            <span>
              <b>{m.title}</b>
              <small>{subtitle[m.id]}</small>
            </span>
            <span className="pay-ico">{m.icon}</span>
          </label>
        ))}

        {method === "dinero_cuenta" ? (
          <div className="pay-panel">
            <div className="mp-account">
              <BrandIcon name="mercadopago" />
              <b>Te llevamos a Mercado Pago para confirmar</b>
              <span className="muted">
                Ingresás con tu cuenta, elegís pagar con el saldo y volvés a la tienda automáticamente. En el celular se
                abre la app.
              </span>
            </div>
          </div>
        ) : (
          <div className="pay-panel">
            <div className="card-prev">
              <div className="row">
                <span className="chip-c" />
                <span className="kind">{method === "debito" ? "Débito" : "Crédito"}</span>
              </div>
              <div className="num">
                {digits.slice(0, 4)} •••• •••• {digits.slice(12, 16)}
              </div>
              <div className="row" style={{ fontSize: 12, opacity: 0.85 }}>
                <span>{holder.toUpperCase() || "NOMBRE"}</span>
                <span>{exp}</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="cn">Número de tarjeta</label>
              <input
                className="input"
                id="cn"
                inputMode="numeric"
                autoComplete="cc-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="ce">Vencimiento</label>
                <input
                  className="input"
                  id="ce"
                  autoComplete="cc-exp"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cc">Código de seguridad</label>
                <input
                  className="input"
                  id="cc"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                />
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="dni">DNI del titular</label>
                <input
                  className="input"
                  id="dni"
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="hol">Nombre como figura</label>
                <input className="input" id="hol" value={holder} onChange={(e) => setHolder(e.target.value)} />
              </div>
            </div>
            {method === "credito" && plans.length > 1 && (
              <div className="field">
                <span className="lbl">Cuotas</span>
                <div className="cuotas-sel">
                  {plans.map((n) => (
                    <label className="option" key={n}>
                      <input type="radio" name="cuo" checked={cuotas === n} onChange={() => setCuotas(n)} />
                      <span>{n === 1 ? `1 pago de ${formatARS(totalCents)}` : `${n} cuotas`}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="pay-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-lg btn-block" id="pay" disabled={busy} onClick={pay}>
        {busy ? (
          <>
            <span className="typing" style={{ padding: 0 }}>
              <i style={{ background: "var(--paper)" }} />
              <i style={{ background: "var(--paper)" }} />
              <i style={{ background: "var(--paper)" }} />
            </span>{" "}
            Procesando con Mercado Pago
          </>
        ) : method === "dinero_cuenta" ? (
          <>Ir a Mercado Pago · {formatARS(totalCents)}</>
        ) : (
          <>Pagar {formatARS(totalCents)}</>
        )}
      </button>
      <div className="secure">
        <Lock className="i-sm" /> Los datos de tu tarjeta los procesa Mercado Pago, nunca pasan por nuestra web.
      </div>
    </>
  );
}
