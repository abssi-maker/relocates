export type Ring = [number, number][]; // [lon, lat]

export function parseWktPolygon(wkt: string): Ring[] {
  // Handles POLYGON and MULTIPOLYGON; keeps outer rings only.
  const rings: Ring[] = [];
  const groups = wkt.match(/\(\s*[-\d.]+\s+[-\d.]+[^()]*\)/g) || [];
  for (const g of groups) {
    const pts = g
      .replace(/[()]/g, "")
      .split(",")
      .map((s) => s.trim().split(/\s+/).map(Number) as [number, number])
      .filter((p) => p.length === 2 && p.every(Number.isFinite));
    if (pts.length >= 3) rings.push(pts);
  }
  return rings;
}

export function polygonArea(ring: Ring): number {
  // Approximate km² using an equirectangular projection around the ring's mean latitude.
  const lat0 = (ring.reduce((s, p) => s + p[1], 0) / ring.length) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(lat0), ky = 110.57;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * kx * ring[i][1] * ky - ring[i][0] * kx * ring[j][1] * ky;
  }
  return Math.abs(a / 2);
}

export function pointInPolygon(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function decodeGeohash(g: string) {
  let even = true;
  const lat = [-90, 90], lon = [-180, 180];
  for (const ch of g) {
    const cd = B32.indexOf(ch);
    for (let mask = 16; mask; mask >>= 1) {
      const range = even ? lon : lat;
      const mid = (range[0] + range[1]) / 2;
      if (cd & mask) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return { s: lat[0], w: lon[0], n: lat[1], e: lon[1] };
}
