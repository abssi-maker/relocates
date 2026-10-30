export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Verifies the caller's Supabase session token; returns the user id or null. */
export async function userFrom(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY || "", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id || null;
}

export async function guarded(req: Request, handler: (body: any, userId: string) => Promise<Response>) {
  if (req.method !== "POST") return fail("Method not allowed", 405);
  const userId = await userFrom(req);
  if (!userId) return fail("Sign in required", 401);
  try {
    const body = await req.json().catch(() => ({}));
    return await handler(body, userId);
  } catch (e: any) {
    console.error(e);
    return fail(e?.message || "Something went wrong", 500);
  }
}
