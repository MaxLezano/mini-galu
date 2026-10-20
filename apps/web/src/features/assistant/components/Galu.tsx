"use client";

import {
  ASSISTANT_MAX_CHARS,
  type AssistantMessage,
  formatARS,
  imageThumb,
  type ProductSummary,
  type Size,
} from "@mini-galu/contracts";
import { SendHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useAddToCart } from "@/features/cart/use-add-to-cart";
import { useShellData, useStoreInfo } from "@/features/shell/shell-context";
import { useUi } from "@/features/shell/ui-store";
import { ApiRequestError, api } from "@/lib/api";
import { cover, sizesIn, stockOf } from "@/lib/product";
import { Foco } from "@/ui/atoms/Foco";
import {
  answer,
  contextSuggestions,
  DEFAULT_SUGGESTIONS,
  type GaluReply,
  greeting,
  orderNotFound,
  orderReply,
  orderUnavailable,
} from "../galu-engine";
import { boldSegments } from "../galu-sse";
import { askGalu, GaluOffline } from "../galu-stream";
import { replyText } from "../galu-text";
import { orderCodeIn } from "../order-code";

type MsgBody =
  | { role: "me" | "bot" | "typing"; content?: ReactNode }
  /** Respuesta del modelo (llega de a pedazos). */
  | { role: "galu"; text: string }
  | { role: "cards"; products: ProductSummary[]; size?: Size };
type Msg = MsgBody & { id: number };

let mid = 0;

/** El plan real de Mercado Pago para un monto (el mismo endpoint de las tarjetas del catálogo). */
const installmentsFor = (cents: number) =>
  api.installments([cents]).then(
    (plans) => plans[cents] ?? null,
    () => null,
  );

function MiniCard({ p, size, onAdd }: { p: ProductSummary; size?: Size; onAdd: (p: ProductSummary, s: Size) => void }) {
  const s = size && stockOf(p, size) ? size : sizesIn(p)[0];
  const n = s ? stockOf(p, s) : 0;
  return (
    <div className="mini-card">
      <Link href={`/producto/${p.slug}`}>
        <img loading="lazy" src={imageThumb(cover(p))} alt={p.name} />
      </Link>
      <div>
        <b>{p.name}</b>
        <div className="muted">{formatARS(p.priceCents)}</div>
        <div className="stock">
          {s ? `${n === 1 ? "¡Queda 1!" : `${n} en stock`} · talle ${s}` : "Sin stock · avisame"}
        </div>
        {s ? (
          <button type="button" className="btn" onClick={() => onAdd(p, s)}>
            Agregar
          </button>
        ) : (
          <Link className="btn btn-ghost" href={`/producto/${p.slug}`}>
            Ver
          </Link>
        )}
      </div>
    </div>
  );
}

/** Galú: el foco flotante + el panel de chat (mockup app.js → galu). */
export function Galu() {
  const info = useStoreInfo();
  const { products, policies } = useShellData();
  const { galu, openGalu, closeGalu, consumeGaluQuestion } = useUi();
  const pathname = usePathname();
  const addToCart = useAddToCart();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [sugs, setSugs] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  // la charla que viaja a la API (solo texto); sin modelo en la API, Galú responde por reglas toda la sesión
  const history = useRef<AssistantMessage[]>([]);
  const offline = useRef(false);
  // id de la charla (para el panel del taller): uno por apertura de la página
  const conversationId = useRef<string | null>(null);
  // randomUUID solo existe en https o localhost: sin él, la charla no se guarda y Galú responde igual
  const chatId = () =>
    (conversationId.current ??= typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null);
  const input = useRef<HTMLInputElement>(null);
  const ctxSlug = pathname.startsWith("/producto/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : null;
  const ctx = products.find((p) => p.slug === ctxSlug) ?? null;

  // pista "¡Hola! Soy Galú" una vez por sesión, se va sola a los 12 s
  useEffect(() => {
    try {
      if (sessionStorage.getItem("mg-hint") || location.search.includes("static")) return;
    } catch {}
    setHint(true);
    const t = setTimeout(() => setHint(false), 12000);
    return () => clearTimeout(t);
  }, []);

  const push = (m: MsgBody) => setMsgs((l) => [...l, { ...m, id: ++mid }]);

  /** Galú con el modelo (API, por SSE). Si no está disponible antes de escribir nada, avisa con GaluOffline. */
  const askModel = async (q: string, typingId: number) => {
    const chat = [...history.current, { role: "user" as const, text: q }];
    const answerId = ++mid;
    let text = "";
    const chatReq = { messages: chat, productSlug: ctx?.slug, conversationId: chatId() ?? undefined };
    await askGalu(chatReq, (e) => {
      if (e.type === "text") {
        text += e.delta;
        setMsgs((l) =>
          l.some((m) => m.id === answerId)
            ? l.map((m) => (m.id === answerId ? { id: answerId, role: "galu", text } : m))
            : [...l.filter((m) => m.id !== typingId), { id: answerId, role: "galu", text }],
        );
      } else if (e.type === "products") {
        setMsgs((l) => [...l, { id: ++mid, role: "cards", products: e.products, size: e.size ?? undefined }]);
      } else if (e.type === "error" && !text) throw new GaluOffline(e.message);
    });
    if (!text) throw new GaluOffline("respuesta vacía");
    history.current = [...chat, { role: "assistant" as const, text }];
  };

  const reply = async (q: string) => {
    push({ role: "me", content: q });
    const typingId = ++mid;
    setMsgs((l) => [...l, { id: typingId, role: "typing" }]);
    if (!offline.current) {
      try {
        await askModel(q, typingId);
        return;
      } catch (e) {
        if (!(e instanceof GaluOffline)) throw e;
        offline.current = true;
      }
    }
    const code = orderCodeIn(q);
    const [out]: [GaluReply[], unknown] = await Promise.all([
      code
        ? api
            .track(code)
            .then(orderReply, (e: unknown) =>
              e instanceof ApiRequestError && e.status === 404
                ? orderNotFound(code, policies.contact.whatsapp)
                : orderUnavailable(code),
            )
        : answer(q, products, ctx, policies, installmentsFor),
      new Promise((r) => setTimeout(r, 650 + Math.random() * 450)),
    ]);
    const id = chatId();
    const said = replyText(out);
    // si no se pudo guardar, la charla sigue: el panel pierde ese par y nada más
    if (id && said)
      void api
        .galuLog({
          conversationId: id,
          productSlug: ctx?.slug,
          question: q.slice(0, ASSISTANT_MAX_CHARS),
          answer: said.slice(0, 4000),
          unanswered: out.some((r) => r.kind === "text" && r.unanswered),
        })
        .catch(() => {});
    setMsgs((l) => [
      ...l.filter((m) => m.id !== typingId),
      ...out.map((r) =>
        r.kind === "cards"
          ? ({ id: ++mid, role: "cards", products: r.products, size: r.size } as Msg)
          : ({ id: ++mid, role: "bot", content: r.content } as Msg),
      ),
    ]);
  };

  // al abrir: saludo (una vez) y, si viene una pregunta (chips "Preguntale a Galú"), la responde
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo reacciona a abrir/cerrar
  useEffect(() => {
    if (!galu.open) {
      document.body.classList.remove("galu-open");
      return;
    }
    document.body.classList.add("galu-open");
    if (!msgs.length) {
      push({ role: "bot", content: greeting(ctx) });
      setSugs(ctx ? contextSuggestions(ctx) : DEFAULT_SUGGESTIONS);
    }
    const q = consumeGaluQuestion();
    if (q) void reply(q);
    else if (matchMedia("(hover: hover)").matches) setTimeout(() => input.current?.focus(), 300);
  }, [galu.open, galu.pending]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: baja al último mensaje cada vez que llega uno
  useEffect(() => {
    body.current?.scrollTo({ top: 1e6 });
  }, [msgs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeGalu();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeGalu]);

  return (
    <>
      <div className={`galu-fab ${galu.open ? "is-hidden" : ""} ${hint ? "" : "no-hint"}`} id="galu-fab">
        <button type="button" className="galu-orb" aria-label="Abrir asistente Galú" onClick={() => openGalu()}>
          <Foco />
        </button>
        <div className="galu-hint">
          <button
            type="button"
            className="x"
            aria-label="Cerrar"
            onClick={() => {
              setHint(false);
              try {
                sessionStorage.setItem("mg-hint", "1");
              } catch {}
            }}
          >
            <X className="i-sm" />
          </button>
          <b>¡Hola! Soy Galú</b>¿Te ayudo a encontrar el talle o un vestido para un cumple?
        </div>
      </div>

      <section
        className={`galu ${galu.open ? "is-open" : ""}`}
        id="galu"
        aria-label="Asistente Galú"
        aria-hidden={!galu.open}
        role="dialog"
      >
        <div className="galu-head hem-bottom">
          <div className="avatar">
            <Foco />
          </div>
          <div>
            <h3>Galú</h3>
            <p>Responde con el stock real del taller</p>
          </div>
          <button type="button" className="icon-btn close" aria-label="Cerrar" onClick={closeGalu}>
            <X />
          </button>
        </div>
        <div className="galu-body" ref={body} aria-live="polite">
          {msgs.map((m) =>
            m.role === "cards" ? (
              <div key={m.id} className="msg cards">
                {m.products.map((p) => (
                  <MiniCard key={p.slug} p={p} size={m.size} onAdd={(prod, s) => addToCart(prod, s)} />
                ))}
              </div>
            ) : m.role === "typing" ? (
              <div key={m.id} className="msg bot" style={{ padding: 0 }}>
                <span className="typing">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : m.role === "galu" ? (
              <div key={m.id} className="msg bot" style={{ whiteSpace: "pre-line" }}>
                {boldSegments(m.text).map((s, i) =>
                  // biome-ignore lint/suspicious/noArrayIndexKey: tramos fijos de un mismo texto
                  s.bold ? <b key={i}>{s.text}</b> : <span key={i}>{s.text}</span>,
                )}
              </div>
            ) : (
              <div key={m.id} className={`msg ${m.role}`}>
                {m.content}
              </div>
            ),
          )}
        </div>
        <div className="galu-sugs">
          {sugs.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => void reply(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="galu-form"
          onSubmit={(e) => {
            e.preventDefault();
            const v = input.current?.value.trim();
            if (v && input.current) {
              input.current.value = "";
              void reply(v);
            }
          }}
        >
          <input
            ref={input}
            placeholder="Preguntame por talles, stock, envíos…"
            autoComplete="off"
            aria-label="Mensaje"
          />
          <button type="submit" aria-label="Enviar">
            <SendHorizontal />
          </button>
        </form>
        <div className="galu-note">
          ¿Algo más?{" "}
          <a className="link" href={info.whatsapp}>
            Escribile a Gaby por WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
