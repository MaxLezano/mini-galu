import { PDFDocument } from "pdf-lib";
import type { PdfMerger } from "../application/ports";

/** Copia las hojas de cada PDF, en orden, a uno nuevo (las etiquetas de Andreani y las simuladas son PDF). */
export class PdfLibMerger implements PdfMerger {
  async merge(pdfs: Uint8Array[]): Promise<Uint8Array> {
    const out = await PDFDocument.create();
    out.setTitle(`Etiquetas · ${pdfs.length}`);
    for (const bytes of pdfs) {
      const src = await PDFDocument.load(bytes);
      for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
    }
    return out.save();
  }
}
