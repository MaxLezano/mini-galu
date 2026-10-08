/** Argentina es UTC−3 todo el año (sin horario de verano). */
const AR_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Franjas de retiro en el taller por día de la semana (0 = domingo). Fase 5: editables desde el panel. */
export const PICKUP_HOURS: Record<number, [number, number][]> = {
  1: [
    [10, 13],
    [16, 19],
  ],
  2: [
    [10, 13],
    [16, 19],
  ],
  3: [
    [10, 13],
    [16, 19],
  ],
  4: [
    [10, 13],
    [16, 19],
  ],
  5: [
    [10, 13],
    [16, 19],
  ],
  6: [[10, 13]],
};

export type Slot = { id: string; label: string };

/**
 * Próximas franjas para retirar: desde mañana (el pedido se prepara en el día) y hasta `count` opciones.
 * id: "2026-10-08T10-13" (fecha y horas en hora argentina).
 */
export function pickupSlots(now: Date, count = 4): Slot[] {
  const slots: Slot[] = [];
  const ar = new Date(now.getTime() + AR_OFFSET_MS);
  for (let d = 1; slots.length < count && d < 15; d++) {
    const day = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate() + d));
    for (const [from, to] of PICKUP_HOURS[day.getUTCDay()] ?? []) {
      if (slots.length >= count) break;
      const date = day.toISOString().slice(0, 10);
      slots.push({
        id: `${date}T${from}-${to}`,
        label: `${DAYS[day.getUTCDay()]} ${day.getUTCDate()} · ${from} a ${to} h`,
      });
    }
  }
  return slots;
}

/** "2026-10-08T10-13" → "Jue 8 · 10 a 13 h" (null si el id no tiene esa forma). */
export function slotLabel(id: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{1,2})-(\d{1,2})$/.exec(id);
  if (!m) return null;
  const day = new Date(`${m[1]}T12:00:00Z`);
  return `${DAYS[day.getUTCDay()]} ${day.getUTCDate()} · ${m[2]} a ${m[3]} h`;
}

export function isValidSlot(id: string, now: Date): boolean {
  return pickupSlots(now, 12).some((s) => s.id === id);
}
