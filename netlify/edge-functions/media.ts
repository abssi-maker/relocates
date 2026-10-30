// Poster (Gemini image) and in-store track (Lyria) generation. Runs at the edge so the ~10s generation
// isn't cut off by the serverless timeout; the response streams straight through to the browser.
import { signedIn, env } from "./_auth.ts";

const MODELS: Record<string, { model: string; config?: object }> = {
  poster: { model: "gemini-3.1-flash-image", config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4" } } },
  track: { model: "lyria-3-clip-preview" },
};

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!(await signedIn(req))) return Response.json({ error: "Sign in required" }, { status: 401 });

  const { kind, prompt } = await req.json().catch(() => ({}));
  const m = MODELS[kind];
  if (!m || typeof prompt !== "string" || prompt.length > 2000) return Response.json({ error: "Bad request" }, { status: 400 });

  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], ...(m.config ? { generationConfig: m.config } : {}) }),
  });
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/media" };
