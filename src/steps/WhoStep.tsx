import { useEffect, useMemo, useState } from "react";
import { BedDouble, Building2, Coffee, ExternalLink, MapPin, Music2, Phone, ShoppingBag, Sparkles, X } from "lucide-react";
import type { StepProps } from "../pages/PlanView";
import { Badge, Button, Card, ErrorNote, Spinner, cx, fmt } from "../components/ui";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { ROLES, entitySnapshot, placeSnapshot, roleForPlace, whyFor } from "../lib/plan";
import { draftOutreach, mailto, spotName } from "../lib/kit";
import type { Outreach, PartnerSnapshot, Place, Role } from "../lib/types";

const ICON: Record<Role, typeof Building2> = { host: Building2, copromote: Coffee, guests: BedDouble, collab: ShoppingBag, launch: Music2 };
const KIND_LABEL: Record<string, string> = { venue: "Venue", food: "Café · restaurant", hotel: "Hotel", retail: "Retail", brand: "Brand", artist: "Artist", other: "Place" };

export function WhoStep({ plan, outreach, savePlan, reloadOutreach }: StepProps) {
  const scout = plan.scout!;
  const { workspaces } = useSession();
  const ws = workspaces.find((w) => w.id === plan.workspace_id)!;
  const spot = scout.map?.spots.find((s) => s.id === plan.chosen_spot);
  const [tab, setTab] = useState<Role>("host");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<{ snap: PartnerSnapshot; role: Role } | null>(null);
  const places = scout.blocks[plan.chosen_spot || ""];

  // The agent scanned its own shortlist; if the founder picked another spot, scan it now.
  useEffect(() => {
    if (places || !spot) return;
    setLoading(true);
    api<{ places: Place[] }>("block", { brandIds: scout.input.brandIds, lat: spot.lat, lon: spot.lon })
      .then((r) => savePlan({ scout: { ...scout, blocks: { ...scout.blocks, [spot.id]: r.places } } }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [places, spot, scout, savePlan]);

  const items = useMemo(() => {
    const out: Record<Role, PartnerSnapshot[]> = { host: [], copromote: [], guests: [], collab: [], launch: [] };
    for (const p of places || []) {
      const r = roleForPlace(p);
      if (r) out[r].push(placeSnapshot(p, whyFor(scout, p.id)));
    }
    out.collab = scout.collabs.map((b) => entitySnapshot(b, "brand", whyFor(scout, b.id)));
    out.launch = scout.artists.map((a) => entitySnapshot(a, "artist", whyFor(scout, a.id)));
    for (const k of Object.keys(out) as Role[]) out[k].sort((a, b) => Number(!!b.why) - Number(!!a.why) || (b.affinity || 0) - (a.affinity || 0));
    return out;
  }, [places, scout]);

  const added = (id: string) => outreach.find((o) => o.partner.id === id);
  const toggle = async (snap: PartnerSnapshot, role: Role) => {
    const row = added(snap.id);
    if (row) await supabase.from("outreach").delete().eq("id", row.id);
    else await supabase.from("outreach").insert({ plan_id: plan.id, role, partner: snap });
    await reloadOutreach();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meet your local partners</h1>
        <div className="mt-1.5 flex items-center gap-1.5 text-muted"><MapPin className="h-4 w-4" /> {spotName(plan)} · {plan.city}</div>
        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
          {ROLES.map((r) => (
            <button key={r.id} onClick={() => setTab(r.id)} className={cx("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm", tab === r.id ? "border-brand font-medium text-brand" : "border-transparent text-muted hover:text-ink")}>
              {r.label} <span className="ml-1 text-xs text-faint">{items[r.id].length}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{ROLES.find((r) => r.id === tab)?.blurb}. Ranked by Qloo affinity with your audience; agent picks first.</p>
        <ErrorNote>{error}</ErrorNote>
        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted"><Spinner /> Scanning partners around {spotName(plan)}…</div>
        ) : items[tab].length === 0 ? (
          <div className="mt-8 text-sm text-muted">No {ROLES.find((r) => r.id === tab)?.label.toLowerCase()} partners found around this spot.</div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {items[tab].slice(0, 12).map((p) => {
              const Icon = ICON[tab];
              const isAdded = !!added(p.id);
              return (
                <Card key={p.id} className={cx("flex flex-col p-5 transition-shadow hover:shadow-sm", isAdded && "ring-1 ring-brand/50")}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-canvas"><Icon className="h-5 w-5 text-muted" /></span>
                    <button onClick={() => setOpen({ snap: p, role: tab })} className="min-w-0 flex-1 text-left">
                      <div className="truncate font-semibold hover:underline">{p.name}</div>
                      <div className="text-sm text-muted">{KIND_LABEL[p.kind] || p.kind}</div>
                    </button>
                    <div className="text-right">
                      <div className="tnum text-xl font-semibold leading-none">{fmt.aff(p.affinity)}</div>
                      <div className="mt-1 text-xs text-faint">affinity</div>
                    </div>
                  </div>
                  {p.why ? (
                    <p className="mt-3 text-sm"><Badge tone="brand" className="mr-1.5"><Sparkles className="h-3 w-3" /> Agent pick</Badge>{p.why}</p>
                  ) : (
                    (p.audience || p.description) && <p className="mt-3 line-clamp-2 text-sm text-muted">{p.audience || p.description}</p>
                  )}
                  <div className="mt-3 space-y-1 text-sm text-muted">
                    {p.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.address}</span></div>}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand hover:underline">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                      </a>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-end gap-3 pt-4">
                    <span className="text-sm text-muted">Add to plan</span>
                    <button role="switch" aria-checked={isAdded} onClick={() => toggle(p, tab)} className={cx("relative h-6 w-11 rounded-full transition-colors", isAdded ? "bg-brand" : "bg-line")}>
                      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", isAdded ? "left-[22px]" : "left-0.5")} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <div>
        {open ? (
          <PartnerDrawer key={open.snap.id} snap={open.snap} role={open.role} row={added(open.snap.id)} onClose={() => setOpen(null)}
            onDraft={async () => {
              let row = added(open.snap.id);
              if (!row) {
                const { data } = await supabase.from("outreach").insert({ plan_id: plan.id, role: open.role, partner: open.snap }).select().single();
                row = data as Outreach;
              }
              await draftOutreach(plan, ws, row);
              await reloadOutreach();
            }}
          />
        ) : (
          <Card className="p-5">
            <div className="text-sm font-semibold">In this plan</div>
            <p className="mt-1 text-sm text-muted">{outreach.length} partners added. Select a partner to see details and draft outreach.</p>
            <div className="mt-4 space-y-2">
              {outreach.map((o) => (
                <button key={o.id} onClick={() => setOpen({ snap: o.partner, role: o.role })} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-canvas">
                  <span className="truncate font-medium">{o.partner.name}</span>
                  <span className="text-xs text-faint">{ROLES.find((r) => r.id === o.role)?.label}</span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function PartnerDrawer({ snap, role, row, onClose, onDraft }: { snap: PartnerSnapshot; role: Role; row?: Outreach; onClose: () => void; onDraft: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const draft = async () => {
    setBusy(true);
    setError("");
    try {
      await onDraft();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="sticky top-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold">{snap.name}</div>
          <div className="text-sm text-muted">{ROLES.find((r) => r.id === role)?.label} · {KIND_LABEL[snap.kind] || snap.kind}</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-canvas"><X className="h-4 w-4" /></button>
      </div>
      {snap.why && <p className="mt-3 text-sm"><span className="font-medium">Why: </span>{snap.why}</p>}
      {snap.audience && <p className="mt-2 text-sm text-muted"><span className="font-medium text-ink">Their crowd (Qloo): </span>{snap.audience}</p>}
      <div className="mt-3 space-y-1 text-sm text-muted">
        {snap.address && <div className="flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{snap.address}</div>}
        {snap.phone && <div className="flex gap-2"><Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />{snap.phone}</div>}
        {snap.website && <a href={snap.website} target="_blank" rel="noreferrer" className="flex gap-2 text-brand hover:underline"><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />{snap.website}</a>}
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Outreach draft</div>
        {row?.body ? (
          <div className="mt-2 rounded-lg border border-line bg-canvas/50 p-3 text-sm">
            <div className="font-medium">Subject: {row.subject}</div>
            <div className="mt-2 whitespace-pre-wrap leading-relaxed text-muted">{row.body}</div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Gemini writes a first email from your brand, grounded in the shared audience Qloo found.</p>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-3 flex gap-2">
          <Button variant={row?.body ? "secondary" : "primary"} onClick={draft} loading={busy} className="flex-1">{row?.body ? "Rewrite" : "Draft outreach"}</Button>
          {row?.body && <a href={mailto(row)} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand text-sm font-medium text-white hover:bg-brand-dark">Open in mail</a>}
        </div>
      </div>
    </Card>
  );
}
