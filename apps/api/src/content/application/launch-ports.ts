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

/** Cifras de las prendas de un lanzamiento. */
export interface LaunchMetrics {
  /** Unidades de pedidos pagos en el rango (sin cancelados ni reembolsados). */
  unitsSold(slugs: string[], from: Date, to: Date): Promise<number>;
  /** Veces que las guardaron en favoritos (solo cuentas: en el adelanto el corazón pide ingresar). */
  favorites(slugs: string[]): Promise<number>;
  /** Visitas al adelanto (una por visitante y día, ver LaunchVisitsService). */
  visits(launchId: string): Promise<number>;
}

/** Publica prendas a través del módulo de catálogo (que valida, por ejemplo, que tengan foto). */
export interface ProductPublisher {
  publish(slugs: string[]): Promise<{ published: string[]; skipped: { slug: string; reason: string }[] }>;
}

/** Qué adelanto se está mirando: la sección de la home (por id) o la ficha de una prenda del lanzamiento. */
export type LaunchVisitTarget = { launchId: string } | { productSlug: string };

export interface LaunchVisitRepository {
  /** El lanzamiento por id, o el que trae esa prenda sin publicar (el más próximo). */
  findPreview(target: LaunchVisitTarget): Promise<{ id: string; startsAt: Date; publishedAt: Date | null } | null>;
  /** false si ese visitante ya contaba ese día. */
  add(launchId: string, day: string, visitor: string): Promise<boolean>;
}
