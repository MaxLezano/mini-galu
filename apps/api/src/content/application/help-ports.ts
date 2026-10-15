import type { HelpPageInput, HelpTopic } from "@mini-galu/contracts";

export type StoredHelpPage = { page: HelpPageInput; updatedAt: Date };

/** Lo que Gaby editó de cada página de ayuda (lo que falta se muestra con el texto de base). */
export interface HelpRepository {
  findAll(): Promise<Map<HelpTopic, StoredHelpPage>>;
  save(topic: HelpTopic, page: HelpPageInput): Promise<void>;
  remove(topic: HelpTopic): Promise<void>;
}
