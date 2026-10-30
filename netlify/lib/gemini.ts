export const AGENT_MODEL = "gemini-3.8-flash";
export const WRITER_MODEL = "gemini-3.8-flash";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generate(model: string, body: unknown, key?: string): Promise<any> {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key ?? process.env.GEMINI_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

export function partsOf(resp: any): any[] {
  return resp?.candidates?.[0]?.content?.parts || [];
}

export function textOf(resp: any): string {
  return partsOf(resp).map((p) => p.text || "").join("").trim();
}

/** One-shot JSON generation with a response schema. */
export async function generateJson<T>(prompt: string, schema: object, system?: string, key?: string): Promise<T> {
  const resp = await generate(WRITER_MODEL, {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } },
  }, key);
  return JSON.parse(textOf(resp));
}
