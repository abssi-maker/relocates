import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TraceEntry } from "../lib/types";
import { cx } from "./ui";

const TOOL_LABEL: Record<string, string> = {
  map_taste: "Map taste across the city",
  scan_block: "Scan blocks for partners",
  find_collab_brands: "Find collab brands",
  find_launch_artists: "Find launch artists",
  submit_plan: "Submit plan",
  reasoning: "Reasoning",
};

/** Flattens agent steps into the Qloo calls behind them, so judges and founders can see the evidence. */
export function traceRows(trace: TraceEntry[], city?: string) {
  const rows: { tool: string; text: string; ms?: number; error?: string }[] = [];
  for (const t of trace) {
    if (t.qloo?.length) {
      for (const q of t.qloo) {
        const type = q.params["filter.type"] || q.params.types || "";
        const loc = q.params["filter.location"] || q.params["signal.location"] || "";
        // A Qloo locality id means the whole city; a point means the blocks around a spot.
        const where = q.params["filter.location.query"] || q.params["signal.location.query"] || (/^[0-9a-f-]{36}$/i.test(loc) ? city || "city" : loc ? "near spot" : "");
        const extra = q.params["output.heatmap.boundary"] ? " · by neighbourhood" : "";
        rows.push({ tool: t.tool, text: `qloo ${q.endpoint} ${type.replace("urn:entity:", "")}${where ? ` · ${where}` : ""}${extra} → ${q.count.toLocaleString()}`, ms: q.ms });
      }
    } else if (t.tool === "submit_plan" || t.error) {
      rows.push({ tool: t.tool, text: t.error ? `${TOOL_LABEL[t.tool] || t.tool}: ${t.error}` : "gemini submit_plan → ranked spots + partners", error: t.error });
    }
  }
  return rows;
}

export function AgentTrace({ trace, city, defaultOpen = false, live = false }: { trace: TraceEntry[]; city?: string; defaultOpen?: boolean; live?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = traceRows(trace, city);
  const qlooCalls = rows.filter((r) => r.text.startsWith("qloo")).length;
  return (
    <div className="rounded-xl border border-line bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-semibold">
          Agent trace <span className="ml-1 font-normal text-faint">{qlooCalls} Qloo calls</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-faint" /> : <ChevronDown className="h-4 w-4 text-faint" />}
      </button>
      {open && (
        <ol className="max-h-72 space-y-1 overflow-auto border-t border-line bg-canvas/60 px-4 py-3 font-mono text-[11.5px] leading-5 text-muted">
          {rows.map((r, i) => (
            <li key={i} className={cx("flex gap-3 rise", r.error && "text-red-600")}>
              <span className="w-5 shrink-0 text-right text-faint">{i + 1}</span>
              <span className="min-w-0 flex-1 break-words">{r.text}</span>
              {r.ms != null && <span className="shrink-0 text-faint">{r.ms}ms</span>}
            </li>
          ))}
          {live && <li className="pl-8 text-faint">…</li>}
        </ol>
      )}
    </div>
  );
}

export { TOOL_LABEL };
