import type { PublicTracking, ShippingOptions } from "@mini-galu/contracts";
import { CatalogService } from "../../catalog/application/catalog-service";
import type { Product } from "../../catalog/domain/product";
import { InMemoryProductRepository, InMemoryWaitlistRepository } from "../../catalog/testing/in-memory";
import { LocalDiskImageStorage } from "../../shared/media/image-storage";
import type { AssistantCatalog, AssistantOrders, AssistantShipping, LlmProvider } from "../application/ports";
import type { ChatTurn, ToolCall, ToolSpec } from "../domain/conversation";

type Step = { text?: string; toolCalls?: Omit<ToolCall, "id">[] };

/** Un "modelo" con guion: cada respuesta es el paso siguiente. Guarda lo que recibió para revisarlo en el test. */
export class ScriptedLlm implements LlmProvider {
  readonly name = "guion";
  calls: { system: string; turns: ChatTurn[]; tools: ToolSpec[] }[] = [];

  constructor(private readonly steps: Step[]) {}

  async respond(req: { system: string; turns: ChatTurn[]; tools: ToolSpec[] }, onText: (d: string) => void) {
    this.calls.push({ ...req, turns: [...req.turns] });
    const step = this.steps[this.calls.length - 1] ?? { text: "" };
    for (const w of (step.text ?? "").split(/(?<= )/)) if (w) onText(w);
    return {
      text: step.text ?? "",
      toolCalls: (step.toolCalls ?? []).map((c, i) => ({ ...c, id: `t${this.calls.length}-${i}` })),
    };
  }
}

/** El catálogo de verdad (casos de uso) sobre productos en memoria, como lo arma app.ts. */
export function memoryCatalog(products: Product[]): AssistantCatalog {
  const svc = new CatalogService(
    new InMemoryProductRepository(products),
    new InMemoryWaitlistRepository(),
    new LocalDiskImageStorage("http://api"),
  );
  return {
    search: (q) => svc.list(q),
    product: async (slug) => {
      const p = await svc.detail(slug).catch(() => null);
      return p?.status === "published" ? p : null;
    },
  };
}

export class MemoryOrders implements AssistantOrders {
  constructor(private readonly orders: PublicTracking[] = []) {}
  async track(number: string) {
    return this.orders.find((o) => o.number === number.trim().toUpperCase()) ?? null;
  }
}

export class FixedShipping implements AssistantShipping {
  async options(postalCode: string): Promise<ShippingOptions> {
    return {
      options: [
        { method: "domicilio", label: "Envío a domicilio", detail: `CP ${postalCode} · 3 a 5 días`, cents: 8_500_00 },
        { method: "sucursal", label: "Retiro en sucursal", detail: "Sucursal Centro", cents: 6_000_00 },
        { method: "taller", label: "Retiro en el taller", detail: "Villa Crespo", cents: 0 },
      ],
      pickupSlots: [],
      workshop: "Villa Crespo",
      branches: [],
    };
  }
}
