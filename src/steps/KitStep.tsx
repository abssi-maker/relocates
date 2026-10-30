import { useState } from "react";
import { CalendarDays, Copy, Download, Image as ImageIcon, Mail, Music2, Wand2 } from "lucide-react";
import type { StepProps } from "../pages/PlanView";
import { Badge, Button, Card, ErrorNote, Spinner, cx, fmt } from "../components/ui";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { ROLES } from "../lib/plan";
import { draftOutreach, generateMedia, mailto, spotName } from "../lib/kit";
import { posterPrompt, trackPrompt } from "../lib/prompts";
import type { Kit, Outreach } from "../lib/types";

export function KitStep({ plan, outreach, savePlan, reloadOutreach }: StepProps) {
  const { workspaces } = useSession();
  const ws = workspaces.find((w) => w.id === plan.workspace_id)!;
  const scout = plan.scout!;
  const kit = plan.kit || {};
  const taste = (ws.profile?.taste || []).map((t) => t.name).slice(0, 6);
  const artists = scout.artists.slice(0, 6);
  const styles = [...new Set(artists.flatMap((a) => a.tags || []))].slice(0, 8);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const save = (patch: Partial<Kit>) => savePlan({ kit: { ...(plan.kit || {}), ...patch } });

  const ctx = { brand: ws.brand?.name || ws.name, goal: (plan.goal || "pop-up").toLowerCase(), spot: spotName(plan), city: plan.city, taste, styles };
  const creative = async () => {
    if (kit.creative) return kit.creative;
    const c = await api<NonNullable<Kit["creative"]>>("write", { kind: "creative", context: ctx });
    await save({ creative: c });
    return c;
  };

  const poster = () =>
    run("poster", async () => {
      const c = await creative();
      const url = await generateMedia("poster", posterPrompt(ctx.brand, ctx.spot, c), plan.id);
      await savePlan({ kit: { ...(plan.kit || {}), creative: c, poster: { url, signals: [...taste.slice(0, 4), ...styles.slice(0, 3)] } } });
    });

  const track = () =>
    run("track", async () => {
      const c = await creative();
      const url = await generateMedia("track", trackPrompt(c), plan.id);
      await savePlan({ kit: { ...(plan.kit || {}), creative: c, track: { url, signals: styles.slice(0, 6) } } });
    });

  const promo = () =>
    run("promo", async () => {
      const r = await api<{ days: NonNullable<Kit["promo"]> }>("write", {
        kind: "promo",
        context: { ...ctx, partners: outreach.map((o) => ({ name: o.partner.name, role: ROLES.find((r) => r.id === o.role)?.label })), artists: artists.map((a) => a.name) },
      });
      await save({ promo: r.days });
    });

  const draftAll = () =>
    run("drafts", async () => {
      for (const row of outreach.filter((o) => !o.body)) await draftOutreach(plan, ws, row);
      await reloadOutreach();
    });

  const missing = outreach.filter((o) => !o.body).length;

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight">Launch kit</h1>
      <p className="mt-1.5 text-muted">Everything you need to get a foot in the door at {spotName(plan)} — each piece is shaped by what Qloo knows your audience loves.</p>
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>

      <Section icon={Mail} title="Outreach" sub={`${outreach.length} partners in this plan`}
        action={missing > 0 && <Button size="sm" onClick={draftAll} loading={busy === "drafts"}><Wand2 className="h-4 w-4" /> Draft {missing} email{missing > 1 ? "s" : ""}</Button>}>
        {outreach.length === 0 ? (
          <p className="text-sm text-muted">Add partners on the Who step to draft outreach.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {outreach.map((o) => <Draft key={o.id} row={o} />)}
          </div>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={ImageIcon} title="Launch poster" sub="Gemini image, art-directed from your Qloo taste profile"
          action={<Button size="sm" variant={kit.poster ? "secondary" : "primary"} onClick={poster} loading={busy === "poster"}>{kit.poster ? "Regenerate" : "Generate poster"}</Button>}>
          {kit.poster ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <img src={kit.poster.url} alt="Launch poster" className="w-full max-w-[260px] rounded-lg border border-line" />
              <div className="text-sm">
                <div className="font-medium">Styled from (Qloo)</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{kit.poster.signals.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                {kit.creative && <p className="mt-3 text-muted">{kit.creative.visual}</p>}
                <a href={kit.poster.url} download target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-medium text-brand hover:underline"><Download className="h-4 w-4" /> Download</a>
              </div>
            </div>
          ) : busy === "poster" ? <Working text="Designing your poster (about 15 seconds)…" /> : <Placeholder text="A print-ready poster for your opening, using your audience's taste tags and music styles." />}
        </Section>

        <Section icon={Music2} title="In-store soundtrack" sub="Lyria, from the music styles your audience loves"
          action={<Button size="sm" variant={kit.track ? "secondary" : "primary"} onClick={track} loading={busy === "track"}>{kit.track ? "Regenerate" : "Generate track"}</Button>}>
          {kit.track ? (
            <div>
              <audio controls src={kit.track.url} className="w-full" />
              {kit.creative && <p className="mt-3 text-sm text-muted">{kit.creative.music}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">{kit.track.signals.map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </div>
          ) : busy === "track" ? <Working text="Composing a 30-second track…" /> : <Placeholder text="An original instrumental loop in the styles of the artists your audience loves." />}
          <div className="mt-5 border-t border-line pt-4">
            <div className="text-sm font-medium">Launch-night lineup ideas <span className="font-normal text-faint">(Qloo artist affinity in {plan.city})</span></div>
            <div className="mt-2 divide-y divide-line">
              {artists.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{a.name}</span>
                  <span className="tnum text-muted">{fmt.aff(a.affinity)}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      <Section icon={CalendarDays} title="Opening week" sub="Promotion plan built around your partners"
        action={<Button size="sm" variant={kit.promo ? "secondary" : "primary"} onClick={promo} loading={busy === "promo"}>{kit.promo ? "Regenerate" : "Plan opening week"}</Button>}>
        {kit.promo ? (
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {kit.promo.map((d, i) => (
              <li key={i} className="rounded-lg border border-line p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-brand">{d.day}</div>
                <div className="mt-1 font-medium">{d.title}</div>
                <p className="mt-1 text-sm text-muted">{d.detail}</p>
                {d.partner && <Badge className="mt-2">{d.partner}</Badge>}
              </li>
            ))}
          </ol>
        ) : busy === "promo" ? <Working text="Planning your opening week…" /> : <Placeholder text="Day-by-day promotions from pre-launch to day 7, tied to your partners and launch artists." />}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, sub, action, children }: { icon: typeof Mail; title: string; sub: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="mt-5 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50"><Icon className="h-[18px] w-[18px] text-brand" /></span>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-muted">{sub}</div>
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Draft({ row }: { row: Outreach }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.partner.name}</div>
          <div className="text-xs text-faint">{ROLES.find((r) => r.id === row.role)?.label}</div>
        </div>
        {row.body && (
          <div className="flex gap-1">
            <button title="Copy" onClick={() => { navigator.clipboard.writeText(`Subject: ${row.subject}\n\n${row.body}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={cx("rounded-md p-1.5 hover:bg-canvas", copied ? "text-brand" : "text-faint")}><Copy className="h-4 w-4" /></button>
            <a title="Open in mail" href={mailto(row)} className="rounded-md p-1.5 text-faint hover:bg-canvas"><Mail className="h-4 w-4" /></a>
          </div>
        )}
      </div>
      {row.body ? (
        <div className="mt-3 text-sm">
          <div className="font-medium">{row.subject}</div>
          <p className="mt-1.5 line-clamp-6 whitespace-pre-wrap text-muted">{row.body}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-faint">Not drafted yet.</p>
      )}
    </div>
  );
}

const Working = ({ text }: { text: string }) => <div className="flex items-center gap-2 py-6 text-sm text-muted"><Spinner /> {text}</div>;
const Placeholder = ({ text }: { text: string }) => <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{text}</p>;
