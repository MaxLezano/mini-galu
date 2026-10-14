"use client";

import { type AdminAutomations, type AutomationKey, formatARS } from "@mini-galu/contracts";
import { BellRing, Check, Clock, Link2, Mail, Send, Truck } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast, useUi } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { monthName, relativeWhen } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Modal } from "@/ui/organisms/Modal";
import { timeSaved } from "./automation-view";
import { MESSAGE_MODAL, MessageModal } from "./components/MessageModal";
import { RuleCard } from "./components/RuleCard";
import { RunsTable } from "./components/RunsTable";
import "./automations.css";

const TEST_MODAL = "m-test";

const PILL = {
  conectado: ["Conectado", "st-ok"],
  sin_conectar: ["Sin conectar", "st-muted"],
  simulado: ["Simulado", "st-warn"],
  prueba: ["Modo prueba", "st-warn"],
  qa: ["Modo prueba", "st-warn"],
  produccion: ["Activo", "st-ok"],
} as const;

const Channel = ({ icon, title, state }: { icon: ReactNode; title: string; state: keyof typeof PILL }) => (
  <div className="chan">
    <span className="ic">{icon}</span>
    <div>
      <b>{title}</b>
      <span className={`pill-status ${PILL[state][1]}`}>{PILL[state][0]}</span>
    </div>
  </div>
);

/** Automatizaciones — design/mockups/admin-automatizaciones.html */
export function AutomationsAdmin({ initial, email }: { initial: AdminAutomations; email: string }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ key: AutomationKey; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState(email);
  const { openModal, closeModal } = useUi();
  const mounted = useMounted();
  const s = data.stats;
  const sent = s.sent.mail + s.sent.whatsapp;
  const on = data.rules.filter((r) => r.on).length;

  const update = async (key: AutomationKey, upd: { on?: boolean; message?: string }, ok: string) => {
    setBusy(true);
    try {
      setData(await adminApi.updateAutomation(key, upd));
      toast(ok, { icon: <Check className="i-sm" /> });
      return true;
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const r = await adminApi.testAutomations(testEmail);
      closeModal();
      toast(`Te mandamos ${r.sent} ${r.sent === 1 ? "mensaje" : "mensajes"} de prueba`, {
        icon: <Send className="i-sm" />,
      });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo mandar la prueba");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Ajustes</span>
          <h1 className="display">Automatizaciones</h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: "60ch" }}>
            Lo que el taller hace solo: avisos a los clientes, stock, seguimiento y recordatorios. Vos te ocupás de
            coser.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => openModal(TEST_MODAL)}>
            <Send className="i-sm" /> Enviarme una prueba
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>
            <Send className="i-sm" /> Mensajes enviados en {mounted ? monthName(new Date().toISOString()) : "el mes"}
          </span>
          <b>{sent}</b>
          <small className="muted">
            {s.sent.whatsapp} por WhatsApp · {s.sent.mail} por mail
          </small>
        </div>
        <div className="kpi">
          <span>
            <Clock className="i-sm" /> Tiempo que te ahorraste
          </span>
          <b>{timeSaved(sent)}</b>
          <small className="muted">a 4 min por mensaje</small>
        </div>
        <div className="kpi">
          <span>
            <BellRing className="i-sm" /> Ventas por avisos de talle
          </span>
          <b>{formatARS(s.waitlistSalesCents)}</b>
          <small className={s.waitlistSales ? "up" : "muted"}>
            {s.waitlistSales} {s.waitlistSales === 1 ? "compra" : "compras"} después del aviso
          </small>
        </div>
        <div className="kpi">
          <span>
            <Link2 className="i-sm" /> Links de pago recuperados
          </span>
          <b>
            {s.recoveredLinks} de {s.remindedLinks}
          </b>
          <small className="muted">después del recordatorio</small>
        </div>
      </div>

      <section>
        <div className="box-head" style={{ marginBottom: 12 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>
            Canales
          </h2>
        </div>
        <div className="channels">
          <Channel icon={<BrandIcon name="whatsapp" />} title="WhatsApp Business" state={data.channels.whatsapp} />
          <Channel icon={<Mail />} title="Mail" state={data.channels.mail} />
          <Channel icon={<BrandIcon name="mercadopago" />} title="Mercado Pago" state={data.channels.mercadopago} />
          <Channel icon={<Truck />} title="Andreani" state={data.channels.andreani} />
        </div>
        {data.channels.whatsapp === "sin_conectar" && (
          <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
            {/* TODO(fase 6 · automations): WhatsApp Business Cloud API (número de prueba de Meta) */}
            Mientras WhatsApp no esté conectado, los avisos salen por mail; los anotados que dejaron solo su WhatsApp
            quedan esperando.
          </p>
        )}
      </section>

      <section>
        <div className="box-head" style={{ marginBottom: 12 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>
            Reglas
          </h2>
          <span className="muted" style={{ fontSize: 13 }}>
            {on} de {data.rules.length} activas
          </span>
        </div>
        <div className="autos" id="autos">
          {data.rules.map((r) => (
            <RuleCard
              key={r.key}
              rule={r}
              busy={busy}
              onToggle={(v) => update(r.key, { on: v }, `${v ? "Activada" : "Pausada"}`)}
              onEdit={() => {
                setEditing({ key: r.key, message: r.message ?? "" });
                openModal(MESSAGE_MODAL);
              }}
            />
          ))}
        </div>
      </section>

      <section className="box">
        <div className="box-head">
          <h2>Registro</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            últimos avisos
          </span>
        </div>
        <RunsTable runs={data.runs} when={(iso) => (mounted ? relativeWhen(iso) : "")} />
      </section>

      <MessageModal
        rule={editing}
        busy={busy}
        onCancel={closeModal}
        onSave={async (message) => {
          if (editing && (await update(editing.key, { message }, "Mensaje guardado"))) closeModal();
        }}
      />
      <Modal
        id={TEST_MODAL}
        label="Enviarme una prueba"
        title={
          <>
            Enviarme una <em>prueba</em>
          </>
        }
      >
        <form
          className="modal-body"
          style={{ display: "grid", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            sendTest();
          }}
        >
          <p className="muted" style={{ margin: 0 }}>
            Te llegan todos los mensajes activos con datos de ejemplo, para ver cómo lo recibe el cliente.
          </p>
          <div className="field">
            <label htmlFor="tw">Tu mail</label>
            <input
              className="input"
              id="tw"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-block" disabled={busy}>
            {busy ? "Enviando…" : "Enviar prueba"}
          </button>
        </form>
      </Modal>
    </main>
  );
}
