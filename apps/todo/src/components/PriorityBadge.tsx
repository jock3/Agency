import clsx from "clsx";
import type { TodoTask } from "@/lib/types";

const PRIORITY_CONFIG: Record<TodoTask["priority"], { label: string; className: string }> = {
  none: { label: "—", className: "text-gray-300 hover:text-gray-500" },
  low: { label: "Låg", className: "bg-blue-50 text-blue-600" },
  medium: { label: "Medel", className: "bg-amber-50 text-amber-600" },
  high: { label: "Hög", className: "bg-milou-100 text-milou-600" },
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
  if (priority === "none" && !onClick) return null;
  const { label, className } = PRIORITY_CONFIG[priority];
  return (
    <button
      onClick={onClick}
      title={onClick ? "Byt prioritet" : undefined}
      className={clsx(
        "text-xs px-1.5 py-0.5 rounded font-medium transition-colors",
        className,
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      {label}
    </button>
  );
}
