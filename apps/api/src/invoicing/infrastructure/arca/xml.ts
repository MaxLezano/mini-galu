/** Lo mínimo de XML para los web services de ARCA (respuestas chicas y con forma fija: no hace falta un parser). */

export const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch] ?? ch);

export const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

/** Contenido de cada `<name>…</name>` (con o sin prefijo de namespace). */
export function tags(xml: string, name: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}

export const tag = (xml: string, name: string): string | null => tags(xml, name)[0] ?? null;
