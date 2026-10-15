import { HelpTopicSchema } from "@mini-galu/contracts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticle } from "@/features/help/components/HelpArticle";
import { HelpContact } from "@/features/help/containers/HelpContact";
import { api } from "@/lib/api";
import "@/features/help/help.css";

function topic(raw: string) {
  const r = HelpTopicSchema.safeParse(raw);
  if (!r.success) notFound();
  return r.data;
}

export async function generateMetadata({ params }: PageProps<"/ayuda/[tema]">): Promise<Metadata> {
  const t = topic((await params).tema);
  const page = await api.help(t);
  return { title: page.title, description: page.intro || undefined, alternates: { canonical: `/ayuda/${t}` } };
}

/** Cambios, envíos y pagos, términos y privacidad: el texto se edita desde el panel (Tienda y pagos). */
export default async function Page({ params }: PageProps<"/ayuda/[tema]">) {
  const t = topic((await params).tema);
  const [page, links] = await Promise.all([api.help(t), api.helpLinks()]);
  return (
    <HelpArticle page={page} links={links}>
      <HelpContact />
    </HelpArticle>
  );
}
