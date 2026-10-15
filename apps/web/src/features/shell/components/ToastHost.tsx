"use client";

import { imageThumb } from "@mini-galu/contracts";

import { Check } from "lucide-react";
import { useUi } from "../ui-store";

export function ToastHost() {
  const t = useUi((s) => s.toast);
  return (
    <div className={`toast ${t ? "is-on" : ""}`} id="toast" role="status" aria-live="polite">
      {t &&
        (t.image ? (
          <img src={imageThumb(t.image)} alt="" />
        ) : (
          <span className="ico">{t.icon ?? <Check className="i-sm" />}</span>
        ))}
      {t && <span>{t.content}</span>}
    </div>
  );
}
