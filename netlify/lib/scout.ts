// The Scout agent's tools. Each returns a compact result for the model and a full artifact for the app.
import { Qloo, findSpots, where, type Place } from "./qloo.ts";
import { decodeGeohash } from "./geo.ts";
import type { ScoutInput } from "./scout-spec.ts";

export type { ScoutInput };



export type Artifact =
  | { type: "map"; data: any }
  | { type: "block"; spotId: string; places: Place[] }
  | { type: "collabs"; items: any[] }
  | { type: "artists"; items: any[] };

export async function runTool(name: string, args: any, input: ScoutInput, qloo: Qloo): Promise<{ result: any; artifact?: Artifact }> {
  const ids = input.brandIds;
  if (name === "map_taste") {
    const [heat, hoods] = await Promise.all([qloo.heatmap(ids, input.city, input.cityId), qloo.neighbourhoods(ids, input.city, input.cityId)]);
    const spots = findSpots(heat.cells, hoods);
    return {
      result: {
        city: heat.locality?.name || input.city,
        cells_scored: heat.cells.length,
        top_neighbourhoods: hoods.slice(0, 8).map((h) => ({ name: h.name, affinity: h.affinity })),
        spots: spots.map((s) => ({ spot_id: s.id, neighbourhood: s.name, label: s.label, affinity: s.affinity, taste_percentile: pct(s.tasteRank), busy_percentile: pct(s.busyRank) })),
      },
      artifact: { type: "map", data: { locality: heat.locality, cells: heat.cells, hoods: hoods.slice(0, 14), spots } },
    };
  }
  if (name === "scan_block") {
    const id = String(args?.spot_id || "");
    if (!/^[0-9a-z]{4,12}$/.test(id)) return { result: { error: "Unknown spot_id; use one from map_taste." } };
    const b = decodeGeohash(id);
    const places = await qloo.placesNear(ids, (b.n + b.s) / 2, (b.e + b.w) / 2);
    const byKind = (k: Place["kind"]) => places.filter((p) => p.kind === k);
    const brief = (p: Place) => ({ entity_id: p.id, name: p.name, affinity: p.affinity, distance_m: p.distanceM, event_space: p.eventSpaces || undefined, neighbourhood: p.neighbourhood, audience: p.audience?.slice(0, 120) });
    return {
      result: {
        spot_id: id,
        partners_found: places.length,
        venues_with_event_space: places.filter((p) => p.eventSpaces).length,
        top_venues: byKind("venue").slice(0, 4).map(brief),
        top_food: byKind("food").slice(0, 4).map(brief),
        top_hotels: byKind("hotel").slice(0, 3).map(brief),
        top_retail: byKind("retail").slice(0, 3).map(brief),
      },
      artifact: { type: "block", spotId: id, places },
    };
  }
  if (name === "find_collab_brands") {
    const items = await qloo.similar(ids, "brand", {}, 10);
    return { result: { brands: items.map((b) => ({ entity_id: b.id, name: b.name, affinity: b.affinity })) }, artifact: { type: "collabs", items } };
  }
  if (name === "find_launch_artists") {
    const items = await qloo.similar(ids, "artist", where(input.city, input.cityId, "signal"), 10);
    return {
      result: { artists: items.map((a) => ({ entity_id: a.id, name: a.name, affinity: a.affinity, style: a.tags?.slice(0, 4) })) },
      artifact: { type: "artists", items },
    };
  }
  return { result: { error: `Unknown tool ${name}` } };
}

function pct(r: number) {
  return Math.round(r * 100);
}
