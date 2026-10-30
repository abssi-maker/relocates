import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Workspace } from "./types";

type Ctx = {
  session: Session | null;
  ready: boolean;
  /** True once the signed-in user's workspaces have loaded (sign-in navigates before that). */
  workspacesReady: boolean;
  workspaces: Workspace[];
  workspace: Workspace | null;
  setWorkspaceId: (id: string) => void;
  reloadWorkspaces: () => Promise<Workspace[]>;
};

const SessionCtx = createContext<Ctx>(null as unknown as Ctx);
const KEY = "relocates.workspace";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadedUser, setLoadedUser] = useState<string | null>(null);
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  const reloadWorkspaces = useCallback(async () => {
    const { data } = await supabase.from("workspaces").select("*").order("created_at");
    const list = (data || []) as Workspace[];
    setWorkspaces(list);
    return list;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await reloadWorkspaces();
        setLoadedUser(data.session.user.id);
      }
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) reloadWorkspaces().then(() => setLoadedUser(s.user.id));
      else {
        setWorkspaces([]);
        setLoadedUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [reloadWorkspaces]);

  const setWorkspaceId = (id: string) => {
    setWorkspaceIdState(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* private mode */
    }
  };

  const workspace = workspaces.find((w) => w.id === workspaceId) || workspaces[0] || null;
  const workspacesReady = !!session && loadedUser === session.user.id;
  return <SessionCtx.Provider value={{ session, ready, workspacesReady, workspaces, workspace, setWorkspaceId, reloadWorkspaces }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
