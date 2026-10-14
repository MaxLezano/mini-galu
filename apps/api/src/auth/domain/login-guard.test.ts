import { describe, expect, it } from "vitest";
import { LoginGuard } from "./login-guard";

describe("bloqueo por intentos fallidos", () => {
  it("bloquea la cuenta al llegar al máximo, avisa una vez y se libera después", () => {
    let now = 0;
    const g = new LoginGuard(3, 60_000, 120_000, () => now);
    expect(g.fail("Gaby@Mini.com").lockedNow).toBe(false);
    expect(g.fail("gaby@mini.com").lockedNow).toBe(false);
    expect(g.fail("gaby@mini.com").lockedNow).toBe(true);
    expect(g.fail("gaby@mini.com").lockedNow).toBe(false); // ya estaba bloqueada: no se vuelve a avisar
    expect(g.lockedUntil("GABY@mini.com")?.getTime()).toBe(120_000);
    now = 120_001;
    expect(g.lockedUntil("gaby@mini.com")).toBeNull();
  });

  it("los fallos viejos no suman y entrar bien limpia el contador", () => {
    let now = 0;
    const g = new LoginGuard(2, 60_000, 60_000, () => now);
    g.fail("a@b.co");
    now = 61_000;
    expect(g.fail("a@b.co").lockedNow).toBe(false); // el primero ya venció
    g.succeed("a@b.co");
    expect(g.fail("a@b.co").lockedNow).toBe(false);
  });
});
