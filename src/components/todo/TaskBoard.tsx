"use client";

import { Archive, Plus } from "lucide-react";
import TaskGroup, { type DropTarget, type SortState } from "./TaskGroup";
import type { DragProps, MutationEvent } from "./TaskRow";
import type { COLUMNS } from "@/lib/todo/constants";
import type { UserOption } from "@/lib/api/todo";
import type { TodoList, TodoSubtask, TodoTask } from "@/lib/types";
import type { DragEvent } from "react";

interface Props {
  lists: TodoList[];
  tasksByList: Record<string, TodoTask[]>;
  shownByList: Record<string, TodoTask[]>;
  subtasksByTask: Record<string, TodoSubtask[]>;
  users: UserOption[];
  visibleCols: typeof COLUMNS;
  sort: SortState | null;
  onSort: (key: string) => void;
  dndEnabled: boolean;
  selection: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (listId: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string, force?: boolean) => void;
  editingTaskId: string | null;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onCreateTask: (listId: string, title: string) => void;
  onUpdateTask: (id: string, updates: Partial<TodoTask>, event?: MutationEvent) => void;
  onUpdateSubtask: (id: string, updates: Partial<TodoSubtask>) => void;
  onCreateSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask: (id: string) => void;
  onMoveTask: (id: string, listId: string, insertIndex?: number | null) => void;
  onOpen: (id: string) => void;
  onUpdateList: (id: string, updates: Partial<TodoList>) => void;
  onMoveGroup: (id: string, dir: -1 | 1) => void;
  onArchiveGroup: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onMarkAllDone: (id: string) => void;
  onCreateGroup: () => void;
  onOpenArchive: () => void;
  archivedCount: number;
  dragProps: (listId: string, taskId: string, index: number) => DragProps;
  groupDropProps: (listId: string) => {
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
  };
  dropTarget: DropTarget | null;
  registerFocus: (listId: string, fn: () => void) => void;
}

export default function TaskBoard({
  lists,
  tasksByList,
  shownByList,
  onCreateGroup,
  onOpenArchive,
  archivedCount,
  ...rest
}: Props) {
  return (
    <div className="px-6 pb-24 pt-2">
      {lists.map((list, i) => (
        <TaskGroup
          key={list.id}
          list={list}
          lists={lists}
          index={i}
          total={lists.length}
          tasks={tasksByList[list.id] ?? []}
          shown={shownByList[list.id] ?? []}
          {...rest}
        />
      ))}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCreateGroup}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
        >
          <Plus size={14} /> Lägg till grupp
        </button>
        <span className="flex-1" />
        {archivedCount > 0 && (
          <button
            type="button"
            onClick={onOpenArchive}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:text-gray-700"
          >
            <Archive size={13} /> Arkiv ({archivedCount})
          </button>
        )}
      </div>
    </div>
  );
}
