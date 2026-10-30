import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MapPin, Store } from "lucide-react";
import { Badge, Button, Card, ErrorNote, Field, Logo, Spinner, cx, inputCls } from "../components/ui";
import { CustomerProfile } from "../components/CustomerProfile";
import { AgentTrace, TOOL_LABEL } from "../components/AgentTrace";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { runScout } from "../lib/scout";
import { BUDGETS, GOALS, TIMINGS, planName, seedAgentPicks } from "../lib/plan";
import type { Entity, Profile, Scout, StoreSummary, TraceEntry, Workspace } from "../lib/types";

type StoreRead = { store: StoreSummary; read: { brand_name: string; category: string; positioning: string }; match: Entity | null; lookalikes: Entity[] };
const STEPS = ["Connect store", "Confirm brand", "Goal & city", "Your first plan"];

export default function Onboarding() {
  const [params] = useSearchParams();
  const { workspaces, reloadWorkspaces, setWorkspaceId } = useSession();
  const existing = workspaces.find((w) => w.id === params.get("workspace")) || null;
  const [step, setStep] = useState(existing ? 2 : 0);
  const [read, setRead] = useState<StoreRead | null>(null);
  const [signals, setSignals] = useState<Entity[]>([]);
  const [profile, setProfile] = useState<Profile | null>(existing?.profile || null);
  const [started, setStarted] = useState<StartCtx | null>(null);
  const nav = useNavigate();

  return (
    <div className="min-h-full bg-canvas">
      <header className="flex flex-wrap items-center gap-6 px-6 py-5 sm:px-10">
        <Link to={workspaces.length ? "/app/plans" : "/"}><Logo /></Link>
        <ol className="mx-auto flex flex-wrap items-center gap-3 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cx("flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold", i < step ? "border-brand bg-white text-brand" : i === step ? "border-brand bg-brand text-white" : "border-line bg-white text-faint")}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cx(i === step ? "font-medium text-brand" : "text-muted", "hidden sm:inline")}>{s}</span>
              {i < STEPS.length - 1 && <span className="hidden h-px w-8 bg-line sm:block" />}
            </li>
          ))}
        </ol>
        <span className="hidden w-[120px] sm:block" />
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        {step === 0 && <ConnectStore onDone={(r) => { setRead(r); setSignals(r.match ? [r.match] : r.lookalikes.slice(0, 3)); setStep(1); }} />}
        {step === 1 && read && (
          <ConfirmBrand read={read} signals={signals} setSignals={setSignals} profile={profile} setProfile={setProfile} onBack={() => setStep(0)} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <GoalCity
            existing={existing}
            onBack={existing ? undefined : () => setStep(1)}
            onCreate={async (goal) => {
              let ws = existing;
              if (!ws && read) {
                const { data, error } = await supabase
                  .from("workspaces")
                  .insert({
                    name: read.read.brand_name,
                    store_url: read.store.domain,
                    store: read.store,
                    brand: { ids: signals.map((s) => s.id), name: read.read.brand_name, category: read.read.category, positioning: read.read.positioning, match: read.match, signals },
                    profile,
                  })
                  .select()
                  .single();
                if (error) throw error;
                ws = data as Workspace;
              }
              if (!ws) throw new Error("Workspace missing");
              const { data: plan, error } = await supabase
                .from("plans")
                .insert({ workspace_id: ws.id, name: planName(goal.city, goal.goal, goal.timing), goal: goal.goal, city: goal.city, timing: goal.timing, budget: goal.budget, status: "scouting" })
                .select()
                .single();
              if (error) throw error;
              await reloadWorkspaces();
              setWorkspaceId(ws.id);
              return { ws, planId: plan.id as string };
            }}
            onStarted={(ctx) => { setStarted(ctx); setStep(3); }}
          />
        )}
        {step === 3 && started && <FirstPlan ctx={started} onDone={(id) => nav(`/app/plans/${id}/where`)} />}
      </div>
    </div>
  );
}

type StartCtx = { ws: Workspace; planId: string; city: string; cityId: string; goal: string; timing: string; budget: string };

function ConnectStore({ onDone }: { onDone: (r: StoreRead) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await api<StoreRead>("store", { url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-8 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Connect your store</h1>
      <p className="mt-2 text-muted">Paste your online store's address. We read your public catalog — products, categories and prices — to understand your brand. No login or app install needed.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Store address" hint="Works best with Shopify stores; any brand website works too.">
          <div className="relative">
            <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input className={cx(inputCls, "pl-9")} placeholder="yourbrand.com" value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus />
          </div>
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap gap-2 text-sm text-muted">
            Try:
            {["glossier.com", "allbirds.com", "brooklinen.com"].map((s) => (
              <button type="button" key={s} onClick={() => setUrl(s)} className="font-medium text-brand hover:underline">{s}</button>
            ))}
          </div>
          <Button type="submit" loading={busy}>{busy ? "Reading store…" : <>Continue <ArrowRight className="h-4 w-4" /></>}</Button>
        </div>
      </form>
    </Card>
  );
}

function ConfirmBrand({ read, signals, setSignals, profile, setProfile, onBack, onNext }: {
  read: StoreRead; signals: Entity[]; setSignals: (s: Entity[]) => void; profile: Profile | null; setProfile: (p: Profile | null) => void; onBack: () => void; onNext: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = signals.map((s) => s.id).join(",");
  useEffect(() => {
    if (!key) return setProfile(null);
    let live = true;
    setLoading(true);
    setError("");
    api<Profile>("profile", { ids: key.split(",") })
      .then((p) => live && setProfile(p))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [key, setProfile]);

  const s = read.store;
  const usingMatch = !!read.match && signals.length === 1 && signals[0].id === read.match.id;
  const toggle = (e: Entity) => {
    const rest = signals.filter((x) => x.id !== read.match?.id);
    setSignals(rest.some((x) => x.id === e.id) ? rest.filter((x) => x.id !== e.id) : [...rest, e]);
  };

  return (
    <Card>
      <div className="p-8 sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">{read.match ? "Is this your brand?" : "Pick brands like yours"}</h1>
        <p className="mt-2 text-muted">
          {read.match ? "We read your store and matched it to a brand in Qloo's taste graph. Confirm to continue." : `${read.read.brand_name} isn't in Qloo's taste graph yet, so we'll read your customers through brands they also love.`}
        </p>
        <div className="mt-7 grid gap-4 rounded-xl border border-line p-5 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-canvas"><Store className="h-5 w-5 text-muted" /></span>
            <div>
              <div className="font-semibold">{s.domain}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Connected store</div>
            </div>
          </div>
          <Stat label="Categories" value={s.categories.slice(0, 3).join(" · ") || read.read.category} />
          {s.productCount > 0 && <Stat label="Products read" value={String(s.productCount)} />}
          {s.priceBand && <Stat label="Price band" value={`$${s.priceBand.low}–$${s.priceBand.high}`} />}
        </div>
        {read.match && (
          <button onClick={() => setSignals([read.match!])} className={cx("mt-4 flex w-full items-center gap-4 rounded-xl border p-5 text-left", usingMatch ? "border-brand/40 bg-brand-50" : "border-line hover:bg-canvas")}>
            <CheckCircle2 className={cx("h-9 w-9", usingMatch ? "text-brand" : "text-line")} strokeWidth={1.5} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand">Qloo match</div>
              <div className="text-xl font-semibold">{read.match.name}</div>
              <div className="text-sm text-muted">{read.read.category}{read.match.popularity != null && ` · popularity ${read.match.popularity.toFixed(2)}`}</div>
            </div>
          </button>
        )}
        {read.lookalikes.length > 0 && (
          <div className="mt-5">
            <div className="text-sm text-muted">{read.match ? "Not you? Use look-alike brands instead:" : "Brands your customers likely love (select one or more):"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {read.lookalikes.map((e) => {
                const on = signals.some((x) => x.id === e.id);
                return (
                  <button key={e.id} onClick={() => toggle(e)} className={cx("rounded-lg border px-3.5 py-2 text-sm", on ? "border-brand bg-brand-50 font-medium text-brand" : "border-line bg-white hover:bg-canvas")}>
                    {on && <Check className="mr-1 inline h-3.5 w-3.5" />}{e.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-8 border-t border-line pt-7">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Your customer, per Qloo</h2>
            {loading && <Spinner />}
          </div>
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
            {profile && !loading && <CustomerProfile profile={profile} />}
            {!signals.length && <p className="text-sm text-muted">Select at least one brand.</p>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-8 py-5">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={onNext} disabled={!profile || loading || !signals.length}>Looks right — continue <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:border-l sm:border-line sm:pl-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function GoalCity({ existing, onBack, onCreate, onStarted }: {
  existing: Workspace | null;
  onBack?: () => void;
  onCreate: (g: { goal: string; city: string; timing: string; budget: string }) => Promise<{ ws: Workspace; planId: string }>;
  onStarted: (c: StartCtx) => void;
}) {
  const [goal, setGoal] = useState(GOALS[0]);
  const [city, setCity] = useState("");
  // The Qloo locality the founder picked; names alone are ambiguous ("New York" is also a state).
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [options, setOptions] = useState<{ id: string; name: string; label: string }[]>([]);
  const [timing, setTiming] = useState(TIMINGS[1]);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<number>();

  useEffect(() => {
    if (picked || city.trim().length < 2) return setOptions([]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      api<{ results: { id: string; name: string; label: string }[] }>("city", { q: city }).then((r) => setOptions(r.results)).catch(() => setOptions([]));
    }, 300);
  }, [city, picked]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!picked) return setError("Pick your city from the suggestions.");
    setBusy(true);
    setError("");
    try {
      const g = { goal, city: city.trim(), timing, budget };
      const { ws, planId } = await onCreate(g);
      onStarted({ ws, planId, cityId: picked.id, ...g });
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Card>
      <form onSubmit={submit}>
        <div className="p-8 sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight">What are you opening?</h1>
          <p className="mt-2 text-muted">{existing ? `New plan for ${existing.name}.` : "Tell us the goal and the city. Our agent does the rest."}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {GOALS.map((g) => (
              <button type="button" key={g} onClick={() => setGoal(g)} className={cx("rounded-xl border p-4 text-left text-sm", goal === g ? "border-brand bg-brand-50" : "border-line hover:bg-canvas")}>
                <div className="font-medium">{g}</div>
                <div className="mt-1 text-xs text-muted">{g.startsWith("Pop") ? "Test a city before committing" : g.startsWith("First") ? "A long-term lease" : "Recurring launches and activations"}</div>
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <Field label="City" hint={picked ? picked.label : "Start typing, then pick your city from the list."}>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input className={cx(inputCls, "pl-9")} placeholder="e.g. New York City, Austin, London" value={city} onChange={(e) => { setCity(e.target.value); setPicked(null); }} required />
                </div>
              </Field>
              {options.length > 0 && (
                <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-line bg-white p-1 shadow-lg">
                  {options.map((o) => (
                    <button type="button" key={o.id} onClick={() => { setCity(o.name); setPicked({ id: o.id, label: o.label }); setOptions([]); }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-canvas">
                      <span className="font-medium">{o.name}</span> <span className="text-faint">{o.label !== o.name && o.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field label="Timing">
              <select className={inputCls} value={timing} onChange={(e) => setTiming(e.target.value)}>{TIMINGS.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Budget">
              <select className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)}>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select>
            </Field>
          </div>
          <div className="mt-5"><ErrorNote>{error}</ErrorNote></div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-8 py-5">
          {onBack ? <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button> : <span />}
          <Button type="submit" loading={busy}>Build my plan <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </form>
    </Card>
  );
}

function FirstPlan({ ctx, onDone }: { ctx: StartCtx; onDone: (planId: string) => void }) {
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const ranFor = useRef<number>(-1);

  useEffect(() => {
    if (ranFor.current === attempt) return;
    ranFor.current = attempt;
    setTrace([]);
    setError("");
    const ws = ctx.ws;
    const input = {
      brandIds: ws.brand?.ids || [],
      brandName: ws.brand?.name || ws.name,
      city: ctx.city,
      cityId: ctx.cityId,
      goal: ctx.goal,
      timing: ctx.timing,
      budget: ctx.budget,
      audience: ws.profile?.taste.map((t) => t.name).join(", "),
    };
    runScout(input, api, { onTrace: (t) => setTrace((x) => [...x, t]) })
      .then(async (scout: Scout) => {
        const chosen = scout.decision?.spots[0]?.spot_id || null;
        await supabase.from("plans").update({ scout, chosen_spot: chosen, status: "ready", trace: scout.trace, updated_at: new Date().toISOString() }).eq("id", ctx.planId);
        await seedAgentPicks(ctx.planId, scout);
        onDone(ctx.planId);
      })
      .catch((e) => setError(e.message));
  }, [attempt, ctx, onDone]);

  const stages = useMemo(() => {
    const done = new Set(trace.map((t) => t.tool));
    return ["map_taste", "scan_block", "find_collab_brands", "submit_plan"].map((k) => ({ k, label: k === "find_collab_brands" ? "Find collab brands and launch artists" : TOOL_LABEL[k], done: done.has(k) }));
  }, [trace]);
  const current = stages.find((s) => !s.done)?.k;

  return (
    <Card className="p-8 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Building your first plan</h1>
      <p className="mt-2 text-muted">Our agent is reading Qloo's taste graph for {ctx.ws.brand?.name || ctx.ws.name} in {ctx.city}. This takes about 30 seconds.</p>
      <ol className="mt-7 space-y-3">
        {stages.map((s) => (
          <li key={s.k} className="flex items-center gap-3 text-sm">
            {s.done ? <CheckCircle2 className="h-5 w-5 text-brand" /> : s.k === current && !error ? <Spinner className="h-5 w-5" /> : <span className="h-5 w-5 rounded-full border border-line" />}
            <span className={cx(s.done ? "text-ink" : s.k === current ? "font-medium" : "text-faint")}>{s.label}</span>
            {s.k === "scan_block" && s.done && <Badge tone="brand">{trace.filter((t) => t.tool === "scan_block").length} areas</Badge>}
          </li>
        ))}
      </ol>
      <div className="mt-7"><AgentTrace trace={trace} defaultOpen live={!error} /></div>
      {error && (
        <div className="mt-5 space-y-3">
          <ErrorNote>{error}</ErrorNote>
          <Button variant="secondary" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
        </div>
      )}
    </Card>
  );
}
