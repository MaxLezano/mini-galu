import { describe, expect, it } from "vitest";
import type { InstagramPost, InstagramState } from "../domain/instagram";
import { type InstagramApi, InstagramFeed, type InstagramStore } from "./instagram-feed";

class MemoryStore implements InstagramStore {
  state: InstagramState | null = null;
  async get() {
    return this.state;
  }
  async save(state: InstagramState) {
    this.state = state;
  }
}

const post = (n: number): InstagramPost => ({
  id: `${n}`,
  imageUrl: `https://cdn.instagram.test/${n}.jpg`,
  permalink: `https://www.instagram.com/p/${n}/`,
});

class FakeApi implements InstagramApi {
  posts = [post(1), post(2)];
  refreshed: string[] = [];
  failPosts = false;
  failRefresh = false;
  async latestPosts(token: string) {
    if (this.failPosts) throw new Error("Instagram 500");
    return this.posts.map((p) => ({ ...p, id: `${p.id}@${token}` }));
  }
  async refreshToken(token: string) {
    if (this.failRefresh) throw new Error("Instagram 400: token muy nuevo");
    this.refreshed.push(token);
    return `${token}+`;
  }
}

const DAY = 86_400_000;

function setup(start = new Date("2026-10-22T12:00:00Z")) {
  let now = start;
  const api = new FakeApi();
  const store = new MemoryStore();
  const feed = (envToken = "env") => new InstagramFeed(api, store, envToken, () => now);
  return { api, store, feed, later: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe("InstagramFeed", () => {
  it("antes de la primera vuelta no hay feed (la portada usa sus fotos)", async () => {
    const { feed } = setup();
    expect(await feed().posts()).toEqual([]);
  });

  it("trae las publicaciones con el token renovado y lo guarda", async () => {
    const { api, store, feed } = setup();
    await feed().sync();
    expect(api.refreshed).toEqual(["env"]);
    expect(store.state?.token).toBe("env+");
    expect((await feed().posts()).map((p) => p.id)).toEqual(["1@env+", "2@env+"]);
  });

  it("renueva el token una vez por semana y sigue con el renovado", async () => {
    const { api, feed, later } = setup();
    await feed().sync();
    later(3 * DAY);
    await feed().sync();
    expect(api.refreshed).toEqual(["env"]);
    later(4 * DAY);
    await feed().sync();
    expect(api.refreshed).toEqual(["env", "env+"]);
    expect((await feed().posts())[0]?.id).toBe("1@env++");
  });

  it("un token nuevo en el .env reemplaza al renovado", async () => {
    const { store, feed } = setup();
    await feed().sync();
    await feed("otro").sync();
    expect(store.state?.token).toBe("otro+");
    expect(store.state?.envToken).toBe("otro");
  });

  it("un token recién generado (Instagram no deja renovarlo) se usa igual y se reintenta en la próxima vuelta", async () => {
    const { api, store, feed, later } = setup();
    api.failRefresh = true;
    await feed().sync();
    expect(store.state?.token).toBe("env");
    expect(await feed().posts()).toHaveLength(2);
    api.failRefresh = false;
    later(7 * DAY);
    await feed().sync();
    expect(store.state?.token).toBe("env+");
  });

  it("si Instagram falla queda el feed anterior, hasta que sus fotos vencen (2 días)", async () => {
    const { api, feed, later } = setup();
    await feed().sync();
    api.failPosts = true;
    later(DAY);
    await expect(feed().sync()).rejects.toThrow("Instagram 500");
    expect(await feed().posts()).toHaveLength(2);
    later(DAY);
    expect(await feed().posts()).toEqual([]);
  });
});
