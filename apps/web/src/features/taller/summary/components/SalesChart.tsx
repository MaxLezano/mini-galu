"use client";

import { formatARS, type SalesPoint } from "@mini-galu/contracts";
import { type MouseEvent, useRef, useState } from "react";
import { monthName, monthShort, shortDate, toArInputs } from "@/lib/date";
import { axisLabel, axisSteps, type ChartMode, chartStats } from "../summary-view";

type Props = {
  weeks: SalesPoint[];
  months: SalesPoint[];
  projectionCents: number | null;
  /** "octubre" */
  monthLabel: string;
};

const W = 640;
const H = 240;
const PL = 44;
const PB = 26;

const MODES: Record<ChartMode, { title: string; button: string; best: string; avg: string; aria: string }> = {
  semanas: {
    title: "Ventas por semana",
    button: "8 semanas",
    best: "Mejor semana",
    avg: "Promedio semanal",
    aria: "Ventas por semana, últimas 8 semanas",
  },
  meses: {
    title: "Ventas por mes",
    button: "12 meses",
    best: "Mejor mes",
    avg: "Promedio mensual",
    aria: "Ventas por mes, últimos 12 meses",
  },
};

const label = (mode: ChartMode, iso: string) => (mode === "semanas" ? shortDate(iso) : monthShort(iso));
const longLabel = (mode: ChartMode, iso: string) =>
  mode === "semanas" ? `Semana del ${shortDate(iso)}` : `${monthName(iso)} ${toArInputs(iso).date.slice(0, 4)}`;

/** admin.html → "Ventas por semana": una serie, un tono, la barra actual más oscura, tooltip y vista de tabla. */
export function SalesChart({ weeks, months, projectionCents, monthLabel }: Props) {
  const [mode, setMode] = useState<ChartMode>("semanas");
  const [tip, setTip] = useState<{ i: number; left: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const data = mode === "semanas" ? weeks : months;
  const m = MODES[mode];
  const steps = axisSteps(Math.max(...data.map((p) => p.cents)));
  const max = steps.at(-1) ?? 1;
  const bw = (W - PL) / data.length;
  const y = (v: number) => H - PB - (v / max) * (H - PB - 8);
  const { best, average } = chartStats(data);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const i = Number((e.target as Element).closest("[data-i]")?.getAttribute("data-i") ?? Number.NaN);
    const p = data[i];
    if (!p || !box.current) return setTip(null);
    const r = box.current.getBoundingClientRect();
    const sv = e.currentTarget.getBoundingClientRect();
    setTip({
      i,
      left: sv.left - r.left + ((PL + i * bw + bw / 2) / W) * sv.width,
      top: sv.top - r.top + (y(p.cents) / H) * sv.height,
    });
  };
  const tipPoint = tip ? data[tip.i] : undefined;

  return (
    <section className="box">
      <div className="box-head">
        <h2>{m.title}</h2>
        <div className="seg-btns">
          {(Object.keys(MODES) as ChartMode[]).map((k) => (
            <button
              type="button"
              key={k}
              aria-pressed={mode === k}
              onClick={() => {
                setMode(k);
                setTip(null);
              }}
            >
              {MODES[k].button}
            </button>
          ))}
        </div>
      </div>
      <div className="chart" ref={box}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={m.aria}
          onMouseMove={onMove}
          onMouseLeave={() => setTip(null)}
        >
          {steps.map((v) => (
            <g key={v}>
              <line className="gl" x1={PL} x2={W} y1={y(v)} y2={y(v)} />
              <text className="ax" x={PL - 8} y={y(v) + 4} textAnchor="end">
                {axisLabel(v)}
              </text>
            </g>
          ))}
          {data.map((p, i) => {
            const w = bw - 18;
            const x = PL + i * bw + 9;
            // sin ventas no hay barra (un piso de 4px con puntas redondas parecería una venta chiquita)
            const top = Math.min(y(p.cents), H - PB - 4);
            const r = 4;
            const d = `M${x},${H - PB} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${H - PB} Z`;
            return (
              <g key={p.start}>
                <rect className="hit" x={PL + i * bw} y={0} width={bw} height={H - PB} data-i={i} />
                {p.cents > 0 && <path className={`bar ${i === data.length - 1 ? "cur" : ""}`} d={d} data-i={i} />}
                <text className="ax" x={x + w / 2} y={H - 8} textAnchor="middle">
                  {label(mode, p.start)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className={`tip ${tipPoint ? "on" : ""}`} style={tip ? { left: tip.left, top: tip.top } : undefined}>
          {tipPoint && (
            <>
              <b>{formatARS(tipPoint.cents)}</b>
              {longLabel(mode, tipPoint.start)}
            </>
          )}
        </div>
      </div>
      <div className="chart-stats">
        <div>
          {m.best}
          <b>{formatARS(best)}</b>
        </div>
        <div>
          {m.avg}
          <b>{formatARS(average)}</b>
        </div>
        <div>
          Proyección {monthLabel}
          <b>{projectionCents === null ? "—" : formatARS(projectionCents)}</b>
        </div>
      </div>
      <details style={{ marginTop: 10 }}>
        <summary style={{ font: "600 12px var(--f-ui)", padding: "6px 0", color: "var(--cacao-2)", cursor: "pointer" }}>
          Ver como tabla
        </summary>
        <div className="tbl-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>{mode === "semanas" ? "Semana" : "Mes"}</th>
                <th className="num">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.start}>
                  <td>{longLabel(mode, p.start)}</td>
                  <td className="num">{formatARS(p.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
