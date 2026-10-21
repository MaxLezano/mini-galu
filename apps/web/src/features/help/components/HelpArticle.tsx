import type { HelpLink, HelpPage, HelpTopic } from "@mini-galu/contracts";
import { FileText, type LucideIcon, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { longDateYear } from "@/lib/date";
import { helpBlocks, sectionId } from "../help-text";

const ICONS: Record<HelpTopic, LucideIcon> = {
  cambios: RefreshCcw,
  "envios-y-pagos": Truck,
  terminos: FileText,
  privacidad: ShieldCheck,
};

type Props = { page: HelpPage; links: HelpLink[]; children?: React.ReactNode };

/** Página de ayuda: navegación entre temas, índice del tema y apartados. `children`: el contacto al pie. */
export function HelpArticle({ page, links, children }: Props) {
  return (
    <main className="wrap help">
      <header className="help-hero">
        <span className="eyebrow is-in">Ayuda</span>
        <h1 className="display h2">{page.title}</h1>
        {page.intro && <p className="lead">{page.intro}</p>}
      </header>

      <div className="help-layout">
        <aside className="help-side">
          <nav aria-label="Páginas de ayuda">
            <ul className="help-topics">
              {links.map((l) => {
                const Icon = ICONS[l.topic];
                return (
                  <li key={l.topic}>
                    <Link
                      href={`/ayuda/${l.topic}`}
                      className="chip"
                      aria-current={l.topic === page.topic ? "page" : undefined}
                    >
                      <Icon className="i-sm" /> {l.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {page.sections.length > 1 && (
            <nav className="help-toc" aria-label="En esta página">
              <span className="lbl">En esta página</span>
              <ol>
                {page.sections.map((s) => (
                  <li key={s.title}>
                    <a href={`#${sectionId(s.title)}`}>{s.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </aside>

        <article className="help-body">
          {page.sections.map((s) => (
            <section key={s.title} id={sectionId(s.title)} className="help-sec">
              <h2 className="display h3">{s.title}</h2>
              {helpBlocks(s.body).map((b, i) =>
                b.kind === "p" ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: los bloques de un apartado no se reordenan
                  <p key={i}>{b.text}</p>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: los bloques de un apartado no se reordenan
                  <ul key={i}>
                    {b.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
          {/* Res. SCI 424/2020: el botón de arrepentimiento también se llega desde la ayuda de cambios */}
          {page.topic === "cambios" && (
            <section id="arrepentimiento" className="help-sec">
              <h2 className="display h3">Botón de arrepentimiento</h2>
              <p>
                Si te arrepentiste de una compra, podés pedir la baja dentro de los 10 días corridos desde que la
                recibiste, sin cuenta: con el número de pedido y el mail con el que compraste.
              </p>
              <Link className="btn btn-ghost help-cta" href="/arrepentimiento">
                Botón de arrepentimiento
              </Link>
            </section>
          )}
          {page.updatedAt && <p className="help-upd">Actualizado el {longDateYear(page.updatedAt)}</p>}
          {children}
        </article>
      </div>
    </main>
  );
}
