"use client";

import {
  type AdminAssistant,
  type AssistantFact,
  type AssistantSettings,
  formatARS,
  questionKey,
} from "@mini-galu/contracts";
import { BellRing, Check, MessageCircleHeart, MessageCircleQuestion, MessagesSquare, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { relativeWhen } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { ConversationList } from "./components/ConversationList";
import { KnowsBox } from "./components/KnowsBox";
import { SettingsBox } from "./components/SettingsBox";
import { TeachBox } from "./components/TeachBox";
import { Transcript } from "./components/Transcript";
import { boughtPercent, weekChange } from "./galu-view";
import "./galu.css";

/** Galú en el panel — design/mockups/admin-galu.html */
export function GaluAdmin({ initial }: { initial: AdminAssistant }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(initial.conversations[0]?.id ?? null);
  const [question, setQuestion] = useState(initial.pending[0]?.question ?? "");
  const [free, setFree] = useState(!initial.pending.length);
  const [answer, setAnswer] = useState("");
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useMounted();
  const when = (iso: string) => (mounted ? relativeWhen(iso) : "");
  const s = data.stats;
  const change = weekChange(s.chats, s.chatsBefore);
  const conversation = data.conversations.find((c) => c.id === current) ?? data.conversations[0] ?? null;

  const save = async (run: () => Promise<AdminAssistant>, ok: string, fail: string) => {
    setBusy(true);
    try {
      const next = await run();
      setData(next);
      toast(ok, { icon: <Check className="i-sm" /> });
      return next;
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : fail);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const chooseQuestion = (q: string, isFree: boolean) => {
    setQuestion(q);
    setFree(isFree);
  };

  const teach = async () => {
    if (!question.trim()) return toast("Escribí la pregunta primero");
    if (!answer.trim()) return toast("Escribí la respuesta primero");
    const next = await save(
      () => adminApi.teachAssistant({ question, answer }),
      "Listo: Galú ya lo sabe",
      "No se pudo guardar la respuesta",
    );
    if (!next) return;
    setAnswer("");
    chooseQuestion(next.pending[0]?.question ?? "", !next.pending.length);
  };

  const forget = (f: AssistantFact) =>
    save(() => adminApi.forgetAssistantFact(f.id), "Galú lo olvidó", "No se pudo borrar");

  const updateSettings = async (next: AssistantSettings) => {
    // el interruptor cambia al instante; si no se pudo guardar, vuelve a como estaba
    const before = data;
    setData((d) => ({ ...d, settings: next }));
    if (!(await save(() => adminApi.assistantSettings(next), "Ajustes guardados", "No se pudieron guardar")))
      setData(before);
  };

  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Tienda</span>
          <h1 className="display">
            Galú, <em>la asistente</em>
          </h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: "62ch" }}>
            Responde con el catálogo y el stock reales. Acá ves qué le preguntan y le enseñás lo que no sabe.
          </p>
          {!data.provider && (
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
              <span className="pill-status st-warn">Sin modelo</span> La tienda responde por reglas: las charlas se
              guardan igual, pero lo que le enseñes lo usa recién con un modelo (configurá{" "}
              <code>ANTHROPIC_API_KEY</code> u <code>OLLAMA_URL</code> en la API).
            </p>
          )}
        </div>
        <div className="actions">
          <a className="btn btn-sm btn-ghost" href="/" target="_blank" rel="noreferrer">
            <MessageCircleHeart className="i-sm" /> Probar en la tienda
          </a>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>
            <MessagesSquare className="i-sm" /> Charlas en 7 días
          </span>
          <b>{s.chats}</b>
          <small className={change?.cls ?? "muted"}>{change?.text ?? "sin charlas la semana anterior"}</small>
        </div>
        <div className="kpi">
          <span>
            <ShoppingBag className="i-sm" /> Terminaron en compra
          </span>
          <b>{boughtPercent(s.bought, s.chats)}</b>
          <small className="muted">
            {s.bought} {s.bought === 1 ? "pedido" : "pedidos"} · {formatARS(s.boughtCents)}
          </small>
        </div>
        <div className="kpi">
          <span>
            <BellRing className="i-sm" /> Pidieron aviso de talle
          </span>
          <b>{s.sizeAlerts}</b>
          <small className="muted">pasan a la lista de espera</small>
        </div>
        <div className="kpi">
          <span>
            <MessageCircleQuestion className="i-sm" /> No supo responder
          </span>
          <b>{s.unanswered}</b>
          <small className={s.unanswered ? "down" : "muted"}>{s.unanswered ? "enseñale abajo" : "en 7 días"}</small>
        </div>
      </div>

      <div className="gl">
        <section className="box" style={{ padding: 8 }}>
          <div className="box-head" style={{ padding: "12px 12px 0", marginBottom: 6 }}>
            <h2>Conversaciones</h2>
          </div>
          <ConversationList
            conversations={data.conversations}
            current={conversation?.id ?? null}
            onSelect={setCurrent}
            when={when}
          />
        </section>
        <Transcript
          conversation={conversation}
          when={when}
          onTeach={(q) => {
            const group = data.pending.find((p) => questionKey(p.question) === questionKey(q));
            chooseQuestion(group?.question ?? q, !group);
            document.getElementById("teach")?.scrollIntoView({ behavior: "smooth", block: "center" });
            answerRef.current?.focus({ preventScroll: true });
          }}
        />
        <aside style={{ display: "grid", gap: 18 }}>
          <TeachBox
            pending={data.pending}
            question={question}
            free={free}
            answer={answer}
            busy={busy}
            answerRef={answerRef}
            onQuestion={chooseQuestion}
            onAnswer={setAnswer}
            onSave={teach}
          />
          <KnowsBox facts={data.facts} busy={busy} onForget={forget} />
          <SettingsBox settings={data.settings} busy={busy} onChange={updateSettings} />
        </aside>
      </div>
    </main>
  );
}
