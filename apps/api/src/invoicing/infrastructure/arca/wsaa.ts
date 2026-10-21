import forge from "node-forge";
import { tag, unescapeXml } from "./xml";

export type ArcaEnv = "homologacion" | "produccion";
export type ArcaConfig = {
  env: ArcaEnv;
  /** CUIT de Gaby, sin guiones: el del certificado. */
  cuit: string;
  /** Punto de venta "RECE para aplicativo y web services" dado de alta en ARCA. */
  pointOfSale: number;
  /** Certificado (PEM) que da ARCA para el alias del sistema y la clave privada con que se pidió. */
  cert: string;
  key: string;
};

export type ArcaTicket = { token: string; sign: string; expiresAt: Date };

/** Donde se guarda el ticket entre reinicios: ARCA no da otro mientras el anterior siga vigente. */
export interface ArcaTicketStore {
  get(service: string): Promise<ArcaTicket | null>;
  save(service: string, t: ArcaTicket): Promise<void>;
}

const WSAA: Record<ArcaEnv, string> = {
  homologacion: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
  produccion: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
};

/** Se renueva 10 minutos antes de que venza. */
const MARGIN_MS = 10 * 60_000;

/** Pedido de acceso (TRA) a un servicio: vale de 10 minutos antes a 10 minutos después (por la hora del servidor). */
export function loginTicketRequest(service: string, now: Date): string {
  const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>
    <generationTime>${iso(now.getTime() - 10 * 60_000)}</generationTime>
    <expirationTime>${iso(now.getTime() + 10 * 60_000)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

/** El TRA firmado con el certificado (CMS/PKCS#7 con el contenido adentro), en base64 como lo pide WSAA. */
export function signTicketRequest(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: forge.pki.privateKeyFromPem(keyPem),
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256 as string,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType as string, value: forge.pki.oids.data as string },
      { type: forge.pki.oids.messageDigest as string },
      // forge acepta la fecha aunque los tipos digan string
      { type: forge.pki.oids.signingTime as string, value: new Date() as unknown as string },
    ],
  });
  p7.sign();
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

/** Respuesta de LoginCms: el ticket, o el error de ARCA (faultstring). */
export function parseLoginResponse(soap: string): ArcaTicket {
  const ret = tag(soap, "loginCmsReturn");
  if (!ret) throw new Error(`ARCA (WSAA): ${unescapeXml(tag(soap, "faultstring") ?? "respuesta sin ticket")}`);
  const xml = unescapeXml(ret);
  const token = tag(xml, "token");
  const sign = tag(xml, "sign");
  const exp = tag(xml, "expirationTime");
  if (!(token && sign && exp)) throw new Error("ARCA (WSAA): el ticket vino incompleto");
  return { token, sign, expiresAt: new Date(exp) };
}

/** Ticket de acceso (WSAA): uno por servicio, cada ~12 h, compartido por todos los pedidos. */
export class Wsaa {
  private cache = new Map<string, ArcaTicket>();
  private pending = new Map<string, Promise<ArcaTicket>>();
  /** Servicios cuyo ticket guardado ARCA ya no acepta. */
  private stale = new Set<string>();

  constructor(
    private readonly cfg: ArcaConfig,
    private readonly store: ArcaTicketStore,
    private readonly http: typeof fetch = fetch,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async ticket(service: string): Promise<ArcaTicket> {
    const fresh = (t: ArcaTicket | null | undefined): t is ArcaTicket =>
      !!t && t.expiresAt.getTime() - MARGIN_MS > this.clock().getTime();
    const cached = this.cache.get(service);
    if (fresh(cached)) return cached;
    const inFlight = this.pending.get(service);
    if (inFlight) return inFlight;
    const p = (async () => {
      const saved = this.stale.has(service) ? null : await this.store.get(service);
      if (fresh(saved)) return saved;
      const t = await this.login(service);
      await this.store.save(service, t);
      this.stale.delete(service);
      return t;
    })();
    this.pending.set(service, p);
    try {
      const t = await p;
      this.cache.set(service, t);
      return t;
    } finally {
      this.pending.delete(service);
    }
  }

  /** ARCA dijo que el ticket no sirve (lo dio de baja o cambió el certificado): el próximo se pide de nuevo. */
  forget(service: string) {
    this.cache.delete(service);
    this.stale.add(service);
  }

  private async login(service: string): Promise<ArcaTicket> {
    const cms = signTicketRequest(loginTicketRequest(service, this.clock()), this.cfg.cert, this.cfg.key);
    const res = await this.http(WSAA[this.cfg.env], {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' },
      body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`,
      signal: AbortSignal.timeout(20_000),
    });
    return parseLoginResponse(await res.text());
  }
}
