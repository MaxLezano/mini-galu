import { HELP_TOPICS, type HelpLink, type HelpPage, type HelpPageInput, type HelpTopic } from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";
import { defaultHelpPage, type HelpFacts } from "../domain/help";
import type { HelpRepository, StoredHelpPage } from "./help-ports";

/** Páginas de ayuda: el texto que guardó Gaby o, si no tocó esa página, el de base. */
export class HelpService {
  constructor(
    private readonly repo: HelpRepository,
    /** Se piden en cada lectura: las políticas cambian desde el panel. */
    private readonly facts: () => Promise<HelpFacts>,
  ) {}

  async page(topic: HelpTopic): Promise<HelpPage> {
    const [stored, facts] = await Promise.all([this.repo.findAll(), this.facts()]);
    return this.toPage(topic, stored.get(topic), facts);
  }

  /** Lo que ve la tienda: sin los apartados apagados. */
  async publicPage(topic: HelpTopic): Promise<HelpPage> {
    const page = await this.page(topic);
    return { ...page, sections: page.sections.filter((s) => !s.hidden) };
  }

  async links(): Promise<HelpLink[]> {
    return (await this.all()).map(({ topic, title }) => ({ topic, title }));
  }

  async all(): Promise<HelpPage[]> {
    const [stored, facts] = await Promise.all([this.repo.findAll(), this.facts()]);
    return HELP_TOPICS.map((t) => this.toPage(t, stored.get(t), facts));
  }

  async save(topic: HelpTopic, input: HelpPageInput): Promise<HelpPage> {
    if (input.sections.every((s) => s.hidden)) throw new ValidationError("Dejá al menos un apartado visible");
    await this.repo.save(topic, input);
    return this.page(topic);
  }

  /** Vuelve al texto de base. */
  async reset(topic: HelpTopic): Promise<HelpPage> {
    await this.repo.remove(topic);
    return this.page(topic);
  }

  private toPage(topic: HelpTopic, stored: StoredHelpPage | undefined, facts: HelpFacts): HelpPage {
    return stored
      ? { topic, ...stored.page, updatedAt: stored.updatedAt.toISOString() }
      : { topic, ...defaultHelpPage(topic, facts), updatedAt: null };
  }
}
