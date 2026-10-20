"use client";

import { Mail, PackageSearch, Phone, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { useStoreInfo } from "../shell-context";

/** Contacto discreto: barra lateral en escritorio, un botón que se despliega en celular (IDEAS.md). */
export function ContactRail() {
  const [open, setOpen] = useState(false);
  const info = useStoreInfo();
  return (
    <nav className={`contact-rail ${open ? "is-open" : ""}`} aria-label="Contacto">
      <a href={info.whatsapp} target="_blank" rel="noopener" aria-label="WhatsApp">
        <BrandIcon name="whatsapp" />
        <span>Escribinos por WhatsApp</span>
      </a>
      <a href={info.instagram} target="_blank" rel="noopener" aria-label="Instagram">
        <BrandIcon name="instagram" />
        <span>{info.instagramHandle}</span>
      </a>
      <a className="hide-m" href={`mailto:${info.email}`} aria-label="Email">
        <Mail />
        <span>{info.email}</span>
      </a>
      <hr />
      <Link className="hide-m" href="/seguimiento" aria-label="Seguir mi pedido">
        <PackageSearch />
        <span>Seguir mi pedido</span>
      </Link>
      <button
        type="button"
        className="cr-toggle"
        aria-label="Contacto"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Phone />}
      </button>
    </nav>
  );
}
