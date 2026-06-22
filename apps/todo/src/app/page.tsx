"use client";

import { useEffect, useState, useCallback } from "react";
import type { TodoList, TodoTask, TodoSubtask } from "@/lib/types";
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
  const [view, setView] = useState<View>("today");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Global keyboard shortcuts
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

  const handleComplete = async (taskId: string, completed: boolean) => {
    await completeTask(taskId, completed);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
          : t
      )
    );
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const handleCreate = async (title: string) => {
    const list_id =
      view !== "today" && view !== "all" && view !== "completed" ? view : null;
    const task = await createTask({ title, list_id, priority: "none", due_date: null });
    setTasks((prev) => [...prev, task]);
  };

  const handleUpdate = async (taskId: string, updates: Partial<TodoTask>) => {
    await updateTask(taskId, updates);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
  };

  const handleAddList = async (name: string, color: string) => {
    const list = await createList(name, color);
    setLists((prev) => [...prev, list]);
    setView(list.id);
    setSelectedTaskId(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  const visibleTasks = tasks.filter((t) => {
    if (view === "today") return !t.completed && t.due_date !== null && t.due_date <= today;
    if (view === "all") return !t.completed;
    if (view === "completed") return t.completed;
    return t.list_id === view;
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
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
