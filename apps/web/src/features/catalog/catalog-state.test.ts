import { describe, expect, it } from "vitest";
import { activeFilterCount, defaultPickSize, stateFromParams, toUrl } from "./catalog-state";

describe("catalog-state", () => {
  it("lee los atajos del menú (?talle, ?ocasion, ?q con talle)", () => {
    const s = stateFromParams({ talle: "6", ocasion: "bautismo", q: "vestido rojo talle 8" });
    expect(s.sizes).toEqual(["6", "8"]);
    expect(s.occ).toEqual(["bautismo"]);
    expect(s.q).toBe("vestido rojo");
    expect(s.instock).toBe(true);
    expect(activeFilterCount(s)).toBe(3);
  });

  it("ida y vuelta a la URL", () => {
    const s = stateFromParams({ col: "fiestas", talle: "6,8", view: "lookbook", sort: "asc", instock: "0" });
    expect(toUrl(s)).toBe("/catalogo?col=fiestas&talle=6%2C8&instock=0&sort=asc&view=lookbook");
    expect(stateFromParams({})).toMatchObject({ col: "", sort: "new", view: "shop" });
  });

  it("modo lista de cumple: la lista viaja en la URL y el talle elegido es el de la nena", () => {
    const s = stateFromParams({ lista: "olivia-7k2q", talle: "6" });
    expect(toUrl(s)).toBe("/catalogo?talle=6&lista=olivia-7k2q");
    expect(defaultPickSize(["4", "6", "8"], "6")).toBe("6");
    expect(defaultPickSize(["4", "8"], "6")).toBe("4");
    expect(defaultPickSize([], null)).toBe("Único");
  });
});
