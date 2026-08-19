"use client";

import { useEffect, useState, useCallback } from "react";
import { getLists, getAllTasks, getAllSubtasks, createTask, updateTask, deleteTask, createList, updateList, deleteList, unassignTasksFromList, getUsers, createSubtask, updateSubtask, deleteSubtask, type UserOption } from "@/lib/api/todo";
import type { TodoList, TodoTask, TodoSubtask, AppUser } from "@/lib/types";
import MilouLogo from "@/components/MilouLogo";
import UserBadge from "@/components/UserBadge";
import TodoSidebar from "@/components/todo/TodoSidebar";
import TaskBoard from "@/components/todo/TaskBoard";
import TaskDetail from "@/components/todo/TaskDetail";

type View = "all" | "today" | "completed" | string;

export default function TodoPage() {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  const load = useCallback(async () => {
    const [listsData, tasksData, subtasksData, usersData] = await Promise.all([getLists(), getAllTasks(), getAllSubtasks(), getUsers()]);
    setLists(listsData);
    setTasks(tasksData);
    setSubtasks(subtasksData);
    setUsers(usersData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setCurrentUser(data.user)).catch(() => {});
  }, []);

  const handleCreateTask = async (listId: string | null, title: string) => {
    const task = await createTask(listId, title, currentUser?.id ?? null);
    setTasks((prev) => [...prev, task]);
  };

  const handleUpdateTask = async (id: string, updates: Partial<TodoTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await updateTask(id, updates);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
    await deleteTask(id);
  };

  const handleCreateSubtask = async (taskId: string, title: string) => {
    const st = await createSubtask(taskId, title);
    setSubtasks((prev) => [...prev, st]);
  };

  const handleToggleSubtask = async (id: string) => {
    let next = false;
    setSubtasks((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      next = !s.completed;
      return { ...s, completed: next };
    }));
    await updateSubtask(id, { completed: next });
  };

  const handleDeleteSubtask = async (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    await deleteSubtask(id);
  };

  const subtasksByTask = subtasks.reduce<Record<string, TodoSubtask[]>>((acc, s) => {
    (acc[s.task_id] ??= []).push(s);
    return acc;
  }, {});

  const handleCreateList = async (name: string, color: string) => {
    const list = await createList(name, color, currentUser?.id ?? null);
    setLists((prev) => [...prev, list]);
  };

  const handleUpdateList = async (id: string, updates: Partial<TodoList>) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    await updateList(id, updates);
  };

  const handleDeleteList = async (id: string) => {
    setTasks((prev) => prev.map((t) => (t.list_id === id ? { ...t, list_id: null } : t)));
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (view === id) setView("all");
    await unassignTasksFromList(id);
    await deleteList(id);
  };

  const today = new Date().toISOString().split("T")[0];

  const filteredTasks = (() => {
    if (view === "completed") return tasks.filter((t) => t.completed);
    if (view === "today") return tasks.filter((t) => !t.completed && t.due_date === today);
    if (view === "all") return tasks.filter((t) => !t.completed);
    return tasks.filter((t) => !t.completed && t.list_id === view);
  })();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow">
        <div className="flex items-center gap-6">
          <MilouLogo className="h-7 w-auto text-white" />
          <nav className="flex items-center gap-1">
            <a href="/" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg transition-colors">
              Mediaplaner
            </a>
            <a href="/kampanj" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg transition-colors">
              Kampanjplanerare
            </a>
            <span className="px-3 py-1.5 text-sm text-white bg-white/10 rounded-lg font-medium">
              Uppgifter
            </span>
          </nav>
        </div>
        <UserBadge />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <TodoSidebar
          lists={lists}
          view={view}
          onViewChange={(v) => { setView(v); setSelectedTaskId(null); }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onCreateList={handleCreateList}
          onUpdateList={handleUpdateList}
          onDeleteList={handleDeleteList}
          completedCount={tasks.filter((t) => t.completed).length}
          todayCount={tasks.filter((t) => !t.completed && t.due_date === today).length}
        />

        <main className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 space-y-3 max-w-5xl mx-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-white rounded-lg border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <TaskBoard
              tasks={filteredTasks}
              lists={lists}
              view={view}
              selectedTaskId={selectedTaskId}
              subtasksByTask={subtasksByTask}
              onSelectTask={setSelectedTaskId}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onToggleSubtask={handleToggleSubtask}
            />
          )}
        </main>

        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            lists={lists}
            users={users}
            subtasks={subtasksByTask[selectedTask.id] ?? []}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onCreateSubtask={handleCreateSubtask}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
          />
        )}
      </div>
    </div>
  );
}
