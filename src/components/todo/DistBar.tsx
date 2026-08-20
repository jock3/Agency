"use client";

import { STATUSES } from "@/lib/todo/constants";
import { countByStatus } from "@/lib/todo/utils";
import type { TodoStatus } from "@/lib/types";

/** The group's "battery": one segment per status, sized by share. */
export default function DistBar({ tasks }: { tasks: { status: TodoStatus }[] }) {
  const total = tasks.length;
  if (!total) return <div className="h-3.5 w-full rounded-full bg-gray-100" aria-hidden="true" />;

  const counts = countByStatus(tasks);
  const present = STATUSES.filter((s) => counts[s.key] > 0);

  return (
    <div
      role="img"
      aria-label={present.map((s) => `${counts[s.key]} ${s.label}`).join(", ")}
      className="flex h-3.5 w-full overflow-hidden rounded-full"
    >
      {present.map((s) => (
        <span
          key={s.key}
          title={`${s.label}: ${counts[s.key]} av ${total} (${Math.round((counts[s.key] / total) * 100)}%)`}
          style={{ width: (counts[s.key] / total) * 100 + "%", background: s.color }}
        />
      ))}
    </div>
  );
}
