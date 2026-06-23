import type { TodoTask } from "@/lib/types";

const PRIORITY_CONFIG: Record<TodoTask["priority"], { label: string; bg: string; color: string }> = {
  none:   { label: "—",     bg: "transparent",  color: "#444" },
  low:    { label: "Låg",   bg: "#1e3a5f",      color: "#60a5fa" },
  medium: { label: "Medel", bg: "#3d2400",      color: "#f59e0b" },
  high:   { label: "Hög",   bg: "#3d0012",      color: "#f87171" },
};

export const PRIORITY_CYCLE: TodoTask["priority"][] = ["none", "low", "medium", "high"];

export function nextPriority(p: TodoTask["priority"]): TodoTask["priority"] {
  return PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(p) + 1) % PRIORITY_CYCLE.length];
}

interface Props {
  priority: TodoTask["priority"];
  onClick?: () => void;
}

export default function PriorityBadge({ priority, onClick }: Props) {
  const cfg = PRIORITY_CONFIG[priority];
  if (priority === "none" && !onClick) return null;
  return (
    <button
      onClick={onClick}
      title={onClick ? "Byt prioritet" : undefined}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      className="text-xs px-2.5 py-1 rounded font-medium transition-opacity hover:opacity-80 cursor-pointer w-full text-center"
    >
      {cfg.label}
    </button>
  );
}
