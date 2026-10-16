import type { LaunchInput, ProductStatus } from "@mini-galu/contracts";

export type LaunchRecord = {
  id: string;
  title: string;
  coverNote: string | null;
  teaser: string;
  coverPath: string | null;
  startsAt: Date;
  collectionSlug: string | null;
  products: { slug: string; name: string; imagePath: string | null; status: ProductStatus }[];
  showCountdown: boolean;
  notifyBefore: boolean;
  autoPublish: boolean;
  socialText: string | null;
  status: "draft" | "scheduled";
  publishedAt: Date | null;
  signups: number;
};

export interface AdminLaunchRepository {
  findAll(): Promise<LaunchRecord[]>;
  findById(id: string): Promise<LaunchRecord | null>;
  /** Devuelve los slugs que NO existen (para validar). */
  missingProducts(slugs: string[]): Promise<string[]>;
  collectionExists(slug: string): Promise<boolean>;
  create(input: LaunchInput): Promise<string>;
  update(id: string, input: LaunchInput): Promise<void>;
  delete(id: string): Promise<void>;
  markPublished(id: string, at: Date): Promise<void>;
}

/** Ventas de prendas en un rango: unidades de pedidos pagos (sin cancelados ni reembolsados). */
export interface LaunchSales {
  unitsSold(slugs: string[], from: Date, to: Date): Promise<number>;
}

/** Publica prendas a través del módulo de catálogo (que valida, por ejemplo, que tengan foto). */
export interface ProductPublisher {
  publish(slugs: string[]): Promise<{ published: string[]; skipped: { slug: string; reason: string }[] }>;
}
