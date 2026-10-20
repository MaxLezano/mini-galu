import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";

describe("csvCell", () => {
  it("lo que Excel tomaría como fórmula va con apóstrofo", () => {
    expect(csvCell('=HYPERLINK("http://x","clic")')).toBe(`"'=HYPERLINK(""http://x"",""clic"")"`);
    expect(csvCell("+54 381 319")).toBe("'+54 381 319");
    expect(csvCell("-2+3@x.com", ",")).toBe("'-2+3@x.com");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("los números y el texto común quedan igual; separador, comillas y saltos van entre comillas", () => {
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell("Lucía")).toBe("Lucía");
    expect(csvCell(null)).toBe("");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell("a,b", ",")).toBe('"a,b"');
    expect(csvCell("línea\notra")).toBe('"línea\notra"');
  });
});
