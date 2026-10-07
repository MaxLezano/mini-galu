"use client";

import type { AdminLaunch, AdminProduct, Collection } from "@mini-galu/contracts";
import { Calendar, CalendarCheck, Copy, Eye, FilePen, House, Pencil, Plus, Shirt, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { daysUntil, launchWhen } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { LaunchEditor } from "./LaunchEditor";
import "./launches.css";

type Props = { initial: AdminLaunch[]; products: AdminProduct[]; collections: Collection[]; startNew?: boolean };

/** Lanzamientos — design/mockups/admin-lanzamientos.html */
export function LaunchesAdmin({ initial, products, collections, startNew = false }: Props) {
  const [launches, setLaunches] = useState(initial);
  const [editor, setEditor] = useState<{ launch: AdminLaunch | null; copy: boolean } | null>(
    startNew ? { launch: null, copy: false } : null,
  );
  const mounted = useMounted();

  const next = launches.filter((l) => l.state === "scheduled");
  const drafts = launches.filter((l) => l.state === "draft");
  const past = launches.filter((l) => l.state === "past").reverse();

  const onSaved = (l: AdminLaunch) => {
    setLaunches((list) =>
      (list.some((x) => x.id === l.id) ? list.map((x) => (x.id === l.id ? l : x)) : [...list, l]).sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      ),
    );
    setEditor(null);
    toast(
      l.state === "scheduled"
        ? `${l.title} programado para el ${launchWhen(l.startsAt)}`
        : l.state === "draft"
          ? "Guardado como borrador"
          : `${l.title} guardado`,
      {
        icon: l.state === "draft" ? <FilePen className="i-sm" /> : <CalendarCheck className="i-sm" />,
      },
    );
  };

  /** "Programar" un borrador desde la lista: si le falta algo (prendas, portada, fecha futura) se abre el editor. */
  const schedule = async (l: AdminLaunch) => {
    try {
      const saved = await adminApi.updateLaunch(l.id, {
        title: l.title,
        coverNote: l.coverNote,
        teaser: l.teaser,
        coverPath: l.coverPath,
        startsAt: l.startsAt,
        collectionSlug: l.collectionSlug,
        productSlugs: l.products.map((p) => p.slug),
        showCountdown: l.showCountdown,
        notifyBefore: l.notifyBefore,
        autoPublish: l.autoPublish,
        socialText: l.socialText,
        status: "scheduled",
      });
      onSaved(saved);
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo programar");
      setEditor({ launch: l, copy: false });
    }
  };

  const remove = async (l: AdminLaunch) => {
    if (!confirm(`¿Borrar el borrador "${l.title}"?`)) return;
    try {
      await adminApi.deleteLaunch(l.id);
      setLaunches((list) => list.filter((x) => x.id !== l.id));
      toast("Borrador eliminado");
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo borrar");
    }
  };

  const row = (l: AdminLaunch, isNext: boolean) => {
    const d = mounted ? daysUntil(l.startsAt) : null;
    const pill =
      l.state === "scheduled" ? (
        <span className="pill-status st-warn">
          {d === null ? "Programado" : d <= 1 ? "Sale mañana" : `En ${d} días`}
        </span>
      ) : l.state === "draft" ? (
        <span className="pill-status st-muted">Borrador</span>
      ) : (
        <span className="pill-status st-ok">{l.publishedAt ? "Publicado" : "Ya salió"}</span>
      );
    const title = l.title.replace(/(\S+)$/, "");
    const lastWord = l.title.match(/(\S+)$/)?.[1];
    return (
      <article key={l.id} className={`ln ${isNext ? "is-next" : ""} ${l.state === "past" ? "is-past" : ""}`}>
        {l.coverUrl ? (
          <img src={l.coverUrl} alt="" />
        ) : (
          <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 18, background: "var(--linen)" }} />
        )}
        <div>
          {pill}
          <h3>
            {title}
            <em>{lastWord}</em>
          </h3>
          <div className="meta">
            <span>
              <Calendar className="i-sm" /> {launchWhen(l.startsAt)}
            </span>
            <span>
              <Shirt className="i-sm" /> {l.products.length} {l.products.length === 1 ? "prenda" : "prendas"}
            </span>
            {l.showCountdown && l.state !== "past" && (
              <span>
                <House className="i-sm" /> En la home
              </span>
            )}
          </div>
          {isNext && (
            <div className="ln-count">
              <span>
                <b>{l.signups}</b>anotados
              </span>
              <span>
                <b>{l.products.length}</b>prendas
              </span>
              <span>
                <b>{d ?? "–"}</b>días
              </span>
            </div>
          )}
          {l.state === "past" && (
            <div className="meta" style={{ marginTop: 6 }}>
              <span>
                <Users className="i-sm" /> {l.signups} anotados
              </span>
            </div>
          )}
        </div>
        <div className="acts">
          {l.state !== "past" ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setEditor({ launch: l, copy: false })}
            >
              <Pencil className="i-sm" /> Editar
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditor({ launch: l, copy: true })}>
              <Copy className="i-sm" /> Usar de base
            </button>
          )}
          {l.state === "draft" && (
            <button type="button" className="btn btn-sm" onClick={() => schedule(l)}>
              Programar
            </button>
          )}
          {l.state === "draft" && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label={`Borrar ${l.title}`}
              onClick={() => remove(l)}
            >
              <Trash2 className="i-sm" />
            </button>
          )}
          {isNext && l.showCountdown && (
            <Link className="btn btn-sm btn-rose" href="/#lanzamiento" target="_blank">
              <Eye className="i-sm" /> Ver en la home
            </Link>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="adm-content">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Día a día</span>
          <h1 className="display">
            Lanza<em>mientos</em>
          </h1>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-sm" onClick={() => setEditor({ launch: null, copy: false })}>
            <Plus className="i-sm" /> Nuevo lanzamiento
          </button>
        </div>
      </div>
      <p className="muted" style={{ margin: "-8px 0 18px", maxWidth: "70ch" }}>
        Los adelantos de lo que viene: se ven en la home con cuenta regresiva, las prendas aparecen como "Próximamente"
        y se publican solas el día y la hora que elijas. Las personas anotadas reciben el aviso antes.
      </p>

      <div>
        <div className="ln-list">
          {next.length ? (
            next.map((l, i) => row(l, i === 0))
          ) : (
            <div className="box empty-state">
              <Embroidery />
              <b>No hay lanzamientos programados</b>
              <button type="button" className="btn btn-sm" onClick={() => setEditor({ launch: null, copy: false })}>
                Crear uno
              </button>
            </div>
          )}
        </div>
        {drafts.length > 0 && (
          <>
            <p className="sec-t">Borradores</p>
            <div className="ln-list">{drafts.map((l) => row(l, false))}</div>
          </>
        )}
        {past.length > 0 && (
          <>
            <p className="sec-t">Anteriores</p>
            <div className="ln-list">{past.map((l) => row(l, false))}</div>
          </>
        )}
      </div>

      <LaunchEditor
        open={!!editor}
        launch={editor?.launch ?? null}
        copy={editor?.copy}
        products={products}
        collections={collections}
        onClose={() => setEditor(null)}
        onSaved={onSaved}
      />
    </main>
  );
}
