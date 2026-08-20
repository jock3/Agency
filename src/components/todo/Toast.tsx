"use client";

import { X, Zap } from "lucide-react";

export interface ToastState {
  msg: string;
  kind: "info" | "auto";
  undo: (() => void) | null;
}

interface Props {
  toast: ToastState | null;
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: Props) {
  if (!toast) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-6 z-[120] flex max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm shadow-2xl ${
        toast.kind === "auto" ? "bg-amber-500 text-white" : "bg-gray-900 text-white"
      }`}
    >
      {toast.kind === "auto" && <Zap size={14} strokeWidth={2.25} className="shrink-0" />}
      <span className="flex-1">{toast.msg}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onDismiss();
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold underline underline-offset-2 hover:bg-white/10"
        >
          Ångra
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Stäng"
        className="shrink-0 rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>
    </div>
  );
}
