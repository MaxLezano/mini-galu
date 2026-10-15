"use client";

import { Mail, MessageCircleHeart } from "lucide-react";
import { useUi } from "@/features/shell/ui-store";
import { SITE } from "@/lib/site";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

/** "¿Te quedó una duda?": Galú, WhatsApp y mail del taller. */
export function HelpContact() {
  const openGalu = useUi((s) => s.openGalu);
  return (
    <div className="help-contact hem-top">
      <div>
        <span className="hand">¿Te quedó una duda?</span>
        <p className="muted">Preguntale a Galú o escribinos: te responde Gaby desde el taller.</p>
      </div>
      <div className="help-contact-btns">
        <button type="button" className="btn" onClick={() => openGalu()}>
          <MessageCircleHeart className="i-sm" /> Preguntale a Galú
        </button>
        <a className="btn btn-ghost" href={SITE.whatsapp}>
          <BrandIcon name="whatsapp" /> WhatsApp
        </a>
        <a className="btn btn-ghost" href={`mailto:${SITE.email}`}>
          <Mail className="i-sm" /> {SITE.email}
        </a>
      </div>
    </div>
  );
}
