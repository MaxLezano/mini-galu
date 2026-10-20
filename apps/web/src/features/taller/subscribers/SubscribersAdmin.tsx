"use client";

import type { AdminSubscribers } from "@mini-galu/contracts";
import { BellRing, CalendarHeart, Download, Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { SubscribersTable } from "./components/SubscribersTable";
import { type AnyRow, filterRows, SUBSCRIBER_TABS, type SubscriberTab, tabCounts } from "./subscribers-view";
import "./subscribers.css";

const EMPTY: Record<SubscriberTab, string> = {
  cartas: "Todavía nadie se sumó a las cartas del taller.",
  lanzamientos: "Nadie se anotó a un lanzamiento todavía.",
  talles: "Nadie pidió aviso de un talle todavía.",
};

/** Suscriptores (sin mockup, solo para ver): cartas, anotados a un lanzamiento y avisos de talle. */
export function SubscribersAdmin({ data }: { data: AdminSubscribers }) {
  const [tab, setTab] = useState<SubscriberTab>("cartas");
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const counts = useMemo(() => tabCounts(data), [data]);
  const rows = filterRows<AnyRow>(data[tab], q, pending);

  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow">Tienda</span>
          <h1 className="display">Suscriptores</h1>
        </div>
        <div className="actions">
          <a className="btn btn-sm btn-ghost" href={adminApi.subscribersCsvUrl()} download>
            <Download className="i-sm" /> Exportar cartas
          </a>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <span>
            <Mail className="i-sm" /> Cartas del taller
          </span>
          <b>{counts.cartas}</b>
          <small className="muted">reciben las cartas de Tienda y pagos</small>
        </div>
        <div className="kpi">
          <span>
            <CalendarHeart className="i-sm" /> Anotados a un lanzamiento
          </span>
          <b>{counts.lanzamientos}</b>
          <small className="muted">les avisamos cuando sale</small>
        </div>
        <div className="kpi">
          <span>
            <BellRing className="i-sm" /> Esperan un talle
          </span>
          <b>{counts.talles}</b>
          <small className="muted">les avisamos cuando vuelve el stock</small>
        </div>
      </div>
      <section className="box">
        <div className="filters-row" style={{ marginBottom: 16 }}>
          <div className="filters-row">
            {SUBSCRIBER_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`chip ${tab === key ? "is-on" : ""}`}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {label} <span className="count">{counts[key]}</span>
              </button>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <div className="adm-sub-tools">
            <button
              type="button"
              className={`chip ${pending ? "is-on" : ""}`}
              aria-pressed={pending}
              onClick={() => setPending((p) => !p)}
            >
              {tab === "cartas" ? "Sin las bajas" : "Solo los que esperan"}
            </button>
            <label className="tiny-search">
              <span>
                <Search className="i-sm" />
              </span>
              <input
                className="input"
                placeholder={tab === "cartas" ? "Buscar mail o nombre" : "Buscar contacto o prenda"}
                aria-label="Buscar suscriptor"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>
        </div>
        <SubscribersTable tab={tab} rows={rows} empty={q || pending ? "No hay nadie con ese filtro." : EMPTY[tab]} />
      </section>
    </main>
  );
}
