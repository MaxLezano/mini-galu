import { ArrowDown, CalendarHeart, CreditCard, Gift, Plus, Send, Shirt } from "lucide-react";
import type { CSSProperties } from "react";
import { GiftcardCard } from "./components/GiftcardCard";
import { BalanceCheck } from "./containers/BalanceCheck";
import { GiftcardBuilder } from "./containers/GiftcardBuilder";
import "./giftcards.css";

const d = (s: string) => ({ "--d": s }) as CSSProperties;

const faq = (exchangeDays: number) => [
  [
    "¿Y si no le queda el talle?",
    `La gift card no elige talle: lo elige quien la recibe. Y si compra y no le queda, tiene ${exchangeDays} días para cambiarlo.`,
  ],
  [
    "¿Cómo se usa?",
    "En el checkout de la web: se carga el código en “Gift card” y se descuenta del total. Si cubre todo, no hace falta pagar nada más.",
  ],
  ["¿Cuánto dura?", "Seis meses desde que se paga. Se puede usar en varias compras hasta agotar el saldo."],
  ["¿Puedo programar el envío?", "Sí: elegí una fecha y le llega esa mañana a las 9."],
];

/** giftcards.html: hero, armado con vista previa, cómo funciona, saldo y preguntas. */
export function GiftcardsPage({ exchangeDays }: { exchangeDays: number }) {
  return (
    <main>
      <section className="wrap gh">
        <div className="split">
          <span className="eyebrow">Gift cards</span>
          <h1 className="display h1">
            <span className="split-line">
              <span style={d(".1s")}>Regalá</span>
            </span>
            <span className="split-line">
              <span style={d(".22s")}>
                <em>a elección</em>
              </span>
            </span>
          </h1>
          <p className="lead" data-reveal style={d(".4s")}>
            Para cuando no sabés el talle, o querés que la mamá elija. Llega por mail o WhatsApp con tu mensaje y se usa
            en la web.
          </p>
          <ul data-reveal style={d(".5s")}>
            <li>
              <Send /> Llega al instante o el día que elijas
            </li>
            <li>
              <CalendarHeart /> Vale 6 meses y se puede usar en varias compras
            </li>
            <li>
              <CreditCard /> Pagás con crédito, débito o dinero en cuenta
            </li>
          </ul>
          <a className="btn btn-lg" href="#armala" data-reveal style={d(".6s")}>
            Armar la mía <ArrowDown />
          </a>
        </div>
        <div className="gh-stage" aria-hidden="true">
          <GiftcardCard className="back" design="rosa" amountCents={35_000_00} toName="Emma" logoSize={22} />
          <GiftcardCard className="front" design="cacao" amountCents={20_000_00} toName="Olivia" />
          <span className="hand note">llega con tu mensaje ♡</span>
        </div>
      </section>

      <section className="bg-linen hem-top hem-bottom section" id="armala">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">En cuatro pasos</span>
              <h2 className="display h2" style={{ marginTop: 14 }}>
                Armá tu <em>gift card</em>
              </h2>
            </div>
          </div>
          <GiftcardBuilder />
        </div>
      </section>

      <section className="section wrap">
        <div className="section-head" style={{ justifyContent: "center", textAlign: "center" }}>
          <div>
            <span className="eyebrow">Cómo funciona</span>
            <h2 className="display h2" style={{ marginTop: 14 }}>
              Simple, como <em>debe ser</em>
            </h2>
          </div>
        </div>
        <div className="how">
          <div data-reveal>
            <Gift />
            <b>La armás y pagás</b>
            <p>Elegís diseño, monto y mensaje. Pagás con Mercado Pago sin salir de la web.</p>
          </div>
          <div data-reveal style={d(".12s")}>
            <Send />
            <b>Le llega con un código</b>
            <p>Por WhatsApp o mail, cuando vos digas. Con tu mensaje y su código único.</p>
          </div>
          <div data-reveal style={d(".24s")}>
            <Shirt />
            <b>Elige lo que le queda</b>
            <p>Carga el código en el checkout. Si sobra saldo, le queda para la próxima.</p>
          </div>
        </div>
      </section>

      <section className="wrap bal-faq" style={{ paddingBottom: "clamp(64px,8vw,120px)" }}>
        <BalanceCheck />
        <div className="faq">
          {faq(exchangeDays).map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>
                {q} <Plus />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
