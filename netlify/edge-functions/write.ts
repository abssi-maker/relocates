import { edgeGuard, env } from "./_auth.ts";
import { generateJson as gen } from "../lib/gemini.ts";

const json = (d: unknown) => Response.json(d);
const fail = (m: string) => Response.json({ error: m }, { status: 400 });
const generateJson = <T,>(prompt: string, schema: object, system?: string) => gen<T>(prompt, schema, system, env("GEMINI_API_KEY"));

const SYSTEM = `You write for Relocates, which helps online brands open physical pop-ups. Write like a sharp, warm founder: specific, brief, no hype, no emojis.
Use only facts given in the input (Qloo data and plan details). Never invent statistics, dates, prices or claims about the recipient.`;

const ROLE_ASK: Record<string, string> = {
  host: "host the pop-up or a launch evening in their space",
  copromote: "co-promote the opening (a shared offer or a small activation)",
  guests: "share the pop-up with their guests (a guest perk or a lobby moment)",
  collab: "explore a small collaboration drop for the opening",
  launch: "perform or DJ at the launch night",
};

// Launch-kit writing: outreach emails, the opening-week promotion plan, and creative direction for the poster and track.
export default (req: Request) =>
  edgeGuard(req, async (body) => {
    const c = body.context || {};
    if (body.kind === "outreach") {
      const p = c.partner || {};
      const out = await generateJson<{ subject: string; body: string }>(
        `Write a first outreach email from ${c.brand} to ${p.name}.
Goal: ${c.goal} in ${c.spot} (${c.city}), ${c.timing || "timing flexible"}.
Ask: would they ${ROLE_ASK[p.role] || "partner on the opening"}.
Why them (Qloo taste data): ${p.why}. Their profile: ${[p.description, p.audience].filter(Boolean).join(" ").slice(0, 600)}.
Brand positioning: ${c.positioning || ""}.
Describe the audience overlap in plain words; never mention Qloo, data, scores or tools in the email.
Under 130 words, in 3-4 short paragraphs separated by blank lines, starting "Hi ${p.name} team,". Subject under 8 words. Sign off as "The ${c.brand} team".`,
        { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"] },
        SYSTEM,
      );
      return json(out);
    }
    if (body.kind === "promo") {
      const out = await generateJson<{ days: { day: string; title: string; detail: string; partner?: string }[] }>(
        `Plan the opening week for ${c.brand}'s ${c.goal} in ${c.spot}, ${c.city}.
Partners in the plan: ${(c.partners || []).map((p: any) => `${p.name} (${p.role})`).join("; ")}.
Audience taste (Qloo): ${(c.taste || []).join(", ")}. Launch artists (Qloo): ${(c.artists || []).join(", ")}.
Give 6 entries from "Pre-launch" through "Day 7": each a short title, one-sentence detail, and the partner involved if any (exact name from the list).`,
        {
          type: "object",
          properties: {
            days: {
              type: "array",
              items: {
                type: "object",
                properties: { day: { type: "string" }, title: { type: "string" }, detail: { type: "string" }, partner: { type: "string" } },
                required: ["day", "title", "detail"],
              },
            },
          },
          required: ["days"],
        },
        SYSTEM,
      );
      return json(out);
    }
    if (body.kind === "creative") {
      const out = await generateJson<{ headline: string; subline: string; visual: string; music: string }>(
        `Creative direction for ${c.brand}'s ${c.goal} in ${c.spot}, ${c.city}.
Audience taste tags (Qloo): ${(c.taste || []).join(", ")}.
Music the audience loves (Qloo artist styles): ${(c.styles || []).join(", ")}.
Return: a poster headline (max 6 words), a subline (max 10 words, include "${c.spot}"), a visual direction for the poster (palette, type, composition; one sentence; no real logos), and a music direction for a 30-second instrumental in-store track (genre, instruments, tempo, mood; never name real artists or songs).`,
        {
          type: "object",
          properties: { headline: { type: "string" }, subline: { type: "string" }, visual: { type: "string" }, music: { type: "string" } },
          required: ["headline", "subline", "visual", "music"],
        },
        SYSTEM,
      );
      return json(out);
    }
    return fail("Unknown kind");
  });

export const config = { path: "/api/write" };
