import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Logo({ className = "", mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-semibold tracking-tight text-ink", className)}>
      <img src="/logo.svg" alt="" className="h-7 w-7" />
      {!mark && <span className="text-[1.35rem] leading-none">relocates</span>}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; loading?: boolean; size?: "sm" | "md" };
export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-canvas",
        variant === "ghost" && "text-muted hover:bg-black/5 hover:text-ink",
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-line bg-white", className)}>{children}</div>;
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "sweet" | "prime" | "brand"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-canvas text-muted ring-1 ring-line",
        tone === "sweet" && "bg-brand-50 text-brand",
        tone === "brand" && "bg-brand-50 text-brand",
        tone === "prime" && "bg-prime-50 text-prime",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-faint outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("h-4 w-4 animate-spin text-brand", className)} />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <div className="text-base font-semibold">{title}</div>
      {body && <div className="mt-1 max-w-md text-sm text-muted">{body}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Score({ value, label = "affinity" }: { value?: number; label?: string }) {
  if (value == null) return null;
  return (
    <div className="text-right">
      <div className="tnum text-xl font-semibold leading-none">{value.toFixed(2)}</div>
      <div className="mt-1 text-xs text-faint">{label}</div>
    </div>
  );
}

export const fmt = {
  aff: (n?: number) => (n == null ? "–" : n.toFixed(2)),
  pct: (n?: number) => (n == null ? "–" : `${Math.round(n * 100)}`),
  ordinal(n: number) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  },
  ago(iso: string) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  },
};
