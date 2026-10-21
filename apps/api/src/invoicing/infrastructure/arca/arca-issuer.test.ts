import { generateKeyPairSync } from "node:crypto";
import forge from "node-forge";
import { describe, expect, it } from "vitest";
import { InvoiceRejected } from "../../application/ports";
import { ArcaIssuer, caeRequestXml, parseCaeResponse } from "./arca-issuer";
import { type ArcaTicket, loginTicketRequest, parseLoginResponse, signTicketRequest, Wsaa } from "./wsaa";

/** Certificado de prueba autofirmado (el de ARCA lo firma su CA, pero la forma es la misma). */
function testCert() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.publicKeyFromPem(publicKey.export({ type: "spki", format: "pem" }).toString());
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-01-01");
  cert.validity.notAfter = new Date("2028-01-01");
  const attrs = [
    { name: "commonName", value: "minigalu" },
    { type: "2.5.4.5", value: "CUIT 20123456786" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(forge.pki.privateKeyFromPem(keyPem), forge.md.sha256.create());
  return { certPem: forge.pki.certificateToPem(cert), keyPem };
}

const soap = (body: string) =>
  `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${body}</soap:Body></soap:Envelope>`;

const CFG = { env: "homologacion" as const, cuit: "20123456786", pointOfSale: 3, cert: "", key: "" };

describe("WSAA (ticket de acceso)", () => {
  it("arma el TRA y lo firma como CMS con el contenido adentro", () => {
    const { certPem, keyPem } = testCert();
    const tra = loginTicketRequest("wsfe", new Date("2026-10-21T15:00:00Z"));
    expect(tra).toContain("<generationTime>2026-10-21T14:50:00Z</generationTime>");
    expect(tra).toContain("<expirationTime>2026-10-21T15:10:00Z</expirationTime>");
    expect(tra).toContain("<service>wsfe</service>");

    const cms = signTicketRequest(tra, certPem, keyPem);
    const der = forge.util.decode64(cms);
    const msg = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der)) as forge.pkcs7.PkcsSignedData;
    expect(msg.certificates).toHaveLength(1);
    // el TRA va adentro (no "detached"), como lo pide WSAA
    expect(der).toContain("<service>wsfe</service>");
  });

  it("lee el ticket de la respuesta (viene escapado adentro de loginCmsReturn) y el error de ARCA", () => {
    const t = parseLoginResponse(
      soap(
        `<loginCmsResponse><loginCmsReturn>&lt;?xml version="1.0"?&gt;&lt;loginTicketResponse&gt;&lt;header&gt;&lt;expirationTime&gt;2026-10-22T03:00:00.000-03:00&lt;/expirationTime&gt;&lt;/header&gt;&lt;credentials&gt;&lt;token&gt;PD94bWw=&lt;/token&gt;&lt;sign&gt;abc+/=&lt;/sign&gt;&lt;/credentials&gt;&lt;/loginTicketResponse&gt;</loginCmsReturn></loginCmsResponse>`,
      ),
    );
    expect(t).toEqual({ token: "PD94bWw=", sign: "abc+/=", expiresAt: new Date("2026-10-22T06:00:00Z") });
    expect(() =>
      parseLoginResponse(
        soap(
          "<soap:Fault><faultcode>ns1:coe.alreadyAuthenticated</faultcode><faultstring>El CEE ya posee un TA valido para el acceso al WSN solicitado</faultstring></soap:Fault>",
        ),
      ),
    ).toThrow("El CEE ya posee un TA valido");
  });

  it("reusa el ticket guardado mientras esté vigente (sobrevive a un reinicio)", async () => {
    const saved: ArcaTicket = { token: "t", sign: "s", expiresAt: new Date("2026-10-21T20:00:00Z") };
    let logins = 0;
    const wsaa = new Wsaa(
      CFG,
      { get: async () => saved, save: async () => {} },
      (async () => {
        logins++;
        return new Response("");
      }) as typeof fetch,
      () => new Date("2026-10-21T15:00:00Z"),
    );
    expect(await wsaa.ticket("wsfe")).toBe(saved);
    expect(logins).toBe(0);
  });
});

describe("WSFEv1 (CAE)", () => {
  const req = { cbteType: 11, number: 42, issuedOn: "2026-10-21", totalCents: 59_000_50, associated: null };

  it("pide la factura C a consumidor final, en pesos, sin IVA y en el orden del WSDL", () => {
    const xml = caeRequestXml(CFG, req).replace(/\n/g, "");
    expect(xml).toContain("<ar:PtoVta>3</ar:PtoVta><ar:CbteTipo>11</ar:CbteTipo>");
    expect(xml).toContain(
      "<ar:Concepto>1</ar:Concepto><ar:DocTipo>99</ar:DocTipo><ar:DocNro>0</ar:DocNro><ar:CbteDesde>42</ar:CbteDesde><ar:CbteHasta>42</ar:CbteHasta><ar:CbteFch>20261021</ar:CbteFch>",
    );
    expect(xml).toContain(
      "<ar:ImpTotal>59000.50</ar:ImpTotal><ar:ImpTotConc>0</ar:ImpTotConc><ar:ImpNeto>59000.50</ar:ImpNeto><ar:ImpOpEx>0</ar:ImpOpEx><ar:ImpTrib>0</ar:ImpTrib><ar:ImpIVA>0</ar:ImpIVA><ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz><ar:CondicionIVAReceptorId>5</ar:CondicionIVAReceptorId>",
    );
    expect(xml).not.toContain("CbtesAsoc");
  });

  it("la nota de crédito C lleva la factura que anula", () => {
    const xml = caeRequestXml(CFG, {
      ...req,
      cbteType: 13,
      number: 1,
      associated: { cbteType: 11, pointOfSale: 3, number: 42, issuedOn: "2026-10-20" },
    }).replace(/\n/g, "");
    expect(xml).toContain(
      "<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>11</ar:Tipo><ar:PtoVta>3</ar:PtoVta><ar:Nro>42</ar:Nro><ar:Cuit>20123456786</ar:Cuit><ar:CbteFch>20261020</ar:CbteFch></ar:CbteAsoc></ar:CbtesAsoc>",
    );
  });

  it("aprobada: CAE y vencimiento; rechazada: InvoiceRejected con lo que observó ARCA; número cruzado: se reintenta", () => {
    expect(
      parseCaeResponse(
        soap(
          "<FECAESolicitarResponse><FECAESolicitarResult><FeCabResp><Resultado>A</Resultado></FeCabResp><FeDetResp><FECAEDetResponse><Resultado>A</Resultado><CAE>76123456789012</CAE><CAEFchVto>20261031</CAEFchVto></FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse>",
        ),
      ),
    ).toEqual({ cae: "76123456789012", caeExpiresOn: "2026-10-31" });

    const rejected = () =>
      parseCaeResponse(
        soap(
          "<FECAESolicitarResponse><FECAESolicitarResult><FeCabResp><Resultado>R</Resultado></FeCabResp><FeDetResp><FECAEDetResponse><Resultado>R</Resultado><Observaciones><Obs><Code>10242</Code><Msg>El campo Condicion IVA receptor no es valido</Msg></Obs></Observaciones><CAE></CAE></FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse>",
        ),
      );
    expect(rejected).toThrow(InvoiceRejected);
    expect(rejected).toThrow("10242: El campo Condicion IVA receptor no es valido");

    const crossed = () =>
      parseCaeResponse(
        soap(
          "<FECAESolicitarResponse><FECAESolicitarResult><FeCabResp><Resultado>R</Resultado></FeCabResp><Errors><Err><Code>10016</Code><Msg>El numero o fecha del comprobante no se corresponde con el proximo a autorizar</Msg></Err></Errors></FECAESolicitarResult></FECAESolicitarResponse>",
        ),
      );
    expect(crossed).toThrow("10016");
    expect(crossed).not.toThrow(InvoiceRejected);
  });

  it("consulta el último número y, si ARCA no acepta el ticket, pide otro y reintenta una vez", async () => {
    const calls: string[] = [];
    let tickets = 0;
    const wsaa = {
      ticket: async () => ({ token: `tok${++tickets}`, sign: "s", expiresAt: new Date() }),
      forget: () => {},
    } as unknown as Wsaa;
    const http = (async (_url: string, init: RequestInit) => {
      const body = String(init.body);
      calls.push(String((init.headers as Record<string, string>).SOAPAction));
      return new Response(
        body.includes("tok1")
          ? soap(
              "<FECompUltimoAutorizadoResponse><FECompUltimoAutorizadoResult><Errors><Err><Code>600</Code><Msg>ValidacionDeToken: No validaron las credenciales</Msg></Err></Errors></FECompUltimoAutorizadoResult></FECompUltimoAutorizadoResponse>",
            )
          : soap(
              "<FECompUltimoAutorizadoResponse><FECompUltimoAutorizadoResult><PtoVta>3</PtoVta><CbteTipo>11</CbteTipo><CbteNro>41</CbteNro></FECompUltimoAutorizadoResult></FECompUltimoAutorizadoResponse>",
            ),
      );
    }) as unknown as typeof fetch;
    const arca = new ArcaIssuer(CFG, wsaa, http);
    expect(await arca.lastNumber(11)).toBe(41);
    expect(calls).toEqual([
      '"http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado"',
      '"http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado"',
    ]);
  });

  it("encuentra un comprobante ya emitido (para no duplicarlo) y null si no existe", async () => {
    const wsaa = {
      ticket: async () => ({ token: "t", sign: "s", expiresAt: new Date() }),
      forget() {},
    } as unknown as Wsaa;
    const reply = (xml: string) => (async () => new Response(soap(xml))) as unknown as typeof fetch;
    const found = new ArcaIssuer(
      CFG,
      wsaa,
      reply(
        "<FECompConsultarResponse><FECompConsultarResult><ResultGet><CbteFch>20261021</CbteFch><ImpTotal>59000.5</ImpTotal><CodAutorizacion>76123456789012</CodAutorizacion><FchVto>20261031</FchVto><Resultado>A</Resultado></ResultGet></FECompConsultarResult></FECompConsultarResponse>",
      ),
    );
    expect(await found.find(11, 42)).toEqual({
      cae: "76123456789012",
      caeExpiresOn: "2026-10-31",
      issuedOn: "2026-10-21",
      totalCents: 59_000_50,
    });
    const missing = new ArcaIssuer(
      CFG,
      wsaa,
      reply(
        "<FECompConsultarResponse><FECompConsultarResult><Errors><Err><Code>602</Code><Msg>Sin Resultados</Msg></Err></Errors></FECompConsultarResult></FECompConsultarResponse>",
      ),
    );
    expect(await missing.find(11, 43)).toBeNull();
  });
});
