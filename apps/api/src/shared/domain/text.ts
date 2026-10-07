/** Minúsculas y sin tildes: "Comunión" → "comunion". */
export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Saca plurales simples para que "vestidos rojos" encuentre "Vestido Rojo". */
export const stem = (w: string) => w.replace(/(es|s)$/, "");
