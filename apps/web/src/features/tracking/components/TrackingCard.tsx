import { formatARS, imageThumb, ORDER_STATUSES, type PublicTracking } from "@mini-galu/contracts";
import { ExternalLink, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { shortDate } from "@/lib/date";
import { SITE } from "@/lib/site";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { handNote, headline } from "../tracking-view";
import { Journey } from "./Journey";

/** Tarjeta del pedido encontrado — seguimiento.html → render(). */
export function TrackingCard({ t, onAskGalu }: { t: PublicTracking; onAskGalu: () => void }) {
  const st = ORDER_STATUSES[t.status];
  const [pre, em, post] = headline(t.status, t.shippingMethod);
  const pickup = t.shippingMethod === "taller";
  const waiting = t.status === "esperando_pago";

  return (
    <article className="tr-card">
      <div className="tr-top hem-bottom">
        <div>
          <span className={`pill-status ${st.tone}`}>{st.short}</span>
          <p className="display eta">
            {pre}
            <em>{em}</em>
            {post}
          </p>
          <p className="muted" style={{ margin: "10px 0 0" }}>
            Pedido <b>#{t.number}</b> · {t.paidAt ? "pagado" : "creado"} el {shortDate(t.paidAt ?? t.createdAt)} ·{" "}
            {formatARS(t.totalCents)}
          </p>
        </div>
        <span className="hand">{handNote(t.status, t.shippingMethod)}</span>
      </div>

      <Journey stops={t.stops} method={t.shippingMethod} />

      <div className="tr-body">
        <div>
          <div className="row">
            <h2 className="display h3" style={{ margin: 0 }}>
              Recorrido
            </h2>
            {t.shipment && <span className="carrier">ANDREANI</span>}
          </div>
          <ul className="log">
            {t.log.map((l) => (
              <li key={`${l.at}-${l.title}`}>
                <b>{l.title}</b>
                <small>{l.detail}</small>
              </li>
            ))}
          </ul>
          {waiting && (
            <div className="pending-pay">
              <b>Te falta pagar {formatARS(t.totalCents)}</b>
              <span className="muted" style={{ fontSize: 13.5 }}>
                Podés pagar con tarjeta de crédito, débito o dinero en cuenta de Mercado Pago
                {t.payUrl ? "." : ", desde el link que te mandamos por mail o WhatsApp."}
              </span>
              {t.payUrl && (
                <a className="btn" href={t.payUrl}>
                  <BrandIcon name="mercadopago" className="i-sm" /> Pagar ahora
                </a>
              )}
            </div>
          )}
        </div>
        <div>
          {/* TODO(fase 6 · automations): interruptor de avisos por WhatsApp (whatsappOptIn del pedido) */}
          <h2 className="display h3" style={{ margin: 0 }}>
            En el paquete
          </h2>
          <div className="pkg">
            {t.items.map((i) => (
              <Link key={`${i.slug}-${i.size}`} href={`/producto/${i.slug}`}>
                {i.imageUrl && <img src={imageThumb(i.imageUrl)} alt="" />}
                <span>
                  <b>{i.name}</b>
                  <br />
                  <span className="muted">
                    Talle {i.size}
                    {i.qty > 1 ? ` · x${i.qty}` : ""}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="kv">
            <div>
              <span>{pickup ? "Retiro en" : "Entrega en"}</span>
              {t.destination}
            </div>
            {t.shipment && (
              <div>
                <span>Nº Andreani</span>
                <b>{t.shipment.trackingNumber}</b>
              </div>
            )}
            <div>
              <span>Recibe</span>
              {t.recipient}
            </div>
          </div>
          <div className="actions">
            {t.shipment?.url && (
              <a className="btn btn-ghost btn-block" href={t.shipment.url} target="_blank" rel="noopener">
                Ver en Andreani <ExternalLink className="i-sm" />
              </a>
            )}
            <button type="button" className="btn btn-rose btn-block" onClick={onAskGalu}>
              <MessageCircleHeart className="i-sm" /> Preguntarle a Galú
            </button>
            <a
              className="link"
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener"
              style={{ justifySelf: "center", fontSize: 13, marginTop: 6 }}
            >
              <BrandIcon name="whatsapp" className="i-sm" /> Escribirle a Gaby
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
