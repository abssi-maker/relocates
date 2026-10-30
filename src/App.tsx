import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "./lib/session";
import { AppShell } from "./components/AppShell";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import { SignIn, SignUp } from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Plans from "./pages/Plans";
import PlanView from "./pages/PlanView";
import OutreachPage from "./pages/Outreach";
import SettingsPage from "./pages/Settings";
import Share from "./pages/Share";

function Protected({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  if (!ready) return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  if (!session) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

function AppHome() {
  const { workspaces, workspacesReady } = useSession();
  if (!workspacesReady) return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  return <Navigate to={workspaces.length ? "/app/plans" : "/app/onboarding"} replace />;
}

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/share/:token" element={<Share />} />
        <Route path="/app/onboarding" element={<Protected><Onboarding /></Protected>} />
        <Route path="/app" element={<Protected><AppShell /></Protected>}>
          <Route index element={<AppHome />} />
          <Route path="plans" element={<Plans />} />
          <Route path="plans/:id" element={<PlanView />} />
          <Route path="plans/:id/:step" element={<PlanView />} />
          <Route path="outreach" element={<OutreachPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}
