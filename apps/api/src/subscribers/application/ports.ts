import type { ContactChannel } from "@mini-galu/contracts";

type Base = { id: string; createdAt: Date };

export type LetterSubscriberRow = Base & { email: string; source: string; unsubscribedAt: Date | null };

type Signed = Base & { channel: ContactChannel; contact: string; notifiedAt: Date | null };

export type LaunchSignupRow = Signed & { launch: { id: string; title: string; startsAt: Date } };

export type SizeAlertRow = Signed & { product: { id: string; name: string; slug: string }; size: string | null };

/** Quien tiene cuenta o compró: para ponerle nombre a un contacto. */
export type KnownPerson = { email: string; phone: string | null; name: string; at: Date };

/** Lectura de las tres listas (cartas, lanzamientos y avisos de talle), sin filtrar. */
export interface SubscribersReadModel {
  letterSubscribers(): Promise<LetterSubscriberRow[]>;
  launchSignups(): Promise<LaunchSignupRow[]>;
  sizeAlerts(): Promise<SizeAlertRow[]>;
  knownPeople(): Promise<KnownPerson[]>;
}
