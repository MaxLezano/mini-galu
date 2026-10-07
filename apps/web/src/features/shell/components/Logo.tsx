import Link from "next/link";
import type { CSSProperties } from "react";
import { Bow } from "@/ui/atoms/Bow";

export function Logo({ style }: { style?: CSSProperties }) {
  return (
    <Link href="/" className="logo" aria-label="Mini Galú, inicio" style={style}>
      <span className="bow">
        <Bow />
      </span>
      Mini Galú
    </Link>
  );
}
