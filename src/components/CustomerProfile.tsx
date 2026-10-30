import type { Profile } from "../lib/types";
import { Badge, cx } from "./ui";

const AGE_LABEL: Record<string, string> = {
  "24_and_younger": "24 and under",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55+",
};

export function CustomerProfile({ profile }: { profile: Profile }) {
  // Qloo returns gender as a skew from -1 (male) to +1 (female), not a share of customers.
  const skew = profile.femaleSkew;
  return (
    <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="text-sm font-medium">Age affinity <span className="font-normal text-faint">(vs. general population)</span></div>
        <div className="mt-3 space-y-2.5">
          {Object.entries(AGE_LABEL).map(([k, label]) => {
            const v = profile.age[k];
            if (v == null) return null;
            return (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-muted">{label}</span>
                <div className="relative h-2.5 flex-1 rounded-full bg-canvas">
                  <div className={cx("absolute inset-y-0 left-0 rounded-full", v >= 0 ? "bg-brand" : "bg-faint/40")} style={{ width: `${Math.min(100, Math.abs(v) * 100)}%` }} />
                </div>
                <span className={cx("tnum w-12 text-right font-medium", v >= 0 ? "text-brand" : "text-faint")}>{v > 0 ? "+" : ""}{v.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">Gender skew <span className="font-normal text-faint">(vs. general population)</span></div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="tnum text-3xl font-semibold">{skew > 0 ? "+" : ""}{skew.toFixed(2)}</span>
          <span className="text-sm text-muted">{Math.abs(skew) < 0.1 ? "balanced" : skew > 0 ? "toward female" : "toward male"}</span>
        </div>
        <div className="relative mt-2 h-2.5 rounded-full bg-canvas">
          <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
          <div className="absolute inset-y-0 rounded-full bg-brand" style={skew >= 0 ? { left: "50%", width: `${skew * 50}%` } : { right: "50%", width: `${-skew * 50}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-faint"><span>Male</span><span>Female</span></div>
        <div className="mt-5 text-sm font-medium">Top taste affinities</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.taste.slice(0, 8).map((t) => (
            <Badge key={t.id || t.name}>{t.name}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
