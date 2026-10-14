import { AUTOMATION_RULES, type AutomationRun } from "@mini-galu/contracts";
import { LayoutDashboard, Mail } from "lucide-react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Embroidery } from "@/ui/atoms/Embroidery";

const CHANNEL = {
  mail: { label: "Mail", icon: <Mail className="i-sm" /> },
  whatsapp: { label: "WhatsApp", icon: <BrandIcon name="whatsapp" /> },
  panel: { label: "Aviso en el panel", icon: <LayoutDashboard className="i-sm" /> },
} as const;

/** Registro de lo que se hizo solo — admin-automatizaciones.html → #log */
export function RunsTable({ runs, when }: { runs: AutomationRun[]; when: (iso: string) => string }) {
  if (!runs.length)
    return (
      <div className="empty-state">
        <Embroidery />
        <b>Todavía no se mandó nada</b>
        <span className="muted">Cuando se apruebe un pago o salga un pedido, queda anotado acá.</span>
      </div>
    );
  return (
    <div className="tbl-wrap">
      <table className="t stack" id="log">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Regla</th>
            <th>Qué pasó</th>
            <th>Canal</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td data-l="Hora" className="nowrap">
                {when(r.at)}
              </td>
              <td data-l="Regla">
                <b>{AUTOMATION_RULES[r.rule].title}</b>
              </td>
              <td className="full">
                {r.subject} · {r.detail}
              </td>
              <td data-l="Canal">
                <span className="meta-ico">
                  {CHANNEL[r.channel].icon} {CHANNEL[r.channel].label}
                </span>
              </td>
              <td data-l="Estado">
                <span className={`pill-status ${r.status === "ok" ? "st-ok" : "st-warn"}`}>
                  {r.status === "ok" ? "Enviado" : "Con aviso"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
