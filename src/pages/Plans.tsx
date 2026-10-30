import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { MapPin, Plus } from "lucide-react";
import { Badge, Card, Empty, Spinner, fmt } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { Plan } from "../lib/types";

export default function Plans() {
  const { workspace, workspaces } = useSession();
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    if (!workspace) return;
    setPlans(null);
    supabase.from("plans").select("id,workspace_id,name,goal,city,timing,budget,status,chosen_spot,scout,updated_at,created_at,share_token,kit").eq("workspace_id", workspace.id).order("updated_at", { ascending: false })
      .then(({ data }) => setPlans((data || []) as Plan[]));
  }, [workspace]);

  if (!workspaces.length) return <Navigate to="/app/onboarding" replace />;
  return (
    <div className="px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
          <p className="mt-1 text-muted">Location plans for {workspace?.name}.</p>
        </div>
        <Link to={`/app/onboarding?workspace=${workspace?.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark">
          <Plus className="h-4 w-4" /> New plan
        </Link>
      </div>
      <div className="mt-6">
        {!plans ? (
          <Spinner className="h-5 w-5" />
        ) : !plans.length ? (
          <Empty title="No plans yet" body="Create a plan to find where to open and who to partner with." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => {
              const spot = p.scout?.map?.spots.find((s) => s.id === p.chosen_spot);
              return (
                <Link key={p.id} to={`/app/plans/${p.id}/where`}>
                  <Card className="h-full p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">{p.name}</div>
                      <Badge tone={p.status === "ready" ? "brand" : "neutral"}>{p.status === "ready" ? "Ready" : "In progress"}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted">{p.goal} · {p.budget}</div>
                    {spot && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2.5 text-sm">
                        <MapPin className="h-4 w-4 text-brand" />
                        <span className="font-medium">{spot.name}</span>
                        <span className="text-faint">· {p.city}</span>
                        <span className="tnum ml-auto font-medium">{fmt.aff(spot.affinity)}</span>
                      </div>
                    )}
                    <div className="mt-4 text-xs text-faint">Updated {fmt.ago(p.updated_at)}</div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
