import webpush from "web-push";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Pushar till alla admins som slagit på notiser på Uppgiftstavlan. Nycklarna
 * ligger i todo_secrets (samma som påminnelsefunktionen läser) och lämnar aldrig
 * servern. Ett fel här får inte stoppa själva förslaget, så anroparen fångar det.
 */
export async function notifyAdmins(payload: { title: string; body: string; url: string }): Promise<void> {
  const sb = getSupabaseAdminClient();

  const { data: admins } = await sb.from("app_users").select("id").eq("is_admin", true);
  const adminIds = (admins ?? []).map((a) => a.id as string);
  if (adminIds.length === 0) return;

  const { data: subs } = await sb.from("todo_app_push_subs").select("endpoint, p256dh, auth").in("app_user_id", adminIds);
  if (!subs?.length) return;

  const { data: secretRows } = await sb.from("todo_secrets").select("key, value");
  const secrets = Object.fromEntries((secretRows ?? []).map((r) => [r.key as string, r.value as string]));
  if (!secrets.vapid_subject || !secrets.vapid_public || !secrets.vapid_private) return;
  webpush.setVapidDetails(secrets.vapid_subject, secrets.vapid_public, secrets.vapid_private);

  const message = JSON.stringify({ ...payload, tag: "tool-request" });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message);
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await sb.from("todo_app_push_subs").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
}
