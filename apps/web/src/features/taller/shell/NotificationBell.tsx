"use client";

import { Bell, Hourglass, Inbox, MessageCircleQuestionMark, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { Notice } from "./shell-view";

const ICON = {
  pedido: Inbox,
  sin_pagar: Hourglass,
  galu: MessageCircleQuestionMark,
  stock: TriangleAlert,
} as const;

type Props = {
  items: Notice[];
  /** Claves ya vistas ("Marcar como leídas"). */
  read: Set<string>;
  when: (iso: string) => string;
  onGo: (n: Notice) => void;
  onReadAll: () => void;
};

/** Campana de novedades — admin.js → renderNotif(). */
export function NotificationBell({ items, read, when, onGo, onReadAll }: Props) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !read.has(n.key)).length;
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !(e.target as Element).closest(".bell-wrap") && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="bell-wrap">
      <button
        type="button"
        className="icon-btn"
        aria-label={unread ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell />
        <span className="badge" data-n={unread}>
          {unread || ""}
        </span>
      </button>
      <div className={`notif ${open ? "is-open" : ""}`} id="notif">
        <div className="row" style={{ padding: "8px 10px" }}>
          <b>Novedades</b>
          {unread > 0 && (
            <button type="button" className="link" style={{ fontSize: 12 }} onClick={onReadAll}>
              Marcar como leídas
            </button>
          )}
        </div>
        {items.length ? (
          items.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <button
                type="button"
                className={`it ${read.has(n.key) ? "is-read" : ""}`}
                key={n.key}
                onClick={() => {
                  setOpen(false);
                  onGo(n);
                }}
              >
                <span className="ic">
                  <Icon className="i-sm" />
                </span>
                <span>
                  <b>{n.title}</b>
                  <small>
                    {n.text}
                    {n.at ? ` · ${when(n.at)}` : ""}
                  </small>
                </span>
              </button>
            );
          })
        ) : (
          <p className="muted" style={{ padding: 10, margin: 0, fontSize: 13.5 }}>
            Nada nuevo por ahora ♡
          </p>
        )}
      </div>
    </div>
  );
}
