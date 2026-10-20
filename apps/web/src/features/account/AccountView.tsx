"use client";

import {
  type AccountAddress,
  type AccountChild,
  type AccountOverview,
  type ChildInput,
  PasswordSchema,
  type ProductSummary,
  ProfileUpdateSchema,
  toE164AR,
} from "@mini-galu/contracts";
import {
  ArrowRight,
  Baby,
  Gift,
  Heart,
  ListChecks,
  LogOut,
  Package,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ProductCardContainer } from "@/features/catalog/containers/ProductCardContainer";
import { useFavorites } from "@/features/favorites/favorites-store";
import { AccountGiftcards } from "@/features/giftcards/containers/AccountGiftcards";
import { useStoreInfo } from "@/features/shell/shell-context";
import { toast, useUi } from "@/features/shell/ui-store";
import { accountApi } from "@/lib/account-api";
import { ApiRequestError, api } from "@/lib/api";
import { useMounted } from "@/lib/use-mounted";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { useAccount } from "./account-store";
import { memberSince } from "./account-view";
import { AccountOrders } from "./components/AccountOrders";
import { AddressForm } from "./components/AddressForm";
import { CHILD_MODAL, ChildModal } from "./components/ChildModal";
import { NenasGrid } from "./components/NenasGrid";
import { PasswordInput } from "./components/PasswordInput";
import { WishlistPanel } from "./components/WishlistPanel";
import "./account.css";

type Tab = "nenas" | "pedidos" | "favoritos" | "lista" | "giftcards" | "datos";

const TABS: [Tab, string, ReactNode][] = [
  ["nenas", "Mis nenas", <Baby key="i" className="i-sm" />],
  ["pedidos", "Pedidos", <Package key="i" className="i-sm" />],
  ["favoritos", "Favoritos", <Heart key="i" className="i-sm" />],
  ["lista", "Lista de cumple", <ListChecks key="i" className="i-sm" />],
  ["giftcards", "Gift cards", <Gift key="i" className="i-sm" />],
  ["datos", "Mis datos", <UserRound key="i" className="i-sm" />],
];

/** Mi cuenta — design/mockups/cuenta.html */
export function AccountView() {
  const router = useRouter();
  const info = useStoreInfo();
  const mounted = useMounted();
  const status = useAccount((s) => s.status);
  const signOut = useAccount((s) => s.signOut);
  const favSlugs = useFavorites((s) => s.slugs);
  const { openModal, closeModal } = useUi();
  const [data, setData] = useState<AccountOverview | null>(null);
  const [tab, setTab] = useState<Tab>("nenas");
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [editingChild, setEditingChild] = useState<AccountChild | null>(null);
  const [editingAddr, setEditingAddr] = useState<AccountAddress | "nueva" | null>(null);
  const [busy, setBusy] = useState(false);
  const [wishFor, setWishFor] = useState<string | null>(null);

  const reload = useCallback(() => accountApi.overview().then(setData), []);

  useEffect(() => {
    if (status === "guest") router.replace("/ingresar?volver=/cuenta");
    if (status === "in") reload().catch(() => router.replace("/ingresar?volver=/cuenta"));
  }, [status, router, reload]);
  useEffect(() => {
    api.products().then(setProducts, () => {});
  }, []);
  // pestañas por hash (#pedidos), como el mockup
  useEffect(() => {
    const read = () => {
      const t = location.hash.slice(1) as Tab;
      setTab(TABS.some(([k]) => k === t) ? t : "nenas");
    };
    read();
    // al volver del modo lista del catálogo (/cuenta?nena=…#lista) queda elegida esa nena
    const nena = new URLSearchParams(location.search).get("nena");
    if (nena) setWishFor(nena);
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      return true;
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar, probá de nuevo");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data)
    return (
      <main className="wrap acc">
        <p className="muted">Cargando tu cuenta…</p>
      </main>
    );

  const p = data.profile;
  const first = data.children.find((c) => c.size);
  const forFirst = first
    ? products.filter((x) => x.variants.some((v) => v.size === first.size && v.stock > 0)).slice(0, 4)
    : [];
  const favs = products.filter((x) => favSlugs.includes(x.slug));

  const panel = (key: Tab, node: ReactNode) => (
    <section className={`panel ${tab === key ? "is-on" : ""}`} id={`p-${key}`} hidden={tab !== key}>
      {node}
    </section>
  );

  return (
    <main className="wrap acc">
      <aside className="side">
        <div className="me">
          <span className="av">{(p.firstName || p.email)[0]?.toUpperCase()}</span>
          <div>
            <b>
              {p.firstName} {p.lastName}
            </b>
            <small>Cliente desde {memberSince(p.createdAt)}</small>
          </div>
        </div>
        <nav aria-label="Mi cuenta">
          {TABS.map(([k, label, icon]) => (
            <a key={k} href={`#${k}`} aria-current={tab === k}>
              {icon}
              {label}
              {k === "pedidos" && data.orders.length > 0 && <span className="count">{data.orders.length}</span>}
              {k === "favoritos" && favs.length > 0 && <span className="count">{favs.length}</span>}
            </a>
          ))}
          <a
            href="/"
            onClick={async (e) => {
              e.preventDefault();
              await signOut();
              router.push("/");
            }}
          >
            <LogOut className="i-sm" />
            Salir
          </a>
        </nav>
      </aside>

      <div>
        {panel(
          "nenas",
          <>
            <div className="panel-head">
              <span className="eyebrow is-in">Mis nenas</span>
              <h1 className="display h2">
                Para <em>quién</em> compramos
              </h1>
              <p className="lead" style={{ margin: 0 }}>
                Guardá el talle y el cumple de cada una: el catálogo te muestra lo que les queda y te avisamos antes del
                cumple.
              </p>
            </div>
            <NenasGrid
              nenas={data.children}
              now={mounted ? new Date() : null}
              onAdd={() => {
                setEditingChild(null);
                openModal(CHILD_MODAL);
              }}
              onEdit={(c) => {
                setEditingChild(c);
                openModal(CHILD_MODAL);
              }}
              onRemove={(c) => run(() => accountApi.deleteChild(c.id).then(reload), `Quitamos a ${c.name}`)}
            />
            {first && (
              <>
                <div className="section-head" style={{ marginBottom: 24 }}>
                  <h2 className="display h3" style={{ margin: 0 }}>
                    Le quedan a <em>{first.name}</em> · talle {first.size}
                  </h2>
                  <Link className="link" href={`/catalogo?talle=${first.size}`}>
                    Ver todo <ArrowRight className="i-sm" />
                  </Link>
                </div>
                <div className="grid4">
                  {forFirst.length ? (
                    forFirst.map((x, i) => <ProductCardContainer key={x.slug} product={x} index={i} reveal={false} />)
                  ) : (
                    <p className="muted" style={{ gridColumn: "1/-1" }}>
                      Ahora no hay prendas en talle {first.size}. Anotate en la prenda que te guste y te avisamos.
                    </p>
                  )}
                </div>
              </>
            )}
          </>,
        )}

        {panel(
          "pedidos",
          <>
            <div className="panel-head">
              <span className="eyebrow is-in">Pedidos</span>
              <h1 className="display h2">
                Tus <em>pedidos</em>
              </h1>
            </div>
            <AccountOrders orders={data.orders} />
          </>,
        )}

        {panel(
          "favoritos",
          <>
            <div className="panel-head">
              <span className="eyebrow is-in">Favoritos</span>
              <h1 className="display h2">
                Lo que te <em>enamoró</em>
              </h1>
            </div>
            <div className="grid4" id="favs">
              {favs.length ? (
                favs.map((x, i) => <ProductCardContainer key={x.slug} product={x} index={i} reveal={false} />)
              ) : (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  <Embroidery />
                  <div className="hand" style={{ fontSize: 32 }}>
                    Todavía no guardaste nada
                  </div>
                  <p className="muted" style={{ margin: "0 0 8px" }}>
                    Tocá el corazón en cualquier prenda para guardarla acá.
                  </p>
                  <Link className="btn" href="/catalogo">
                    Ver catálogo
                  </Link>
                </div>
              )}
            </div>
          </>,
        )}

        {panel(
          "lista",
          <WishlistPanel
            nenas={data.children}
            selected={data.children.find((c) => c.id === wishFor) ?? data.children[0] ?? null}
            origin={mounted ? location.origin : ""}
            onSelect={setWishFor}
            onRemove={(itemId) => {
              const c = data.children.find((x) => x.id === wishFor) ?? data.children[0];
              if (c) run(() => accountApi.removeWish(c.id, itemId).then(reload), "Quitado de la lista");
            }}
            onAddNena={() => {
              setEditingChild(null);
              openModal(CHILD_MODAL);
            }}
            onCopy={(url) => navigator.clipboard?.writeText(url).then(() => toast("Link copiado"))}
          />,
        )}
        {panel("giftcards", <AccountGiftcards profile={data.profile} cards={data.giftcards} />)}

        {panel(
          "datos",
          <>
            <div className="panel-head">
              <span className="eyebrow is-in">Mis datos</span>
              <h1 className="display h2">
                Tus <em>datos</em>
              </h1>
            </div>
            <form
              className="acc-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const phoneRaw = String(fd.get("phone") ?? "").trim();
                const phone = phoneRaw ? toE164AR(phoneRaw) : null;
                if (phoneRaw && !phone) return toast("Escribí el celular con característica (ej. 11 5555-1234)");
                const r = ProfileUpdateSchema.safeParse({
                  firstName: fd.get("firstName"),
                  lastName: fd.get("lastName"),
                  phone,
                  newsletterOptIn: fd.get("newsletter") === "on",
                });
                if (!r.success) return toast(r.error.issues[0]?.message ?? "Revisá los datos");
                run(() => accountApi.saveProfile(r.data).then(reload), "Datos guardados");
              }}
            >
              <div className="two">
                <div className="field">
                  <label htmlFor="d-first">Nombre</label>
                  <input className="input" id="d-first" name="firstName" defaultValue={p.firstName} />
                </div>
                <div className="field">
                  <label htmlFor="d-last">Apellido</label>
                  <input className="input" id="d-last" name="lastName" defaultValue={p.lastName} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="d-mail">Email</label>
                <input className="input" id="d-mail" value={p.email} readOnly aria-readonly />
                {!p.emailVerified && (
                  <small className="muted" style={{ fontSize: 12.5 }}>
                    Te mandamos un mail para confirmarlo.
                  </small>
                )}
              </div>
              <div className="field">
                <label htmlFor="d-phone">Celular (para avisos de envío)</label>
                <input
                  className="input"
                  id="d-phone"
                  name="phone"
                  inputMode="tel"
                  placeholder="11 5555-1234"
                  defaultValue={p.phone?.replace(/^\+549/, "") ?? ""}
                />
              </div>
              <label className="check">
                <input type="checkbox" name="newsletter" defaultChecked={p.newsletterOptIn} /> Recibir las Cartas del
                taller (1 por mes)
              </label>
              <button type="submit" className="btn" style={{ justifySelf: "start" }} disabled={busy}>
                Guardar cambios
              </button>
            </form>

            <h2 className="acc-sub">Direcciones</h2>
            {data.addresses.map((a) =>
              editingAddr !== "nueva" && editingAddr?.id === a.id ? (
                <AddressForm
                  key={a.id}
                  initial={a}
                  defaultProvince={info.province}
                  busy={busy}
                  onCancel={() => setEditingAddr(null)}
                  onSave={async (v) => {
                    if (await run(() => accountApi.updateAddress(a.id, v).then(reload), "Dirección guardada"))
                      setEditingAddr(null);
                  }}
                />
              ) : (
                <div className="addr" key={a.id}>
                  <div>
                    <b>
                      {a.label}
                      {a.isDefault ? " · por defecto" : ""}
                    </b>
                    <small>
                      {a.street} {a.number}
                      {a.unit ? `, ${a.unit}` : ""} · {a.city}, {a.province} ({a.postalCode})
                    </small>
                  </div>
                  <div className="acts">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Editar ${a.label}`}
                      onClick={() => setEditingAddr(a)}
                    >
                      <Pencil className="i-sm" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Borrar ${a.label}`}
                      onClick={() => run(() => accountApi.deleteAddress(a.id).then(reload), "Dirección borrada")}
                    >
                      <Trash2 className="i-sm" />
                    </button>
                  </div>
                </div>
              ),
            )}
            {editingAddr === "nueva" ? (
              <AddressForm
                initial={null}
                defaultProvince={info.province}
                busy={busy}
                onCancel={() => setEditingAddr(null)}
                onSave={async (v) => {
                  if (await run(() => accountApi.addAddress(v).then(reload), "Dirección guardada"))
                    setEditingAddr(null);
                }}
              />
            ) : (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingAddr("nueva")}>
                <Plus className="i-sm" /> Agregar dirección
              </button>
            )}

            <h2 className="acc-sub">Contraseña</h2>
            <form
              className="acc-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const next = String(fd.get("next"));
                const r = PasswordSchema.safeParse(next);
                if (!r.success) return toast(r.error.issues[0]?.message ?? "Revisá la contraseña");
                if (await run(() => accountApi.changePassword(String(fd.get("current")), next), "Contraseña cambiada"))
                  form.reset();
              }}
            >
              <div className="field">
                <label htmlFor="pw-current">Contraseña actual</label>
                <PasswordInput id="pw-current" name="current" autoComplete="current-password" />
              </div>
              <div className="field">
                <label htmlFor="pw-next">Contraseña nueva</label>
                <PasswordInput id="pw-next" name="next" autoComplete="new-password" rules />
              </div>
              <button type="submit" className="btn btn-ghost" style={{ justifySelf: "start" }} disabled={busy}>
                Cambiar contraseña
              </button>
            </form>
          </>,
        )}
      </div>

      <ChildModal
        editing={editingChild}
        busy={busy}
        onSave={async (c: ChildInput) => {
          const ok = await run(
            () => (editingChild ? accountApi.updateChild(editingChild.id, c) : accountApi.addChild(c)).then(reload),
            editingChild ? `Guardamos a ${c.name}` : `Agregamos a ${c.name}`,
          );
          if (ok) closeModal();
        }}
      />
    </main>
  );
}
