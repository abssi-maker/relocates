// Runs the real flow locally against live Qloo + Gemini: store → profile → Scout agent (same loop the app uses).
// Usage: npx tsx scripts/try-flow.ts glossier.com "New York City"
import { readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
(globalThis as any).Netlify = { env: { get: (k: string) => process.env[k] } };

const handlers: Record<string, (r: Request) => Promise<Response>> = {
  store: (await import("../netlify/functions/store.mts")).default,
  profile: (await import("../netlify/functions/profile.mts")).default,
  tools: (await import("../netlify/functions/tools.mts")).default,
  think: (await import("../netlify/edge-functions/think.ts")).default,
};
const { runScout } = await import("../src/lib/scout.ts");

const auth = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: process.env.SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD }),
}).then((r) => r.json());

async function call<T = any>(path: string, body: unknown): Promise<T> {
  const t = Date.now();
  const res = await handlers[path](new Request("http://x/api", { method: "POST", headers: { authorization: `Bearer ${auth.access_token}` }, body: JSON.stringify(body) }));
  const json = await res.json();
  console.log(`  [${path}] ${res.status} ${Date.now() - t}ms`);
  if (!res.ok) throw new Error(json.error);
  return json;
}

const [url = "glossier.com", city = "New York City"] = process.argv.slice(2);
const s = await call("store", { url });
console.log("brand:", s.read.brand_name, "| match:", s.match?.name, "| lookalikes:", s.lookalikes.map((l: any) => l.name).join(", "));
const ids = s.match ? [s.match.id] : s.lookalikes.slice(0, 3).map((l: any) => l.id);
const p = await call("profile", { ids });
const input = { brandIds: ids, brandName: s.read.brand_name, city, goal: "Pop-up (1–3 months)", budget: "$50k–$150k", timing: "Spring 2027", audience: p.taste.map((t: any) => t.name).join(", ") };
const scout = await runScout(input, call, {
  onTrace: (t) => console.log("trace:", t.tool, JSON.stringify(t.args || {}), t.error || "", (t.qloo || []).map((q) => `${q.endpoint}→${q.count}`).join(" "), t.note ? `note: ${t.note.slice(0, 120)}` : ""),
});
console.log("spots:", scout.map?.spots.map((x) => `${x.name}/${x.label}/${x.affinity}/${Math.round(x.busyRank * 100)}`).join(" | "));
console.log("source:", scout.source, "\nDECISION", JSON.stringify(scout.decision, null, 1).slice(0, 2500));
writeFileSync(`/tmp/relocates-scout-${url.replace(/\W/g, "_")}.json`, JSON.stringify({ store: s, profile: p, scout }));
