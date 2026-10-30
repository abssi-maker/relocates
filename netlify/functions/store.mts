import type { Config } from "@netlify/functions";
import { guarded, json } from "../lib/http.ts";
import { readStore } from "../lib/store.ts";
import { generateJson } from "../lib/gemini.ts";
import { Qloo, type Entity } from "../lib/qloo.ts";

type BrandRead = { brand_name: string; category: string; positioning: string; lookalikes: string[] };

// Onboarding step 1: read the store, identify the brand, and match it (and look-alikes) in Qloo.
export default (req: Request) =>
  guarded(req, async (body) => {
    const store = await readStore(String(body.url || ""));
    const read = await generateJson<BrandRead>(
      `Storefront data (JSON): ${JSON.stringify(store).slice(0, 6000)}
Identify the brand that owns this store, its retail category in 2-4 words, a one-sentence positioning, and 5 well-known consumer brands whose customers most resemble this brand's customers (same category or adjacent, real brands only).`,
      {
        type: "object",
        properties: {
          brand_name: { type: "string" },
          category: { type: "string" },
          positioning: { type: "string" },
          lookalikes: { type: "array", items: { type: "string" } },
        },
        required: ["brand_name", "category", "positioning", "lookalikes"],
      },
    );

    const qloo = new Qloo();
    const [own, ...alts] = await Promise.all([
      qloo.searchBrand(read.brand_name, 3),
      ...read.lookalikes.slice(0, 5).map((n) => qloo.searchBrand(n, 1)),
    ]);
    const match = own.find((e) => sameName(e.name, read.brand_name)) || null;
    const lookalikes = alts
      .map((r, i) => r.find((e) => sameName(e.name, read.lookalikes[i])))
      .filter((e): e is Entity => !!e && e.id !== match?.id);

    return json({ store, read, match, lookalikes, qloo: qloo.calls });
  });

function sameName(a: string, b: string) {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const x = n(a), y = n(b);
  return !!x && !!y && (x === y || (x.length > 3 && (x.startsWith(y) || y.startsWith(x))));
}

export const config: Config = { path: "/api/store" };
