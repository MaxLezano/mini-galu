import type {
  AdminCoupon,
  AdminGiftcards,
  AdminHome,
  AdminLaunch,
  AdminNewsletter,
  AdminPayments,
  AdminShipping,
  HelpPage,
  StorePolicies,
} from "@mini-galu/contracts";
import Link from "next/link";
import { launchWhen } from "@/lib/date";
import { CouponsEditor } from "./CouponsEditor";
import { GiftcardsBox } from "./GiftcardsBox";
import { HelpEditor } from "./HelpEditor";
import { HeroEditor } from "./HeroEditor";
import { NewsletterEditor } from "./NewsletterEditor";
import { PaymentsEditor } from "./PaymentsEditor";
import { PoliciesEditor } from "./PoliciesEditor";
import { ShippingEditor } from "./ShippingEditor";
import "./store.css";

/** Tienda y pagos — design/mockups/admin-tienda.html */
type Props = {
  home: AdminHome;
  next: AdminLaunch | null;
  payments: AdminPayments;
  shipping: AdminShipping;
  coupons: AdminCoupon[];
  newsletter: AdminNewsletter;
  giftcards: AdminGiftcards;
  help: HelpPage[];
  policies: StorePolicies;
  email: string;
};

export function StoreSettings({
  home,
  next,
  payments,
  shipping,
  coupons,
  newsletter,
  giftcards,
  help,
  policies,
  email,
}: Props) {
  return (
    <main className="adm-content">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Ajustes</span>
          <h1 className="display">
            Tienda y <em>pagos</em>
          </h1>
        </div>
      </div>

      {/* dos columnas que apilan cada una sus cajas (las alturas son muy distintas: una grilla deja huecos) */}
      <div className="set-grid">
        <div className="set-col">
          <PaymentsEditor initial={payments} />
          <PoliciesEditor
            initial={policies}
            andreani={shipping.andreani.mode !== "simulado"}
            helpEdited={help.some(
              (h) => (h.topic === "cambios" || h.topic === "envios-y-pagos") && h.updatedAt !== null,
            )}
          />
          <CouponsEditor initial={coupons} />
          <GiftcardsBox data={giftcards} />
          <HelpEditor initial={help} />
        </div>
        <div className="set-col">
          <ShippingEditor initial={shipping} />
          <HeroEditor initial={home} />
          <section className="box" id="lanzamiento">
            <div className="box-head">
              <h2>Lanzamientos</h2>
              {next && <span className="pill-status st-warn">Próximo: {launchWhen(next.startsAt)}</span>}
            </div>
            <div className="stack">
              {next ? (
                <div className="launch-prev">
                  {next.coverUrl ? <img src={next.coverUrl} alt="" /> : <span />}
                  <div>
                    <span className="eyebrow is-in" style={{ color: "var(--rosa)" }}>
                      {next.showCountdown ? "Así se ve en la home" : "No se muestra en la home"}
                    </span>
                    <p className="display h3" style={{ margin: "6px 0 0" }}>
                      {next.title}
                    </p>
                    <span style={{ fontSize: 12.5, opacity: 0.8 }}>
                      {launchWhen(next.startsAt)} · {next.signups} anotados
                    </span>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No hay lanzamientos programados.
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn btn-sm" href="/taller/lanzamientos">
                  Editar lanzamientos
                </Link>
                <Link className="btn btn-sm btn-ghost" href="/taller/lanzamientos?nuevo">
                  + Nuevo lanzamiento
                </Link>
              </div>
            </div>
          </section>
          <NewsletterEditor initial={newsletter} email={email} />
        </div>
      </div>
    </main>
  );
}
