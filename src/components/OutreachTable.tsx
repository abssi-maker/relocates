import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ROLES } from "../lib/plan";
import { mailto } from "../lib/kit";
import type { Outreach, OutreachStatus } from "../lib/types";
import { Card, Empty, cx, fmt } from "./ui";

const STATUSES: { id: OutreachStatus; label: string; tone: string }[] = [
  { id: "to_contact", label: "To contact", tone: "bg-canvas text-muted" },
  { id: "sent", label: "Sent", tone: "bg-blue-50 text-blue-700" },
  { id: "replied", label: "Replied", tone: "bg-amber-50 text-amber-700" },
  { id: "booked", label: "Booked", tone: "bg-brand-50 text-brand" },
];

export function OutreachTable({ rows, onChange, planNames }: { rows: Outreach[]; onChange: () => void; planNames?: Record<string, string> }) {
  if (!rows.length) return <Empty title="No partners yet" body="Add partners from a plan's Who step and they'll show up here." />;
  const setStatus = async (id: string, status: OutreachStatus) => {
    await supabase.from("outreach").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    onChange();
  };
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="tnum text-2xl font-semibold">{rows.filter((r) => r.status === s.id).length}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="px-4 py-3 font-medium">Partner</th>
              <th className="px-4 py-3 font-medium">Role</th>
              {planNames && <th className="px-4 py-3 font-medium">Plan</th>}
              <th className="px-4 py-3 font-medium">Affinity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = STATUSES.find((s) => s.id === r.status)!;
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.partner.name}</div>
                    {r.partner.address && <div className="max-w-xs truncate text-xs text-faint">{r.partner.address}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted">{ROLES.find((x) => x.id === r.role)?.label}</td>
                  {planNames && <td className="px-4 py-3"><Link className="text-brand hover:underline" to={`/app/plans/${r.plan_id}/tracker`}>{planNames[r.plan_id]}</Link></td>}
                  <td className="tnum px-4 py-3">{fmt.aff(r.partner.affinity)}</td>
                  <td className="px-4 py-3">
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as OutreachStatus)} className={cx("rounded-md border-0 px-2 py-1 text-xs font-medium outline-none ring-1 ring-line", st.tone)}>
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted">{fmt.ago(r.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.body ? <a href={mailto(r)} title="Open draft in mail" className="inline-flex rounded-md p-1.5 text-faint hover:bg-canvas hover:text-ink"><Mail className="h-4 w-4" /></a> : <span className="text-xs text-faint">No draft</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
