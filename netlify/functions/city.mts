import type { Config } from "@netlify/functions";
import { guarded, json } from "../lib/http.ts";
import { Qloo } from "../lib/qloo.ts";

// Resolves a typed city to Qloo localities for the onboarding city picker.
export default (req: Request) =>
  guarded(req, async (body) => {
    const q = String(body.q || "").trim();
    if (q.length < 2) return json({ results: [] });
    const results = await new Qloo().searchLocality(q, 6);
    return json({ results: results.map((r) => ({ id: r.id, name: r.name, label: r.disambiguation || r.name })) });
  });

export const config: Config = { path: "/api/city" };
