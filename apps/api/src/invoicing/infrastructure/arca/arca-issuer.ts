import { type AuthorizeRequest, type InvoiceIssuer, InvoiceRejected } from "../../application/ports";
import type { ArcaConfig, Wsaa } from "./wsaa";
import { escapeXml, tag, tags, unescapeXml } from "./xml";

const WSFE = {
  homologacion: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  produccion: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
} as const;
const NS = "http://ar.gov.afip.dif.FEV1/";
const SERVICE = "wsfe";

/** Consumidor final sin identificar (DocTipo 99, DocNro 0) y su condición frente al IVA (RG 5616/2024). */
const CONSUMIDOR_FINAL = { docType: 99, ivaCondition: 5 };
/** Concepto 1: productos (no lleva fechas de servicio). */
const PRODUCTOS = 1;

/** Errores de ARCA que son del momento (reintentar sirve): número no correlativo y errores internos. */
const TRANSIENT_CODES = new Set(["10016", "500", "501", "502"]);
/** 600 (ValidacionDeToken): el ticket no sirve, se pide otro y se reintenta una vez. */
const AUTH_CODES = new Set(["600"]);

const ymd = (iso: string) => iso.replace(/-/g, "");
const isoDate = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
const amount = (cents: number) => (cents / 100).toFixed(2);

type ArcaError = { code: string; msg: string };
const errors = (xml: string, list: string, item: string): ArcaError[] =>
  tags(tag(xml, list) ?? "", item).map((e) => ({
    code: (tag(e, "Code") ?? "").trim(),
    msg: unescapeXml(tag(e, "Msg") ?? "").trim(),
  }));
const describe = (es: ArcaError[]) => es.map((e) => `${e.code}: ${e.msg}`).join(" · ");

/** El cuerpo del comprobante para FECAESolicitar, en el orden que pide el WSDL. */
export function caeRequestXml(cfg: Pick<ArcaConfig, "cuit" | "pointOfSale">, r: AuthorizeRequest): string {
  const total = amount(r.totalCents);
  const a = r.associated;
  return `<ar:FeCAEReq>
<ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${cfg.pointOfSale}</ar:PtoVta><ar:CbteTipo>${r.cbteType}</ar:CbteTipo></ar:FeCabReq>
<ar:FeDetReq><ar:FECAEDetRequest>
<ar:Concepto>${PRODUCTOS}</ar:Concepto><ar:DocTipo>${CONSUMIDOR_FINAL.docType}</ar:DocTipo><ar:DocNro>0</ar:DocNro>
<ar:CbteDesde>${r.number}</ar:CbteDesde><ar:CbteHasta>${r.number}</ar:CbteHasta><ar:CbteFch>${ymd(r.issuedOn)}</ar:CbteFch>
<ar:ImpTotal>${total}</ar:ImpTotal><ar:ImpTotConc>0</ar:ImpTotConc><ar:ImpNeto>${total}</ar:ImpNeto><ar:ImpOpEx>0</ar:ImpOpEx><ar:ImpTrib>0</ar:ImpTrib><ar:ImpIVA>0</ar:ImpIVA>
<ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz>
<ar:CondicionIVAReceptorId>${CONSUMIDOR_FINAL.ivaCondition}</ar:CondicionIVAReceptorId>${
    a
      ? `
<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${a.cbteType}</ar:Tipo><ar:PtoVta>${a.pointOfSale}</ar:PtoVta><ar:Nro>${a.number}</ar:Nro><ar:Cuit>${escapeXml(cfg.cuit)}</ar:Cuit><ar:CbteFch>${ymd(a.issuedOn)}</ar:CbteFch></ar:CbteAsoc></ar:CbtesAsoc>`
      : ""
  }
</ar:FECAEDetRequest></ar:FeDetReq>
</ar:FeCAEReq>`;
}

/** Lo que contestó FECAESolicitar: el CAE, o por qué no (rechazo de ARCA o error del momento). */
export function parseCaeResponse(xml: string): { cae: string; caeExpiresOn: string } {
  const det = tag(xml, "FECAEDetResponse") ?? "";
  const result = (tag(det, "Resultado") ?? tag(xml, "Resultado") ?? "").trim();
  const cae = (tag(det, "CAE") ?? "").trim();
  const vto = (tag(det, "CAEFchVto") ?? "").trim();
  if (result === "A" && cae && vto) return { cae, caeExpiresOn: isoDate(vto) };
  const es = [...errors(xml, "Errors", "Err"), ...errors(det, "Observaciones", "Obs")];
  const message = `ARCA: ${describe(es) || "no autorizó el comprobante"}`;
  if (es.some((e) => TRANSIENT_CODES.has(e.code)) || !result) throw new Error(message);
  throw new InvoiceRejected(message);
}

/**
 * Facturación electrónica de ARCA (WSFEv1) con el certificado de Gaby. Homologación para probar con un certificado
 * de prueba; producción con el del punto de venta "RECE para aplicativo y web services".
 */
export class ArcaIssuer implements InvoiceIssuer {
  readonly mode: "homologacion" | "produccion";
  readonly cuit: string;
  readonly pointOfSale: number;

  constructor(
    private readonly cfg: ArcaConfig,
    private readonly wsaa: Wsaa,
    private readonly http: typeof fetch = fetch,
  ) {
    this.mode = cfg.env;
    this.cuit = cfg.cuit;
    this.pointOfSale = cfg.pointOfSale;
  }

  async lastNumber(cbteType: number): Promise<number> {
    const xml = await this.call(
      "FECompUltimoAutorizado",
      `<ar:PtoVta>${this.pointOfSale}</ar:PtoVta><ar:CbteTipo>${cbteType}</ar:CbteTipo>`,
    );
    const n = tag(xml, "CbteNro");
    if (n === null) throw new Error(`ARCA: ${describe(errors(xml, "Errors", "Err")) || "no informó el último número"}`);
    return Number(n);
  }

  async find(cbteType: number, number: number) {
    const xml = await this.call(
      "FECompConsultar",
      `<ar:FeCompConsReq><ar:CbteTipo>${cbteType}</ar:CbteTipo><ar:CbteNro>${number}</ar:CbteNro><ar:PtoVta>${this.pointOfSale}</ar:PtoVta></ar:FeCompConsReq>`,
    );
    const get = tag(xml, "ResultGet");
    if (!get) return null;
    const cae = (tag(get, "CodAutorizacion") ?? "").trim();
    if (!cae) return null;
    return {
      cae,
      caeExpiresOn: isoDate((tag(get, "FchVto") ?? "").trim()),
      issuedOn: isoDate((tag(get, "CbteFch") ?? "").trim()),
      totalCents: Math.round(Number(tag(get, "ImpTotal")) * 100),
    };
  }

  async authorize(r: AuthorizeRequest) {
    return parseCaeResponse(await this.call("FECAESolicitar", caeRequestXml(this.cfg, r)));
  }

  private async call(method: string, body: string, retried = false): Promise<string> {
    const t = await this.wsaa.ticket(SERVICE);
    const res = await this.http(WSFE[this.cfg.env], {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${NS}${method}"` },
      body: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}"><soap:Body><ar:${method}><ar:Auth><ar:Token>${escapeXml(t.token)}</ar:Token><ar:Sign>${escapeXml(t.sign)}</ar:Sign><ar:Cuit>${escapeXml(this.cuit)}</ar:Cuit></ar:Auth>${body}</ar:${method}></soap:Body></soap:Envelope>`,
      signal: AbortSignal.timeout(30_000),
    });
    const xml = await res.text();
    const fault = tag(xml, "faultstring");
    if (fault) throw new Error(`ARCA (${method}): ${unescapeXml(fault)}`);
    if (!res.ok) throw new Error(`ARCA (${method}): HTTP ${res.status}`);
    if (!retried && errors(xml, "Errors", "Err").some((e) => AUTH_CODES.has(e.code))) {
      this.wsaa.forget(SERVICE);
      return this.call(method, body, true);
    }
    return xml;
  }
}
