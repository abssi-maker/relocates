import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { StepProps } from "../pages/PlanView";
import { TasteMap } from "../components/TasteMap";
import { AgentTrace } from "../components/AgentTrace";
import { Badge, Button, Card, cx, fmt } from "../components/ui";

export function WhereStep({ plan, savePlan }: StepProps) {
  const scout = plan.scout!;
  const map = scout.map!;
  const ranked = useMemo(() => scout.decision!.spots.map((s) => s.spot_id), [scout]);
  const [selected, setSelected] = useState<string>(plan.chosen_spot || ranked[0]);
  const spot = map.spots.find((s) => s.id === selected) || map.spots[0];
  const rec = scout.decision!.spots.find((s) => s.spot_id === spot?.id);
  const rank = ranked.indexOf(spot?.id);
  const partnersNear = (scout.blocks[spot?.id] || []).length;
  const hostsNear = (scout.blocks[spot?.id] || []).filter((p) => p.eventSpaces).length;
  const chosen = plan.chosen_spot === spot?.id;

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Find your sweet spot</h1>
      <p className="mt-1.5 max-w-3xl text-muted">
        Qloo scored {map.cells.length.toLocaleString()} blocks of {map.locality?.name || plan.city} for how strongly your audience's taste shows up there. <span className="text-ink">Sweet spots</span> are top-decile taste matches outside the city's busiest blocks — your crowd, before the rent.
      </p>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-xl border border-line">
          <TasteMap className="h-[460px] w-full lg:h-[600px]" cells={map.cells} hoods={map.hoods} spots={map.spots} ranked={ranked} selected={spot?.id} onSelect={setSelected} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-white px-4 py-3 text-xs text-muted">
            <span className="flex items-center gap-2 font-medium text-ink">
              Taste affinity (Qloo)
              <span className="flex">{[0.15, 0.3, 0.45, 0.6, 0.75].map((o) => <span key={o} className="h-2.5 w-5" style={{ background: `rgba(15,118,110,${o})` }} />)}</span>
            </span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" /> Sweet spot — top-10% taste, outside the busiest 10%</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-prime" /> Prime — top-10% taste and busiest 10%</span>
          </div>
        </div>
        <div className="space-y-4">
          {spot && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{rank === 0 ? "Recommended location" : `Option ${rank + 1}`}</div>
                <Badge tone={spot.label === "sweet" ? "sweet" : "prime"}>{spot.label === "sweet" ? "Sweet spot" : "Prime"}</Badge>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">
                <span className="text-faint">{String(rank + 1).padStart(2, "0")} /</span> {spot.name}
              </div>
              {rec && <div className="mt-0.5 text-sm text-muted">{rec.headline}</div>}
              <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line py-4">
                <Metric value={fmt.aff(spot.affinity)} label="Taste affinity" />
                <Metric value={fmt.ordinal(Math.round(spot.busyRank * 100))} label="Busy percentile" />
                <Metric value={String(partnersNear || "–")} label={`Partners (${hostsNear} hosts)`} />
              </div>
              {rec && (
                <>
                  <div className="mt-4 text-sm font-semibold">Why this location</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{rec.reasoning}</p>
                </>
              )}
              <Button className="mt-5 w-full" variant={chosen ? "secondary" : "primary"} disabled={chosen} onClick={() => savePlan({ chosen_spot: spot.id })}>
                {chosen ? "Selected for this plan" : "Use this location"}
              </Button>
            </Card>
          )}
          <Card className="p-5">
            <div className="text-sm font-semibold">Agent's shortlist</div>
            <div className="mt-3 space-y-1">
              {ranked.map((id, i) => {
                const s = map.spots.find((x) => x.id === id);
                if (!s) return null;
                return (
                  <button key={id} onClick={() => setSelected(id)} className={cx("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm", id === spot?.id ? "bg-canvas" : "hover:bg-canvas")}>
                    <span className={cx("flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold", s.label === "prime" ? "border-prime text-prime" : "border-brand text-brand")}>{i + 1}</span>
                    <span className="flex-1 font-medium">{s.name}</span>
                    <span className="tnum text-muted">{fmt.aff(s.affinity)}</span>
                    {plan.chosen_spot === id && <Badge tone="brand">Selected</Badge>}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">Top neighbourhoods <Info className="h-3.5 w-3.5 text-faint" aria-label="Qloo affinity by neighbourhood" /></div>
            <div className="mt-3 space-y-2.5">
              {map.hoods.slice(0, 5).map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <span className="w-4 text-faint">{i + 1}</span>
                  <span className="w-32 truncate">{h.name}</span>
                  <div className="h-2 flex-1 rounded-full bg-canvas"><div className="h-full rounded-full bg-brand" style={{ width: `${h.affinity * 100}%` }} /></div>
                  <span className="tnum w-10 text-right font-medium">{fmt.aff(h.affinity)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-semibold">Agent summary</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{scout.decision!.summary}</p>
            {scout.source === "fallback" && <p className="mt-2 text-xs text-faint">Ranked directly from Qloo scores.</p>}
          </Card>
          <AgentTrace trace={scout.trace} />
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 first:pl-0">
      <div className="tnum text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-faint">{label}</div>
    </div>
  );
}
