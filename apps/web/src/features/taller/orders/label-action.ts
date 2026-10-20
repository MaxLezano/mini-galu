import type { BulkLabels } from "@mini-galu/contracts";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

/**
 * "Generar etiqueta Andreani": da de alta el envío y abre el PDF para imprimir. La pestaña se abre antes de esperar
 * a la API (si se abre después, el navegador la bloquea por no venir directo del clic).
 */
export async function generateLabel(number: string): Promise<{ trackingNumber: string } | { error: string }> {
  const tab = window.open("about:blank", "_blank");
  try {
    const r = await adminApi.createLabel(number);
    if (tab) tab.location.href = adminApi.labelUrl(number);
    return { trackingNumber: r.trackingNumber };
  } catch (e) {
    tab?.close();
    return { error: e instanceof ApiRequestError ? e.message : "No se pudo generar la etiqueta" };
  }
}

/** "Etiquetas" de la selección: genera las que faltan y abre un solo PDF con todas (la pestaña, igual que arriba). */
export async function generateLabels(numbers: string[]): Promise<BulkLabels | { error: string }> {
  const tab = window.open("about:blank", "_blank");
  try {
    const r = await adminApi.createLabels(numbers);
    if (r.labeled.length && tab) tab.location.href = adminApi.labelsUrl(r.labeled);
    else tab?.close();
    return r;
  } catch (e) {
    tab?.close();
    return { error: e instanceof ApiRequestError ? e.message : "No se pudieron generar las etiquetas" };
  }
}
