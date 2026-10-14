"use client";

import { type AdminSession, formatARS } from "@mini-galu/contracts";
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
  ShieldCheck,
  Shirt,
  Store,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { ToastHost } from "@/features/shell/components/ToastHost";
import { adminApi } from "@/lib/admin-api";
import { relativeWhen } from "@/lib/date";
import { Foco } from "@/ui/atoms/Foco";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { OPEN_ORDER } from "./panel-events";
import { navCounts, notices } from "./shell-view";
import { usePanelData } from "./use-panel-data";
import "./shell.css";

type NavItem = { href: string; icon: LucideIcon; label: string; phase?: string; count?: "pedidos" | "stock" };

/** Secciones del panel (mockup admin.js). Las que todavía no existen muestran en qué fase llegan. */
const NAV: [string, NavItem[]][] = [
  [
    "Día a día",
    [
      { href: "/taller", icon: LayoutDashboard, label: "Resumen" },
      { href: "/taller/pedidos", icon: Inbox, label: "Pedidos", count: "pedidos" },
      { href: "/taller/lanzamientos", icon: CalendarHeart, label: "Lanzamientos" },
    ],
  ],
  [
    "Tienda",
    [
      { href: "/taller/productos", icon: Shirt, label: "Productos", count: "stock" },
      { href: "/taller/clientes", icon: Users, label: "Clientes" },
      { href: "/taller/galu", icon: MessageCircleHeart, label: "Galú" },
    ],
  ],
  [
    "Ajustes",
    [
      { href: "/taller/automatizaciones", icon: Workflow, label: "Automatizaciones" },
      { href: "/taller/tienda", icon: Store, label: "Tienda y pagos" },
      { href: "/taller/seguridad", icon: ShieldCheck, label: "Seguridad" },
    ],
  ],
];

/** Armazón del panel del taller (mockup admin.js): menú lateral, barra superior y barra inferior en celular. */
export function AdminShell({ session, children }: { session: AdminSession; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sideOpen, setSideOpen] = useState(false);
  const { orders, products, read, markRead } = usePanelData(pathname);
  const counts = orders && products ? navCounts(orders, products) : { pedidos: 0, stock: 0 };
  const items = orders && products ? notices(orders, products, formatARS) : [];
  // ya en Pedidos se abre el detalle ahí mismo; desde otra pantalla se navega
  const openOrder = (number: string) =>
    pathname === "/taller/pedidos"
      ? window.dispatchEvent(new CustomEvent(OPEN_ORDER, { detail: number }))
      : router.push(`/taller/pedidos?pedido=${number}`);
  const badge = (key: NavItem["count"]) => (key && counts[key] ? <span className="n">{counts[key]}</span> : null);
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

  const link = ({ href, icon: Icon, label, phase, count }: NavItem) =>
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
        {badge(count)}
      </Link>
    );

  return (
    <>
      <div className="adm">
        <aside className={`adm-side ${sideOpen ? "is-open" : ""}`} id="adm-side">
          <Link className="logo" href="/taller">
            <span className="bow">
              <Foco />
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
            <GlobalSearch
              orders={orders}
              products={products}
              onOrder={openOrder}
              onProduct={(slug) => router.push(`/taller/productos?editar=${slug}`)}
            />
            <span className="spacer" />
            <NotificationBell
              items={items}
              read={read}
              when={(iso) => relativeWhen(iso)}
              onGo={(n) => (n.order ? openOrder(n.order) : n.href && router.push(n.href))}
              onReadAll={() => markRead(items.map((n) => n.key))}
            />
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
        {(
          [
            ["/taller", LayoutDashboard, "Resumen", undefined],
            ["/taller/pedidos", Inbox, "Pedidos", "pedidos"],
            ["/taller/lanzamientos", CalendarHeart, "Lanzar", undefined],
            ["/taller/productos", Shirt, "Productos", undefined],
          ] as const
        ).map(([href, Icon, label, count]) => (
          <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>
            <Icon />
            {label}
            {badge(count)}
          </Link>
        ))}
        <button type="button" onClick={() => setSideOpen(true)} aria-label="Más secciones">
          <Menu />
          Más
        </button>
      </nav>
      <ToastHost />
    </>
  );
}
