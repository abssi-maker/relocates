import { useCallback, useEffect, useState } from "react";
import { OutreachTable } from "../components/OutreachTable";
import { Spinner } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import type { Outreach } from "../lib/types";

export default function OutreachPage() {
  const { workspace } = useSession();
  const [rows, setRows] = useState<Outreach[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!workspace) return;
    const { data: plans } = await supabase.from("plans").select("id,name").eq("workspace_id", workspace.id);
    const ids = (plans || []).map((p) => p.id);
    setNames(Object.fromEntries((plans || []).map((p) => [p.id, p.name])));
    if (!ids.length) return setRows([]);
    const { data } = await supabase.from("outreach").select("*").in("plan_id", ids).order("updated_at", { ascending: false });
    setRows((data || []) as Outreach[]);
  }, [workspace]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Outreach</h1>
      <p className="mt-1 text-muted">Every partner conversation across {workspace?.name}'s plans.</p>
      <div className="mt-6">{rows ? <OutreachTable rows={rows} onChange={load} planNames={names} /> : <Spinner className="h-5 w-5" />}</div>
    </div>
  );
}
