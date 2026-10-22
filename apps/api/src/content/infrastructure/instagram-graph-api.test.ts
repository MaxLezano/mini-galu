import { describe, expect, it } from "vitest";
import { InstagramGraphApi } from "./instagram-graph-api";

function fakeFetch(body: unknown, status = 200) {
  const urls: string[] = [];
  const fetcher = (async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { fetcher, urls };
}

describe("InstagramGraphApi", () => {
  it("pide el feed del token: foto, primera del carrusel y miniatura del video", async () => {
    const { fetcher, urls } = fakeFetch({
      data: [
        { id: "1", media_type: "IMAGE", media_url: "https://cdn/1.jpg", permalink: "https://ig/p/1" },
        { id: "2", media_type: "CAROUSEL_ALBUM", media_url: "https://cdn/2.jpg", permalink: "https://ig/p/2" },
        {
          id: "3",
          media_type: "VIDEO",
          media_url: "https://cdn/3.mp4",
          thumbnail_url: "https://cdn/3.jpg",
          permalink: "https://ig/p/3",
        },
        // reel sin miniatura: no va
        { id: "4", media_type: "VIDEO", media_url: "https://cdn/4.mp4", permalink: "https://ig/p/4" },
      ],
    });
    const posts = await new InstagramGraphApi(fetcher).latestPosts("tok", 6);
    expect(posts).toEqual([
      { id: "1", imageUrl: "https://cdn/1.jpg", permalink: "https://ig/p/1" },
      { id: "2", imageUrl: "https://cdn/2.jpg", permalink: "https://ig/p/2" },
      { id: "3", imageUrl: "https://cdn/3.jpg", permalink: "https://ig/p/3" },
    ]);
    const url = new URL(urls[0] ?? "");
    expect(url.origin + url.pathname).toBe("https://graph.instagram.com/v26.0/me/media");
    expect(url.searchParams.get("access_token")).toBe("tok");
    expect(url.searchParams.get("fields")).toContain("thumbnail_url");
  });

  it("corta en la cantidad pedida", async () => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      media_type: "IMAGE",
      media_url: `https://cdn/${i}.jpg`,
      permalink: `https://ig/p/${i}`,
    }));
    expect(await new InstagramGraphApi(fakeFetch({ data }).fetcher).latestPosts("tok", 6)).toHaveLength(6);
  });

  it("renueva el token con ig_refresh_token", async () => {
    const { fetcher, urls } = fakeFetch({ access_token: "nuevo", token_type: "bearer", expires_in: 5184000 });
    expect(await new InstagramGraphApi(fetcher).refreshToken("viejo")).toBe("nuevo");
    const url = new URL(urls[0] ?? "");
    expect(url.pathname).toBe("/refresh_access_token");
    expect(url.searchParams.get("grant_type")).toBe("ig_refresh_token");
    expect(url.searchParams.get("access_token")).toBe("viejo");
  });

  it("un error de Meta sale con su mensaje", async () => {
    const { fetcher } = fakeFetch({ error: { message: "Error validating access token", code: 190 } }, 400);
    await expect(new InstagramGraphApi(fetcher).latestPosts("tok", 6)).rejects.toThrow(
      "Instagram 400: Error validating access token",
    );
  });
});
