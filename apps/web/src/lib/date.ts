/** Fechas siempre en hora de Argentina, así el server y el navegador muestran lo mismo. */
const TZ = "America/Argentina/Buenos_Aires";

/** "18/10" */
export const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(new Date(iso));

/** "18 de octubre" */
export const longDate = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));

/** "domingo, 18 de octubre · 10 h" */
export const launchWhen = (iso: string) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(
    d,
  );
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(d);
  return `${day} · ${time.replace(/:00$/, "")} h`;
};

/** ISO → { date: "2026-10-18", time: "10:00" } en hora de Argentina (para los inputs date/time). */
export function toArInputs(iso: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
  };
}

/** Inputs date/time (hora de Argentina, UTC−3 todo el año) → ISO con offset. */
export const fromArInputs = (date: string, time: string) => `${date}T${time || "10:00"}:00-03:00`;

export const daysUntil = (iso: string, now = Date.now()) => Math.ceil((new Date(iso).getTime() - now) / 864e5);
