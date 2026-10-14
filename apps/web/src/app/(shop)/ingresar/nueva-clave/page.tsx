import type { Metadata } from "next";
import { NewPasswordView } from "@/features/account/NewPasswordView";

export const metadata: Metadata = { title: "Contraseña nueva", robots: { index: false } };

/** Llega desde el link del mail: ?token=… (o ?error=INVALID_TOKEN si venció). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  return <NewPasswordView token={typeof q.token === "string" ? q.token : null} invalid={typeof q.error === "string"} />;
}
