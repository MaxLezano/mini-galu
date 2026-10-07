"use client";

import type { ReactNode } from "react";
import { useUi } from "@/features/shell/ui-store";

/** Cualquier botón que abre Galú (opcionalmente con una pregunta ya hecha). */
export function OpenGaluButton({
  question,
  className,
  children,
}: {
  question?: string;
  className?: string;
  children: ReactNode;
}) {
  const openGalu = useUi((s) => s.openGalu);
  return (
    <button type="button" className={className} onClick={() => openGalu(question)}>
      {children}
    </button>
  );
}
