/**
 * Programador simple en proceso: corre tareas cada N segundos y nunca dos veces a la vez la misma.
 * Fase 6: se reemplaza por pg-boss (cola sobre Postgres) para tener reintentos y varias instancias.
 */
export class IntervalScheduler {
  private timers: ReturnType<typeof setInterval>[] = [];

  every(seconds: number, name: string, task: () => Promise<unknown>) {
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        await task();
      } catch (e) {
        console.error(`[programador] ${name}:`, e);
      } finally {
        running = false;
      }
    };
    const t = setInterval(run, seconds * 1000);
    t.unref();
    this.timers.push(t);
    void run();
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }
}
