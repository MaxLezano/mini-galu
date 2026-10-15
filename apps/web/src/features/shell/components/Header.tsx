"use client";

import { ChevronDown, Menu, Search, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type AccountMenuSummary, accountMenuSummary } from "@/features/account/account-menu";
import { useAccount } from "@/features/account/account-store";
import { cartCount, useCart } from "@/features/cart/cart-store";
import { useFavorites } from "@/features/favorites/favorites-store";
import { accountApi } from "@/lib/account-api";
import { useMounted } from "@/lib/use-mounted";
import { launchCountLabel, useShellData } from "../shell-context";
import { useUi } from "../ui-store";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import { MegaMenu } from "./MegaMenu";

export function Header() {
  const pathname = usePathname();
  const account = useAccount();
  const router = useRouter();
  const over = pathname === "/";
  const { launch } = useShellData();
  const mounted = useMounted();
  const count = cartCount(useCart((s) => s.lines));
  const { menuOpen, setMenu, setSearch, setDrawer } = useUi();
  const [solid, setSolid] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [pop, setPop] = useState<"track" | "user" | null>(null);
  const [summary, setSummary] = useState<AccountMenuSummary | null>(null);
  const favorites = useFavorites((s) => s.slugs.length);
  const itemRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const days = mounted ? launchCountLabel(launch) : null;

  useEffect(() => {
    const onScroll = () => setSolid(scrollY > 40);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // se cierra todo al navegar
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname es el disparador
  useEffect(() => {
    setMegaOpen(false);
    setPop(null);
    setMenu(false);
  }, [pathname, setMenu]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!itemRef.current?.contains(t)) setMegaOpen(false);
      if (!t.closest(".nav-pop-wrap")) setPop(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        setPop(null);
      }
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // el resumen de la cuenta se pide al abrir el menú (así muestra los pedidos y el saldo al día)
  useEffect(() => {
    if (pop === "user")
      accountApi.overview().then(
        (o) => setSummary(accountMenuSummary(o)),
        () => {},
      );
  }, [pop]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: al cambiar de cuenta se descarta el resumen anterior
  useEffect(() => setSummary(null), [account.user?.id]);

  // mega menú: se abre al pasar el mouse (con un respiro para no parpadear) o tocando en pantallas táctiles
  const hover = () => typeof window !== "undefined" && matchMedia("(hover: hover)").matches;
  const setMegaSoon = (open: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMegaOpen(open), ms);
  };

  const cls = ["site-header", over && "is-over", (solid || menuOpen) && "is-solid", megaOpen && "mega-open"]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={cls} id="site-header">
      <nav className="wrap nav" aria-label="Principal">
        <div className="nav-links">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: el hover solo abre el mega menú; el link también lo abre con teclado */}
          <div
            ref={itemRef}
            className={`nav-item ${megaOpen ? "is-open" : ""}`}
            onMouseEnter={() => hover() && setMegaSoon(true, 90)}
            onMouseLeave={() => hover() && setMegaSoon(false, 200)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setMegaOpen(false);
            }}
          >
            <Link
              href="/catalogo"
              className="nav-top"
              aria-haspopup="true"
              aria-expanded={megaOpen}
              aria-current={pathname === "/catalogo" ? "page" : undefined}
              onClick={(e) => {
                if (!hover() && !megaOpen) {
                  e.preventDefault();
                  setMegaOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMegaOpen(true);
                  requestAnimationFrame(() => itemRef.current?.querySelector<HTMLAnchorElement>(".mega a")?.focus());
                }
              }}
            >
              Tienda <ChevronDown className="i-sm nav-chev" />
            </Link>
            <MegaMenu onNavigate={() => setMegaOpen(false)} />
          </div>
          <Link href="/catalogo?view=lookbook">Lookbook</Link>
          {launch && (
            <Link href="/#lanzamiento" className="nav-launch">
              Lanzamiento {days && <span className="nav-count">{days}</span>}
            </Link>
          )}
          <Link href="/giftcards" aria-current={pathname === "/giftcards" ? "page" : undefined}>
            Gift cards
          </Link>
        </div>

        <button
          type="button"
          className="icon-btn menu-btn"
          id="menu-btn"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenu(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <Logo />

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn"
            id="search-btn"
            aria-label="Buscar (atajo /)"
            data-tip="Buscar"
            onClick={() => setSearch(true)}
          >
            <Search />
          </button>
          <div className={`nav-pop-wrap hide-m ${pop === "track" ? "is-open" : ""}`}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Seguir mi pedido"
              aria-expanded={pop === "track"}
              data-tip="Seguir mi pedido"
              onClick={() => setPop(pop === "track" ? null : "track")}
            >
              <Truck />
            </button>
            <div className="nav-pop" id="pop-track">
              <b className="pop-title">¿Dónde está mi pedido?</b>
              <p className="muted" style={{ fontSize: 13, margin: "8px 0 12px" }}>
                Con el número que te llegó por mail o WhatsApp.
              </p>
              <form
                className="pop-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = new FormData(e.currentTarget).get("pedido")?.toString().trim().toUpperCase();
                  if (v) router.push(`/seguimiento?pedido=${encodeURIComponent(v)}`);
                  setPop(null);
                }}
              >
                <input
                  className="input"
                  name="pedido"
                  placeholder="Ej. MG-1040"
                  aria-label="Número de pedido"
                  required
                />
                <button type="submit" className="btn btn-sm">
                  Buscar
                </button>
              </form>
            </div>
          </div>
          {account.status === "in" ? (
            <AccountMenu
              open={pop === "user"}
              firstName={account.user?.firstName || account.user?.name || "vos"}
              favorites={mounted ? favorites : 0}
              summary={summary}
              onToggle={() => setPop(pop === "user" ? null : "user")}
              onTab={(e, tab) => {
                setPop(null);
                // en Mi cuenta solo cambia de pestaña (escucha el hash), sin volver a cargar
                if (pathname === "/cuenta") {
                  e.preventDefault();
                  location.hash = tab;
                }
              }}
              onSignOut={async () => {
                setPop(null);
                await account.signOut();
                router.push("/");
              }}
            />
          ) : (
            <Link className="nav-login hide-m" href="/ingresar">
              <UserRound className="i-sm" /> Ingresar
            </Link>
          )}
          <button
            type="button"
            className="icon-btn"
            id="cart-btn"
            aria-label="Abrir bolsa"
            onClick={() => setDrawer(true)}
          >
            <ShoppingBag />
            <span className="badge" id="cart-badge" data-n={mounted ? count : 0}>
              {mounted ? count : 0}
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
