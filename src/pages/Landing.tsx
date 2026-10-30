import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Map, Store, Users } from "lucide-react";
import { Logo } from "../components/ui";
import { useSession } from "../lib/session";

const STEPS = [
  { icon: Store, title: "Connect your store", body: "Paste your store's address. We read your public catalog and match your brand in Qloo's taste graph to see who your customers really are." },
  { icon: Map, title: "Find your sweet spot", body: "Our agent maps where your audience's taste lives block by block, and separates sweet spots from the obvious, priciest streets." },
  { icon: Users, title: "Get a foot in the door", body: "Local venues, cafés, hotels, brands and artists that share your audience, with outreach drafted, a launch poster, a soundtrack and an opening-week plan." },
];

export default function Landing() {
  const { session, ready } = useSession();
  if (ready && session) return <Navigate to="/app" replace />;
  return (
    <div className="min-h-full bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/signin" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink">Sign in</Link>
          <Link to="/signup" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Get started</Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted">For online brands opening their first pop-up or store</div>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">Open where your customers already are.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Online brands pick pop-up locations by foot traffic and a broker's shortlist. Relocates reads your store, finds the blocks where your customers' taste already lives, and lines up the local partners to open there.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-dark">Plan your first location <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/signin" className="inline-flex h-11 items-center rounded-lg border border-line px-5 text-sm font-medium hover:bg-canvas">Sign in</Link>
          </div>
        </div>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-xl border border-line p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50"><Icon className="h-[18px] w-[18px] text-brand" /></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-faint">Step {i + 1}</span>
              </div>
              <div className="mt-4 font-semibold">{title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl bg-brand px-8 py-10 text-white sm:px-12">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Sweet spot, not just the busiest street.</h2>
              <p className="mt-3 text-white/80">Qloo scores every block of a city for how strongly your audience's taste shows up there, and how busy it is. A sweet spot is a top-10% taste match outside the city's busiest 10% — your crowd, before the rent.</p>
            </div>
            <div className="text-sm text-white/80">
              Built on <span className="font-semibold text-white">Qloo Taste AI</span> for cultural intelligence and <span className="font-semibold text-white">Google Gemini</span> for the agent, writing, images and music.
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t border-line py-8 text-center text-xs text-faint">© {new Date().getFullYear()} Relocates · relocates.io</footer>
    </div>
  );
}
