// One reasoning step of the Scout agent (Gemini with Qloo tools). The browser runs the requested tools via
// /api/tools and calls back with the results until the agent submits a plan.
import { edgeGuard, env } from "../lib/edge-auth.ts";
import { AGENT_MODEL, generate, partsOf } from "../lib/gemini.ts";
import { SCOUT_TOOLS, scoutSystem, type ScoutInput } from "../lib/scout-spec.ts";

const MAX_TURNS = 7;

export default (req: Request) =>
  edgeGuard(req, async (body) => {
    const input = body.input as ScoutInput;
    if (!input?.brandIds?.length || !input.city) return Response.json({ error: "Missing brand or city" }, { status: 400 });
    const contents: any[] = Array.isArray(body.contents) && body.contents.length
      ? body.contents
      : [{ role: "user", parts: [{ text: `Plan where ${input.brandName} should open in ${input.city}, and who to partner with.` }] }];
    const turn = Number(body.turn || 0);
    const known = new Set<string>((body.known || []).map(String));

    const resp = await generate(
      AGENT_MODEL,
      {
        systemInstruction: { parts: [{ text: scoutSystem(input) }] },
        contents,
        tools: SCOUT_TOOLS,
        toolConfig: { functionCallingConfig: turn >= MAX_TURNS - 1 ? { mode: "ANY", allowedFunctionNames: ["submit_plan"] } : { mode: "ANY" } },
        generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
      },
      env("GEMINI_API_KEY"),
    );

    const modelContent = resp?.candidates?.[0]?.content || { role: "model", parts: [] };
    const calls = partsOf(resp).filter((p) => p.functionCall).map((p) => p.functionCall);
    const note = partsOf(resp).map((p) => (p.thought ? "" : p.text || "")).join(" ").trim() || undefined;
    contents.push(modelContent);

    const final = calls.find((c) => c.name === "submit_plan");
    if (final) {
      // A plan may only cite spots and partners that a tool actually returned.
      const bad = [...(final.args?.spots || []).map((s: any) => s.spot_id), ...(final.args?.partners || []).map((p: any) => p.entity_id)].filter(
        (id) => !known.has(String(id)),
      );
      if (!bad.length && (final.args?.spots || []).length) return Response.json({ done: true, decision: final.args, note });
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name: "submit_plan", id: final.id, response: { error: `Rejected: ids not returned by any tool: ${bad.slice(0, 8).join(", ")}. Use only returned ids.` } } }],
      });
      return Response.json({ done: false, contents, calls: [], note: "Plan cited unknown ids; retrying." });
    }
    if (!calls.length) contents.push({ role: "user", parts: [{ text: "Continue with the tools, then finish with submit_plan." }] });
    return Response.json({ done: false, contents, calls, note });
  });

export const config = { path: "/api/think" };
