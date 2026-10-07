"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useUi } from "@/features/shell/ui-store";

/** Modal del atelier (hoja inferior en celular). Se abre con useUi().openModal(id). */
export function Modal({
  id,
  label,
  title,
  children,
}: {
  id: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const { modal, closeModal } = useUi();
  const open = modal === id;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeModal]);
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar"
        className={`scrim modal-scrim ${open ? "is-open" : ""}`}
        onClick={closeModal}
      />
      <div
        className={`modal ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
      >
        <div className="modal-head">
          <h3 className="display h3" style={{ margin: 0 }}>
            {title}
          </h3>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={closeModal}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
