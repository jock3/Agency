/* Web-push opt-in for the board.
 *
 * The VAPID public key is public by design — it identifies our push sender to
 * the browser. The private half lives in todo_secrets and is only ever read by
 * the reminder edge function. Subscriptions are written through /api/todo/push
 * so the app_user_id comes from the session cookie rather than the browser. */

export const VAPID_PUBLIC =
  "BFlOfqyunxcM8gk8yxQ2qIPsp386Cjek0LiPd0xHEE2wLFY_HniOtg-C9cwsVPIW1VZlVDu-Nv3IlQZ9PJI0Z28";

const SW_URL = "/todo-sw.js";
const SW_SCOPE = "/todo/";

export type PushStatus = "loading" | "off" | "on" | "denied" | "unsupported";

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function pushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub ? "on" : "off";
}

export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) throw new Error("Webbnotiser stöds inte i denna webbläsare.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    throw new Error("Notiser nekades. Slå på dem i webbläsarens inställningar.");
  }

  const reg =
    (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ??
    (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }));
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const res = await fetch("/api/todo/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
  if (!res.ok) throw new Error("Kunde inte spara prenumerationen.");

  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await fetch("/api/todo/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  return "off";
}
