"use client";

import type { TodoList, TodoTask, TodoSubtask } from "@/lib/types";
import TaskGroup from "./TaskGroup";

interface Props {
  tasks: TodoTask[];
  lists: TodoList[];
  view: string;
  selectedTaskId: string | null;
  subtasksByTask: Record<string, TodoSubtask[]>;
  onSelectTask: (id: string) => void;
  onCreateTask: (listId: string | null, title: string) => void;
  onUpdateTask: (id: string, updates: Partial<TodoTask>) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask: (id: string) => void;
}

export default function TaskBoard({
  tasks, lists, view, selectedTaskId, subtasksByTask, onSelectTask, onCreateTask, onUpdateTask, onDeleteTask, onToggleSubtask,
}: Props) {
  const common = { selectedTaskId, subtasksByTask, onSelectTask, onCreateTask, onUpdateTask, onDeleteTask, onToggleSubtask };

  if (view === "all") {
    const grouped = lists.map((list) => ({
      list,
      tasks: tasks.filter((t) => t.list_id === list.id),
    }));
    const unlisted = tasks.filter((t) => !t.list_id);

    return (
      <div className="p-6 max-w-5xl mx-auto">
        {grouped.map(({ list, tasks: lt }) => (
          <TaskGroup key={list.id} list={list} tasks={lt} {...common} />
        ))}
        {unlisted.length > 0 && <TaskGroup list={null} tasks={unlisted} {...common} />}
      </div>
    );
  }

  if (view === "today") {
    const pseudoList: TodoList = { id: "today", name: "Idag", color: "#F59E0B", sort_order: 0, created_at: "", created_by: null };
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TaskGroup list={pseudoList} tasks={tasks} {...common} disableAdd />
      </div>
    );
  }

  if (view === "completed") {
    const pseudoList: TodoList = { id: "completed", name: "Slutförda", color: "#10B981", sort_order: 0, created_at: "", created_by: null };
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TaskGroup list={pseudoList} tasks={tasks} {...common} disableAdd />
        {tasks.length === 0 && (
          <div className="text-center py-24 text-gray-300">
            <p className="text-sm">Inga slutförda uppgifter</p>
          </div>
        )}
      </div>
    );
  }

  // Specific list view
  const list = lists.find((l) => l.id === view) ?? null;
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <TaskGroup list={list} tasks={tasks} {...common} />
    </div>
  );
}
