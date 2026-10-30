import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, ErrorNote, Field, Logo, inputCls } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";

const DEMO = { email: "judge@relocates.io", password: "Relocates-Judge-2026" };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
        <div className="text-xs text-faint">© Relocates · relocates.io</div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand lg:block">
        <MapMotif />
        <div className="relative px-14 pt-24">
          <h2 className="max-w-md text-5xl font-semibold leading-[1.05] tracking-tight text-white">Open where your customers already are.</h2>
          <p className="mt-5 max-w-md text-base text-white/75">Relocates maps where your brand's taste lives in any city with Qloo, then lines up the partners and launch kit to open there.</p>
        </div>
      </div>
    </div>
  );
}

function MapMotif() {
  const cells = Array.from({ length: 120 }, (_, i) => ({ x: (i * 37) % 560, y: 260 + ((i * 53) % 420), o: ((i * 29) % 10) / 22 }));
  return (
    <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => <line key={`h${i}`} x1="0" x2="600" y1={220 + i * 44} y2={200 + i * 44} stroke="white" strokeOpacity="0.08" />)}
      {Array.from({ length: 14 }, (_, i) => <line key={`v${i}`} y1="200" y2="900" x1={i * 46} x2={i * 46 + 30} stroke="white" strokeOpacity="0.08" />)}
      {cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width="22" height="14" fill="white" fillOpacity={c.o} />)}
    </svg>
  );
}

export function SignIn() {
  const { session } = useSession();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (session) return <Navigate to="/app" replace />;

  const signIn = async (creds: { email: string; password: string }) => {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (error) setError(error.message);
    else nav("/app");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn({ email, password });
  };

  return (
    <Frame>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-muted">Sign in to plan your next place.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email"><input className={inputCls} type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" loading={busy} className="w-full">Continue</Button>
      </form>
      <button onClick={() => signIn(DEMO)} disabled={busy} className="mt-4 w-full text-center text-sm font-medium text-brand underline-offset-4 hover:underline">
        Use demo account
      </button>
      <p className="mt-8 text-center text-sm text-muted">
        New to Relocates? <Link to="/signup" className="font-medium text-brand hover:underline">Create an account</Link>
      </p>
    </Frame>
  );
}

export function SignUp() {
  const { session } = useSession();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  if (session) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) nav("/app/onboarding");
    else setSent(true);
  };

  return (
    <Frame>
      {sent ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-2 text-muted">We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Open it to finish setting up your workspace.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-muted">Plan your first physical location in minutes.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Full name"><input className={inputCls} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="Work email"><input className={inputCls} type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Password" hint="At least 8 characters."><input className={inputCls} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" loading={busy} className="w-full">Create account</Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted">
            Already have an account? <Link to="/signin" className="font-medium text-brand hover:underline">Sign in</Link>
          </p>
        </>
      )}
    </Frame>
  );
}
