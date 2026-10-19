import { isValidElement, type ReactNode } from "react";
import type { GaluReply } from "./galu-engine";

/** El texto que se lee de una respuesta por reglas (para guardarla en el panel): sin etiquetas, `<br>` → salto. */
export function plainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return node.type === "br" ? "\n" : plainText(node.props.children);
  return "";
}

/**
 * La respuesta completa como la guarda el panel: los textos y, de las tarjetas, los nombres de las prendas
 * (el modelo nombra las prendas en su texto; acá van al final).
 */
export function replyText(out: GaluReply[]): string {
  return out
    .map((r) => (r.kind === "text" ? plainText(r.content) : r.products.map((p) => p.name).join(" · ")))
    .map((t) => t.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}
