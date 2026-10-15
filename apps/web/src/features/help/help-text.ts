export type HelpBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** Texto de un apartado → bloques: párrafos separados por línea en blanco; líneas con "- " forman una lista. */
export function helpBlocks(body: string): HelpBlock[] {
  const blocks: HelpBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const item = /^[-•]\s+(.*)$/.exec(line);
    if (item?.[1]) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "ul") last.items.push(item[1]);
      else blocks.push({ kind: "ul", items: [item[1]] });
    } else if (!line) flush();
    else {
      // una línea suelta después de una lista arranca un párrafo nuevo
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/** Ancla de un apartado ("Cómo pedir un cambio" → "como-pedir-un-cambio"). */
export function sectionId(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
