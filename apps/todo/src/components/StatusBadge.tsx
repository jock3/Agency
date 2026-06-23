import type { TodoStatus } from "@/lib/types";

export const STATUS_CONFIG: Record<TodoStatus, { label: string; bg: string; color: string }> = {
  ej_paborjad: { label: "Ej påbörjad", bg: "#2d2d2d",  color: "#777" },
  pagar:       { label: "Pågår",        bg: "#f59e0b",  color: "#1c1c1c" },
  klar:        { label: "Klar",         bg: "#10b981",  color: "#fff" },
  avbruten:    { label: "Avbruten",     bg: "#ef4444",  color: "#fff" },
};

export const STATUS_CYCLE: TodoStatus[] = ["ej_paborjad", "pagar", "klar", "avbruten"];

export function nextStatus(s: TodoStatus): TodoStatus {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length];
}

interface Props {
  status: TodoStatus;
  onClick?: () => void;
}

export default function StatusBadge({ status, onClick }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ej_paborjad;
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      className="text-xs px-2.5 py-1 rounded font-medium whitespace-nowrap w-full text-center transition-opacity hover:opacity-80"
    >
      {cfg.label}
    </button>
  );
}
