"use client";

import type { AdminOrderDetail } from "@mini-galu/contracts";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Modal } from "@/ui/organisms/Modal";
import { fillTemplate, TEMPLATES, type TemplateKey, waLink } from "../order-flow";

export const WHATSAPP_MODAL = "m-wa";

type Props = {
  order: AdminOrderDetail | null;
  template: TemplateKey;
  /** Datos para completar las plantillas. */
  vars: { seguimiento: string; taller: string; horario: string; link: string; vence: string; resena: string };
};

/** Escribirle al cliente por WhatsApp con plantillas (admin.js → openWA). Se abre WhatsApp con el texto listo. */
export function WhatsAppModal({ order, template, vars }: Props) {
  const [key, setKey] = useState<TemplateKey>(template);
  const [text, setText] = useState("");
  const name = order?.customer.name.split(" ")[0] ?? "";
  const fill = (body: string) => (order ? fillTemplate(body, { nombre: name, pedido: order.number, ...vars }) : "");

  // cada vez que se abre con otro pedido o plantilla, arranca de la plantilla
  // biome-ignore lint/correctness/useExhaustiveDependencies: se recalcula al cambiar de pedido o plantilla
  useEffect(() => {
    setKey(template);
    setText(fill(TEMPLATES[template].body));
  }, [order?.number, template]);

  const pick = (k: TemplateKey) => {
    setKey(k);
    setText(fill(TEMPLATES[k].body));
  };

  return (
    <Modal
      id={WHATSAPP_MODAL}
      label="Mensaje por WhatsApp"
      title={
        <>
          Escribirle por <em>WhatsApp</em>
        </>
      }
    >
      {order && (
        <div className="modal-body" style={{ display: "grid", gap: 14 }}>
          <div className="tpls">
            {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
              <button type="button" key={k} className="tpl" aria-pressed={k === key} onClick={() => pick(k)}>
                <b>{TEMPLATES[k].title}</b>
                <small>{fill(TEMPLATES[k].body).slice(0, 72)}…</small>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="wa-txt">
              Mensaje para {order.customer.name} · {order.phone}
            </label>
            <textarea className="input" id="wa-txt" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="wa-preview">
            <div className="wa-bubble">
              {text}
              <small>ahora ✓✓</small>
            </div>
          </div>
          <a className="btn btn-block" target="_blank" rel="noopener" href={waLink(order.phone, text)}>
            <BrandIcon name="whatsapp" className="i-sm" /> Abrir WhatsApp
          </a>
          <p className="muted" style={{ fontSize: 12, margin: 0, textAlign: "center" }}>
            {/* TODO(fase 6 · automations): con WhatsApp Business conectado, estos avisos salen solos */}
            Se abre WhatsApp con el texto listo para mandar.
          </p>
        </div>
      )}
    </Modal>
  );
}
