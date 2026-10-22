import {
  currentToken,
  freshPosts,
  INSTAGRAM_GRID,
  type InstagramPost,
  type InstagramState,
  needsTokenRefresh,
} from "../domain/instagram";

/** API de Instagram (Instagram API with Instagram Login). */
export interface InstagramApi {
  /** Últimas publicaciones con foto, de la más nueva a la más vieja. */
  latestPosts(token: string, limit: number): Promise<InstagramPost[]>;
  /** Token nuevo, válido por 60 días desde ahora. */
  refreshToken(token: string): Promise<string>;
}

export interface InstagramStore {
  get(): Promise<InstagramState | null>;
  save(state: InstagramState): Promise<void>;
}

/**
 * Feed de Instagram de la portada. El programador lo actualiza cada hora (y renueva el token cada semana); la tienda
 * lee lo guardado, así una caída de Instagram no demora la portada. Sin `INSTAGRAM_ACCESS_TOKEN` no se usa: la grilla
 * muestra las fotos guardadas en la portada (las del seed; en producción, ninguna).
 */
export class InstagramFeed {
  constructor(
    private readonly api: InstagramApi,
    private readonly store: InstagramStore,
    private readonly envToken: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async posts(): Promise<InstagramPost[]> {
    return freshPosts(await this.store.get(), this.now());
  }

  async sync() {
    const state = await this.store.get();
    let token = currentToken(state, this.envToken);
    let tokenRefreshedAt = state?.envToken === this.envToken ? state.tokenRefreshedAt : this.now().toISOString();
    if (needsTokenRefresh(state, this.envToken, this.now())) {
      try {
        token = await this.api.refreshToken(token);
        tokenRefreshedAt = this.now().toISOString();
      } catch (e) {
        // recién generado (menos de 24 h) Instagram no deja renovarlo: se reintenta en la próxima vuelta
        console.warn("[instagram] no se pudo renovar el token:", e instanceof Error ? e.message : e);
      }
    }
    const base = { token, envToken: this.envToken, tokenRefreshedAt };
    try {
      const posts = await this.api.latestPosts(token, INSTAGRAM_GRID);
      await this.store.save({ ...base, posts, fetchedAt: this.now().toISOString() });
    } catch (e) {
      // queda lo último que se trajo (hasta que venza) y el token renovado
      await this.store.save({ ...base, posts: state?.posts ?? [], fetchedAt: state?.fetchedAt ?? null });
      throw e;
    }
  }
}
