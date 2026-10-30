import { api } from "./api";
import { supabase } from "./supabase";
import type { Outreach, Plan, Workspace } from "./types";

export function spotName(plan: Plan) {
  return plan.scout?.map?.spots.find((s) => s.id === plan.chosen_spot)?.name || plan.city || "";
}

export async function draftOutreach(plan: Plan, ws: Workspace, row: Outreach) {
  const out = await api<{ subject: string; body: string }>("write", {
    kind: "outreach",
    context: {
      brand: ws.brand?.name || ws.name,
      positioning: ws.brand?.positioning,
      goal: (plan.goal || "pop-up").toLowerCase(),
      spot: spotName(plan),
      city: plan.city,
      timing: plan.timing,
      partner: { ...row.partner, role: row.role },
    },
  });
  await supabase.from("outreach").update({ subject: out.subject, body: out.body, updated_at: new Date().toISOString() }).eq("id", row.id);
  return out;
}

export function mailto(row: Outreach) {
  return `mailto:?subject=${encodeURIComponent(row.subject || "")}&body=${encodeURIComponent(row.body || "")}`;
}

/** Generates media through the edge function and stores it in the workspace's storage folder. */
export async function generateMedia(kind: "poster" | "track", prompt: string, planId: string) {
  const resp = await api<any>("media", { kind, prompt });
  const part = (resp?.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData);
  if (!part) {
    const reason = resp?.promptFeedback?.blockReason || resp?.candidates?.[0]?.finishReason;
    throw new Error(reason ? `The model declined this request (${reason}). Try again.` : "No media returned. Try again.");
  }
  const { mimeType, data } = part.inlineData;
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") ? "jpg" : mimeType.includes("mpeg") ? "mp3" : mimeType.split("/")[1] || "bin";
  const { data: u } = await supabase.auth.getUser();
  const path = `${u.user?.id}/${planId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("kit").upload(path, new Blob([bytes], { type: mimeType }), { contentType: mimeType });
  if (error) throw error;
  return supabase.storage.from("kit").getPublicUrl(path).data.publicUrl;
}
