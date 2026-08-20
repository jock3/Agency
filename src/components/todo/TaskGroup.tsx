"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import GroupHeader from "./GroupHeader";
import TaskRow, { gridTemplate, type DragProps, type MutationEvent } from "./TaskRow";
import DistBar from "./DistBar";
import { AvatarStack } from "./Avatar";
import { COLUMNS } from "@/lib/todo/constants";
import { elapsedPct, fmtRange, groupTimeline } from "@/lib/todo/utils";
import type { UserOption } from "@/lib/api/todo";
import type { TodoList, TodoSubtask, TodoTask } from "@/lib/types";

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export interface DropTarget {
  listId: string;
  index: number;
  pos: "before" | "after" | "end";
}

interface Props {
  list: TodoList;
  index: number;
  total: number;
  tasks: TodoTask[];
  shown: TodoTask[];
  subtasksByTask: Record<string, TodoSubtask[]>;
  users: UserOption[];
  lists: TodoList[];
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
  dragProps: (listId: string, taskId: string, index: number) => DragProps;
  groupDropProps: (listId: string) => {
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
  };
  dropTarget: DropTarget | null;
  registerFocus: (listId: string, fn: () => void) => void;
}

export default function TaskGroup(props: Props) {
  const {
    list, index, total, tasks, shown, subtasksByTask, users, lists, visibleCols,
    sort, onSort, dndEnabled, selection, onToggleSelect, onToggleAll, expanded,
    onToggleExpand, editingTaskId, onStartEdit, onStopEdit, onCreateTask,
    onUpdateTask, onUpdateSubtask, onCreateSubtask, onDeleteSubtask, onDeleteTask,
    onDuplicateTask, onMoveTask, onOpen, onUpdateList, onMoveGroup, onArchiveGroup,
    onDeleteGroup, onMarkAllDone, dragProps, groupDropProps, dropTarget, registerFocus,
  } = props;

  const allSelected = tasks.length > 0 && tasks.every((t) => selection.has(t.id));

  return (
    <section id={`group-${list.id}`} className="mb-6 scroll-mt-4">
      <GroupHeader
        list={list}
        index={index}
        total={total}
        tasks={tasks}
        onUpdateList={onUpdateList}
        onMoveGroup={onMoveGroup}
        onArchiveGroup={onArchiveGroup}
        onDeleteGroup={onDeleteGroup}
        onMarkAllDone={onMarkAllDone}
      />

      {!list.collapsed && (
        <div
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          {...groupDropProps(list.id)}
        >
          <ColumnHeaderRow
            color={list.color}
            visibleCols={visibleCols}
            sort={sort}
            onSort={onSort}
            allSelected={allSelected}
            onToggleAll={() => onToggleAll(list.id)}
          />

          {shown.map((task) => {
            const realIndex = tasks.indexOf(task);
            const dt =
              dropTarget && dropTarget.listId === list.id && dropTarget.index === realIndex
                ? dropTarget.pos
                : null;
            return (
              <TaskRow
                key={task.id}
                task={task}
                list={list}
                lists={lists}
                users={users}
                subtasks={subtasksByTask[task.id] ?? []}
                visibleCols={visibleCols}
                sortActive={!dndEnabled}
                selected={selection.has(task.id)}
                onToggleSelect={() => onToggleSelect(task.id)}
                expanded={expanded.has(task.id)}
                onToggleExpand={(force) => onToggleExpand(task.id, force)}
                editing={editingTaskId === task.id}
                onStartEdit={() => onStartEdit(task.id)}
                onStopEdit={onStopEdit}
                onUpdateTask={onUpdateTask}
                onUpdateSubtask={onUpdateSubtask}
                onCreateSubtask={onCreateSubtask}
                onDeleteSubtask={onDeleteSubtask}
                onDeleteTask={onDeleteTask}
                onDuplicateTask={onDuplicateTask}
                onMoveTask={(id, toList) => onMoveTask(id, toList)}
                onOpen={onOpen}
                dragProps={dragProps(list.id, task.id, realIndex)}
                dropIndicator={dt === "end" ? null : dt}
              />
            );
          })}

          {shown.length === 0 && tasks.length > 0 && (
            <div
              className="border-b border-l-4 border-gray-100 px-4 py-2.5 text-xs italic text-gray-400"
              style={{ borderLeftColor: list.color }}
            >
              Inga objekt matchar filtren i den här gruppen
            </div>
          )}

          <AddTaskRow
            list={list}
            visibleCols={visibleCols}
            onAdd={onCreateTask}
            registerFocus={registerFocus}
          />

          <SummaryRow list={list} tasks={tasks} users={users} visibleCols={visibleCols} />

          {dropTarget && dropTarget.listId === list.id && dropTarget.index === -1 && (
            <div className="h-0.5 bg-milou-500" aria-hidden="true" />
          )}
        </div>
      )}
    </section>
  );
}

function ColumnHeaderRow({
  color,
  visibleCols,
  sort,
  onSort,
  allSelected,
  onToggleAll,
}: {
  color: string;
  visibleCols: typeof COLUMNS;
  sort: SortState | null;
  onSort: (key: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
}) {
  const sortIcon = (key: string) => {
    if (!sort || sort.key !== key) return <ArrowUpDown size={11} className="text-gray-300" />;
    return sort.dir === "asc" ? (
      <ArrowUp size={11} className="text-milou-500" />
    ) : (
      <ArrowDown size={11} className="text-milou-500" />
    );
  };

  return (
    <div
      className="grid items-center gap-2 border-b border-l-4 border-gray-200 bg-gray-50 px-2"
      style={{ gridTemplateColumns: gridTemplate(visibleCols), borderLeftColor: color }}
    >
      <div className="flex h-9 items-center justify-center">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          aria-label="Markera alla i gruppen"
          className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-milou-500"
        />
      </div>
      <button
        type="button"
        onClick={() => onSort("title")}
        className="flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
      >
        Objekt {sortIcon("title")}
      </button>
      {visibleCols.map((col) =>
        col.key === "group" ? (
          <div
            key={col.key}
            className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400"
          >
            {col.label}
          </div>
        ) : (
          <button
            key={col.key}
            type="button"
            onClick={() => onSort(col.key)}
            className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
          >
            {col.label} {sortIcon(col.key)}
          </button>
        ),
      )}
      <div />
    </div>
  );
}

function AddTaskRow({
  list,
  visibleCols,
  onAdd,
  registerFocus,
}: {
  list: TodoList;
  visibleCols: typeof COLUMNS;
  onAdd: (listId: string, title: string) => void;
  registerFocus: (listId: string, fn: () => void) => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerFocus(list.id, () => ref.current?.focus());
  }, [list.id, registerFocus]);

  const commit = () => {
    const t = value.trim();
    if (!t) return;
    onAdd(list.id, t);
    setValue("");
  };

  return (
    <div
      className="grid items-center gap-2 border-b border-l-4 border-gray-100 px-2"
      style={{ gridTemplateColumns: gridTemplate(visibleCols), borderLeftColor: list.color }}
    >
      <span className="flex h-10 items-center justify-center text-gray-300">
        <Plus size={14} aria-hidden="true" />
      </span>
      <input
        ref={ref}
        value={value}
        placeholder="Lägg till objekt"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setValue("");
        }}
        onBlur={commit}
        className="w-full bg-transparent py-1 text-sm text-gray-700 outline-none placeholder:text-gray-300"
      />
      {visibleCols.map((c) => (
        <div key={c.key} />
      ))}
      <div />
    </div>
  );
}

function SummaryRow({
  list,
  tasks,
  users,
  visibleCols,
}: {
  list: TodoList;
  tasks: TodoTask[];
  users: UserOption[];
  visibleCols: typeof COLUMNS;
}) {
  const names = [
    ...new Set(
      tasks
        .map((t) => users.find((u) => u.id === t.assigned_to)?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const tl = groupTimeline(tasks);

  return (
    <div
      className="grid items-center gap-2 border-l-4 bg-gray-50/70 px-2"
      style={{ gridTemplateColumns: gridTemplate(visibleCols), borderLeftColor: list.color }}
    >
      <div />
      <div className="py-2 text-xs text-gray-400">{tasks.length} objekt</div>
      {visibleCols.map((col) => (
        <div key={col.key} className="flex min-w-0 items-center justify-center">
          {col.key === "person" && <AvatarStack names={names} />}
          {col.key === "status" && <DistBar tasks={tasks} />}
          {col.key === "timeline" && (tl.min || tl.max) && (
            <span
              className="relative w-full overflow-hidden rounded-full px-3 py-1 text-center text-[11px] font-medium text-white"
              style={{ background: list.color }}
            >
              <span
                className="absolute inset-y-0 left-0 bg-black/20"
                style={{ width: elapsedPct(tl.min, tl.max) + "%" }}
              />
              <span className="relative">{fmtRange(tl.min, tl.max)}</span>
            </span>
          )}
        </div>
      ))}
      <div />
    </div>
  );
}
