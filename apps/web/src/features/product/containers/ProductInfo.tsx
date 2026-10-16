"use client";

import {
  type ContactChannel,
  discountPercent,
  formatARS,
  installmentsLabel,
  type ProductDetail,
  qualifiesForFreeShipping,
  type Size,
  type StorePolicies,
  sizeAge,
  zoneQuote,
} from "@mini-galu/contracts";
import {
  Bell,
  BellRing,
  ChevronDown,
  CreditCard,
  Heart,
  ListChecks,
  MapPin,
  RefreshCcw,
  Ruler,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/features/account/account-store";
import { contextSuggestions } from "@/features/assistant/galu-engine";
import { cartTotal, useCart } from "@/features/cart/cart-store";
import { useAddToCart } from "@/features/cart/use-add-to-cart";
import { useInstallmentPlan } from "@/features/checkout/installments-store";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/use-toggle-favorite";
import { useShellData } from "@/features/shell/shell-context";
import { toast, useUi } from "@/features/shell/ui-store";
import { WISH_PICK_MODAL, WishPickModal } from "@/features/wishlist/WishPickModal";
import { ApiRequestError, api } from "@/lib/api";
import { longDate } from "@/lib/date";
import { sizesIn, splitLastWord, stockOf } from "@/lib/product";
import { SITE } from "@/lib/site";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Foco } from "@/ui/atoms/Foco";
import { Stars } from "@/ui/atoms/Stars";
import { Modal } from "@/ui/organisms/Modal";
import { formatMeasures, recommendSize } from "../size-advisor";

type Quote = { label: string; detail: string; cents: number | null }[];

/**
 * Estimación con la tabla por zona del panel (las mismas tarifas que usa el checkout sin Andreani; con Andreani
 * conectado, el checkout cotiza con Andreani). Solo las formas de entrega prendidas.
 */
function estimateShipping(policies: StorePolicies, cp: string, subtotalCents: number): Quote {
  const q = zoneQuote(policies, cp);
  const free = qualifiesForFreeShipping(policies, subtotalCents);
  const { methods } = policies;
  return [
    methods.domicilio && {
      label: "Andreani a domicilio",
      detail: q.domicilio.detail,
      cents: free ? 0 : q.domicilio.cents,
    },
    methods.sucursal && {
      label: "Andreani a sucursal",
      detail: "Retirás en la sucursal más cercana",
      cents: free ? 0 : q.sucursal.cents,
    },
    methods.taller && { label: "Retiro en el taller", detail: `${SITE.workshop} · elegís día y horario`, cents: 0 },
  ].filter((o) => o !== false);
}

/** "Envíos a todo el país con Andreani (domicilio o sucursal) o retiro gratis por el taller." según lo prendido. */
function shippingText({ methods }: StorePolicies): string {
  const how = [methods.domicilio && "domicilio", methods.sucursal && "sucursal"].filter(Boolean).join(" o ");
  if (!how) return `Retiro gratis por el taller de ${SITE.workshop}.`;
  return `Envíos a todo el país con Andreani (${how})${methods.taller ? " o retiro gratis por el taller" : ""}.`;
}

/** Columna de compra de la ficha (mockup producto.html → .info). */
export function ProductInfo({ product: p, launchAt }: { product: ProductDetail; launchAt: string | null }) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const toggleFav = useToggleFavorite();
  const isFav = useIsFavorite(p.slug);
  const lines = useCart((s) => s.lines);
  const { policies } = useShellData();
  const shipped = policies.methods.domicilio || policies.methods.sucursal;
  const plan = useInstallmentPlan(p.priceCents);
  const cuotas = plan ? installmentsLabel(plan, p.priceCents, formatARS) : null;
  const { openModal, closeModal, openGalu } = useUi();
  const draft = p.status === "draft";
  const only = p.variants.length === 1 && sizesIn(p).length === 1 ? sizesIn(p)[0] : undefined;
  const [size, setSize] = useState<Size | null>(only ?? null);
  const [notifySize, setNotifySize] = useState<Size | null>(null);
  const [channel, setChannel] = useState<ContactChannel>("whatsapp");
  const [age, setAge] = useState(5);
  const [height, setHeight] = useState(112);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [mbar, setMbar] = useState(false);
  const sizesRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const off = discountPercent(p.priceCents, p.compareAtCents);
  const rec = recommendSize(age, height);
  const recStock = stockOf(p, rec);
  const [head, last] = splitLastWord(p.name);

  // tabla de medidas abierta si llegan con #medidas
  useEffect(() => {
    if (location.hash === "#medidas") {
      const d = document.getElementById("medidas") as HTMLDetailsElement | null;
      if (d) {
        d.open = true;
        setTimeout(() => d.scrollIntoView({ block: "center" }), 300);
      }
    }
  }, []);

  // barra fija en celular cuando el botón principal sale de pantalla
  useEffect(() => {
    const el = addRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setMbar(!!e && !e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    document.body.classList.toggle("has-mbar", mbar);
    return () => document.body.classList.remove("has-mbar");
  }, [mbar]);

  const add = () => {
    if (!size) {
      toast("Elegí un talle primero", { icon: <Ruler className="i-sm" /> });
      sizesRef.current?.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-8px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(0)" },
        ],
        {
          duration: 350,
        },
      );
      sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    addToCart(p, size, {
      open: true,
      from: document.querySelector<HTMLImageElement>(".gallery .swiper-slide-active img, .gallery img"),
    });
  };

  const askNotify = (s: Size | null) => {
    setNotifySize(s);
    openModal("m-notify");
  };

  const notifyText = draft ? (
    <>
      Cuando salga el <b>{p.name}</b> te escribimos una hora antes que en Instagram.
    </>
  ) : (
    <>
      Cuando vuelva el <b>talle {notifySize}</b> del {p.name} te escribimos.
    </>
  );

  return (
    <div className="info">
      <div>
        <span className="eyebrow">{p.collection.name}</span>
        <h1 className="display">
          {head}
          <em>{last}</em>
        </h1>
        {p.rating.count > 0 && (
          <a className="rating-link" href="#resenas">
            <Stars /> {String(p.rating.average).replace(".", ",")} · {p.rating.count} reseñas
          </a>
        )}
      </div>
      <div className="p-price">
        <b>{formatARS(p.priceCents)}</b>
        {off && p.compareAtCents && (
          <>
            <s>{formatARS(p.compareAtCents)}</s>
            <span className="label-tag is-sale">-{off}%</span>
          </>
        )}
        {cuotas && (
          <span className="cuotas">
            <BrandIcon name="mercadopago" /> {cuotas}
          </span>
        )}
      </div>
      <p className="lead" style={{ margin: 0 }}>
        {p.description}
      </p>

      {draft ? (
        <div className="soon-box">
          <b>
            Este modelo sale con el lanzamiento {p.collection.name}
            {launchAt ? `, el ${longDate(launchAt)}` : ""}.
          </b>
          <div className="buy">
            <button type="button" className="btn" onClick={() => askNotify(null)}>
              Avisame cuando salga <BellRing />
            </button>
            {/* en el adelanto el favorito va a la cuenta (así el taller lo cuenta): sin sesión, a ingresar y vuelve */}
            <button
              type="button"
              className={`fav-big fav ${isFav ? "is-on" : ""}`}
              aria-label="Guardar en favoritos"
              aria-pressed={isFav}
              onClick={async (e) => {
                const el = e.currentTarget;
                if (await useAccount.getState().signedIn()) toggleFav(p.slug, el);
                else router.push(`/ingresar?volver=${encodeURIComponent(`/producto/${p.slug}`)}`);
              }}
            >
              <Heart />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="sizes-head">
              <b>
                Talle{" "}
                <span className="muted">
                  {size ? `· ${size}${/^\d+$/.test(size) ? ` (${size} años aprox.)` : ""}` : ""}
                </span>
              </b>
              <button type="button" className="link" style={{ fontSize: 13 }} onClick={() => openModal("m-calc")}>
                <Ruler className="i-sm" /> ¿Qué talle elijo?
              </button>
            </div>
            <div className="sizes" role="radiogroup" aria-label="Talle" ref={sizesRef}>
              {p.variants.map((v) => {
                const cls = v.stock === 0 ? "is-out" : v.stock <= 1 ? "is-low" : "";
                return (
                  <button
                    key={v.size}
                    type="button"
                    className={`size ${cls}`}
                    role="radio"
                    aria-checked={size === v.size}
                    aria-label={`Talle ${v.size}, ${v.stock ? `${v.stock} en stock` : "sin stock"}`}
                    onClick={() => (v.stock === 0 ? askNotify(v.size) : setSize(v.size))}
                  >
                    <b>{v.size}</b>
                    <small>
                      {v.stock === 0 ? (
                        <>
                          <Bell className="i-sm" /> Avisame
                        </>
                      ) : v.stock === 1 ? (
                        "¡Última!"
                      ) : v.stock <= 2 ? (
                        `Quedan ${v.stock}`
                      ) : (
                        "Disponible"
                      )}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="buy">
            <button type="button" className="btn btn-lg" ref={addRef} onClick={add}>
              Agregar a la bolsa <ShoppingBag />
            </button>
            <button
              type="button"
              className={`fav-big fav ${isFav ? "is-on" : ""}`}
              aria-label="Guardar en favoritos"
              aria-pressed={isFav}
              onClick={(e) => toggleFav(p.slug, e.currentTarget)}
            >
              <Heart />
            </button>
          </div>
          {/* la lista de cumple necesita cuenta: sin sesión, a ingresar y vuelve */}
          <button
            type="button"
            className="link wish-link"
            onClick={async () =>
              (await useAccount.getState().signedIn())
                ? openModal(WISH_PICK_MODAL)
                : router.push(`/ingresar?volver=${encodeURIComponent(`/producto/${p.slug}`)}`)
            }
          >
            <ListChecks className="i-sm" /> Sumar a una lista de cumple
          </button>
        </>
      )}

      <div className="trust">
        <div>
          <Truck />
          <span>{shipped ? "Envíos Andreani a todo el país" : `Retiro gratis en el taller de ${SITE.workshop}`}</span>
        </div>
        <div>
          <CreditCard />
          <span>Crédito, débito o dinero en cuenta</span>
        </div>
        <div>
          <RefreshCcw />
          <span>{policies.exchangeDays} días para cambiar talle</span>
        </div>
      </div>

      {shipped && (
        <div className="ship">
          <div className="row">
            <b style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <MapPin className="i-sm" /> Calculá tu envío
            </b>
            <span className="muted" style={{ fontSize: 12 }}>
              Andreani
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cp = String(new FormData(e.currentTarget).get("cp") ?? "").trim() || "1414";
              setQuote(estimateShipping(policies, cp, cartTotal(lines) + p.priceCents));
            }}
          >
            <input
              className="input"
              name="cp"
              inputMode="numeric"
              maxLength={4}
              placeholder="Código postal (ej. 1414)"
              aria-label="Código postal"
            />
            <button type="submit" className="btn btn-sm">
              Calcular
            </button>
          </form>
          <div className="ship-res">
            {quote?.map((o) => (
              <div key={o.label}>
                <span>
                  <b>{o.label}</b>
                  <small>{o.detail}</small>
                </span>
                <b>{o.cents ? formatARS(o.cents) : "Gratis"}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ask">
        <div className="bg-bow">
          <Foco />
        </div>
        <p className="display" style={{ margin: 0 }}>
          ¿Dudas con este modelo? <em>Preguntale a Galú</em>
        </p>
        <div className="chips">
          {contextSuggestions(p).map((q) => (
            <button key={q} type="button" className="chip" onClick={() => openGalu(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <details open>
          <summary>
            Detalles <ChevronDown />
          </summary>
          <div>
            <p style={{ marginTop: 0 }}>{p.description}</p>
            <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 4 }}>
              <li>Diseño propio Mini Galú (marca registrada)</li>
              <li>Bordado a mano en el taller</li>
              <li>Color: {p.color.name}</li>
            </ul>
          </div>
        </details>
        <details id="medidas">
          <summary>
            Tabla de medidas <ChevronDown />
          </summary>
          <div>
            <div className="tbl-wrap">
              <table className="meas">
                <thead>
                  <tr>
                    <th>Talle</th>
                    <th>Medidas</th>
                    <th>Edad aprox.</th>
                  </tr>
                </thead>
                <tbody>
                  {p.variants.map((v) => (
                    <tr key={v.size} className={v.size === size ? "is-sel" : ""}>
                      <td>{v.size}</td>
                      <td>{formatMeasures(v.measures)}</td>
                      <td>{sizeAge(v.size)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12.5, marginBottom: 0 }}>
              Medidas en cm, tomadas con la prenda apoyada. Si está entre dos talles, elegí el más grande.
            </p>
          </div>
        </details>
        <details>
          <summary>
            Tela y cuidados <ChevronDown />
          </summary>
          <div>
            <b style={{ color: "var(--cacao)" }}>{p.fabric}.</b> {p.care}
          </div>
        </details>
        <details>
          <summary>
            Envíos, cambios y pagos <ChevronDown />
          </summary>
          <div>
            {shippingText(policies)} Cambios de talle dentro de los {policies.exchangeDays} días. Pagás con Mercado Pago
            sin salir de la web: tarjeta de crédito (hasta 6 cuotas sin interés), débito o dinero en cuenta.
          </div>
        </details>
      </div>

      {!draft && (
        <div className={`mbar ${mbar ? "is-on" : ""}`}>
          <div>
            <b>{formatARS(p.priceCents)}</b>
            <div className="muted" style={{ fontSize: 12 }}>
              {size ? `Talle ${size}` : "Elegí un talle"}
            </div>
          </div>
          <button type="button" className="btn" onClick={add}>
            Agregar a la bolsa
          </button>
        </div>
      )}

      <WishPickModal product={p} size={size} />
      <Modal
        id="m-calc"
        label="¿Qué talle elijo?"
        title={
          <>
            ¿Qué talle <em>elijo</em>?
          </>
        }
      >
        <div className="modal-body">
          <p className="muted" style={{ margin: 0 }}>
            Contanos la edad y la altura. Comparamos con la tabla de medidas de este modelo.
          </p>
          <div className="calc">
            <div className="field">
              <label htmlFor="c-age">Edad</label>
              <select className="input" id="c-age" value={age} onChange={(e) => setAge(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((a) => (
                  <option key={a} value={a}>
                    {a} {a === 1 ? "año" : "años"}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-h">Altura (cm)</label>
              <input
                className="input"
                id="c-h"
                type="number"
                inputMode="numeric"
                min={70}
                max={150}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="calc-res">
            <span className="muted" style={{ fontSize: 13 }}>
              Te recomendamos
            </span>
            <span className="big">
              Talle <em>{rec}</em>
            </span>
            <span style={{ fontSize: 13.5 }}>
              {p.variants.find((v) => v.size === rec)
                ? `${formatMeasures(p.variants.find((v) => v.size === rec)?.measures)} · `
                : ""}
              {recStock ? (
                <b style={{ color: "var(--salvia-d)" }}>{recStock} en stock</b>
              ) : (
                <b style={{ color: "var(--rojo)" }}>sin stock en este modelo</b>
              )}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              closeModal();
              if (recStock) {
                setSize(rec);
                toast(`Elegiste el talle ${rec}`);
              } else if (p.variants.some((v) => v.size === rec)) setTimeout(() => askNotify(rec), 250);
            }}
          >
            {recStock
              ? `Elegir talle ${rec}`
              : p.variants.some((v) => v.size === rec)
                ? `Avisame cuando vuelva el ${rec}`
                : "Entendido"}
          </button>
        </div>
      </Modal>

      <Modal
        id="m-notify"
        label="Avisame cuando vuelva"
        title={
          <>
            Te <em>avisamos</em>
          </>
        }
      >
        <form
          className="modal-body"
          onSubmit={async (e) => {
            e.preventDefault();
            const contact = String(new FormData(e.currentTarget).get("contact") ?? "");
            try {
              const r = await api.joinWaitlist({ slug: p.slug, size: draft ? null : notifySize, channel, contact });
              closeModal();
              toast(
                r.created
                  ? `Te avisamos cuando ${draft ? "salga" : `vuelva el talle ${notifySize}`} · sos la n.º ${r.position}`
                  : "Ya estabas anotada: te avisamos apenas haya",
                { icon: <BellRing className="i-sm" /> },
              );
            } catch (err) {
              toast(err instanceof ApiRequestError ? err.message : "No pudimos anotarte, probá de nuevo");
            }
          }}
        >
          <p className="muted" style={{ margin: 0 }}>
            {notifyText}
          </p>
          <div role="group" aria-label="Avisarme por" style={{ display: "flex", gap: 8 }}>
            {(["whatsapp", "email"] as const).map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={channel === c} onClick={() => setChannel(c)}>
                {c === "whatsapp" ? <BrandIcon name="whatsapp" className="i-sm" /> : null}
                {c === "whatsapp" ? "WhatsApp" : "Email"}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="n-contact">{channel === "whatsapp" ? "WhatsApp" : "Email"}</label>
            <input
              className="input"
              id="n-contact"
              name="contact"
              type={channel === "email" ? "email" : "text"}
              inputMode={channel === "email" ? "email" : "tel"}
              placeholder={channel === "email" ? "tu@email.com" : "11 5555-1234"}
              required
            />
          </div>
          <button type="submit" className="btn btn-block">
            Avisame <BellRing />
          </button>
          <p className="muted" style={{ fontSize: 12, margin: 0, textAlign: "center" }}>
            Te escribimos una sola vez, cuando vuelva.{" "}
            <Link className="link" href="/catalogo">
              Ver otros modelos
            </Link>
          </p>
        </form>
      </Modal>
    </div>
  );
}
