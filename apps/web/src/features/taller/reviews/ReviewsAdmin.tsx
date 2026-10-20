"use client";

import type { AdminReview, ReviewModeration } from "@mini-galu/contracts";
import { Eye, House, Info, MessageSquareHeart, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { panelChanged } from "@/features/taller/shell/panel-events";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { ReviewCard } from "./components/ReviewCard";
import { inTab, publishedAverage, REVIEW_TABS, type ReviewTab, tabCounts } from "./reviews-view";
import "./reviews.css";

const EMPTY: Record<ReviewTab, string> = {
  pendiente: "No hay reseñas nuevas para revisar.",
  publicada: "Todavía no publicaste ninguna.",
  inicio: "Elegí reseñas publicadas con «Mostrar en el inicio» para que salgan en «Lo que dicen las familias».",
  oculta: "No hay reseñas ocultas.",
};

/** Reseñas (sin mockup): las que dejan los clientes llegan para revisar; Gaby las publica y elige las de la home. */
export function ReviewsAdmin({ initial }: { initial: AdminReview[] }) {
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<ReviewTab>(initial.some((r) => r.status === "pendiente") ? "pendiente" : "publicada");
  const [busy, setBusy] = useState<string | null>(null);
  const counts = useMemo(() => tabCounts(list), [list]);
  const shown = list.filter((r) => inTab(r, tab));
  const avg = publishedAverage(list);

  const change = async (r: AdminReview, m: ReviewModeration, done: string) => {
    setBusy(r.id);
    try {
      const next = await adminApi.moderateReview(r.id, m);
      setList((l) => l.map((x) => (x.id === r.id ? next : x)));
      panelChanged();
      toast(done);
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No pudimos guardar el cambio", {
        icon: <Info className="i-sm" />,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow">Tienda</span>
          <h1 className="display">Reseñas</h1>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <span>
            <MessageSquareHeart className="i-sm" /> Para revisar
          </span>
          <b>{counts.pendiente}</b>
          <small className="muted">las nuevas no se ven hasta que las publicás</small>
        </div>
        <div className="kpi">
          <span>
            <Eye className="i-sm" /> Publicadas
          </span>
          <b>{counts.publicada}</b>
          <small className="muted">se ven en la ficha de cada prenda</small>
        </div>
        <div className="kpi">
          <span>
            <Star className="i-sm" /> Promedio
          </span>
          <b>{avg ?? "—"}</b>
          <small className="muted">las estrellas de la tienda salen de las publicadas</small>
        </div>
        <div className="kpi">
          <span>
            <House className="i-sm" /> En el inicio
          </span>
          <b>{counts.inicio}</b>
          <small className="muted">en «Lo que dicen las familias»</small>
        </div>
      </div>
      <section className="box">
        <div className="filters-row" style={{ marginBottom: 16 }}>
          {REVIEW_TABS.map(([key, label]) => (
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
        {shown.length ? (
          <div className="adm-rv-list">
            {shown.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                busy={busy === r.id}
                onPublish={() => change(r, { status: "publicada" }, "Reseña publicada: ya se ve en la ficha")}
                onHide={() => change(r, { status: "oculta" }, "Reseña oculta")}
                onFeature={(on) =>
                  change(r, { featured: on }, on ? "Va a salir en el inicio" : "Ya no sale en el inicio")
                }
              />
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {EMPTY[tab]}
          </p>
        )}
      </section>
    </main>
  );
}
