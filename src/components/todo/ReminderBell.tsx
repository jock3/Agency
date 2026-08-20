"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/todo/push";

export default function ReminderBell({ onToast }: { onToast: (msg: string) => void }) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pushStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (status === "unsupported") return null;

  const on = status === "on";

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setStatus("off");
        onToast("Påminnelser avstängda");
      } else {
        await enablePush();
        setStatus("on");
        onToast("Påminnelser på — du får en notis när något förfaller");
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Kunde inte ändra påminnelser");
      setStatus(await pushStatus());
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || status === "loading"}
      title={on ? "Påminnelser på" : "Slå på påminnelser för förfallande uppgifter"}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${
        on ? "bg-milou-50 text-milou-600" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {on ? <Bell size={14} /> : <BellOff size={14} />}
      <span className="hidden sm:inline">Påminnelser</span>
    </button>
  );
}
