"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import * as api from "@/lib/api/todo";
import type { UserOption } from "@/lib/api/todo";
import { COLUMNS, PRIORITIES, STATUSES, STATUS_MAP } from "@/lib/todo/constants";
import { defaultStatus, runAutomations, type AutomationEvent } from "@/lib/todo/automations";
import { advanceDate, isOverdue, todayISO, uid } from "@/lib/todo/utils";
import type {
  Automation,
  BoardSettings,
  TodoColumnKey,
  TodoList,
  TodoStatus,
  TodoSubtask,
  TodoTask,
} from "@/lib/types";

import ArchivePanel from "@/components/todo/ArchivePanel";
import AutomationsModal from "@/components/todo/AutomationsModal";
import BulkBar from "@/components/todo/BulkBar";
import CalendarView from "@/components/todo/CalendarView";
import EditInput from "@/components/todo/EditInput";
import EmptyState from "@/components/todo/EmptyState";
import TaskBoard from "@/components/todo/TaskBoard";
import TaskDetail from "@/components/todo/TaskDetail";
import TimelineView from "@/components/todo/TimelineView";
import Toast, { type ToastState } from "@/components/todo/Toast";
import TodoSidebar, { type QuickView } from "@/components/todo/TodoSidebar";
import Toolbar, { EMPTY_FILTERS, type BoardView, type Filters } from "@/components/todo/Toolbar";
import type { DropTarget, SortState } from "@/components/todo/TaskGroup";
import type { MutationEvent } from "@/components/todo/TaskRow";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function TodoPage() {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>([]);
  const [settings, setSettings] = useState<BoardSettings>({
    board_title: "Projekttavlan",
    hidden_cols: [],
    automations: [],
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [view, setView] = useState<BoardView>("table");
  const [quickView, setQuickView] = useState<QuickView>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState | null>(null);
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [drag, setDrag] = useState<{ taskId: string; fromList: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFns = useRef<Record<string, () => void>>({});
  const pending = useRef(0);

  /* ── Toast ───────────────────────────────────────────────────── */

  const showToast = useCallback(
    (msg: string, kind: ToastState["kind"] = "info", undo: (() => void) | null = null) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ msg, kind, undo });
      toastTimer.current = setTimeout(() => setToast(null), 4200);
    },
    [],
  );

  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  /* ── Persistens ──────────────────────────────────────────────── */

  /** Every write goes through here, so the header can show a save state and a
   *  failed write surfaces instead of silently diverging from the UI. */
  const persist = useCallback(
    (work: Promise<unknown>) => {
      pending.current += 1;
      setSaveState("saving");
      work
        .then(() => {
          pending.current -= 1;
          if (pending.current === 0) setSaveState("saved");
        })
        .catch(() => {
          pending.current -= 1;
          setSaveState("error");
          showToast("Kunde inte spara ändringen — kontrollera anslutningen");
        });
    },
    [showToast],
  );

  const saveSettings = useCallback(
    (patch: Partial<BoardSettings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      persist(api.saveBoardSettings(patch));
    },
    [persist],
  );

  /* ── Automationer ────────────────────────────────────────────── */

  const applyAutomations = useCallback(
    (
      ev: AutomationEvent,
      nextTasks: TodoTask[],
      nextLists: TodoList[],
      automations: Automation[],
    ) => {
      const res = runAutomations(ev, { tasks: nextTasks, lists: nextLists, automations });
      if (!res.taskUpdates.length && !res.listUpdates.length) return;

      setTasks((prev) =>
        prev.map((t) => {
          const u = res.taskUpdates.find((x) => x.id === t.id);
          return u ? { ...t, ...u.patch } : t;
        }),
      );
      setLists((prev) =>
        prev.map((l) => {
          const u = res.listUpdates.find((x) => x.id === l.id);
          return u ? { ...l, ...u.patch } : l;
        }),
      );

      persist(
        Promise.all([
          ...res.taskUpdates.map((u) => api.updateTask(u.id, u.patch)),
          ...res.listUpdates.map((u) => api.updateList(u.id, u.patch)),
        ]),
      );

      if (res.fired.length) {
        showToast(
          res.fired[0] + (res.fired.length > 1 ? ` (+${res.fired.length - 1} till)` : ""),
          "auto",
        );
      }
    },
    [persist, showToast],
  );

  /* ── Inläsning ───────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const board = await api.getBoard();

    setLists(board.lists);
    setTasks(board.tasks);
    setSubtasks(board.subtasks);
    setUsers(board.users);
    setSettings(board.settings);
    setLoading(false);

    applyAutomations(
      { type: "date_check" },
      board.tasks,
      board.lists,
      board.settings.automations,
    );
  }, [applyAutomations]);

  useEffect(() => {
    load().catch(() => {
      setLoading(false);
      showToast("Kunde inte hämta tavlan — kontrollera anslutningen");
    });
  }, [load, showToast]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user ? { id: d.user.id, name: d.user.name } : null))
      .catch(() => {});
  }, []);

  /* A tab left open overnight should notice that yesterday's dates passed. */
  useEffect(() => {
    const onFocus = () =>
      applyAutomations({ type: "date_check" }, tasks, lists, settings.automations);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [applyAutomations, tasks, lists, settings.automations]);

  /* ── Härledda värden ─────────────────────────────────────────── */

  const activeLists = useMemo(
    () => lists.filter((l) => !l.archived).sort((a, b) => a.sort_order - b.sort_order),
    [lists],
  );
  const archivedLists = useMemo(() => lists.filter((l) => l.archived), [lists]);

  const tasksByList = useMemo(() => {
    const map: Record<string, TodoTask[]> = {};
    for (const l of lists) map[l.id] = [];
    for (const t of tasks) {
      if (t.list_id && map[t.list_id]) map[t.list_id].push(t);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [lists, tasks]);

  const subtasksByTask = useMemo(() => {
    const map: Record<string, TodoSubtask[]> = {};
    for (const s of subtasks) (map[s.task_id] ??= []).push(s);
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [subtasks]);

  const matchTask = useCallback(
    (t: TodoTask) => {
      if (quickView === "today" && t.due_date !== todayISO()) return false;
      if (quickView === "overdue" && !isOverdue(t)) return false;
      if (quickView === "done" && t.status !== "done") return false;

      if (search) {
        const q = search.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inSubs = (subtasksByTask[t.id] ?? []).some((s) => s.title.toLowerCase().includes(q));
        if (!inTitle && !inSubs) return false;
      }
      if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
      if (
        filters.priorities.length &&
        !filters.priorities.includes(t.priority as (typeof filters.priorities)[number])
      ) {
        return false;
      }
      if (filters.persons.length && !(t.assigned_to && filters.persons.includes(t.assigned_to))) {
        return false;
      }
      if (filters.overdue && !isOverdue(t)) return false;
      return true;
    },
    [quickView, search, filters, subtasksByTask],
  );

  const sortTasks = useCallback(
    (rows: TodoTask[]) => {
      if (!sort) return rows;
      const dir = sort.dir === "asc" ? 1 : -1;
      const statusIdx = (k: TodoStatus) => STATUSES.findIndex((s) => s.key === k);
      const prioIdx = (k: string) => {
        const i = PRIORITIES.findIndex((p) => p.key === k);
        return i < 0 ? 99 : i;
      };
      return [...rows].sort((a, b) => {
        switch (sort.key) {
          case "title":
            return dir * a.title.localeCompare(b.title, "sv");
          case "status":
            return dir * (statusIdx(a.status) - statusIdx(b.status));
          case "priority":
            return dir * (prioIdx(a.priority) - prioIdx(b.priority));
          case "date":
            return dir * (a.due_date || "9999").localeCompare(b.due_date || "9999");
          case "person":
            return dir * (a.assigned_to || "").localeCompare(b.assigned_to || "");
          case "timeline":
            return (
              dir *
              (a.start_date || a.due_date || "9999").localeCompare(
                b.start_date || b.due_date || "9999",
              )
            );
          default:
            return 0;
        }
      });
    },
    [sort],
  );

  const shownByList = useMemo(() => {
    const map: Record<string, TodoTask[]> = {};
    for (const l of activeLists) map[l.id] = sortTasks((tasksByList[l.id] ?? []).filter(matchTask));
    return map;
  }, [activeLists, tasksByList, matchTask, sortTasks]);

  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => !settings.hidden_cols.includes(c.key)),
    [settings.hidden_cols],
  );

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let overdue = 0;
    for (const t of tasks) {
      total++;
      if (t.status === "done") done++;
      if (isOverdue(t)) overdue++;
    }
    return { total, done, overdue };
  }, [tasks]);

  const quickCounts = useMemo(
    () => ({
      all: tasks.length,
      today: tasks.filter((t) => t.due_date === todayISO() && t.status !== "done").length,
      overdue: tasks.filter(isOverdue).length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks],
  );

  const automationsOn = settings.automations.filter((a) => a.enabled).length;

  /* ── Objektmutationer ────────────────────────────────────────── */

  /** Keeps the completed/completed_at columns in step with status. */
  const withCompletion = (patch: Partial<TodoTask>): Partial<TodoTask> => {
    if (patch.status === undefined) return { ...patch };
    const done = patch.status === "done";
    return { ...patch, completed: done, completed_at: done ? new Date().toISOString() : null };
  };

  const updateTask = useCallback(
    (id: string, updates: Partial<TodoTask>, event?: MutationEvent) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // Completing a recurring task rolls it forward instead of finishing it —
      // the same row reappears on its next date.
      if (updates.status === "done" && task.repeat && (task.due_date || task.start_date)) {
        const rolled: Partial<TodoTask> = {
          status: "todo",
          completed: false,
          completed_at: null,
          overdue_key: null,
          due_date: task.due_date ? advanceDate(task.due_date, task.repeat) : null,
          start_date: task.start_date ? advanceDate(task.start_date, task.repeat) : null,
          end_date: task.end_date ? advanceDate(task.end_date, task.repeat) : null,
        };
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...rolled } : t)));
        persist(api.updateTask(id, rolled));
        showToast(`↻ Återkommer ${rolled.due_date || rolled.start_date}`, "auto");
        return;
      }

      const patch = withCompletion(updates);
      // A new due date re-arms the overdue rule.
      if (patch.due_date !== undefined) patch.overdue_key = null;

      const next = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
      setTasks(next);
      persist(api.updateTask(id, patch));

      if (event === "status" && patch.status) {
        applyAutomations(
          { type: "status", taskId: id, listId: task.list_id ?? "", status: patch.status },
          next,
          lists,
          settings.automations,
        );
      }
      if (event === "date") {
        applyAutomations({ type: "date_check" }, next, lists, settings.automations);
      }
    },
    [tasks, lists, settings.automations, persist, applyAutomations, showToast],
  );

  const createTask = useCallback(
    (listId: string, title: string) => {
      const siblings = tasksByList[listId] ?? [];
      const sortOrder = (siblings[siblings.length - 1]?.sort_order ?? 0) + 1;
      const status = defaultStatus(settings.automations);

      persist(
        api
          .createTask(listId, title, { status, sort_order: sortOrder })
          .then((task) => setTasks((prev) => [...prev, task])),
      );
    },
    [tasksByList, settings.automations, persist],
  );

  const duplicateTask = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || !task.list_id) return;
      const subs = subtasksByTask[id] ?? [];

      persist(
        api
          .createTask(task.list_id, task.title + " (kopia)", {
            notes: task.notes,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            start_date: task.start_date,
            end_date: task.end_date,
            repeat: task.repeat,
            comments: [],
            sort_order: task.sort_order + 1,
            completed: task.completed,
            assigned_to: task.assigned_to,
          })
          .then(async (copy) => {
            setTasks((prev) => [...prev, copy]);
            const recreated = await Promise.all(
              subs.map((s, i) =>
                api.createSubtask(copy.id, s.title, i + 1, {
                  status: s.status,
                  completed: s.completed,
                  due_date: s.due_date,
                  assigned_to: s.assigned_to,
                }),
              ),
            );
            setSubtasks((prev) => [...prev, ...recreated]);
          }),
      );
    },
    [tasks, subtasksByTask, persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const subs = subtasksByTask[id] ?? [];

      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSubtasks((prev) => prev.filter((s) => s.task_id !== id));
      setSelection((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      if (drawerTaskId === id) setDrawerTaskId(null);
      persist(api.deleteTask(id));

      showToast(`"${task.title}" togs bort`, "info", () => {
        // Undo re-creates the row under a new id; nothing else links to it.
        if (!task.list_id) return;
        persist(
          api
            .createTask(task.list_id, task.title, {
              notes: task.notes,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
              start_date: task.start_date,
              end_date: task.end_date,
              repeat: task.repeat,
              comments: task.comments,
              sort_order: task.sort_order,
              completed: task.completed,
              assigned_to: task.assigned_to,
            })
            .then(async (restored) => {
              setTasks((prev) => [...prev, restored]);
              const recreated = await Promise.all(
                subs.map((s, i) =>
                  api.createSubtask(restored.id, s.title, i + 1, {
                    status: s.status,
                    completed: s.completed,
                    due_date: s.due_date,
                    assigned_to: s.assigned_to,
                  }),
                ),
              );
              setSubtasks((prev) => [...prev, ...recreated]);
            }),
        );
      });
    },
    [tasks, subtasksByTask, drawerTaskId, persist, showToast],
  );

  const moveTask = useCallback(
    (id: string, toListId: string, insertIndex: number | null = null) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const target = (tasksByList[toListId] ?? []).filter((t) => t.id !== id);
      const at =
        insertIndex == null ? target.length : Math.max(0, Math.min(insertIndex, target.length));
      target.splice(at, 0, { ...task, list_id: toListId });

      const reordered = target.map((t, i) => ({ ...t, sort_order: i + 1 }));
      setTasks((prev) => prev.map((t) => reordered.find((r) => r.id === t.id) ?? t));

      persist(
        Promise.all(
          reordered.map((t) =>
            api.updateTask(t.id, { list_id: toListId, sort_order: t.sort_order }),
          ),
        ),
      );
    },
    [tasks, tasksByList, persist],
  );

  /* ── Underobjekt ─────────────────────────────────────────────── */

  const createSubtask = useCallback(
    (taskId: string, title: string) => {
      const siblings = subtasksByTask[taskId] ?? [];
      const sortOrder = (siblings[siblings.length - 1]?.sort_order ?? 0) + 1;
      persist(
        api
          .createSubtask(taskId, title, sortOrder)
          .then((sub) => setSubtasks((prev) => [...prev, sub])),
      );
    },
    [subtasksByTask, persist],
  );

  const updateSubtask = useCallback(
    (id: string, updates: Partial<TodoSubtask>) => {
      const patch =
        updates.status === undefined
          ? updates
          : { ...updates, completed: updates.status === "done" };
      setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      persist(api.updateSubtask(id, patch));
    },
    [persist],
  );

  const deleteSubtask = useCallback(
    (id: string) => {
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      persist(api.deleteSubtask(id));
    },
    [persist],
  );

  /* ── Kommentarer ─────────────────────────────────────────────── */

  const addComment = useCallback(
    (taskId: string, text: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const comments = [
        ...task.comments,
        { id: uid(), author: currentUser?.name ?? "Jag", text, at: new Date().toISOString() },
      ];
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, comments } : t)));
      persist(api.updateTask(taskId, { comments }));
    },
    [tasks, currentUser, persist],
  );

  const deleteComment = useCallback(
    (taskId: string, commentId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const comments = task.comments.filter((c) => c.id !== commentId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, comments } : t)));
      persist(api.updateTask(taskId, { comments }));
    },
    [tasks, persist],
  );

  /* ── Gruppmutationer ─────────────────────────────────────────── */

  const updateList = useCallback(
    (id: string, updates: Partial<TodoList>) => {
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
      persist(api.updateList(id, updates));
    },
    [persist],
  );

  const createGroup = useCallback(() => {
    const color = api.nextGroupColor(activeLists);
    const sortOrder = (activeLists[activeLists.length - 1]?.sort_order ?? 0) + 1;
    persist(
      api.createList("Ny grupp", color, sortOrder).then((list) => setLists((prev) => [...prev, list])),
    );
  }, [activeLists, persist]);

  const deleteGroup = useCallback(
    (id: string) => {
      const list = lists.find((l) => l.id === id);
      if (!list) return;
      const count = (tasksByList[id] ?? []).length;
      if (count && !window.confirm(`Ta bort gruppen "${list.name}" och dess ${count} objekt?`)) {
        return;
      }
      setLists((prev) => prev.filter((l) => l.id !== id));
      setTasks((prev) => prev.filter((t) => t.list_id !== id));
      persist(api.deleteList(id));
    },
    [lists, tasksByList, persist],
  );

  const archiveGroup = useCallback(
    (id: string) => {
      const list = lists.find((l) => l.id === id);
      if (!list) return;
      updateList(id, { archived: true, archived_at: new Date().toISOString() });
      showToast(`"${list.name}" arkiverades`, "info", () =>
        updateList(id, { archived: false, archived_at: null }),
      );
    },
    [lists, updateList, showToast],
  );

  const moveGroup = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = activeLists.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= activeLists.length) return;
      const next = [...activeLists];
      const [moved] = next.splice(i, 1);
      next.splice(j, 0, moved);

      const withOrder = next.map((l, idx) => ({ ...l, sort_order: idx + 1 }));
      setLists((prev) => prev.map((l) => withOrder.find((x) => x.id === l.id) ?? l));
      persist(api.reorderLists(withOrder.map((l) => l.id)));
    },
    [activeLists, persist],
  );

  const markAllDone = useCallback(
    (id: string) => {
      const rows = tasksByList[id] ?? [];
      if (!rows.length) return;
      const patch: Partial<TodoTask> = {
        status: "done",
        completed: true,
        completed_at: new Date().toISOString(),
      };
      setTasks((prev) => prev.map((t) => (t.list_id === id ? { ...t, ...patch } : t)));
      persist(
        api.updateTasks(
          rows.map((t) => t.id),
          patch,
        ),
      );

      if (settings.automations.some((a) => a.type === "collapse_done" && a.enabled)) {
        updateList(id, { collapsed: true });
      }
    },
    [tasksByList, settings.automations, persist, updateList],
  );

  /* ── Markering & bulk ────────────────────────────────────────── */

  const toggleSelect = (id: string) =>
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAllInGroup = (listId: string) => {
    const rows = tasksByList[listId] ?? [];
    setSelection((prev) => {
      const n = new Set(prev);
      const all = rows.length > 0 && rows.every((t) => n.has(t.id));
      for (const t of rows) {
        if (all) n.delete(t.id);
        else n.add(t.id);
      }
      return n;
    });
  };

  const clearSelection = () => setSelection(new Set());

  const bulkSetStatus = (status: TodoStatus) => {
    const ids = [...selection];
    const patch: Partial<TodoTask> = {
      status,
      completed: status === "done",
      completed_at: status === "done" ? new Date().toISOString() : null,
    };
    setTasks((prev) => prev.map((t) => (selection.has(t.id) ? { ...t, ...patch } : t)));
    persist(api.updateTasks(ids, patch));
    showToast(`${ids.length} objekt fick status ${STATUS_MAP[status].label}`);
  };

  const bulkMoveTo = (listId: string) => {
    const ids = [...selection];
    const target = tasksByList[listId] ?? [];
    let order = (target[target.length - 1]?.sort_order ?? 0) + 1;
    const updates = ids.map((id) => ({ id, sort_order: order++ }));

    setTasks((prev) =>
      prev.map((t) => {
        const u = updates.find((x) => x.id === t.id);
        return u ? { ...t, list_id: listId, sort_order: u.sort_order } : t;
      }),
    );
    persist(
      Promise.all(
        updates.map((u) => api.updateTask(u.id, { list_id: listId, sort_order: u.sort_order })),
      ),
    );
  };

  const bulkDuplicate = () => {
    for (const id of selection) duplicateTask(id);
  };

  const bulkDelete = () => {
    if (!window.confirm(`Ta bort ${selection.size} objekt?`)) return;
    const ids = [...selection];
    setTasks((prev) => prev.filter((t) => !selection.has(t.id)));
    setSubtasks((prev) => prev.filter((s) => !ids.includes(s.task_id)));
    persist(api.deleteTasks(ids));
    clearSelection();
  };

  /* ── Dra & släpp ─────────────────────────────────────────────── */

  // Reordering only makes sense while the rows on screen are the real order.
  const dndEnabled =
    !sort &&
    !search &&
    quickView === "all" &&
    !filters.statuses.length &&
    !filters.priorities.length &&
    !filters.persons.length &&
    !filters.overdue;

  const dragProps = (listId: string, taskId: string, index: number) => ({
    isDragging: drag?.taskId === taskId,
    onDragStart: (e: DragEvent<HTMLDivElement>) => {
      if (!dndEnabled || (e.target as HTMLElement).closest("button, input, label, select")) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", taskId);
      e.dataTransfer.effectAllowed = "move";
      setDrag({ taskId, fromList: listId });
    },
    onDragEnd: () => {
      setDrag(null);
      setDropTarget(null);
    },
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      if (!drag || !dndEnabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const r = e.currentTarget.getBoundingClientRect();
      const pos: "before" | "after" = e.clientY < r.top + r.height / 2 ? "before" : "after";
      setDropTarget((t) =>
        t && t.listId === listId && t.index === index && t.pos === pos ? t : { listId, index, pos },
      );
    },
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      if (!drag || !dndEnabled) return;
      e.preventDefault();
      const at = dropTarget?.pos === "after" ? index + 1 : index;
      moveTask(drag.taskId, listId, at);
      setDrag(null);
      setDropTarget(null);
    },
  });

  const groupDropProps = (listId: string) => ({
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      if (!drag || !dndEnabled) return;
      e.preventDefault();
      setDropTarget((t) =>
        t && t.listId === listId && t.index === -1 ? t : { listId, index: -1, pos: "end" },
      );
    },
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      if (!drag || !dndEnabled) return;
      e.preventDefault();
      moveTask(drag.taskId, listId, null);
      setDrag(null);
      setDropTarget(null);
    },
  });

  /* ── Övrigt ──────────────────────────────────────────────────── */

  const onSortColumn = (key: string) =>
    setSort((s) =>
      s && s.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" },
    );

  const toggleExpand = (id: string, force?: boolean) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (force === true || !n.has(id)) n.add(id);
      else n.delete(id);
      return n;
    });

  const registerFocus = useCallback((listId: string, fn: () => void) => {
    focusFns.current[listId] = fn;
  }, []);

  const newTaskFromToolbar = () => {
    const first = activeLists[0];
    if (!first) {
      createGroup();
      return;
    }
    if (first.collapsed) updateList(first.id, { collapsed: false });
    requestAnimationFrame(() => focusFns.current[first.id]?.());
  };

  const jumpToGroup = (listId: string) => {
    document
      .getElementById(`group-${listId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const drawerTask = drawerTaskId ? (tasks.find((t) => t.id === drawerTaskId) ?? null) : null;
  const drawerList = drawerTask ? (lists.find((l) => l.id === drawerTask.list_id) ?? null) : null;

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="flex h-full min-h-0 bg-gray-50">
      <TodoSidebar
        lists={activeLists}
        quickView={quickView}
        onQuickViewChange={setQuickView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        counts={quickCounts}
        onJumpToGroup={jumpToGroup}
        onCreateGroup={createGroup}
        onOpenArchive={() => setArchiveOpen(true)}
        archivedCount={archivedLists.length}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-gray-100 bg-white px-6 pb-3 pt-4">
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <EditInput
                value={settings.board_title}
                className="text-xl font-semibold"
                onCancel={() => setEditingTitle(false)}
                onCommit={(v) => {
                  if (v) saveSettings({ board_title: v });
                  setEditingTitle(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                title="Byt namn på tavlan"
                className="group flex items-center gap-2"
              >
                <h1 className="text-xl font-semibold text-gray-900">{settings.board_title}</h1>
                <Pencil size={14} className="text-gray-300 opacity-0 group-hover:opacity-100" />
              </button>
            )}
            <span
              role="status"
              className={`text-xs ${saveState === "error" ? "text-red-500" : "text-gray-400"}`}
            >
              {saveState === "saving"
                ? "Sparar…"
                : saveState === "saved"
                  ? "Sparad"
                  : saveState === "error"
                    ? "Fel vid sparning"
                    : ""}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {stats.total} objekt · {stats.done} klara
            {stats.overdue > 0 && <span className="text-red-500"> · {stats.overdue} försenade</span>}
          </p>
        </header>

        <Toolbar
          onNewTask={newTaskFromToolbar}
          onNewGroup={createGroup}
          search={search}
          setSearch={setSearch}
          users={users}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          hiddenCols={settings.hidden_cols}
          setHiddenCols={(next: TodoColumnKey[]) => saveSettings({ hidden_cols: next })}
          onOpenAutomations={() => setAutoOpen(true)}
          automationsOn={automationsOn}
          view={view}
          setView={setView}
          onToast={showToast}
        />

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="mx-auto max-w-5xl space-y-3 p-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg border border-gray-100 bg-white"
                />
              ))}
            </div>
          ) : activeLists.length === 0 ? (
            <EmptyState onCreate={createGroup} />
          ) : view === "timeline" ? (
            <TimelineView lists={activeLists} tasksByList={tasksByList} onOpen={setDrawerTaskId} />
          ) : view === "calendar" ? (
            <CalendarView lists={activeLists} tasks={tasks} onOpen={setDrawerTaskId} />
          ) : (
            <TaskBoard
              lists={activeLists}
              tasksByList={tasksByList}
              shownByList={shownByList}
              subtasksByTask={subtasksByTask}
              users={users}
              visibleCols={visibleCols}
              sort={sort}
              onSort={onSortColumn}
              dndEnabled={dndEnabled}
              selection={selection}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAllInGroup}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              editingTaskId={editingTaskId}
              onStartEdit={setEditingTaskId}
              onStopEdit={() => setEditingTaskId(null)}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onUpdateSubtask={updateSubtask}
              onCreateSubtask={createSubtask}
              onDeleteSubtask={deleteSubtask}
              onDeleteTask={deleteTask}
              onDuplicateTask={duplicateTask}
              onMoveTask={moveTask}
              onOpen={setDrawerTaskId}
              onUpdateList={updateList}
              onMoveGroup={moveGroup}
              onArchiveGroup={archiveGroup}
              onDeleteGroup={deleteGroup}
              onMarkAllDone={markAllDone}
              onCreateGroup={createGroup}
              onOpenArchive={() => setArchiveOpen(true)}
              archivedCount={archivedLists.length}
              dragProps={dragProps}
              groupDropProps={groupDropProps}
              dropTarget={dropTarget}
              registerFocus={registerFocus}
            />
          )}
        </div>
      </main>

      {selection.size > 0 && (
        <BulkBar
          count={selection.size}
          lists={activeLists}
          onSetStatus={bulkSetStatus}
          onMoveTo={bulkMoveTo}
          onDuplicate={bulkDuplicate}
          onDelete={bulkDelete}
          onClear={clearSelection}
        />
      )}

      {autoOpen && (
        <AutomationsModal
          automations={settings.automations}
          lists={activeLists}
          onChange={(next) => saveSettings({ automations: next })}
          onClose={() => setAutoOpen(false)}
        />
      )}

      {archiveOpen && (
        <ArchivePanel
          archived={archivedLists}
          tasksByList={tasksByList}
          onRestore={(id) => updateList(id, { archived: false, archived_at: null })}
          onDeleteForever={(id) => {
            const list = lists.find((l) => l.id === id);
            if (!list || !window.confirm(`Ta bort "${list.name}" permanent?`)) return;
            setLists((prev) => prev.filter((l) => l.id !== id));
            setTasks((prev) => prev.filter((t) => t.list_id !== id));
            persist(api.deleteList(id));
          }}
          onClose={() => setArchiveOpen(false)}
        />
      )}

      {drawerTask && drawerList && (
        <TaskDetail
          task={drawerTask}
          list={drawerList}
          users={users}
          subtasks={subtasksByTask[drawerTask.id] ?? []}
          currentUserName={currentUser?.name ?? null}
          onClose={() => setDrawerTaskId(null)}
          onUpdate={updateTask}
          onDelete={(id) => {
            deleteTask(id);
            setDrawerTaskId(null);
          }}
          onCreateSubtask={createSubtask}
          onUpdateSubtask={updateSubtask}
          onDeleteSubtask={deleteSubtask}
          onAddComment={addComment}
          onDeleteComment={deleteComment}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
