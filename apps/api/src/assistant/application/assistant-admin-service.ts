import {
  type AdminAssistant,
  type AdminConversation,
  ASSISTANT_DEFAULT_SETTINGS,
  type AssistantFactInput,
  type AssistantSettings,
  questionKey,
} from "@mini-galu/contracts";
import { NotFoundError } from "../../shared/domain/errors";
import { groupPending } from "../domain/teaching";
import type { AssistantMemory, ConversationRecord } from "./ports";

const DAY = 86_400_000;
/** KPIs: últimos 7 días contra los 7 anteriores. */
const WINDOW_DAYS = 7;
/** Lista de conversaciones: las de los últimos 30 días, hasta 40. */
const LIST_DAYS = 30;
const LIST_LIMIT = 40;

/**
 * Galú en el panel (admin-galu.html): qué le preguntan, lo que no supo responder, lo que Gaby le enseña y sus ajustes.
 */
export class AssistantAdminService {
  constructor(
    private readonly memory: AssistantMemory,
    private readonly provider: () => string | null,
    private readonly formatOrderNumber: (n: number) => string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async admin(): Promise<AdminAssistant> {
    const now = this.clock().getTime();
    const since = new Date(now - WINDOW_DAYS * DAY);
    const [current, before, conversations, rows, facts, settings] = await Promise.all([
      this.memory.log.stats(since, null),
      this.memory.log.stats(new Date(now - 2 * WINDOW_DAYS * DAY), since),
      this.memory.log.recent(new Date(now - LIST_DAYS * DAY), LIST_LIMIT),
      this.memory.log.unanswered(new Date(now - LIST_DAYS * DAY)),
      this.memory.facts.list(),
      this.settings(),
    ]);
    return {
      provider: this.provider(),
      stats: {
        chats: current.chats,
        chatsBefore: before.chats,
        bought: current.bought,
        boughtCents: current.boughtCents,
        unanswered: rows.filter((r) => r.at >= since).length,
      },
      conversations: conversations.map((c) => this.conversation(c)),
      pending: groupPending(rows).map(({ ids: _, ...p }) => p),
      facts,
      settings,
    };
  }

  /** Le enseña una respuesta; las veces que se preguntó lo mismo dejan de estar pendientes. */
  async teach(input: AssistantFactInput): Promise<AdminAssistant> {
    const at = this.clock();
    await this.memory.facts.add(input, at);
    const key = questionKey(input.question);
    const rows = await this.memory.log.unanswered(new Date(0));
    const ids = rows.filter((r) => questionKey(r.question) === key).map((r) => r.id);
    if (ids.length) await this.memory.log.markTaught(ids, at);
    return this.admin();
  }

  async forget(id: string): Promise<AdminAssistant> {
    if (!(await this.memory.facts.remove(id))) throw new NotFoundError("Esa respuesta ya no está");
    return this.admin();
  }

  async updateSettings(s: AssistantSettings): Promise<AdminAssistant> {
    await this.memory.settings.save(s);
    return this.admin();
  }

  private async settings(): Promise<AssistantSettings> {
    return { ...ASSISTANT_DEFAULT_SETTINGS, ...(await this.memory.settings.get()) };
  }

  private conversation(c: ConversationRecord): AdminConversation {
    const pending = c.messages.some((m) => m.unanswered && !m.taught);
    return {
      ...c,
      order: c.order ? { number: this.formatOrderNumber(c.order.number), totalCents: c.order.totalCents } : null,
      outcome: c.order ? "compra" : pending ? "sin_respuesta" : null,
    };
  }
}
