"use client";

import type { AdminProduct, AdminSession } from "@mini-galu/contracts";
import { formatARS } from "@mini-galu/contracts";
import {
  CalendarHeart,
  ExternalLink,
  Eye,
  Inbox,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  MessageCircleHeart,
  Search,
  Shirt,
  Store,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ToastHost } from "@/features/shell/components/ToastHost";
import { adminApi } from "@/lib/admin-api";
import { cover, stripAccents } from "@/lib/product";
import { Bow } from "@/ui/atoms/Bow";
import "./shell.css";

type NavItem = { href: string; icon: LucideIcon; label: string; phase?: string };

/** Secciones del panel (mockup admin.js). Las que todavía no existen muestran en qué fase llegan. */
const NAV: [string, NavItem[]][] = [
  [
    "Día a día",
    [
      { href: "/taller", icon: LayoutDashboard, label: "Resumen", phase: "Fase 4" },
      { href: "/taller/pedidos", icon: Inbox, label: "Pedidos" },
      { href: "/taller/lanzamientos", icon: CalendarHeart, label: "Lanzamientos" },
    ],
  ],
  [
    "Tienda",
    [
      { href: "/taller/productos", icon: Shirt, label: "Productos" },
      { href: "/taller/clientes", icon: Users, label: "Clientes", phase: "Fase 8" },
      { href: "/taller/galu", icon: MessageCircleHeart, label: "Galú", phase: "Fase 7" },
    ],
  ],
  [
    "Ajustes",
    [
      { href: "/taller/automatizaciones", icon: Workflow, label: "Automatizaciones", phase: "Fase 6" },
      { href: "/taller/tienda", icon: Store, label: "Tienda y pagos" },
    ],
  ],
];

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = () => {
    if (!products) adminApi.products().then(setProducts, () => setProducts([]));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key === "/" && !["input", "textarea", "select"].includes(tag)) {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => !(e.target as Element).closest(".adm-search") && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);
  const term = stripAccents(q.trim());
  const hits = term
    ? (products ?? []).filter((p) => stripAccents(`${p.name} ${p.slug}`).includes(term)).slice(0, 6)
    : [];

  return (
    <div className="adm-search">
      <span>
        <Search className="i-sm" />
      </span>
      <input
        ref={input}
        value={q}
        onFocus={load}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="Buscar prenda…"
        autoComplete="off"
        aria-label="Buscar"
      />
      <kbd>/</kbd>
      <div className={`search-pop ${open && term ? "is-open" : ""}`}>
        {hits.length ? (
          <>
            <h6>Productos</h6>
            {hits.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQ("");
                  router.push(`/taller/productos?editar=${p.slug}`);
                }}
              >
                {p.images[0] && <img src={cover(p)} alt="" />}
                {p.name}
                <span className="muted" style={{ marginLeft: "auto" }}>
                  {formatARS(p.priceCents)}
                </span>
              </button>
            ))}
          </>
        ) : (
          <p className="muted" style={{ padding: 10, margin: 0, fontSize: 13.5 }}>
            {products ? `Sin resultados para “${q}”.` : "Buscando…"}
          </p>
        )}
      </div>
    </div>
  );
}

/** Armazón del panel del taller (mockup admin.js): menú lateral, barra superior y barra inferior en celular. */
export function AdminShell({ session, children }: { session: AdminSession; children: ReactNode }) {
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);
  const current = (href: string) => (href === "/taller" ? pathname === href : pathname.startsWith(href));

  useEffect(() => {
    document.body.classList.add("adm-body");
    return () => document.body.classList.remove("adm-body");
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: cierra el menú al navegar
  useEffect(() => setSideOpen(false), [pathname]);

  const signOut = async () => {
    await adminApi.signOut().catch(() => {});
    window.location.assign("/taller/ingresar");
  };

  const link = ({ href, icon: Icon, label, phase }: NavItem) =>
    phase ? (
      <span key={href} className="nav-soon" title={`Llega en: ${phase}`} aria-disabled="true">
        <Icon className="i-sm" />
        {label}
        <span className="soon">{phase}</span>
      </span>
    ) : (
      <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>
        <Icon className="i-sm" />
        {label}
      </Link>
    );

  return (
    <>
      <div className="adm">
        <aside className={`adm-side ${sideOpen ? "is-open" : ""}`} id="adm-side">
          <Link className="logo" href="/taller/productos">
            <span className="bow">
              <Bow />
            </span>
            Mini Galú<small>taller</small>
          </Link>
          <nav aria-label="Panel">
            {NAV.map(([h, items]) => (
              <div key={h} style={{ display: "contents" }}>
                <h6>{h}</h6>
                {items.map(link)}
              </div>
            ))}
          </nav>
          <div className="who">
            <span className="av">{session.name[0]}</span>
            <div>
              <b>{session.name}</b>
              <br />
              <span style={{ opacity: 0.6 }}>Dueña</span>
            </div>
            <button type="button" onClick={signOut} aria-label="Salir del panel" title="Salir">
              <LogOut className="i-sm" />
            </button>
          </div>
        </aside>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cerrar menú"
          className={`scrim adm-scrim ${sideOpen ? "is-open" : ""}`}
          onClick={() => setSideOpen(false)}
        />
        <div className="adm-main">
          <header className="adm-top">
            <button type="button" className="icon-btn burger" aria-label="Abrir menú" onClick={() => setSideOpen(true)}>
              <Menu />
            </button>
            <GlobalSearch />
            <span className="spacer" />
            <a className="btn btn-sm btn-ghost store-link" href="/" target="_blank" rel="noopener">
              <Eye className="i-sm" />
              <span>Ver tienda</span>
              <ExternalLink className="i-sm" />
            </a>
          </header>
          {children}
        </div>
      </div>
      <nav className="adm-tabbar" aria-label="Accesos rápidos">
        <Link href="/taller/productos" aria-current={current("/taller/productos") ? "page" : undefined}>
          <Shirt />
          Productos
        </Link>
        <a href="/" target="_blank" rel="noopener">
          <Eye />
          Tienda
        </a>
        <button type="button" onClick={() => setSideOpen(true)} aria-label="Más secciones">
          <Menu />
          Más
        </button>
      </nav>
      <ToastHost />
    </>
  );
}
