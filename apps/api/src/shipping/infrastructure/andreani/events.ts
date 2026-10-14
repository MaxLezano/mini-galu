import type { CarrierCode, CarrierEvent } from "../../domain/tracking";

/** Una traza de GET /v3/envios/{numero}/trazas (planilla "api-tracking-pullv3"). */
export type AndreaniTrace = {
  Fecha: string;
  Ciclo?: string | null;
  Evento: string;
  Motivo?: string | null;
  Submotivo?: string | null;
  Estado?: string | null;
  Sucursal?: string | null;
  Comentario?: string | null;
};

/** Ciclos del envío hacia el cliente ("Maestro de eventos y estados" → DescripcionCiclos). */
const FORWARD = new Set(["distribution", "directo", "resend", "reenvio"]);
const RETURN = new Set(["drop", "devolucion"]);

/** Eventos de Andreani que le sirven al cliente, con el paso del seguimiento al que corresponden. */
const MAP: Record<string, [CarrierCode, string]> = {
  Admision: ["picked_up", "Recibido por Andreani"],
  AltaAutomatica: ["picked_up", "Recibido por Andreani"],
  EnvioConsolidado: ["in_transit", "En viaje hacia la sucursal de destino"],
  EnvioDespachado: ["in_transit", "En viaje hacia la sucursal de destino"],
  ExpedicionHojaDeRutaCabecera: ["in_transit", "En viaje hacia la sucursal de destino"],
  ExpedicionHojaDeRutaDeViaje: ["in_transit", "En viaje hacia la sucursal de destino"],
  RecepcionEnSucursalDestino: ["hub", "Llegó a la sucursal de destino"],
  Distribucion: ["out_for_delivery", "Salió a reparto"],
  ComienzoCustodiaEnSucursal: ["at_branch", "Listo para retirar en la sucursal"],
  IncorporarMarcaDeCustodia: ["at_branch", "Listo para retirar en la sucursal"],
  EnvioEntregado: ["delivered", "Entregado"],
  EnvioNoEntregado: ["issue", "No se pudo entregar"],
  Siniestro: ["issue", "Hubo un problema con el envío"],
};

/** Las trazas vienen en hora de Argentina sin zona ("2025-10-08T12:19:04.054"). */
export function traceDate(s: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}-03:00`);
}

/**
 * Traduce una traza al recorrido del seguimiento. Lo interno del correo (impresiones, asignaciones, hojas de ruta
 * repetidas) se descarta: null.
 */
export function toCarrierEvent(t: AndreaniTrace): CarrierEvent | null {
  const ciclo = (t.Ciclo ?? "").toLowerCase();
  const at = traceDate(t.Fecha);
  const location = t.Sucursal?.trim() || null;
  if (RETURN.has(ciclo))
    return t.Evento === "EnvioEntregado" || t.Evento === "EnvioRendido"
      ? { code: "issue", title: "El envío volvió al remitente", location, at }
      : null;
  if (ciclo && !FORWARD.has(ciclo) && ciclo !== "siniestro") return null;
  if (t.Evento === "Visita") {
    if (t.Motivo === "Entregado") return { code: "delivered", title: "Entregado", location, at };
    return t.Motivo ? { code: "issue", title: `Visita sin éxito: ${t.Motivo.toLowerCase()}`, location, at } : null;
  }
  const m = MAP[t.Evento];
  if (!m) return null;
  const [code, title] = m;
  const why = code === "issue" && t.Motivo ? `: ${t.Motivo.toLowerCase()}` : "";
  return { code, title: title + why, location, at };
}

/** Todas las trazas útiles, en orden y sin repetir el mismo paso en el mismo momento. */
export function carrierEvents(traces: AndreaniTrace[]): CarrierEvent[] {
  const seen = new Set<string>();
  return traces
    .map(toCarrierEvent)
    .filter((e): e is CarrierEvent => e !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter((e) => {
      const k = `${e.code}|${e.at.getTime()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}
