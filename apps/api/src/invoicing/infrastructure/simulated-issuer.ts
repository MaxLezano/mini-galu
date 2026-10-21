import { randomInt } from "node:crypto";
import type { AuthorizeRequest, InvoiceIssuer } from "../application/ports";

/**
 * Sin credenciales de ARCA (local y CI): numera a partir de lo ya emitido en la base y da un CAE inventado. El PDF
 * sale marcado "sin validez fiscal".
 */
export class SimulatedIssuer implements InvoiceIssuer {
  readonly mode = "simulado" as const;
  readonly cuit = "20000000001";
  readonly pointOfSale = 1;

  constructor(private readonly last: (cbteType: number, pointOfSale: number) => Promise<number>) {}

  lastNumber(cbteType: number) {
    return this.last(cbteType, this.pointOfSale);
  }

  async find() {
    return null;
  }

  async authorize(r: AuthorizeRequest) {
    const vto = new Date(`${r.issuedOn}T12:00:00Z`);
    vto.setUTCDate(vto.getUTCDate() + 10);
    return {
      cae: `7${Array.from({ length: 13 }, () => randomInt(10)).join("")}`,
      caeExpiresOn: vto.toISOString().slice(0, 10),
    };
  }
}

/** Producción sin ARCA conectado: no se inventa un CAE. Los pedidos quedan sin facturar (el panel lo avisa). */
export class NoIssuer implements InvoiceIssuer {
  readonly mode = "produccion" as const;
  readonly cuit = "";
  readonly pointOfSale = 0;

  private fail(): never {
    throw new Error("ARCA no está conectado: cargá ARCA_CUIT, ARCA_PUNTO_VENTA, ARCA_CERT y ARCA_KEY en el .env");
  }
  async lastNumber(): Promise<number> {
    this.fail();
  }
  async find(): Promise<null> {
    this.fail();
  }
  async authorize(): Promise<never> {
    this.fail();
  }
}
