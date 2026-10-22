/**
 * Mapa de sucursales del checkout: teselas de OpenStreetMap (Web Mercator) y la posición de cada sucursal,
 * en % del recuadro para que el mapa se estire con el ancho sin medir nada.
 */

export const MAP_W = 600;
export const MAP_H = 320;
const TILE = 256;
const PAD = 44; // que ningún pin quede pegado al borde
const MAX_ZOOM = 16;

export type MapPoint = { id: string; lat: number | null; lng: number | null };
export type MapTile = { key: string; src: string; left: number; top: number; size: number };
export type MapPin = { id: string; left: number; top: number };
export type BranchMapLayout = { zoom: number; tiles: MapTile[]; pins: MapPin[] };

const worldX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const worldY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * 2 ** z;
};

/** null si ninguna sucursal trae coordenadas. */
export function branchMapLayout(points: MapPoint[]): BranchMapLayout | null {
  const located = points.filter((p): p is MapPoint & { lat: number; lng: number } => p.lat !== null && p.lng !== null);
  if (!located.length) return null;

  // el zoom más cercano en el que entran todas
  let zoom = MAX_ZOOM;
  while (zoom > 3) {
    const xs = located.map((p) => worldX(p.lng, zoom));
    const ys = located.map((p) => worldY(p.lat, zoom));
    if (Math.max(...xs) - Math.min(...xs) <= MAP_W - 2 * PAD && Math.max(...ys) - Math.min(...ys) <= MAP_H - 2 * PAD)
      break;
    zoom--;
  }
  // con una sola (o todas juntas) no se acerca tanto que no se vean las calles alrededor
  zoom = Math.min(zoom, 15);

  const xs = located.map((p) => worldX(p.lng, zoom));
  const ys = located.map((p) => worldY(p.lat, zoom));
  const x0 = (Math.min(...xs) + Math.max(...xs)) / 2 - MAP_W / 2;
  const y0 = (Math.min(...ys) + Math.max(...ys)) / 2 - MAP_H / 2;
  const n = 2 ** zoom;

  const tiles: MapTile[] = [];
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + MAP_H) / TILE); ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + MAP_W) / TILE); tx++) {
      const wx = ((tx % n) + n) % n;
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`,
        left: ((tx * TILE - x0) / MAP_W) * 100,
        top: ((ty * TILE - y0) / MAP_H) * 100,
        size: (TILE / MAP_W) * 100,
      });
    }
  }
  const pins = located.map((p, i) => ({
    id: p.id,
    left: (((xs[i] ?? 0) - x0) / MAP_W) * 100,
    top: (((ys[i] ?? 0) - y0) / MAP_H) * 100,
  }));
  return { zoom, tiles, pins };
}

/** "a 2,3 km" (null para la del código postal o sin coordenadas). */
export const kmLabel = (km: number | null) =>
  km ? `a ${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km` : null;
