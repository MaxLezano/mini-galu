import type { InstagramApi } from "../application/instagram-feed";
import type { InstagramPost } from "../domain/instagram";

const BASE = "https://graph.instagram.com";
const VERSION = "v26.0";

type Media = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
};

/**
 * Instagram API with Instagram Login (cuenta profesional del taller, permiso `instagram_business_basic`). El token
 * largo sale de Meta → la app → Instagram → "Generate token" y dura 60 días; `InstagramFeed` lo renueva.
 */
export class InstagramGraphApi implements InstagramApi {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async latestPosts(token: string, limit: number): Promise<InstagramPost[]> {
    const q = new URLSearchParams({
      fields: "id,media_type,media_url,thumbnail_url,permalink",
      // de más: los videos sin miniatura no van
      limit: String(limit * 2),
      access_token: token,
    });
    const { data } = await this.get<{ data: Media[] }>(`/${VERSION}/me/media?${q}`);
    return data
      .flatMap((m) => {
        // del video, su miniatura; del carrusel, la primera foto (media_url)
        const imageUrl = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
        return imageUrl && m.permalink ? [{ id: m.id, imageUrl, permalink: m.permalink }] : [];
      })
      .slice(0, limit);
  }

  async refreshToken(token: string) {
    const q = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token });
    const r = await this.get<{ access_token: string }>(`/refresh_access_token?${q}`);
    return r.access_token;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetcher(`${BASE}${path}`, { signal: AbortSignal.timeout(15_000) });
    const body = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    if (!res.ok || !body) throw new Error(`Instagram ${res.status}: ${body?.error?.message ?? "sin respuesta"}`);
    return body;
  }
}
