// Drives the Scout agent: Gemini reasons at the edge (/api/think), the requested Qloo tools run in /api/tools,
// and this loop passes results between them until the agent submits a plan.
import type { Decision, Scout, ScoutInput, TraceEntry } from "./types";

type Call = <T = any>(path: string, body: unknown) => Promise<T>;
type Events = { onTrace?: (t: TraceEntry) => void; onUpdate?: (s: Scout) => void };

const MAX_TURNS = 7;

export async function runScout(input: ScoutInput, call: Call, ev: Events = {}): Promise<Scout> {
  const scout: Scout = { input, blocks: {}, collabs: [], artists: [], trace: [] };
  const known = new Set<string>();
  const push = (t: TraceEntry) => {
    const entry = { ...t, at: Date.now() };
    scout.trace.push(entry);
    ev.onTrace?.(entry);
  };
  let contents: any[] = [];

  for (let turn = 0; turn < MAX_TURNS && !scout.decision; turn++) {
    const step = await retry(() => call<any>("think", { input, contents, turn, known: [...known] }));
    contents = step.contents || contents;
    if (step.done) {
      scout.decision = step.decision as Decision;
      scout.source = "agent";
      push({ tool: "submit_plan", note: step.note });
      break;
    }
    if (step.note) push({ tool: "reasoning", note: step.note });
    if (!step.calls?.length) continue;

    const ran = await retry(() => call<any>("tools", { input, calls: step.calls }));
    for (const t of ran.trace) push(t);
    for (const a of ran.artifacts) {
      if (a.type === "map") {
        scout.map = a.data;
        a.data.spots.forEach((s: any) => known.add(s.id));
      } else if (a.type === "block") {
        scout.blocks[a.spotId] = a.places;
        a.places.forEach((p: any) => known.add(p.id));
      } else if (a.type === "collabs") {
        scout.collabs = a.items;
        a.items.forEach((x: any) => known.add(x.id));
      } else if (a.type === "artists") {
        scout.artists = a.items;
        a.items.forEach((x: any) => known.add(x.id));
      }
    }
    contents = [...contents, ran.response];
    ev.onUpdate?.({ ...scout });
  }

  if (!scout.decision) {
    if (!scout.map?.spots.length) throw new Error("Qloo couldn't map this city for your brand. Try a larger nearby city.");
    scout.decision = fallbackDecision(scout);
    scout.source = "fallback";
    push({ tool: "submit_plan", note: "Agent didn't finish; ranked directly from Qloo scores." });
  }
  scout.finishedAt = new Date().toISOString();
  ev.onUpdate?.({ ...scout });
  return scout;
}

/** Deterministic ranking from Qloo scores, used only if the agent fails to submit. */
export function fallbackDecision(s: Scout): Decision {
  const spots = (s.map?.spots || []).slice(0, 3);
  const block = s.blocks[spots[0]?.id] || [];
  const pick = (kind: string, role: Decision["partners"][number]["role"], n: number) =>
    block.filter((p) => (kind === "venue" ? p.eventSpaces : p.kind === kind)).slice(0, n).map((p) => ({ entity_id: p.id, role, why: `Qloo affinity ${p.affinity.toFixed(2)} with your audience` }));
  return {
    summary: `Ranked by Qloo taste affinity across ${s.map?.cells.length || 0} map cells.`,
    spots: spots.map((sp) => ({ spot_id: sp.id, headline: `${sp.name} ${sp.label === "sweet" ? "sweet spot" : "prime"}`, reasoning: `Affinity ${sp.affinity.toFixed(2)}, busier than ${Math.round(sp.busyRank * 100)}% of the city.` })),
    partners: [
      ...pick("venue", "host", 2), ...pick("food", "copromote", 2), ...pick("hotel", "guests", 1),
      ...s.collabs.slice(0, 2).map((b) => ({ entity_id: b.id, role: "collab" as const, why: `Qloo affinity ${b.affinity?.toFixed(2)}` })),
      ...s.artists.slice(0, 1).map((a) => ({ entity_id: a.id, role: "launch" as const, why: `Qloo affinity ${a.affinity?.toFixed(2)}` })),
    ],
  };
}

async function retry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (tries <= 1) throw e;
    return retry(fn, tries - 1);
  }
}
