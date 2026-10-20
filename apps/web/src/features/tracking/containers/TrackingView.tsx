"use client";

import type { PublicTracking } from "@mini-galu/contracts";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStoreInfo } from "@/features/shell/shell-context";
import { useUi } from "@/features/shell/ui-store";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { TrackingCard } from "../components/TrackingCard";
import { normalizeCode } from "../tracking-view";
import "../tracking.css";

type Props = {
  /** Lo que se buscó (?pedido=) y lo que encontró la API (null: no existe; undefined: todavía no se buscó). */
  code: string;
  result: PublicTracking | null | undefined;
};

/** Seguí tu pedido — design/mockups/seguimiento.html */
export function TrackingView({ code, result }: Props) {
  const info = useStoreInfo();
  const router = useRouter();
  const openGalu = useUi((s) => s.openGalu);
  const [value, setValue] = useState(code);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="wrap">
      <section className="tr-hero">
        <span className="eyebrow is-in">Seguimiento de envío</span>
        <h1 className="display h1">
          Seguí tu <em>pedido</em>
        </h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          Ingresá tu número de pedido o el código de Andreani. No hace falta iniciar sesión.
        </p>
        <form
          className="tr-form"
          onSubmit={(e) => {
            e.preventDefault();
            const c = normalizeCode(value);
            if (!c) return setError("Escribí el número de pedido (ej. MG-1042)");
            setError(null);
            router.push(`/seguimiento?pedido=${encodeURIComponent(c)}`);
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="MG-1042"
            aria-label="Número de pedido o código Andreani"
            autoComplete="off"
          />
          <button type="submit" className="btn">
            Buscar <Search className="i-sm" />
          </button>
        </form>
        {error && (
          <p className="tr-error" role="alert">
            {error}
          </p>
        )}
      </section>

      {result ? (
        <TrackingCard
          key={result.number}
          t={result}
          whatsapp={info.whatsapp}
          onAskGalu={() => openGalu(`¿Dónde está mi pedido #${result.number}?`)}
        />
      ) : result === null ? (
        <div className="notfound empty-state">
          <Embroidery />
          <div className="hand" style={{ fontSize: 34 }}>
            No encontramos ese pedido
          </div>
          <p className="muted" style={{ margin: "0 0 10px" }}>
            Revisá el número que te llegó por mail o WhatsApp, o preguntale a Galú.
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => openGalu()}>
            Preguntarle a Galú
          </button>
        </div>
      ) : null}
    </main>
  );
}
