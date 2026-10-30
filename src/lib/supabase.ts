import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Assigned once by initSupabase() before the app renders; ES module live binding keeps imports current.
export let supabase: SupabaseClient;

/** Uses the build-time public config, or falls back to the server's runtime config if the build didn't get it. */
export async function initSupabase() {
  let url: string | undefined = import.meta.env.SUPABASE_URL;
  let key: string | undefined = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    const res = await fetch("/api/config").catch(() => null);
    const cfg = res?.ok ? await res.json() : {};
    url = cfg.url;
    key = cfg.key;
  }
  if (!url || !key) throw new Error("Relocates isn't configured yet: SUPABASE_URL and SUPABASE_ANON_KEY are missing.");
  supabase = createClient(url, key);
}
