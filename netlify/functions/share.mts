import type { Config } from "@netlify/functions";
import { json, fail } from "../lib/http.ts";

// Read-only plan for share links. Uses the service role, so it returns only the fields the shared view shows.
export default async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{32}$/.test(token)) return fail("Invalid link", 404);
  const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
  const base = `${process.env.SUPABASE_URL}/rest/v1`;
  const plans = await (await fetch(`${base}/plans?share_token=eq.${token}&select=id,name,goal,city,timing,budget,scout,chosen_spot,kit,updated_at,workspace_id`, { headers })).json();
  const plan = plans?.[0];
  if (!plan) return fail("This link is no longer active", 404);
  const ws = await (await fetch(`${base}/workspaces?id=eq.${plan.workspace_id}&select=name,brand,profile`, { headers })).json();
  const outreach = await (await fetch(`${base}/outreach?plan_id=eq.${plan.id}&select=partner,role,status`, { headers })).json();
  delete plan.workspace_id;
  return json({ plan, workspace: ws?.[0] || null, outreach: outreach || [] });
};

export const config: Config = { path: "/api/share" };
