import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, Field, inputCls } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";

export default function SettingsPage() {
  const { session, workspace, reloadWorkspaces } = useSession();
  const [name, setName] = useState(workspace?.name || "");
  const [saved, setSaved] = useState(false);
  const nav = useNavigate();
  useEffect(() => setName(workspace?.name || ""), [workspace]);

  const save = async () => {
    if (!workspace) return;
    await supabase.from("workspaces").update({ name }).eq("id", workspace.id);
    await reloadWorkspaces();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      {workspace && (
        <Card className="mt-6 p-6">
          <h2 className="font-semibold">Workspace</h2>
          <div className="mt-4 space-y-4">
            <Field label="Workspace name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><div className="text-sm font-medium">Connected store</div><div className="mt-1 text-sm text-muted">{workspace.store_url || "–"}</div></div>
              <div>
                <div className="text-sm font-medium">Qloo signal</div>
                <div className="mt-1 flex flex-wrap gap-1.5">{(workspace.brand?.signals || []).map((s) => <Badge key={s.id} tone="brand">{s.name}</Badge>)}</div>
              </div>
            </div>
            <Button onClick={save} disabled={!name.trim() || name === workspace.name}>{saved ? "Saved" : "Save changes"}</Button>
          </div>
        </Card>
      )}
      <Card className="mt-5 p-6">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-3 text-sm text-muted">Signed in as <span className="font-medium text-ink">{session?.user.email}</span></div>
        <Button variant="secondary" className="mt-4" onClick={() => supabase.auth.signOut().then(() => nav("/signin"))}>Sign out</Button>
      </Card>
    </div>
  );
}
