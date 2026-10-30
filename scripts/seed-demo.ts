// Builds the judges' demo workspace through the real backend: store → profile → Scout agent → partners →
// outreach drafts → poster, track and opening week. Re-running replaces the previous demo workspace.
// Usage: npx tsx scripts/seed-demo.ts [store] [city]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
  write: (await import("../netlify/edge-functions/write.ts")).default,
  media: (await import("../netlify/edge-functions/media.ts")).default,
};
const { runScout } = await import("../src/lib/scout.ts");
const { posterPrompt, trackPrompt } = await import("../src/lib/prompts.ts");

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await db.auth.signInWithPassword({ email: process.env.DEMO_EMAIL!, password: process.env.DEMO_PASSWORD! });
if (authErr) throw authErr;
const token = auth.session!.access_token;
const uid = auth.user!.id;

async function call<T = any>(path: string, body: unknown): Promise<T> {
  const res = await handlers[path](new Request("http://x/api", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${json.error}`);
  return json;
}
const must = <T>(r: { data: T; error: any }) => {
  if (r.error) throw r.error;
  return r.data;
};

const [url = "glossier.com", city = "New York City"] = process.argv.slice(2);
const goal = "Pop-up (1–3 months)", timing = "Spring 2027", budget = "$75k–$250k";

console.log("Clearing previous demo workspaces…");
await db.from("workspaces").delete().eq("owner_id", uid);

console.log("Reading store…");
const s = await call("store", { url });
const signals = s.match ? [s.match] : s.lookalikes.slice(0, 3);
const profile = await call("profile", { ids: signals.map((x: any) => x.id) });
const { qloo: _q, ...profileData } = profile;

const ws: any = must(await db.from("workspaces").insert({
  name: `${s.read.brand_name} · Demo`,
  store_url: s.store.domain,
  store: s.store,
  brand: { ids: signals.map((x: any) => x.id), name: s.read.brand_name, category: s.read.category, positioning: s.read.positioning, match: s.match, signals },
  profile: profileData,
}).select().single());
const shortCity = city.split(",")[0];
const plan: any = must(await db.from("plans").insert({ workspace_id: ws.id, name: `${shortCity} Pop-up — ${timing}`, goal, city, timing, budget, status: "scouting" }).select().single());

console.log("Running Scout agent…");
const scout = await runScout(
  { brandIds: ws.brand.ids, brandName: ws.brand.name, city, goal, timing, budget, audience: profileData.taste.map((t: any) => t.name).join(", ") },
  call,
  { onTrace: (t) => console.log("  ·", t.tool, t.error || "") },
);
const chosen = scout.decision!.spots[0].spot_id;
must(await db.from("plans").update({ scout, chosen_spot: chosen, status: "ready", trace: scout.trace }).eq("id", plan.id).select());
console.log("  source:", scout.source, "| spots:", scout.decision!.spots.map((x) => scout.map!.spots.find((y) => y.id === x.spot_id)?.name).join(", "));

// Agent partner picks → outreach rows.
const idx = new Map<string, any>();
for (const places of Object.values(scout.blocks)) for (const p of places) idx.set(p.id, { id: p.id, name: p.name, kind: p.kind, affinity: p.affinity, address: p.address, website: p.website, phone: p.phone, description: p.description, audience: p.audience });
for (const b of scout.collabs) idx.set(b.id, { id: b.id, name: b.name, kind: "brand", affinity: b.affinity, description: b.description });
for (const a of scout.artists) idx.set(a.id, { id: a.id, name: a.name, kind: "artist", affinity: a.affinity, description: a.description });
const rows = scout.decision!.partners.filter((p) => idx.has(p.entity_id)).map((p) => ({ plan_id: plan.id, role: p.role, partner: { ...idx.get(p.entity_id), why: p.why } }));
const outreach = must(await db.from("outreach").insert(rows).select()) as any[];
console.log(`  ${outreach.length} partners added`);

const spot = scout.map!.spots.find((x) => x.id === chosen)!.name;
console.log("Drafting outreach…");
await Promise.all(
  outreach.map(async (o, i) => {
    const d = await call("write", { kind: "outreach", context: { brand: ws.brand.name, positioning: ws.brand.positioning, goal: goal.toLowerCase(), spot, city, timing, partner: { ...o.partner, role: o.role } } });
    const status = i === 0 ? "replied" : i < 3 ? "sent" : "to_contact";
    must(await db.from("outreach").update({ subject: d.subject, body: d.body, status }).eq("id", o.id).select());
  }),
);

console.log("Launch kit…");
const taste = profileData.taste.map((t: any) => t.name).slice(0, 6);
const styles = [...new Set(scout.artists.slice(0, 6).flatMap((a) => a.tags || []))].slice(0, 8);
const ctx = { brand: ws.brand.name, goal: goal.toLowerCase(), spot, city, taste, styles };
const creative = await call("write", { kind: "creative", context: ctx });

async function media(kind: "poster" | "track", prompt: string) {
  const resp = await call("media", { kind, prompt });
  const part = (resp?.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData);
  if (!part) throw new Error(`${kind}: ${JSON.stringify(resp?.promptFeedback || resp).slice(0, 200)}`);
  const { mimeType, data } = part.inlineData;
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") ? "jpg" : "mp3";
  const path = `${uid}/${plan.id}/${kind}-${Date.now()}.${ext}`;
  must(await db.storage.from("kit").upload(path, Buffer.from(data, "base64"), { contentType: mimeType }));
  return db.storage.from("kit").getPublicUrl(path).data.publicUrl;
}
const [posterUrl, trackUrl, promo] = await Promise.all([
  media("poster", posterPrompt(ctx.brand, spot, creative)),
  media("track", trackPrompt(creative)),
  call("write", { kind: "promo", context: { ...ctx, partners: outreach.map((o) => ({ name: o.partner.name, role: o.role })), artists: scout.artists.slice(0, 6).map((a) => a.name) } }),
]);
must(await db.from("plans").update({
  kit: { creative, poster: { url: posterUrl, signals: [...taste.slice(0, 4), ...styles.slice(0, 3)] }, track: { url: trackUrl, signals: styles.slice(0, 6) }, promo: promo.days },
}).eq("id", plan.id).select());

console.log(`Done. Workspace ${ws.name}, plan ${plan.id}, share /share/${plan.share_token}`);
