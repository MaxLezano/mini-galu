import type { ShippingBranch } from "@mini-galu/contracts";
import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { branchMapLayout, kmLabel, MAP_H, MAP_W } from "../branch-map";

type Props = {
  branches: ShippingBranch[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/** Sucursales Andreani sobre un plano (OpenStreetMap en los tonos de la tienda); tocar una la elige. */
export function BranchMap({ branches, selectedId, onSelect }: Props) {
  const layout = useMemo(() => branchMapLayout(branches), [branches]);
  if (!layout) return null;
  const byId = new Map(branches.map((b) => [b.id, b]));
  return (
    <div className="bmap" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
      <div className="bmap-tiles" aria-hidden="true">
        {layout.tiles.map((t) => (
          <img
            key={t.key}
            src={t.src}
            alt=""
            width={256}
            height={256}
            loading="lazy"
            decoding="async"
            draggable={false}
            style={{ left: `${t.left}%`, top: `${t.top}%`, width: `${t.size}%` }}
          />
        ))}
      </div>
      {layout.pins.map((p, i) => {
        const b = byId.get(p.id);
        if (!b) return null;
        const on = p.id === selectedId;
        const where = i === 0 ? "la de tu código postal" : kmLabel(b.km);
        return (
          <button
            key={p.id}
            type="button"
            className={`bmap-pin${on ? " is-on" : ""}`}
            style={{ left: `${p.left}%`, top: `${p.top}%`, zIndex: on ? 3 : 2 }}
            aria-pressed={on}
            aria-label={`Sucursal ${b.name}${where ? ` (${where})` : ""}`}
            title={b.name}
            onClick={() => onSelect(p.id)}
          >
            <MapPin size={on ? 30 : 24} strokeWidth={1.6} />
          </button>
        );
      })}
      <a className="bmap-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        © OpenStreetMap
      </a>
    </div>
  );
}
