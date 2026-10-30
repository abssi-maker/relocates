import type { Config } from "@netlify/functions";
import { guarded, json, fail } from "../lib/http.ts";
import { Qloo } from "../lib/qloo.ts";

// Partners around a spot the founder picked on the map (the agent scans its own picks).
export default (req: Request) =>
  guarded(req, async (body) => {
    const ids: string[] = body.brandIds || [];
    const lat = Number(body.lat), lon = Number(body.lon);
    if (!ids.length || !Number.isFinite(lat) || !Number.isFinite(lon)) return fail("Missing spot");
    const qloo = new Qloo();
    const places = await qloo.placesNear(ids, lat, lon);
    return json({ places, qloo: qloo.calls });
  });

export const config: Config = { path: "/api/block" };
