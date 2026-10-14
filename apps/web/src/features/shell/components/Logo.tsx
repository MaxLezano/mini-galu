import Link from "next/link";
import type { CSSProperties } from "react";
import { Foco } from "@/ui/atoms/Foco";

export function Logo({ style }: { style?: CSSProperties }) {
  return (
    <Link href="/" className="logo" aria-label="Mini Galú, inicio" style={style}>
      <span className="bow">
        <Foco />
      </span>
      Mini Galú
    </Link>
  );
}
