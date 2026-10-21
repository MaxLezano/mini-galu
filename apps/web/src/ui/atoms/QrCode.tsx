import QRCode from "qrcode";
import { useMemo } from "react";

/** QR en SVG con el color del texto (`currentColor`), sin imagen: se arma en el render, igual en server y browser. */
export function QrCode({ value, size = 64, title }: { value: string; size?: number; title: string }) {
  const { n, d } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    let path = "";
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
    return { n: modules.size, d: path };
  }, [value]);
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} role="img" aria-label={title}>
      <path d={d} fill="currentColor" shapeRendering="crispEdges" />
    </svg>
  );
}
