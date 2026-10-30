import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Badge, Card, Logo, Spinner, fmt } from "../components/ui";
import { TasteMap } from "../components/TasteMap";
import { ROLES } from "../lib/plan";
import type { Outreach, Plan, Workspace } from "../lib/types";

type Shared = { plan: Plan; workspace: Pick<Workspace, "name" | "brand" | "profile"> | null; outreach: Pick<Outreach, "partner" | "role" | "status">[] };

export default function Share() {
  const { token } = useParams();
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/share?token=${token}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) setError(j.error || "Not found");
      else setData(j);
    });
  }, [token]);
  const ranked = useMemo(() => data?.plan.scout?.decision?.spots.map((s) => s.spot_id) || [], [data]);

  if (error) return <div className="p-10 text-center text-muted">{error}</div>;
  if (!data) return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  const { plan, workspace, outreach } = data;
  const scout = plan.scout!;
  const spot = scout.map?.spots.find((s) => s.id === plan.chosen_spot);
  const rec = scout.decision?.spots.find((s) => s.spot_id === plan.chosen_spot);

  return (
    <div className="min-h-full bg-canvas">
      <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
        <Link to="/"><Logo /></Link>
        <span className="text-sm text-muted">Shared plan · read-only</span>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="text-sm text-muted">{workspace?.name}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{plan.name}</h1>
        <p className="mt-1 text-muted">{plan.goal} · {plan.city} · {plan.timing}</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          {scout.map && <div className="overflow-hidden rounded-xl border border-line"><TasteMap className="h-[460px] w-full" cells={scout.map.cells} hoods={scout.map.hoods} spots={scout.map.spots} ranked={ranked} selected={plan.chosen_spot} /></div>}
          <div className="space-y-4">
            {spot && (
              <Card className="p-5">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">Chosen location</span><Badge tone={spot.label === "sweet" ? "sweet" : "prime"}>{spot.label === "sweet" ? "Sweet spot" : "Prime"}</Badge></div>
                <div className="mt-2 flex items-center gap-2 text-2xl font-semibold"><MapPin className="h-5 w-5 text-brand" /> {spot.name}</div>
                <div className="mt-3 flex gap-6 text-sm"><span><span className="tnum font-semibold">{fmt.aff(spot.affinity)}</span> <span className="text-muted">taste affinity</span></span><span><span className="tnum font-semibold">{fmt.ordinal(Math.round(spot.busyRank * 100))}</span> <span className="text-muted">busy pct.</span></span></div>
                {rec && <p className="mt-3 text-sm text-muted">{rec.reasoning}</p>}
              </Card>
            )}
            <Card className="p-5">
              <div className="text-sm font-semibold">Partners</div>
              <div className="mt-3 divide-y divide-line">
                {outreach.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{o.partner.name}</span>
                    <span className="text-xs text-faint">{ROLES.find((r) => r.id === o.role)?.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
        {(plan.kit?.poster || plan.kit?.track || plan.kit?.promo) && (
          <Card className="mt-5 p-5">
            <div className="text-sm font-semibold">Launch kit</div>
            <div className="mt-4 grid gap-5 md:grid-cols-[220px_1fr]">
              {plan.kit.poster && <img src={plan.kit.poster.url} alt="Launch poster" className="rounded-lg border border-line" />}
              <div>
                {plan.kit.track && <audio controls src={plan.kit.track.url} className="w-full" />}
                {plan.kit.promo && (
                  <ol className="mt-4 space-y-2 text-sm">
                    {plan.kit.promo.map((d, i) => <li key={i}><span className="font-medium text-brand">{d.day}</span> — <span className="font-medium">{d.title}.</span> <span className="text-muted">{d.detail}</span></li>)}
                  </ol>
                )}
              </div>
            </div>
          </Card>
        )}
        <p className="mt-8 text-center text-sm text-muted">Planned with <Link to="/" className="font-medium text-brand">Relocates</Link> · Taste data by Qloo</p>
      </div>
    </div>
  );
}
