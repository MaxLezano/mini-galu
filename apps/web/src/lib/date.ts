/** Fechas siempre en hora de Argentina, así el server y el navegador muestran lo mismo. */
const TZ = "America/Argentina/Buenos_Aires";

/** "18/10" */
export const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(new Date(iso));

/** "18 de octubre" */
export const longDate = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
