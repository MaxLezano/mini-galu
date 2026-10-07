import type { ContactChannel, HomeBlock } from "@mini-galu/contracts";

export type LaunchRow = {
  id: string;
  title: string;
  collectionSlug: string | null;
  startsAt: Date;
  teaser: string;
  coverPath: string | null;
  coverNote: string | null;
  showCountdown: boolean;
};

export interface ContentRepository {
  getHomeBlock(): Promise<HomeBlock | null>;
  saveHomeBlock(block: HomeBlock): Promise<void>;
  /** Portadas de todos los lanzamientos (para ofrecerlas como foto de la portada). */
  launchCoverPaths(): Promise<string[]>;
  /** Próximo lanzamiento programado (después de `now`). */
  findUpcomingLaunch(now: Date): Promise<LaunchRow | null>;
  findLaunch(id: string): Promise<LaunchRow | null>;
  countLaunchSignups(launchId: string): Promise<number>;
  /** false si ya estaba anotada. */
  addLaunchSignup(launchId: string, channel: ContactChannel, contact: string): Promise<boolean>;
}
