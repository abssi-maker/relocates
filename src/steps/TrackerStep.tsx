import type { StepProps } from "../pages/PlanView";
import { OutreachTable } from "../components/OutreachTable";

export function TrackerStep({ outreach, reloadOutreach }: StepProps) {
  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight">Outreach tracker</h1>
      <p className="mt-1.5 text-muted">Move each partner along as conversations progress.</p>
      <div className="mt-6"><OutreachTable rows={outreach} onChange={reloadOutreach} /></div>
    </div>
  );
}
