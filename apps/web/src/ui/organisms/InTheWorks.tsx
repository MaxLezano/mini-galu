import Link from "next/link";
import { Embroidery } from "@/ui/atoms/Embroidery";

/** Página de una fase futura: navegable y honesta en vez de un 404. */
export function InTheWorks({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <main className="wrap section">
      <div className="empty-state" style={{ maxWidth: 560, marginInline: "auto" }}>
        <Embroidery />
        <span className="eyebrow">{phase}</span>
        <h1 className="display h2" style={{ margin: "6px 0" }}>
          {title}
        </h1>
        <p className="lead" style={{ margin: "0 auto 12px" }}>
          {children ?? "Estamos cosiendo esta página en el taller. Mientras tanto, mirá lo que ya está listo."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn" href="/catalogo">
            Ver catálogo
          </Link>
          <Link className="btn btn-ghost" href="/">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
