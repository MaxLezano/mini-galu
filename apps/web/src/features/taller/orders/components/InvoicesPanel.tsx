import { type AdminInvoice, formatARS, INVOICE_KINDS } from "@mini-galu/contracts";
import { FileText, RotateCw } from "lucide-react";

/** "2026-10-21" → "21/10/2026" (es una fecha sin hora: no pasa por la zona horaria). */
const dmy = (d: string | null) => d?.split("-").reverse().join("/") ?? "";

type Props = {
  invoices: AdminInvoice[];
  pdfUrl: (id: string) => string;
  busy: boolean;
  onRetry: () => void;
};

const STATUS: Record<AdminInvoice["status"], { label: string; cls: string }> = {
  emitida: { label: "Emitida", cls: "st-ok" },
  pendiente: { label: "Sin emitir", cls: "st-warn" },
  error: { label: "Con error", cls: "st-rose" },
  anulada: { label: "Anulada", cls: "st-muted" },
};

/**
 * Factura y nota de crédito del pedido (ARCA), en el detalle (sin mockup: lenguaje del detalle). Emitida: número, CAE
 * y el PDF; trabada: lo que respondió ARCA y "Reintentar".
 */
export function InvoicesPanel({ invoices, pdfUrl, busy, onRetry }: Props) {
  if (!invoices.length) return null;
  const stuck = invoices.some((i) => i.status === "pendiente" || i.status === "error");
  return (
    <div className="od-sec">
      <h4>Factura</h4>
      <dl className="kv2">
        {invoices.map((i) => (
          <div key={i.id} style={{ display: "contents" }}>
            <dt>{INVOICE_KINDS[i.kind]}</dt>
            <dd>
              <div className="od-invoice">
                <span>{i.label.slice(INVOICE_KINDS[i.kind].length).trim() || "—"}</span>
                <span className={`pill-status ${STATUS[i.status].cls}`}>{STATUS[i.status].label}</span>
                {i.status === "emitida" && (
                  <a className="link" href={pdfUrl(i.id)} target="_blank" rel="noopener">
                    <FileText className="i-sm" /> Ver PDF
                  </a>
                )}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {i.status === "emitida"
                  ? `${formatARS(i.totalCents)} · CAE ${i.cae} · ${dmy(i.issuedOn)}`
                  : i.status === "anulada"
                    ? "Se reintegró antes de emitirse"
                    : `${i.error ?? "ARCA no respondió"}${i.status === "pendiente" ? " · se reintenta sola" : ""}`}
                {i.simulated && i.status === "emitida" ? " · simulada, sin validez fiscal" : ""}
              </div>
            </dd>
          </div>
        ))}
      </dl>
      {stuck && (
        <div className="od-refund-cta">
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={onRetry}>
            <RotateCw className="i-sm" /> Reintentar con ARCA
          </button>
        </div>
      )}
    </div>
  );
}
