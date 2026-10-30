import type { Config } from "@netlify/functions";

// Public browser config (the Supabase URL and anon key are designed to be public; access is enforced by row-level security).
export default async () =>
  Response.json({ url: process.env.SUPABASE_URL || null, key: process.env.SUPABASE_ANON_KEY || null }, { headers: { "Cache-Control": "public, max-age=300" } });

export const config: Config = { path: "/api/config" };
