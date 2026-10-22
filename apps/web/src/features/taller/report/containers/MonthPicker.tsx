"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";

/** Elegir el mes (cambia `?mes=`) e imprimir — admin-reporte.html → .month-pick */
export function MonthPicker({ month, months }: { month: string; months: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <div className="actions month-pick">
      <select
        className="input"
        aria-label="Mes"
        value={month}
        onChange={(e) => router.push(`/taller/reporte?mes=${e.target.value}`)}
      >
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-sm" onClick={() => window.print()}>
        <Printer className="i-sm" /> Imprimir
      </button>
    </div>
  );
}
