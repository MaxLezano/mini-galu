import { formatARS, GARMENT_SIZES, sizeLabel } from "@mini-galu/contracts";
import Link from "next/link";
import { dayMonth } from "@/lib/date";
import { cover } from "@/lib/product";
import { useShellData } from "../shell-context";
import { useUi } from "../ui-store";

const OCC = [
  ["cumple", "Cumple"],
  ["bautismo", "Bautismo"],
  ["casamiento", "Casamiento"],
  ["navidad", "Navidad"],
  ["diario", "Día a día"],
] as const;

/** Mega menú de "Tienda" (mockup app.js → mega()). */
export function MegaMenu({ onNavigate }: { onNavigate: () => void }) {
  const { products, collections, launch } = useShellData();
  const openGalu = useUi((s) => s.openGalu);
  const shop = collections.filter((c) => c.productCount > 0);
  const upcoming = collections.find((c) => c.launchAt);
  const feat = products.filter((p) => p.tag === "Nuevo").slice(0, 2);
  const launchDate = launch ? dayMonth(launch.startsAt) : null;

  return (
    <div className="mega" id="mega-tienda" role="region" aria-label="Tienda">
      <div className="wrap mega-grid">
        <div>
          <h6>Colecciones</h6>
          <ul className="mega-list">
            <li>
              <Link href="/catalogo" onClick={onNavigate}>
                <span>Todo el taller</span>
                <small>{products.length}</small>
              </Link>
            </li>
            {shop.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalogo?col=${c.slug}`} onClick={onNavigate}>
                  <span>{c.label}</span>
                  <small>{c.productCount}</small>
                </Link>
              </li>
            ))}
            {upcoming && launchDate && (
              <li>
                <Link href="/#lanzamiento" onClick={onNavigate}>
                  <span>{upcoming.label}</span>
                  <span className="pill-status st-warn">Sale el {launchDate}</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h6>Por talle</h6>
          <div className="mega-sizes">
            {GARMENT_SIZES.map((t) => (
              <Link key={t} className="chip" href={`/catalogo?talle=${t}`} onClick={onNavigate}>
                {sizeLabel(t)}
              </Link>
            ))}
          </div>
          <h6>Por ocasión</h6>
          <div className="mega-occ">
            {OCC.map(([k, v]) => (
              <Link key={k} href={`/catalogo?ocasion=${k}`} onClick={onNavigate}>
                {v}
              </Link>
            ))}
          </div>
        </div>
        <div className="mega-feat">
          <h6>Recién salidas del taller</h6>
          <div>
            {feat.map((p) => (
              <Link key={p.slug} href={`/producto/${p.slug}`} className="mf-card" onClick={onNavigate}>
                <span className="mf-img">
                  <img src={cover(p)} alt="" loading="lazy" />
                </span>
                <b>{p.name}</b>
                <small>{formatARS(p.priceCents)} · 6 cuotas sin interés</small>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap mega-foot">
        <span className="hand">¿no sabés el talle?</span>
        <button
          type="button"
          className="link"
          onClick={() => {
            onNavigate();
            openGalu();
          }}
        >
          Preguntale a Galú
        </button>
        <i className="dot-sep" />
        <Link className="link" href="/giftcards" onClick={onNavigate}>
          Regalá una gift card
        </Link>
        <i className="dot-sep" />
        <Link className="link" href="/producto/cleo#medidas" onClick={onNavigate}>
          Tabla de medidas
        </Link>
      </div>
    </div>
  );
}
