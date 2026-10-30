// Thin client for the Qloo hackathon API plus the domain helpers Relocates builds on.
import { decodeGeohash, polygonArea, pointInPolygon, parseWktPolygon, haversineKm, type Ring } from "./geo.ts";

const BASE = (process.env.QLOO_API_URL || "").replace(/\/$/, "");

export type QlooCall = { endpoint: string; params: Record<string, string>; ms: number; count: number };

export class Qloo {
  calls: QlooCall[] = [];

  async get(path: string, params: Record<string, string | number | undefined>): Promise<any> {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") clean[k] = String(v);
    const url = `${BASE}${path}?${new URLSearchParams(clean)}`;
    const t = Date.now();
    const res = await fetch(url, { headers: { "X-Api-Key": process.env.QLOO_API_KEY || "" } });
    const body = await res.json().catch(() => ({}));
    const results = body?.results;
    const count = Array.isArray(results)
      ? results.length
      : results?.entities?.length ?? results?.heatmap?.length ?? results?.tags?.length ?? results?.demographics?.length ?? 0;
    this.calls.push({ endpoint: path, params: summarizeParams(clean), ms: Date.now() - t, count });
    if (!res.ok) throw new Error(`Qloo ${path} ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
    return body;
  }

  async searchBrand(query: string, take = 3): Promise<Entity[]> {
    const b = await this.get("/search", { query, types: "urn:entity:brand", take });
    return (b.results || []).map(slimEntity);
  }

  async searchLocality(query: string, take = 5): Promise<Entity[]> {
    const b = await this.get("/search", { query, types: "urn:entity:locality", take });
    return (b.results || []).map(slimEntity);
  }

  async demographics(ids: string[]) {
    const b = await this.get("/v2/insights", { "filter.type": "urn:demographics", "signal.interests.entities": ids.join(",") });
    return b.results?.demographics || [];
  }

  async brandTags(ids: string[], take = 12): Promise<{ id: string; name: string; type: string; affinity: number }[]> {
    const b = await this.get("/v2/insights", {
      "filter.type": "urn:tag",
      "filter.parents.types": "urn:entity:brand",
      "signal.interests.entities": ids.join(","),
      take,
    });
    return (b.results?.tags || b.results?.entities || []).map((t: any) => ({
      id: t.id || t.tag_id,
      name: String(t.name || "").trim(),
      type: t.subtype || t.type,
      affinity: t.query?.affinity ?? 0,
    }));
  }

  async similar(ids: string[], type: "brand" | "artist", extra: Record<string, string | number> = {}, take = 8): Promise<Entity[]> {
    const b = await this.get("/v2/insights", {
      "filter.type": `urn:entity:${type}`,
      "signal.interests.entities": ids.join(","),
      "filter.exclude.entities": ids.join(","),
      take,
      ...extra,
    });
    return (b.results?.entities || []).map(slimEntity);
  }

  async heatmap(ids: string[], city: string, cityId?: string) {
    const b = await this.get("/v2/insights", {
      "filter.type": "urn:heatmap",
      ...where(city, cityId),
      "signal.interests.entities": ids.join(","),
    });
    const cells: Cell[] = (b.results?.heatmap || []).map((c: any) => ({
      g: c.location.geohash,
      lat: c.location.latitude,
      lon: c.location.longitude,
      a: round(c.query.affinity),
      p: round(c.query.popularity),
    }));
    const locality = b.query?.localities?.filter?.[0];
    return { cells, locality: locality ? { id: locality.entity_id, name: locality.name, lat: locality.location?.lat, lon: locality.location?.lon } : null };
  }

  /** Neighbourhood-sized localities ranked by brand affinity, with their polygons. */
  async neighbourhoods(ids: string[], city: string, cityId?: string, take = 50): Promise<Neighbourhood[]> {
    const b = await this.get("/v2/insights", {
      "filter.type": "urn:heatmap",
      ...where(city, cityId),
      "signal.interests.entities": ids.join(","),
      "output.heatmap.boundary": "urn:entity:locality",
      take,
    });
    const out: Neighbourhood[] = [];
    const seen = new Set<string>();
    for (const e of b.results?.entities || []) {
      if (!e.boundary || seen.has(e.name)) continue;
      const rings = parseWktPolygon(e.boundary);
      if (!rings.length) continue;
      const km2 = rings.reduce((sum, r) => sum + polygonArea(r), 0);
      // Neighbourhoods only: drop countries, states, counties, boroughs and community districts.
      if (km2 > 25 || km2 < 0.05 || /district|county|community/i.test(e.name)) continue;
      seen.add(e.name);
      out.push({ id: e.entity_id, name: e.name, affinity: round(e.query?.affinity ?? 0), popularity: round(e.popularity ?? 0), km2: round(km2, 2), rings: rings.map(simplifyRing) });
    }
    return out;
  }

  async placesNear(ids: string[], lat: number, lon: number, radius = 900, take = 40): Promise<Place[]> {
    const b = await this.get("/v2/insights", {
      "filter.type": "urn:entity:place",
      "filter.location": `POINT(${lon} ${lat})`,
      "filter.location.radius": radius,
      "signal.interests.entities": ids.join(","),
      "feature.explainability": "true",
      take,
    });
    return (b.results?.entities || []).map((e: any) => slimPlace(e, lat, lon));
  }
}

export type Entity = { id: string; name: string; subtype?: string; popularity?: number; affinity?: number; tags?: string[]; image?: string; description?: string; disambiguation?: string; lat?: number; lon?: number };
export type Cell = { g: string; lat: number; lon: number; a: number; p: number };
export type Neighbourhood = { id: string; name: string; affinity: number; popularity: number; km2: number; rings: Ring[] };
export type Place = {
  id: string; name: string; kind: "venue" | "food" | "hotel" | "retail" | "other"; affinity: number; popularity: number;
  lat: number; lon: number; distanceM: number; address?: string; website?: string; phone?: string; neighbourhood?: string;
  description?: string; audience?: string; eventSpaces?: boolean; liveMusic?: boolean; rating?: number; tags: string[]; image?: string;
};
export type Spot = { id: string; name: string; lat: number; lon: number; affinity: number; popularity: number; label: "sweet" | "prime"; tasteRank: number; busyRank: number };

/** Prefer the exact Qloo locality id; fall back to a fuzzy name query. */
export function where(city: string, cityId?: string, kind: "filter" | "signal" = "filter"): Record<string, string> {
  return cityId ? { [`${kind}.location`]: cityId } : { [`${kind}.location.query`]: city };
}

function slimEntity(e: any): Entity {
  return {
    id: e.entity_id,
    name: e.name,
    subtype: e.subtype,
    popularity: e.popularity != null ? round(e.popularity) : undefined,
    affinity: e.query?.affinity != null ? round(e.query.affinity) : undefined,
    tags: (e.tags || []).slice(0, 8).map((t: any) => String(t.name || "").trim()).filter(Boolean),
    image: e.properties?.image?.url,
    description: e.properties?.short_description || e.properties?.description,
    disambiguation: e.disambiguation,
    lat: e.location?.lat,
    lon: e.location?.lon,
  };
}

function slimPlace(e: any, lat: number, lon: number): Place {
  const p = e.properties || {};
  const kind: Place["kind"] =
    p.hotel_class || p.number_of_rooms || p.check_in_time ? "hotel"
    : p.event_spaces || p.live_music ? "venue"
    : p.cuisine_description || p.specialty_dishes || p.menu_url ? "food"
    : /shop|store|boutique|retail/i.test(JSON.stringify(e.tags || []).slice(0, 600)) ? "retail"
    : "other";
  const plat = e.location?.lat ?? lat, plon = e.location?.lon ?? lon;
  return {
    id: e.entity_id,
    name: e.name,
    kind,
    affinity: round(e.query?.affinity ?? 0),
    popularity: round(e.popularity ?? 0),
    lat: plat,
    lon: plon,
    distanceM: Math.round(haversineKm(lat, lon, plat, plon) * 1000),
    address: p.address,
    website: p.website,
    phone: p.phone,
    neighbourhood: p.neighborhood,
    description: p.short_description || p.overall_description || p.description,
    audience: p.customer_demographics_description,
    eventSpaces: !!p.event_spaces,
    liveMusic: !!p.live_music,
    rating: p.business_rating ? round(p.business_rating, 1) : undefined,
    tags: (e.tags || []).slice(0, 6).map((t: any) => String(t.name || "").trim()).filter(Boolean),
    image: p.images?.[0]?.url || p.image?.url,
  };
}

/**
 * Turns heatmap cells into candidate spots. A sweet spot is a top-decile taste cell outside the busiest decile;
 * a prime spot is top-decile on both. Spots are kept at least `minKm` apart and named by the neighbourhood polygon they fall in.
 */
export function findSpots(cells: Cell[], hoods: Neighbourhood[], max = 6, minKm = 1.2): Spot[] {
  if (!cells.length) return [];
  const byA = [...cells].sort((x, y) => y.a - x.a);
  const byP = [...cells].sort((x, y) => y.p - x.p);
  const aRank = new Map(byA.map((c, i) => [c.g, 1 - i / cells.length]));
  const pRank = new Map(byP.map((c, i) => [c.g, 1 - i / cells.length]));
  const top = byA.filter((c) => (aRank.get(c.g) ?? 0) >= 0.9);
  const named = (c: Cell) => {
    const inside = hoods.filter((h) => h.rings.some((r) => pointInPolygon(c.lon, c.lat, r))).sort((x, y) => x.km2 - y.km2);
    return inside[0]?.name;
  };
  const pick = (pool: Cell[], label: Spot["label"], n: number, chosen: Spot[]) => {
    for (const c of pool) {
      if (chosen.filter((s) => s.label === label).length >= n) break;
      if (chosen.some((s) => haversineKm(s.lat, s.lon, c.lat, c.lon) < minKm)) continue;
      const name = named(c);
      if (!name) continue;
      chosen.push({ id: c.g, name, lat: c.lat, lon: c.lon, affinity: c.a, popularity: c.p, label, tasteRank: round(aRank.get(c.g) ?? 0), busyRank: round(pRank.get(c.g) ?? 0) });
    }
  };
  const chosen: Spot[] = [];
  const sweet = top.filter((c) => (pRank.get(c.g) ?? 1) < 0.9).sort((x, y) => (y.a - y.p) - (x.a - x.p) || y.a - x.a);
  const prime = top.filter((c) => (pRank.get(c.g) ?? 0) >= 0.9);
  pick(sweet, "sweet", Math.ceil(max * 0.66), chosen);
  pick(prime, "prime", max - chosen.length, chosen);
  return chosen;
}

export function cellBox(g: string) {
  return decodeGeohash(g);
}

function simplifyRing(r: Ring): Ring {
  if (r.length <= 120) return r.map(([x, y]) => [round(x, 5), round(y, 5)] as [number, number]);
  const step = Math.ceil(r.length / 120);
  return r.filter((_, i) => i % step === 0).map(([x, y]) => [round(x, 5), round(y, 5)] as [number, number]);
}

function summarizeParams(p: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) out[k] = v.length > 60 ? v.slice(0, 57) + "…" : v;
  return out;
}

export function round(n: number, d = 3) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
