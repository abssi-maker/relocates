declare const Netlify: { env: { get(name: string): string | undefined } };

export const env = (name: string) => Netlify.env.get(name) || "";

/** True when the request carries a valid Supabase session. */
export async function signedIn(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` } });
  return res.ok;
}

export async function edgeGuard(req: Request, handler: (body: any) => Promise<Response>) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!(await signedIn(req))) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    return await handler(await req.json().catch(() => ({})));
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e?.message || "Something went wrong" }, { status: 500 });
  }
}
