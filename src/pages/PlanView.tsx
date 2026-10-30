import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Share2 } from "lucide-react";
import { Button, Spinner, cx } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { Outreach, Plan } from "../lib/types";
import { ProfileStep } from "../steps/ProfileStep";
import { WhereStep } from "../steps/WhereStep";
import { WhoStep } from "../steps/WhoStep";
import { KitStep } from "../steps/KitStep";
import { TrackerStep } from "../steps/TrackerStep";

const STEPS = [
  { id: "profile", label: "Profile" },
  { id: "where", label: "Where" },
  { id: "who", label: "Who" },
  { id: "kit", label: "Launch kit" },
  { id: "tracker", label: "Tracker" },
] as const;
const NEXT: Record<string, string> = { profile: "Continue to location", where: "Continue to partners", who: "Continue to launch kit", kit: "Continue to tracker" };

export type StepProps = {
  plan: Plan;
  outreach: Outreach[];
  savePlan: (patch: Partial<Plan>) => Promise<void>;
  reloadOutreach: () => Promise<void>;
};

export default function PlanView() {
  const { id = "", step = "where" } = useParams();
  const { workspaces } = useSession();
  const nav = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  const reloadOutreach = useCallback(async () => {
    const { data } = await supabase.from("outreach").select("*").eq("plan_id", id).order("created_at");
    setOutreach((data || []) as Outreach[]);
  }, [id]);

  useEffect(() => {
    supabase.from("plans").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) setMissing(true);
      else setPlan(data as Plan);
    });
    reloadOutreach();
  }, [id, reloadOutreach]);

  const savePlan = useCallback(
    async (patch: Partial<Plan>) => {
      setPlan((p) => (p ? { ...p, ...patch } : p));
      await supabase.from("plans").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    },
    [id],
  );

  if (missing) return <div className="p-10 text-muted">This plan doesn't exist or you don't have access. <Link className="text-brand" to="/app/plans">Back to plans</Link></div>;
  if (!plan) return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  const ws = workspaces.find((w) => w.id === plan.workspace_id);
  const idx = STEPS.findIndex((s) => s.id === step);
  const props: StepProps = { plan, outreach, savePlan, reloadOutreach };

  const share = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${plan.share_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-line px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted">
            <Link to="/app/plans" className="hover:text-ink">Plans</Link> <span className="mx-1.5 text-faint">/</span>
            <span className="font-medium text-ink">{plan.name}</span>
            {ws && <span className="ml-2 text-faint">· {ws.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={share} title="Copy a read-only link to this plan">
              {copied ? <><Check className="h-4 w-4 text-brand" /> Link copied</> : <><Share2 className="h-4 w-4" /> Share</>}
            </Button>
            {NEXT[step] && (
              <Button size="sm" onClick={() => nav(`/app/plans/${id}/${STEPS[idx + 1].id}`)}>
                {NEXT[step]} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ol className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3">
              <Link to={`/app/plans/${id}/${s.id}`} className="flex items-center gap-2 text-sm">
                <span className={cx("flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold", i < idx ? "border-brand bg-brand text-white" : i === idx ? "border-brand text-brand" : "border-line text-faint")}>
                  {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cx(i === idx ? "font-medium text-ink" : "text-muted")}>{s.label}</span>
              </Link>
              {i < STEPS.length - 1 && <span className="hidden h-px w-6 bg-line sm:block lg:w-14" />}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex-1 px-5 py-6 sm:px-8">
        {!plan.scout?.decision ? (
          <div className="text-muted">This plan hasn't been built yet. <Link className="text-brand" to={`/app/onboarding?workspace=${plan.workspace_id}`}>Start a new plan</Link></div>
        ) : step === "profile" ? (
          <ProfileStep {...props} />
        ) : step === "who" ? (
          <WhoStep {...props} />
        ) : step === "kit" ? (
          <KitStep {...props} />
        ) : step === "tracker" ? (
          <TrackerStep {...props} />
        ) : (
          <WhereStep {...props} />
        )}
      </div>
    </div>
  );
}
