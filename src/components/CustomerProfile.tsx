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
  const female = Math.round(50 + profile.femaleSkew * 50);
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
          <span className="tnum text-3xl font-semibold">{female >= 50 ? female : 100 - female}%</span>
          <span className="text-sm text-muted">{female >= 50 ? "female" : "male"}</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-canvas">
          <div className="h-full rounded-full bg-brand" style={{ width: `${female >= 50 ? female : 100 - female}%` }} />
        </div>
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
