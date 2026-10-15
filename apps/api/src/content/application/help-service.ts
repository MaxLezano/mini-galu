import { HELP_TOPICS, type HelpLink, type HelpPage, type HelpPageInput, type HelpTopic } from "@mini-galu/contracts";
import { defaultHelpPage, type HelpFacts } from "../domain/help";
import type { HelpRepository, StoredHelpPage } from "./help-ports";

/** Páginas de ayuda: el texto que guardó Gaby o, si no tocó esa página, el de base. */
export class HelpService {
  constructor(
    private readonly repo: HelpRepository,
    private readonly facts: HelpFacts,
  ) {}

  async page(topic: HelpTopic): Promise<HelpPage> {
    return this.toPage(topic, (await this.repo.findAll()).get(topic));
  }

  async links(): Promise<HelpLink[]> {
    return (await this.all()).map(({ topic, title }) => ({ topic, title }));
  }

  async all(): Promise<HelpPage[]> {
    const stored = await this.repo.findAll();
    return HELP_TOPICS.map((t) => this.toPage(t, stored.get(t)));
  }

  async save(topic: HelpTopic, input: HelpPageInput): Promise<HelpPage> {
    await this.repo.save(topic, input);
    return this.page(topic);
  }

  /** Vuelve al texto de base. */
  async reset(topic: HelpTopic): Promise<HelpPage> {
    await this.repo.remove(topic);
    return this.page(topic);
  }

  private toPage(topic: HelpTopic, stored: StoredHelpPage | undefined): HelpPage {
    return stored
      ? { topic, ...stored.page, updatedAt: stored.updatedAt.toISOString() }
      : { topic, ...defaultHelpPage(topic, this.facts), updatedAt: null };
  }
}
