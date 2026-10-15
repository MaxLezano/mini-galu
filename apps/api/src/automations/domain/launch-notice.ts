/** "Aviso de lanzamiento": cuántos minutos antes de la salida se avisa a los anotados. */
export const LAUNCH_NOTICE_MINUTES = 60;

const AR_HOUR = new Intl.DateTimeFormat("es-AR", {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

/** "19 h" · "19:30 h" (hora de Argentina). */
export function launchHour(d: Date): string {
  const [h, m] = AR_HOUR.format(d).split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)}:${m} h`;
}
