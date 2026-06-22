"use client";

import type { TodoTask, TodoList } from "@/lib/types";
import type { View } from "@/app/page";
import TaskItem from "@/components/TaskItem";
import AddTask from "@/components/AddTask";

const VIEW_LABELS: Record<string, string> = {
  today: "Idag",
  all: "Alla uppgifter",
  completed: "Avklarade",
};

interface Props {
  view: View;
  tasks: TodoTask[];
  lists: TodoList[];
  loading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (title: string) => void;
  onUpdate: (id: string, updates: Partial<TodoTask>) => void;
}

export default function TaskList({
  view,
  tasks,
  lists,
  loading,
  selectedTaskId,
  onSelectTask,
  onComplete,
  onDelete,
  onCreate,
  onUpdate,
}: Props) {
  const list = lists.find((l) => l.id === view);
  const label = list ? list.name : (VIEW_LABELS[view] ?? "Uppgifter");
  const showAddTask = view !== "completed";
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto w-full px-6">
          {/* Header */}
          <div className="pt-10 pb-6">
            <div className="flex items-center gap-2.5">
              {list && (
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: list.color }}
                />
              )}
              <h1 className="text-2xl font-semibold text-gray-900">{label}</h1>
            </div>
            {!loading && tasks.length > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                {activeTasks.length} uppgift{activeTasks.length !== 1 ? "er" : ""}
                {completedTasks.length > 0 && ` · ${completedTasks.length} avklarade`}
              </p>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-11 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          ) : (
            <>
              {activeTasks.length === 0 && !showAddTask ? (
                <EmptyState view={view} />
              ) : activeTasks.length === 0 && showAddTask ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">Inga uppgifter ännu</p>
                </div>
              ) : null}

              <div className="space-y-0.5">
                {activeTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    lists={lists}
                    isSelected={selectedTaskId === task.id}
                    onSelect={() => onSelectTask(task.id)}
                    onComplete={(c) => onComplete(task.id, c)}
                    onDelete={() => onDelete(task.id)}
                  />
                ))}
              </div>

              {showAddTask && (
                <div className="mt-1">
                  <AddTask onAdd={onCreate} />
                </div>
              )}

              {completedTasks.length > 0 && view !== "completed" && (
                <CompletedSection tasks={completedTasks} lists={lists} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} onComplete={onComplete} onDelete={onDelete} />
              )}

              {view === "completed" && (
                <div className="space-y-0.5">
                  {completedTasks.length === 0 ? (
                    <EmptyState view={view} />
                  ) : (
                    completedTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        lists={lists}
                        isSelected={selectedTaskId === task.id}
                        onSelect={() => onSelectTask(task.id)}
                        onComplete={(c) => onComplete(task.id, c)}
                        onDelete={() => onDelete(task.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}

          <div className="pb-10" />
        </div>
      </div>
    </div>
  );
}

function CompletedSection({
  tasks,
  lists,
  selectedTaskId,
  onSelectTask,
  onComplete,
  onDelete,
}: {
  tasks: TodoTask[];
  lists: TodoList[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
        Avklarade ({tasks.length})
      </p>
      <div className="space-y-0.5 opacity-60">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            lists={lists}
            isSelected={selectedTaskId === task.id}
            onSelect={() => onSelectTask(task.id)}
            onComplete={(c) => onComplete(task.id, c)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ view }: { view: View }) {
  const messages: Record<string, { emoji: string; title: string; sub: string }> = {
    today: { emoji: "☀️", title: "Fri dag!", sub: "Inga uppgifter förfaller idag." },
    all: { emoji: "✓", title: "Allt klart", sub: "Skapa en uppgift med knappen nedan." },
    completed: { emoji: "🎉", title: "Inga avklarade", sub: "Avklarade uppgifter dyker upp här." },
  };
  const msg = messages[view] ?? { emoji: "📋", title: "Tom lista", sub: "Lägg till en uppgift nedan." };
  return (
    <div className="text-center py-16 select-none">
      <div className="text-4xl mb-3">{msg.emoji}</div>
      <p className="text-base font-medium text-gray-500">{msg.title}</p>
      <p className="text-sm text-gray-400 mt-1">{msg.sub}</p>
    </div>
  );
}
