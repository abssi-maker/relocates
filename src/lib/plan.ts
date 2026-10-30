import { supabase } from "./supabase";
import type { Entity, PartnerSnapshot, Place, Role, Scout } from "./types";

export const GOALS = ["Pop-up (1–3 months)", "First permanent store", "Event series"];
export const TIMINGS = ["Winter 2026–27", "Spring 2027", "Summer 2027", "Fall 2027", "Flexible"];
export const BUDGETS = ["Under $25k", "$25k–$75k", "$75k–$250k", "$250k+"];

export const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: "host", label: "Host it", blurb: "Venues with event space near your spot" },
  { id: "copromote", label: "Co-promote", blurb: "Cafés and restaurants your crowd already visits" },
  { id: "guests", label: "Guest traffic", blurb: "Hotels whose guests share your taste" },
  { id: "collab", label: "Collab drop", blurb: "Brands with an overlapping audience" },
  { id: "launch", label: "Launch night", blurb: "Artists your audience in this city loves" },
];

export function planName(city: string, goal: string, timing: string) {
  const g = goal.startsWith("Pop") ? "Pop-up" : goal.startsWith("First") ? "First store" : "Event series";
  return `${city.split(",")[0]} ${g}${timing && timing !== "Flexible" ? ` — ${timing}` : ""}`;
}

export function roleForPlace(p: Place): Role | null {
  if (p.eventSpaces || p.kind === "venue") return "host";
  if (p.kind === "food") return "copromote";
  if (p.kind === "hotel") return "guests";
  return null;
}

export function placeSnapshot(p: Place, why?: string): PartnerSnapshot {
  return { id: p.id, name: p.name, kind: p.kind, affinity: p.affinity, why, address: p.address, website: p.website, phone: p.phone, description: p.description, audience: p.audience };
}

export function entitySnapshot(e: Entity, kind: string, why?: string): PartnerSnapshot {
  return { id: e.id, name: e.name, kind, affinity: e.affinity, why, description: e.description };
}

/** Every partner candidate the agent saw, keyed by Qloo id. */
export function partnerIndex(s: Scout) {
  const idx = new Map<string, PartnerSnapshot>();
  for (const places of Object.values(s.blocks)) for (const p of places) idx.set(p.id, placeSnapshot(p));
  for (const b of s.collabs) idx.set(b.id, entitySnapshot(b, "brand"));
  for (const a of s.artists) idx.set(a.id, entitySnapshot(a, "artist"));
  return idx;
}

/** Adds the agent's partner picks to the plan's outreach list (once). */
export async function seedAgentPicks(planId: string, s: Scout) {
  const idx = partnerIndex(s);
  const rows = (s.decision?.partners || [])
    .map((p) => {
      const snap = idx.get(p.entity_id);
      return snap ? { plan_id: planId, role: p.role, partner: { ...snap, why: p.why } } : null;
    })
    .filter(Boolean);
  if (rows.length) await supabase.from("outreach").insert(rows as any[]);
}

export function whyFor(s: Scout | null, id: string) {
  return s?.decision?.partners.find((p) => p.entity_id === id)?.why;
}
