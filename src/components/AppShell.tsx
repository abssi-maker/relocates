import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarRange, Check, ChevronDown, LogOut, Plus, Send, Settings } from "lucide-react";
import { Logo, cx } from "./ui";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";

const NAV = [
  { to: "/app/plans", label: "Plans", icon: CalendarRange },
  { to: "/app/outreach", label: "Outreach", icon: Send },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { session, workspaces, workspace, setWorkspaceId } = useSession();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const email = session?.user.email || "";
  const name = (session?.user.user_metadata?.full_name as string) || email.split("@")[0];

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-canvas px-3 py-5 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="relative mt-6">
          <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2 text-left hover:bg-white/70">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand">{workspace?.name?.[0] || "?"}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {workspace?.name || "No workspace"} <span className="font-normal text-faint">· Workspace</span>
            </span>
            <ChevronDown className="h-4 w-4 text-faint" />
          </button>
          {open && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-line bg-white p-1 shadow-lg">
              {workspaces.map((w) => (
                <button key={w.id} onClick={() => { setWorkspaceId(w.id); setOpen(false); nav("/app/plans"); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-canvas">
                  <span className="flex-1 truncate">{w.name}</span>
                  {w.id === workspace?.id && <Check className="h-4 w-4 text-brand" />}
                </button>
              ))}
              <button onClick={() => { setOpen(false); nav("/app/onboarding"); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-brand hover:bg-canvas">
                <Plus className="h-4 w-4" /> New workspace
              </button>
            </div>
          )}
        </div>
        <nav className="mt-5 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx("flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm", isActive ? "bg-brand-50 font-medium text-brand" : "text-muted hover:bg-black/5 hover:text-ink")}>
              <Icon className="h-[18px] w-[18px]" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold ring-1 ring-line">{name.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-faint">{email}</div>
          </div>
          <button title="Sign out" onClick={() => supabase.auth.signOut().then(() => nav("/signin"))} className="rounded-md p-1.5 text-faint hover:bg-black/5 hover:text-ink">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <Logo />
          <div className="flex gap-1">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} title={label} className={({ isActive }) => cx("rounded-md p-2", isActive ? "bg-brand-50 text-brand" : "text-muted")}>
                <Icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        </div>
        <main className="min-h-0 flex-1 overflow-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
