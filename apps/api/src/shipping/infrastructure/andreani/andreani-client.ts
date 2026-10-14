/** Credenciales y contratos de la API REST de Andreani (developers.andreani.com). */
export type AndreaniConfig = {
  env: "qa" | "produccion";
  user: string;
  password: string;
  /** Código de cliente (lo da el comercial al dar de alta la cuenta). */
  client: string;
  contracts: { domicilio: string; sucursal: string };
};

export const andreaniBaseUrl = (env: AndreaniConfig["env"]) =>
  env === "produccion" ? "https://apis.andreani.com" : "https://apisqa.andreani.com";

export class AndreaniError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

const HOUR = 3_600_000;

/**
 * Cliente HTTP de Andreani: login con usuario y contraseña (Basic) → token de 24 h en el header
 * `x-authorization-token`, que va en cada llamada. Se renueva antes de vencer o si la API lo rechaza.
 */
export class AndreaniClient {
  private token: { value: string; at: number } | null = null;
  /** Login en curso (dos llamadas a la vez comparten el mismo). */
  private logging: Promise<string> | null = null;

  constructor(
    private readonly cfg: Pick<AndreaniConfig, "env" | "user" | "password">,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  get baseUrl() {
    return andreaniBaseUrl(this.cfg.env);
  }

  /** Llamada autenticada. `raw`: devuelve la respuesta tal cual (la etiqueta es un PDF). */
  async request(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers,
        "x-authorization-token": await this.login(),
      },
      signal: AbortSignal.timeout(20_000),
    });
    if ((res.status === 401 || res.status === 403) && !retried) {
      this.token = null;
      return this.request(path, init, true);
    }
    return res;
  }

  async json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.request(path, init);
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new AndreaniError(res.status, describe(body) ?? `Andreani respondió ${res.status}`, body);
    return body as T;
  }

  private async login(): Promise<string> {
    if (this.token && this.now() - this.token.at < 23 * HOUR) return this.token.value;
    this.logging ??= this.fetchToken().finally(() => {
      this.logging = null;
    });
    return this.logging;
  }

  private async fetchToken(): Promise<string> {
    const basic = Buffer.from(`${this.cfg.user}:${this.cfg.password}`).toString("base64");
    const res = await this.fetcher(`${this.baseUrl}/login`, {
      headers: { authorization: `Basic ${basic}` },
      signal: AbortSignal.timeout(15_000),
    });
    const value = res.headers.get("x-authorization-token");
    if (!res.ok || !value)
      throw new AndreaniError(res.status, "Andreani rechazó el usuario o la contraseña de la API (revisá el .env)");
    this.token = { value, at: this.now() };
    return value;
  }
}

/** Los errores de validación vienen como lista de { code, property, message } (planilla "Mensajes de error"). */
function describe(body: unknown): string | null {
  const list = Array.isArray(body) ? body : (body as { errors?: unknown[] } | null)?.errors;
  if (!Array.isArray(list) || !list.length) {
    const m = (body as { message?: string; detail?: string } | null)?.message ?? (body as { detail?: string })?.detail;
    return m ? `Andreani: ${m}` : null;
  }
  return `Andreani: ${list
    .map((e) => (e as { message?: string; property?: string }).message ?? (e as { property?: string }).property)
    .filter(Boolean)
    .join(" · ")}`;
}
