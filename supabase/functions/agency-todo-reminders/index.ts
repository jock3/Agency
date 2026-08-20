// agency-todo-reminders — scheduled scan of due tasks -> web push.
//
// Separate from the older todo-reminders function, which reads the ai-labb
// jsonb boards and is still serving that app. This one reads the relational
// todo_tasks table and pushes to subscriptions keyed on app_users.
//
// Guarded by the shared cron_key in todo_secrets, which also holds the VAPID
// keypair. Each user gets a digest of what is due today or overdue: the tasks
// assigned to them plus the unassigned ones, since nobody owns those yet.
// Expired subscriptions (404/410) are pruned.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PushSub {
  app_user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface Task {
  title: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
}

Deno.serve(async (req) => {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: secretRows } = await admin.from("todo_secrets").select("key,value");
  const secrets = Object.fromEntries((secretRows || []).map((r) => [r.key, r.value]));

  const key = req.headers.get("x-cron-key");
  if (!secrets.cron_key || key !== secrets.cron_key) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(secrets.vapid_subject, secrets.vapid_public, secrets.vapid_private);

  const todayKey = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

  const { data: subs } = await admin.from("todo_app_push_subs").select("*");
  const { data: tasks } = await admin
    .from("todo_tasks")
    .select("title,status,due_date,assigned_to")
    .neq("status", "done")
    .not("due_date", "is", null)
    .lte("due_date", todayKey);

  const byUser = new Map<string, PushSub[]>();
  for (const s of (subs || []) as PushSub[]) {
    if (!byUser.has(s.app_user_id)) byUser.set(s.app_user_id, []);
    byUser.get(s.app_user_id)!.push(s);
  }

  let sent = 0;
  let pruned = 0;
  let notified = 0;

  for (const [userId, list] of byUser) {
    const mine = ((tasks || []) as Task[]).filter(
      (t) => t.assigned_to === userId || t.assigned_to === null,
    );

    let dueToday = 0;
    let overdue = 0;
    const names: string[] = [];
    for (const t of mine) {
      if (t.due_date === todayKey) {
        dueToday++;
        names.push(t.title);
      } else {
        overdue++;
        names.push(t.title);
      }
    }
    if (dueToday + overdue === 0) continue;
    notified++;

    const parts: string[] = [];
    if (dueToday) parts.push(`${dueToday} förfaller idag`);
    if (overdue) parts.push(`${overdue} försenad${overdue > 1 ? "e" : ""}`);
    const body = `${parts.join(" · ")} — ${names.slice(0, 3).join(", ")}${
      names.length > 3 ? "…" : ""
    }`;
    const payload = JSON.stringify({
      title: "Uppgifter · påminnelse",
      body,
      url: "/todo",
      tag: "todo-daily",
    });

    for (const s of list) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await admin.from("todo_app_push_subs").delete().eq("endpoint", s.endpoint);
          pruned++;
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, todayKey, notified, sent, pruned }), {
    headers: { "Content-Type": "application/json" },
  });
});
