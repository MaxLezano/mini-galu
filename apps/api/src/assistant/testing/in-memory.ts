import type {
  AssistantFact,
  AssistantFactInput,
  AssistantSettings,
  InstallmentPlan,
  PublicTracking,
  ShippingOptions,
} from "@mini-galu/contracts";
import { CatalogService } from "../../catalog/application/catalog-service";
import type { Product } from "../../catalog/domain/product";
import { InMemoryProductRepository, InMemoryWaitlistRepository } from "../../catalog/testing/in-memory";
import { LocalDiskImageStorage } from "../../shared/media/image-storage";
import type {
  AssistantCatalog,
  AssistantMemory,
  AssistantOrders,
  AssistantPayments,
  AssistantSettingsStore,
  AssistantShipping,
  ChatOwner,
  ConversationLog,
  ConversationRecord,
  FactStore,
  LlmProvider,
  NewChatMessage,
} from "../application/ports";
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
    joinWaitlist: (req) => svc.joinWaitlist(req),
  };
}

export class MemoryOrders implements AssistantOrders {
  constructor(private readonly orders: PublicTracking[] = []) {}
  async track(number: string) {
    return this.orders.find((o) => o.number === number.trim().toUpperCase()) ?? null;
  }
}

/** Mercado Pago de mentira: el plan es fijo y guarda los montos consultados. */
export class FixedInstallments implements AssistantPayments {
  asked: number[] = [];
  constructor(private readonly plan: InstallmentPlan = { interestFree: 3, max: 12 }) {}
  async installments(cents: number) {
    this.asked.push(cents);
    return this.plan;
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
      localDelivery: null,
      branches: [],
    };
  }
}

type StoredConversation = { id: string; owner: ChatOwner; productSlug: string | null; startedAt: Date; lastAt: Date };
type StoredMessage = NewChatMessage & { id: string; conversationId: string; at: Date; taughtAt: Date | null };

/** Charlas en memoria. `orders` simula el pedido pagado que vino después de una charla (lo resuelve la base). */
export class MemoryConversationLog implements ConversationLog {
  conversations: StoredConversation[] = [];
  messages: StoredMessage[] = [];
  orders = new Map<string, { number: number; totalCents: number }>();
  private seq = 0;

  async append(c: { id: string; owner: ChatOwner; productSlug: string | null }, msgs: NewChatMessage[], at: Date) {
    const found = this.conversations.find((x) => x.id === c.id);
    if (found) found.lastAt = at;
    else this.conversations.push({ ...c, startedAt: at, lastAt: at });
    for (const m of msgs) this.messages.push({ ...m, id: `m${++this.seq}`, conversationId: c.id, at, taughtAt: null });
  }

  async recent(since: Date, limit: number): Promise<ConversationRecord[]> {
    return this.conversations
      .filter((c) => c.lastAt >= since)
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .slice(0, limit)
      .map((c) => ({
        id: c.id,
        who: null,
        startedAt: c.startedAt.toISOString(),
        lastAt: c.lastAt.toISOString(),
        order: this.orders.get(c.id) ?? null,
        messages: this.messages
          .filter((m) => m.conversationId === c.id)
          .map((m) => ({
            role: m.role,
            text: m.text,
            unanswered: m.unanswered,
            taught: !!m.taughtAt,
            sizeAlert: m.sizeAlert,
          })),
      }));
  }

  async stats(from: Date, to: Date | null) {
    const inRange = this.conversations.filter((c) => c.startedAt >= from && (!to || c.startedAt < to));
    const orders = inRange.flatMap((c) => this.orders.get(c.id) ?? []);
    return {
      chats: inRange.length,
      bought: orders.length,
      boughtCents: orders.reduce((s, o) => s + o.totalCents, 0),
    };
  }

  async sizeAlerts(since: Date) {
    return this.messages.filter((m) => m.sizeAlert && m.at >= since).length;
  }

  async unanswered(since: Date) {
    return this.messages
      .filter((m) => m.unanswered && !m.taughtAt && m.at >= since)
      .map((m) => ({ id: m.id, question: m.unanswered ?? "", at: m.at }));
  }

  async markTaught(ids: string[], at: Date) {
    for (const m of this.messages) if (ids.includes(m.id)) m.taughtAt = at;
  }
}

export class MemoryFacts implements FactStore {
  facts: AssistantFact[] = [];
  async list() {
    return [...this.facts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async add(f: AssistantFactInput, at: Date) {
    const fact = { ...f, id: `f${this.facts.length + 1}`, createdAt: at.toISOString() };
    this.facts.push(fact);
    return fact;
  }
  async remove(id: string) {
    const before = this.facts.length;
    this.facts = this.facts.filter((f) => f.id !== id);
    return this.facts.length < before;
  }
}

export class MemoryAssistantSettings implements AssistantSettingsStore {
  value: Partial<AssistantSettings> = {};
  async get() {
    return { ...this.value };
  }
  async save(s: AssistantSettings) {
    this.value = { ...s };
  }
}

export function memoryAssistant(): AssistantMemory & {
  log: MemoryConversationLog;
  facts: MemoryFacts;
  settings: MemoryAssistantSettings;
} {
  return { log: new MemoryConversationLog(), facts: new MemoryFacts(), settings: new MemoryAssistantSettings() };
}
