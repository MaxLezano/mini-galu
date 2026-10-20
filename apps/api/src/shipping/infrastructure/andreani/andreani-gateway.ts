import { PACKAGE_PRESETS, type ShippingSettings } from "@mini-galu/contracts";
import { ConflictError } from "../../../shared/domain/errors";
import type { NewShipment, ShippingGateway, ShippingRates, ShippingSettingsStore } from "../../application/ports";
import type { CarrierEvent } from "../../domain/tracking";
import { type AndreaniClient, type AndreaniConfig, AndreaniError } from "./andreani-client";
import { type AndreaniTrace, carrierEvents } from "./events";

/** Teléfono para Andreani: solo números, sin el +54 ni el 9 de celular (máx. 15). */
const phone = (e164: string) => e164.replace(/\D/g, "").replace(/^549?/, "").slice(0, 15);
const cut = (s: string, n: number) => s.trim().slice(0, n);

/** Paquete por defecto del panel, en el formato de bultos de Andreani. */
export function bulto(settings: ShippingSettings | null) {
  const p = PACKAGE_PRESETS[settings?.package ?? "bolsa"];
  return {
    kilos: p.kilos,
    largoCm: p.largoCm,
    anchoCm: p.anchoCm,
    altoCm: p.altoCm,
    volumenCm: p.largoCm * p.anchoCm * p.altoCm,
  };
}

/** Cuerpo de POST /v2/ordenes-de-envio (planilla "api-orden-envio"): B2C, un bulto. */
export function orderBody(s: NewShipment, contracts: AndreaniConfig["contracts"]) {
  const from = s.from;
  if (!from) throw new ConflictError("Completá los datos de envío (origen, remitente y paquete) en Tienda y pagos");
  const o = from.origin;
  const destino =
    s.method === "sucursal"
      ? (() => {
          if (!s.branch) throw new ConflictError("El pedido no tiene la sucursal Andreani donde retira");
          return { sucursal: { id: s.branch.id } };
        })()
      : (() => {
          if (!s.address) throw new ConflictError("El pedido no tiene la dirección de entrega");
          return {
            postal: {
              codigoPostal: s.postalCode.replace(/\D/g, "").slice(0, 4),
              calle: cut(s.address.street, 40),
              numero: cut(s.address.number, 40),
              ...(s.address.unit ? { departamento: cut(s.address.unit, 20) } : {}),
              localidad: cut(s.city ?? "", 40),
              pais: "Argentina",
              ...(s.notes ? { componentesDeDireccion: [{ meta: "observaciones", contenido: cut(s.notes, 200) }] } : {}),
            },
          };
        })();
  return {
    contrato: s.method === "sucursal" ? contracts.sucursal : contracts.domicilio,
    idPedido: s.orderNumber,
    origen: {
      postal: {
        codigoPostal: o.postalCode,
        calle: cut(o.street, 40),
        numero: cut(o.number, 40),
        ...(o.unit ? { departamento: cut(o.unit, 20) } : {}),
        localidad: cut(o.city, 40),
        pais: "Argentina",
      },
    },
    destino,
    remitente: {
      nombreCompleto: cut(from.sender.name, 40),
      email: from.sender.email,
      ...(from.sender.taxId ? { documentoNumero: cut(from.sender.taxId.replace(/\D/g, ""), 20) } : {}),
      telefonos: [{ tipo: 1, numero: phone(from.sender.phone) }],
    },
    destinatario: [
      {
        nombreCompleto: cut(s.recipient.name, 40),
        email: cut(s.recipient.email, 40),
        telefonos: [{ tipo: 2, numero: phone(s.recipient.phone) }],
      },
    ],
    bultos: [bulto(from)],
  };
}

type OrderResponse = { estado?: string; bultos?: { numeroDeEnvio?: string }[] };

/**
 * Andreani de verdad (API REST v2/v3): alta de la orden de envío, etiqueta PDF y trazas para el seguimiento.
 * Se usa solo cuando están las credenciales en el .env; si no, FakeAndreani.
 */
export class AndreaniGateway implements ShippingGateway {
  readonly carrier = "andreani";
  readonly mode: "qa" | "produccion";

  constructor(
    private readonly api: AndreaniClient,
    private readonly cfg: Pick<AndreaniConfig, "env" | "contracts">,
  ) {
    this.mode = cfg.env;
  }

  async createShipment(s: NewShipment) {
    const r = await this.api.json<OrderResponse>("/v2/ordenes-de-envio", {
      method: "POST",
      body: JSON.stringify(orderBody(s, this.cfg.contracts)),
    });
    const trackingNumber = r.bultos?.[0]?.numeroDeEnvio;
    if (!trackingNumber) throw new AndreaniError(502, "Andreani no devolvió el número de envío", r);
    return { trackingNumber };
  }

  async events(trackingNumber: string): Promise<CarrierEvent[]> {
    const r = await this.api.json<{ eventos?: AndreaniTrace[] }>(
      `/v3/envios/${encodeURIComponent(trackingNumber)}/trazas`,
    );
    return carrierEvents(r.eventos ?? []);
  }

  async label(trackingNumber: string): Promise<Uint8Array> {
    const res = await this.api.request(`/v2/ordenes-de-envio/${encodeURIComponent(trackingNumber)}/etiquetas`, {
      headers: { accept: "application/pdf" },
    });
    if (!res.ok)
      throw new ConflictError(
        "Andreani todavía no tiene lista la etiqueta (el envío se está creando): probá de nuevo en un minuto",
      );
    return new Uint8Array(await res.arrayBuffer());
  }

  trackingUrl(trackingNumber: string) {
    return `https://www.andreani.com/envio/${encodeURIComponent(trackingNumber)}`;
  }
}

type Tarifa = { tarifaConIva?: { total?: string } };

/**
 * Cotización real con el contrato de la cuenta (GET /v1/tarifas). Si Andreani no responde, no hay precio (null): la
 * tienda lo dice y ofrece las otras formas de entrega.
 */
export class AndreaniRates implements ShippingRates {
  readonly available = true;

  constructor(
    private readonly api: AndreaniClient,
    private readonly cfg: Pick<AndreaniConfig, "client" | "contracts">,
    private readonly settings: ShippingSettingsStore,
  ) {}

  async quote(postalCode: string) {
    try {
      const b = bulto(await this.settings.get());
      const one = async (contrato: string) => {
        const q = new URLSearchParams({
          cpDestino: postalCode.replace(/\D/g, "").slice(0, 4),
          contrato,
          cliente: this.cfg.client,
          "bultos[0][volumen]": String(b.volumenCm),
          "bultos[0][kilos]": String(b.kilos),
          "bultos[0][largoCm]": String(b.largoCm),
          "bultos[0][anchoCm]": String(b.anchoCm),
          "bultos[0][altoCm]": String(b.altoCm),
        });
        const r = await this.api.json<Tarifa>(`/v1/tarifas?${q}`);
        const total = Number(r.tarifaConIva?.total);
        if (!Number.isFinite(total) || total <= 0) throw new Error("tarifa vacía");
        return Math.round(total * 100);
      };
      const [domicilio, sucursal] = await Promise.all([
        one(this.cfg.contracts.domicilio),
        one(this.cfg.contracts.sucursal),
      ]);
      return {
        domicilio: { cents: domicilio, detail: "Te lo lleva Andreani, con número de seguimiento" },
        sucursal: { cents: sucursal, detail: "Retirás en la sucursal Andreani que elijas" },
      };
    } catch (e) {
      console.warn("[envíos] Andreani no cotizó:", e instanceof Error ? e.message : e);
      return null;
    }
  }
}
