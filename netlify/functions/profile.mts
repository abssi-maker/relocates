import type { Config } from "@netlify/functions";
import { guarded, json, fail } from "../lib/http.ts";
import { Qloo } from "../lib/qloo.ts";

const AGES = ["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"];

// Builds "your customer, per Qloo" from the confirmed brand signal.
export default (req: Request) =>
  guarded(req, async (body) => {
    const ids: string[] = (body.ids || []).filter((x: unknown) => typeof x === "string").slice(0, 5);
    if (!ids.length) return fail("Pick at least one brand");
    const qloo = new Qloo();
    const [demo, tags] = await Promise.all([qloo.demographics(ids), qloo.brandTags(ids, 14)]);

    // Average per-entity skews when several signals are used.
    const age: Record<string, number> = {};
    for (const k of AGES) {
      const vals = demo.map((d: any) => d.query?.age?.[k]).filter((v: any) => typeof v === "number");
      if (vals.length) age[k] = Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 100) / 100;
    }
    const female = demo.map((d: any) => d.query?.gender?.female).filter((v: any) => typeof v === "number");
    const femaleSkew = female.length ? female.reduce((a: number, b: number) => a + b, 0) / female.length : 0;

    const seen = new Set<string>();
    const taste = tags
      .filter((t) => t.name && !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase()))
      .slice(0, 10);

    return json({ age, femaleSkew: Math.round(femaleSkew * 100) / 100, taste, qloo: qloo.calls });
  });

export const config: Config = { path: "/api/profile" };
