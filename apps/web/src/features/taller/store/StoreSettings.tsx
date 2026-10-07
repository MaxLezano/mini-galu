import type { AdminHome, AdminLaunch } from "@mini-galu/contracts";
import { CreditCard, Gift, TicketPercent, Truck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { launchWhen } from "@/lib/date";
import { HeroEditor } from "./HeroEditor";
import "./store.css";

function Soon({
  title,
  icon,
  phase,
  children,
}: {
  title: string;
  icon: ReactNode;
  phase: string;
  children: ReactNode;
}) {
  return (
    <section className="box">
      <div className="box-head">
        <h2>{title}</h2>
        <span className="pill-status st-muted">{phase}</span>
      </div>
      <div className="soon-box">
        <b style={{ display: "flex", gap: 8, alignItems: "center" }}>{icon} Todavía no está conectado</b>
        {children}
      </div>
    </section>
  );
}

/** Tienda y pagos — design/mockups/admin-tienda.html */
export function StoreSettings({ home, next }: { home: AdminHome; next: AdminLaunch | null }) {
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

      <div className="set-grid">
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
            </div>
          </div>
        </section>

        <Soon title="Mercado Pago" icon={<CreditCard className="i-sm" />} phase="Fase 3">
          Crédito con cuotas sin interés, débito, dinero en cuenta y links de pago automáticos. Se configura acá cuando
          conectemos la cuenta (primero en modo prueba).
        </Soon>
        <Soon title="Envíos" icon={<Truck className="i-sm" />} phase="Fase 5">
          Andreani a domicilio y a sucursal, retiro en el taller con horarios, envío gratis desde un monto (hoy fijo en
          $90.000) y paquete por defecto.
        </Soon>
        <Soon title="Cupones" icon={<TicketPercent className="i-sm" />} phase="Fase 3">
          Porcentaje, monto fijo o envío gratis; compra mínima, vencimiento, usos y para quién (primera compra, cumple,
          anotados).
        </Soon>
        <Soon title="Gift cards" icon={<Gift className="i-sm" />} phase="Fase 8">
          Vendidas, saldo sin usar y vencimientos de cada tarjeta.
        </Soon>
      </div>
    </main>
  );
}
