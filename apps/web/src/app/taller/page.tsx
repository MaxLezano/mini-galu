import type { Metadata } from "next";
import Link from "next/link";
import { Embroidery } from "@/ui/atoms/Embroidery";

export const metadata: Metadata = { title: "Panel del taller" };

/** Panel del taller (mockups admin*.html). Llega en la fase 2 (productos) y la fase 4 (pedidos). */
export default function Page() {
  return (
    <main className="wrap section">
      <div className="empty-state">
        <Embroidery />
        <span className="eyebrow">Panel del taller · Fases 2 y 4</span>
        <h1 className="display h2">El taller está en obra</h1>
        <p className="lead" style={{ margin: "0 auto 12px" }}>
          Acá Gaby va a operar pedidos, stock por talle, lanzamientos y automatizaciones.
        </p>
        <Link className="btn" href="/">
          Ir a la tienda
        </Link>
      </div>
    </main>
  );
}
