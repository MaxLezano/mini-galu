"use client";

import { CreditCard, Mail, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApiRequestError, api } from "@/lib/api";
import { SITE } from "@/lib/site";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { useUi } from "../ui-store";
import { Logo } from "./Logo";

export function Footer() {
  const openGalu = useUi((s) => s.openGalu);
  const [subscribed, setSubscribed] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlBusy, setNlBusy] = useState(false);
  return (
    <footer className="site-footer hem-top">
      <div className="wrap footer-grid">
        <div>
          <Logo style={{ color: "var(--linen)" }} />
          <p style={{ opacity: 0.75, maxWidth: "36ch", margin: "22px 0" }}>
            Prendas de diseño para niñas, de 12 meses a talle 10. Cada modelo se corta, se cose y se borda a mano en
            nuestro taller.
          </p>
          <div className="social">
            <a href={SITE.instagram} aria-label="Instagram">
              <BrandIcon name="instagram" />
            </a>
            <a href={SITE.whatsapp} aria-label="WhatsApp">
              <BrandIcon name="whatsapp" />
            </a>
            <a href={`mailto:${SITE.email}`} aria-label="Email">
              <Mail />
            </a>
          </div>
        </div>
        <div>
          <h5>Tienda</h5>
          <ul>
            <li>
              <Link href="/catalogo">Catálogo</Link>
            </li>
            <li>
              <Link href="/catalogo?col=verano-2027">Verano 2027</Link>
            </li>
            <li>
              <Link href="/catalogo?col=fiestas">Fiestas</Link>
            </li>
            <li>
              <Link href="/catalogo?col=accesorios">Accesorios</Link>
            </li>
            <li>
              <Link href="/giftcards">Gift cards</Link>
            </li>
          </ul>
        </div>
        <div>
          <h5>Ayuda</h5>
          <ul>
            <li>
              <Link href="/seguimiento">Seguir mi pedido</Link>
            </li>
            <li>
              <Link href="/producto/cleo#medidas">Guía de talles</Link>
            </li>
            <li>
              <Link href="/ayuda/cambios">Cambios y devoluciones</Link>
            </li>
            <li>
              <Link href="/ayuda/envios-y-pagos">Envíos y pagos</Link>
            </li>
            <li>
              <button type="button" onClick={() => openGalu()} style={{ opacity: 0.82 }}>
                Hablar con Galú
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h5>Cartas del taller</h5>
          <p style={{ opacity: 0.75, fontSize: 14, margin: "0 0 14px" }}>
            Enterate de los lanzamientos antes que en Instagram. Una carta por mes, prometido.
          </p>
          {subscribed ? (
            <span className="hand" style={{ color: "var(--rosa)", fontSize: 26 }}>
              ¡Gracias! Te escribimos pronto.
            </span>
          ) : (
            <form
              className="nl-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const email = String(new FormData(e.currentTarget).get("email") ?? "");
                setNlBusy(true);
                setNlError(null);
                try {
                  await api.subscribe(email);
                  setSubscribed(true);
                } catch (err) {
                  setNlError(err instanceof ApiRequestError ? err.message : "No pudimos sumarte. Probá de nuevo.");
                } finally {
                  setNlBusy(false);
                }
              }}
            >
              <input
                className="input"
                type="email"
                name="email"
                required
                placeholder="tu@email.com"
                aria-label="Email"
              />
              <button type="submit" className="btn btn-light" disabled={nlBusy}>
                Sumarme
              </button>
            </form>
          )}
          {nlError && (
            <p role="alert" style={{ color: "var(--rosa)", fontSize: 13, margin: "8px 0 0" }}>
              {nlError}
            </p>
          )}
        </div>
      </div>
      <div className="wrap">
        <div className="footer-bottom">
          <span className="footer-legal">
            © {new Date().getFullYear()} Mini Galú · Marca registrada · <Link href="/ayuda/terminos">Términos</Link> ·{" "}
            <Link href="/ayuda/privacidad">Privacidad</Link>
          </span>
          <div className="pay-logos">
            <span>
              <BrandIcon name="mercadopago" /> Mercado Pago
            </span>
            <span>
              <CreditCard className="i-sm" /> Crédito y débito
            </span>
            <span>
              <Truck className="i-sm" /> Andreani
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
