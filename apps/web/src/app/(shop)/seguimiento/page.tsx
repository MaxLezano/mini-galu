import type { Metadata } from "next";
import { TrackingView } from "@/features/tracking/containers/TrackingView";
import { ApiRequestError, api } from "@/lib/api";

export const metadata: Metadata = { title: "Seguí tu pedido", robots: { index: false } };

/** Mockup: design/mockups/seguimiento.html */
export default async function Page({ searchParams }: PageProps<"/seguimiento">) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const code = one(q.pedido)?.trim() ?? "";
  const t = one(q.t);
  const result = code
    ? await api.track(code, t).catch((e) => {
        if (e instanceof ApiRequestError && e.status === 404) return null;
        throw e;
      })
    : undefined;
  return <TrackingView code={code} result={result} token={t ?? null} />;
}
