export type Subscriber = { id: string; email: string; token: string; unsubscribedAt: Date | null; createdAt: Date };

export interface SubscriberRepository {
  findByEmail(email: string): Promise<Subscriber | null>;
  create(s: { email: string; source: string; token: string }): Promise<Subscriber>;
  resubscribe(id: string): Promise<void>;
  /** Da de baja por el token del link; false si no existe. */
  unsubscribe(token: string, at: Date): Promise<boolean>;
  active(): Promise<Subscriber[]>;
  countActive(): Promise<number>;
}

export type Letter = {
  id: string;
  subject: string;
  body: string;
  recipients: number;
  sentAt: Date | null;
  createdAt: Date;
};

export interface LetterRepository {
  create(l: { subject: string; body: string }): Promise<Letter>;
  markSent(id: string, recipients: number, at: Date): Promise<void>;
  recent(limit: number): Promise<Letter[]>;
}

/** Los mails de las cartas (los arma el módulo de notificaciones). */
export interface LetterMailer {
  welcome(to: string, unsubscribeUrl: string): Promise<void>;
  letter(m: { to: string; subject: string; body: string; unsubscribeUrl: string }): Promise<void>;
}
