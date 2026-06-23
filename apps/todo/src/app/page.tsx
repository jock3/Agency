"use client";

import { useEffect, useState, useCallback } from "react";
import type { TodoList, TodoTask, TodoSubtask, TodoStatus } from "@/lib/types";
import { getLists, createList } from "@/lib/api/lists";
import { getAllTasks, completeTask, deleteTask, createTask, updateTask } from "@/lib/api/tasks";
import { getSubtasks } from "@/lib/api/subtasks";
import Sidebar from "@/components/Sidebar";
import TaskList from "@/components/TaskList";
import TaskDetail from "@/components/TaskDetail";

export type View = "today" | "all" | "completed" | string;

export default function App() {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [view, setView] = useState<View>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    const [listsData, tasksData] = await Promise.all([getLists(), getAllTasks()]);
    setLists(listsData);
    setTasks(tasksData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadSubtasks = useCallback(async (taskId: string) => {
    const data = await getSubtasks(taskId);
    setSubtasks(data);
  }, []);

  useEffect(() => {
    if (selectedTaskId) loadSubtasks(selectedTaskId);
    else setSubtasks([]);
  }, [selectedTaskId, loadSubtasks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "n" && !inInput) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("todo:new-task"));
      }
      if (e.key === "Escape") setSelectedTaskId(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const statusMeta = (status: TodoStatus) => ({
    completed: status === "klar",
    completed_at: status === "klar" ? new Date().toISOString() : null,
  });

  const handleComplete = async (taskId: string, completed: boolean) => {
    const status: TodoStatus = completed ? "klar" : "ej_paborjad";
    await completeTask(taskId, completed);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status, ...statusMeta(status) } : t
      )
    );
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const handleCreate = async (title: string, listId?: string | null) => {
    const list_id =
      listId !== undefined
        ? listId
        : view !== "today" && view !== "all" && view !== "completed"
        ? view
        : null;
    const task = await createTask({ title, list_id, priority: "none", due_date: null });
    setTasks((prev) => [...prev, task]);
  };

  const handleUpdate = async (taskId: string, updates: Partial<TodoTask>) => {
    const extra = updates.status ? statusMeta(updates.status) : {};
    await updateTask(taskId, { ...updates, ...extra });
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, ...extra } : t))
    );
  };

  const handleAddList = async (name: string, color: string) => {
    const list = await createList(name, color);
    setLists((prev) => [...prev, list]);
    setView(list.id);
    setSelectedTaskId(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  const visibleTasks = tasks
    .filter((t) => {
      if (view === "today") return t.status !== "klar" && t.status !== "avbruten" && t.due_date !== null && t.due_date <= today;
      if (view === "all") return t.status !== "klar" && t.status !== "avbruten";
      if (view === "completed") return t.status === "klar";
      return t.list_id === view;
    })
    .filter((t) =>
      searchQuery.trim() === "" || t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const completedCount = tasks.filter((t) => t.status === "klar").length;

  return (
    <div className="flex h-screen bg-[#141414] overflow-hidden">
      <Sidebar
        view={view}
        onViewChange={(v) => { setView(v); setSelectedTaskId(null); }}
        lists={lists}
        onAddList={handleAddList}
        completedCount={completedCount}
      />

      <main className="flex flex-1 min-w-0 overflow-hidden">
        <TaskList
          view={view}
          tasks={visibleTasks}
          lists={lists}
          loading={loading}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            subtasks={subtasks}
            lists={lists}
            onUpdate={handleUpdate}
            onClose={() => setSelectedTaskId(null)}
            onDelete={() => handleDelete(selectedTask.id)}
            onSubtasksChange={() => loadSubtasks(selectedTask.id)}
          />
        )}
      </main>
    </div>
  );
}
