/**
 * Bloqueo por cuenta después de varios intentos fallidos de contraseña (además del límite por IP de Better Auth).
 * Cuenta por email, exista o no la cuenta, así la respuesta no revela qué mails están registrados.
 * En memoria: alcanza con una sola instancia de la API (con varias, pasarlo a la base).
 */
export class LoginGuard {
  private failures = new Map<string, { count: number; first: number; lockedUntil: number | null }>();

  constructor(
    private readonly max = 8,
    private readonly windowMs = 15 * 60_000,
    private readonly lockMs = 15 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Hasta cuándo está bloqueada (null si se puede intentar). */
  lockedUntil(email: string): Date | null {
    const f = this.failures.get(key(email));
    if (!f?.lockedUntil) return null;
    if (f.lockedUntil <= this.now()) {
      this.failures.delete(key(email));
      return null;
    }
    return new Date(f.lockedUntil);
  }

  /** Anota un intento fallido. `lockedNow`: este intento la bloqueó (para avisarle a la cuenta una sola vez). */
  fail(email: string): { lockedNow: boolean } {
    const k = key(email);
    const now = this.now();
    const f = this.failures.get(k);
    const fresh = !f || now - f.first > this.windowMs;
    const next = fresh ? { count: 1, first: now, lockedUntil: null } : { ...f, count: f.count + 1 };
    const lockedNow = !next.lockedUntil && next.count >= this.max;
    if (lockedNow) next.lockedUntil = now + this.lockMs;
    this.failures.set(k, next);
    return { lockedNow };
  }

  succeed(email: string) {
    this.failures.delete(key(email));
  }
}

const key = (email: string) => email.trim().toLowerCase();
