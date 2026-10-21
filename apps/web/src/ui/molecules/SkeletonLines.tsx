import { Skeleton } from "@/ui/atoms/Skeleton";

const WIDTHS = ["100%", "92%", "84%", "96%", "72%"];

/** Párrafo en carga: `lines` renglones de largo variado, el último más corto. */
export function SkeletonLines({ lines = 3, size, className }: { lines?: number; size?: number; className?: string }) {
  return (
    <div className={className ? `skel-lines ${className}` : "skel-lines"} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: renglones fijos, sin identidad
          key={i}
          className="line"
          style={{ width: i === lines - 1 && lines > 1 ? "58%" : WIDTHS[i % WIDTHS.length], fontSize: size }}
        />
      ))}
    </div>
  );
}
