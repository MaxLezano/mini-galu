"use client";

import { GARMENT_SIZES, sizeLabel } from "@mini-galu/contracts";
import { ArrowRight, MessageCircleHeart, Search, Truck, UserRound } from "lucide-react";
import Link from "next/link";
import { useAccount } from "@/features/account/account-store";
import { useMounted } from "@/lib/use-mounted";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { launchCountLabel, useShellData, useStoreInfo } from "../shell-context";
import { useUi } from "../ui-store";

export function MobileNav() {
  const info = useStoreInfo();
  const { products, collections, launch } = useShellData();
  const signedIn = useAccount((s) => s.status === "in");
  const { menuOpen, setMenu, openGalu } = useUi();
  const mounted = useMounted();
  const days = mounted ? launchCountLabel(launch) : null;
  const close = () => setMenu(false);

  return (
    <div className={`mnav ${menuOpen ? "is-open" : ""}`} id="mnav" aria-hidden={!menuOpen}>
      <div className="wrap">
        <form className="mnav-search" action="/catalogo" onSubmit={close}>
          <Search className="i-sm" />
          <input name="q" type="search" placeholder="Buscá “vestido rojo”, “bautismo”…" aria-label="Buscar" />
        </form>
        <Link className="big" href="/catalogo" onClick={close}>
          Todo el taller <small>{products.length}</small>
        </Link>
        {collections
          .filter((c) => c.productCount > 0)
          .map((c) => (
            <Link key={c.slug} className="big" href={`/catalogo?col=${c.slug}`} onClick={close}>
              {c.label} <small>{c.productCount}</small>
            </Link>
          ))}
        <div className="mnav-sizes">
          <span className="eyebrow">Por talle</span>
          <div>
            {GARMENT_SIZES.map((t) => (
              <Link key={t} className="chip" href={`/catalogo?talle=${t}`} onClick={close}>
                {sizeLabel(t)}
              </Link>
            ))}
          </div>
        </div>
        {launch && (
          <Link className="big" href="/#lanzamiento" onClick={close}>
            Lanzamiento {days && <span className="nav-count">{days}</span>}
          </Link>
        )}
        <Link className="big" href="/catalogo?view=lookbook" onClick={close}>
          Lookbook <ArrowRight />
        </Link>
        <Link className="big" href="/giftcards" onClick={close}>
          Gift cards <ArrowRight />
        </Link>
        <div className="mnav-small">
          <Link href="/seguimiento" onClick={close}>
            <Truck className="i-sm" /> Seguir mi pedido
          </Link>
          <Link href={signedIn ? "/cuenta" : "/ingresar"} onClick={close}>
            <UserRound className="i-sm" /> {signedIn ? "Mi cuenta" : "Ingresar o crear cuenta"}
          </Link>
          {/* biome-ignore lint/a11y/useValidAnchor: comparte el estilo de los links del menú */}
          <a
            href="#galu"
            onClick={(e) => {
              e.preventDefault();
              openGalu();
            }}
          >
            <MessageCircleHeart className="i-sm" /> Preguntale a Galú
          </a>
        </div>
        <div className="mnav-foot">
          <a className="btn btn-sm btn-ghost" href={info.whatsapp}>
            <BrandIcon name="whatsapp" className="i-sm" /> WhatsApp
          </a>
          <a className="btn btn-sm btn-ghost" href={info.instagram}>
            <BrandIcon name="instagram" className="i-sm" /> Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
