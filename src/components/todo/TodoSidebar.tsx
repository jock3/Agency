"use client";

import { Archive, CalendarClock, CheckCircle2, ChevronLeft, LayoutList, Plus, TriangleAlert } from "lucide-react";
import type { TodoList } from "@/lib/types";

export type QuickView = "all" | "today" | "overdue" | "done";

interface Props {
  lists: TodoList[];
  quickView: QuickView;
  onQuickViewChange: (v: QuickView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  counts: Record<QuickView, number>;
  onJumpToGroup: (listId: string) => void;
  onCreateGroup: () => void;
  onOpenArchive: () => void;
  archivedCount: number;
}

const NAV: { id: QuickView; label: string; Icon: typeof LayoutList }[] = [
  { id: "all", label: "Alla objekt", Icon: LayoutList },
  { id: "today", label: "Idag", Icon: CalendarClock },
  { id: "overdue", label: "Försenade", Icon: TriangleAlert },
  { id: "done", label: "Klara", Icon: CheckCircle2 },
];

/** Quick filters plus a jump list of the board's groups. The groups themselves
 *  live on the board — this is navigation, not a second source of truth. */
export default function TodoSidebar({
  lists,
  quickView,
  onQuickViewChange,
  collapsed,
  onToggleCollapse,
  counts,
  onJumpToGroup,
  onCreateGroup,
  onOpenArchive,
  archivedCount,
}: Props) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Visa sidopanel" : "Dölj sidopanel"}
        className="flex items-center border-b border-gray-100 px-3 py-3 text-gray-400 transition-colors hover:text-gray-600"
        style={{ justifyContent: collapsed ? "center" : "flex-end" }}
      >
        <ChevronLeft size={14} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>

      <nav className="space-y-0.5 p-2">
        {NAV.map(({ id, label, Icon }) => {
          const active = quickView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onQuickViewChange(id)}
              title={collapsed ? label : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-milou-50 font-medium text-milou-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {counts[id] > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                        active ? "bg-milou-100 text-milou-600" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {counts[id]}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 pb-1.5 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Grupper
          </span>
        </div>
      )}

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {lists.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onJumpToGroup(l.id)}
            title={l.name}
            className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
            {!collapsed && <span className="truncate text-left">{l.name}</span>}
          </button>
        ))}

        {!collapsed && (
          <button
            type="button"
            onClick={onCreateGroup}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-400 transition-colors hover:text-milou-500"
          >
            <Plus size={15} className="shrink-0" />
            Ny grupp
          </button>
        )}
      </div>

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={onOpenArchive}
          title="Arkiv"
          className={`flex items-center gap-2.5 border-t border-gray-100 py-3 text-sm text-gray-500 transition-colors hover:text-gray-800 ${
            collapsed ? "justify-center px-0" : "px-5"
          }`}
        >
          <Archive size={15} className="shrink-0" />
          {!collapsed && <span>Arkiv ({archivedCount})</span>}
        </button>
      )}
    </aside>
  );
}
