import type { Config } from "@netlify/functions";
import { guarded, json, fail } from "../lib/http.ts";
import { Qloo } from "../lib/qloo.ts";
import { runTool, type ScoutInput } from "../lib/scout.ts";

// Executes the Qloo tool calls the Scout agent asked for in its last step.
export default (req: Request) =>
  guarded(req, async (body) => {
    const input = body.input as ScoutInput;
    const calls: { name: string; id?: string; args?: any }[] = (body.calls || []).slice(0, 6);
    if (!input?.brandIds?.length || !calls.length) return fail("Nothing to run");

    const results = await Promise.all(
      calls.map(async (c) => {
        const t = Date.now();
        const qloo = new Qloo();
        try {
          const r = await runTool(c.name, c.args || {}, input, qloo);
          return { call: c, result: r.result, artifact: r.artifact, ms: Date.now() - t, qloo: qloo.calls };
        } catch (e: any) {
          return { call: c, result: { error: e.message }, artifact: undefined, ms: Date.now() - t, qloo: qloo.calls };
        }
      }),
    );

    return json({
      response: { role: "user", parts: results.map((r) => ({ functionResponse: { name: r.call.name, id: r.call.id, response: r.result } })) },
      artifacts: results.map((r) => r.artifact).filter(Boolean),
      trace: results.map((r) => ({ tool: r.call.name, args: r.call.args, ms: r.ms, qloo: r.qloo, error: r.result?.error })),
    });
  });

export const config: Config = { path: "/api/tools" };
