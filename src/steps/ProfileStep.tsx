import { Store } from "lucide-react";
import type { StepProps } from "../pages/PlanView";
import { Badge, Card } from "../components/ui";
import { CustomerProfile } from "../components/CustomerProfile";
import { useSession } from "../lib/session";

export function ProfileStep({ plan }: StepProps) {
  const { workspaces } = useSession();
  const ws = workspaces.find((w) => w.id === plan.workspace_id);
  if (!ws) return null;
  const s = ws.store;
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">Brand profile</h1>
      <p className="mt-1.5 text-muted">What the agent knows about {ws.name} and its customers before choosing a location.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas"><Store className="h-5 w-5 text-muted" /></span>
            <div>
              <div className="font-semibold">{ws.store_url}</div>
              <div className="text-xs text-muted">{s?.platform === "shopify" ? `Shopify · ${s.productCount} products read` : "Website"}</div>
            </div>
          </div>
          {ws.brand?.positioning && <p className="mt-4 text-sm leading-relaxed text-muted">{ws.brand.positioning}</p>}
          <dl className="mt-4 space-y-2 text-sm">
            {s?.categories.length ? <Row k="Categories" v={s.categories.slice(0, 4).join(", ")} /> : null}
            {s?.priceBand && <Row k="Price band" v={`$${s.priceBand.low}–$${s.priceBand.high}`} />}
          </dl>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold">Qloo signal</div>
          <p className="mt-1 text-xs text-muted">The entities the agent uses to read your audience.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(ws.brand?.signals || []).map((e) => <Badge key={e.id} tone="brand">{e.name}</Badge>)}
          </div>
          {ws.brand?.match ? <p className="mt-3 text-xs text-faint">Matched {ws.brand.name} directly in Qloo's taste graph.</p> : <p className="mt-3 text-xs text-faint">Read through look-alike brands.</p>}
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold">This plan</div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Goal" v={plan.goal || "–"} />
            <Row k="City" v={plan.city || "–"} />
            <Row k="Timing" v={plan.timing || "–"} />
            <Row k="Budget" v={plan.budget || "–"} />
          </dl>
        </Card>
      </div>
      {ws.profile && (
        <Card className="mt-5 p-6">
          <h2 className="mb-5 text-lg font-semibold">Your customer, per Qloo</h2>
          <CustomerProfile profile={ws.profile} />
        </Card>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
