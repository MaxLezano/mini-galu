/** Fechas siempre en hora de Argentina, así el server y el navegador muestran lo mismo. */
const TZ = "America/Argentina/Buenos_Aires";

/** "18/10" */
export const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(new Date(iso));

/** "18 de octubre" */
export const longDate = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));

/** "14 de abril de 2027" */
export const longDateYear = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(
    new Date(iso),
  );

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

/** "6 oct" */
export const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: TZ })
    .format(new Date(iso))
    .replace(".", "");

/** "recién", "hace 25 min", "hace 2 h", "ayer", "4 oct" (como las tarjetas del tablero del mockup). */
export function relativeWhen(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 2) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const today = toArInputs(new Date(now).toISOString()).date;
  const day = toArInputs(iso).date;
  if (day === today) return `hace ${h} h`;
  const yesterday = toArInputs(new Date(now - 86_400_000).toISOString()).date;
  if (day === yesterday) return "ayer";
  return shortDate(iso);
}

/** "octubre" */
export const monthName = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: TZ }).format(new Date(iso));

/** "oct" */
export const monthShort = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: TZ }).format(new Date(iso)).replace(".", "");

/** "Martes 6 de octubre" */
export const dayTitle = (iso: string) => {
  const s = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })
    .format(new Date(iso))
    .replace(",", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Hora (0–23) en Argentina. */
export const arHour = (iso: string) => Number(toArInputs(iso).time.slice(0, 2));

/** "abr 2027" (vencimiento de una gift card). */
export const monthYear = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric", timeZone: TZ })
    .format(new Date(iso))
    .replace(".", "")
    .replace(" de ", " ");
