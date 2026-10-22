/** Publicación del feed de Instagram, lista para la grilla de la portada. */
export type InstagramPost = {
  id: string;
  /** Foto (o la miniatura de un video): URL firmada del CDN de Instagram, vence a los pocos días. */
  imageUrl: string;
  permalink: string;
};

/** Lo que se guarda en content_blocks["instagram"]: el token renovado y la última foto del feed. */
export type InstagramState = {
  token: string;
  /** Token del .env del que salió `token`: si Gaby pone uno nuevo en el .env, rige ese. */
  envToken: string;
  tokenRefreshedAt: string;
  posts: InstagramPost[];
  fetchedAt: string | null;
};

/** Cuadros de la grilla (mockup index.html: 6 en compu, 2 filas de 3 en celular). */
export const INSTAGRAM_GRID = 6;
const DAY = 86_400_000;
/** El token largo dura 60 días y se puede renovar después de las 24 h: se renueva cada semana. */
const TOKEN_REFRESH_EVERY = 7 * DAY;
/** Las URL del CDN de Instagram vencen: un feed que no se pudo actualizar en 2 días ya no se muestra. */
const POSTS_STALE_AFTER = 2 * DAY;

/** El token que rige: el del .env si cambió desde la última renovación; si no, el último renovado. */
export function currentToken(state: InstagramState | null, envToken: string) {
  return state && state.envToken === envToken ? state.token : envToken;
}

export function needsTokenRefresh(state: InstagramState | null, envToken: string, now: Date) {
  if (!state || state.envToken !== envToken) return true;
  return now.getTime() - new Date(state.tokenRefreshedAt).getTime() >= TOKEN_REFRESH_EVERY;
}

export function freshPosts(state: InstagramState | null, now: Date): InstagramPost[] {
  if (!state?.fetchedAt) return [];
  return now.getTime() - new Date(state.fetchedAt).getTime() < POSTS_STALE_AFTER ? state.posts : [];
}
