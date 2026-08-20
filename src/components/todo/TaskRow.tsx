"use client";

import {
  ArrowUpDown,
  ChevronRight,
  Copy,
  CornerDownRight,
  GripVertical,
  Maximize2,
  MoreHorizontal,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { Fragment, useRef, useState, type DragEvent } from "react";
import Popover, { PopItem, PopSeparator } from "./Popover";
import StatusPill from "./StatusPill";
import PriorityPill from "./PriorityPill";
import PersonCell from "./PersonCell";
import DateCell from "./DateCell";
import TimelineCell from "./TimelineCell";
import GroupCell from "./GroupCell";
import EditInput from "./EditInput";
import { COLUMNS, REPEAT_LABEL } from "@/lib/todo/constants";
import { isOverdue } from "@/lib/todo/utils";
import type { UserOption } from "@/lib/api/todo";
import type { TodoColumnKey, TodoList, TodoSubtask, TodoTask } from "@/lib/types";

export type MutationEvent = "status" | "date" | undefined;

export function gridTemplate(cols: typeof COLUMNS): string {
  return "34px minmax(280px, 1fr) " + cols.map((c) => c.width + "px").join(" ") + " 40px";
}

export interface DragProps {
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

interface Props {
  task: TodoTask;
  list: TodoList;
  lists: TodoList[];
  users: UserOption[];
  subtasks: TodoSubtask[];
  visibleCols: typeof COLUMNS;
  sortActive: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: (force?: boolean) => void;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdateTask: (id: string, updates: Partial<TodoTask>, event?: MutationEvent) => void;
  onUpdateSubtask: (id: string, updates: Partial<TodoSubtask>) => void;
  onCreateSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask: (id: string) => void;
  onMoveTask: (id: string, listId: string) => void;
  onOpen: (id: string) => void;
  dragProps: DragProps;
  dropIndicator: "before" | "after" | null;
}

export default function TaskRow({
  task,
  list,
  lists,
  users,
  subtasks,
  visibleCols,
  sortActive,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
  editing,
  onStartEdit,
  onStopEdit,
  onUpdateTask,
  onUpdateSubtask,
  onCreateSubtask,
  onDeleteSubtask,
  onDeleteTask,
  onDuplicateTask,
  onMoveTask,
  onOpen,
  dragProps,
  dropIndicator,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [subInput, setSubInput] = useState("");
  const menuRef = useRef<HTMLButtonElement>(null);

  const overdue = isOverdue(task);
  const doneSubs = subtasks.filter((s) => s.status === "done").length;
  const hasDetail = task.comments.length > 0 || Boolean(task.notes?.trim());

  const commitSub = () => {
    const t = subInput.trim();
    if (!t) return;
    onCreateSubtask(task.id, t);
    setSubInput("");
  };

  return (
    <Fragment>
      <div
        draggable={!sortActive && !editing}
        onDragStart={dragProps.onDragStart}
        onDragEnd={dragProps.onDragEnd}
        onDragOver={dragProps.onDragOver}
        onDrop={dragProps.onDrop}
        style={{ gridTemplateColumns: gridTemplate(visibleCols), borderLeftColor: list.color }}
        className={[
          "group relative grid items-center gap-2 border-b border-l-4 border-gray-100 bg-white px-2 transition-colors",
          selected ? "bg-milou-50/60" : "hover:bg-gray-50",
          dragProps.isDragging ? "opacity-40" : "",
          dropIndicator === "before" ? "shadow-[inset_0_2px_0_0_#E60330]" : "",
          dropIndicator === "after" ? "shadow-[inset_0_-2px_0_0_#E60330]" : "",
        ].join(" ")}
      >
        <div className="flex h-11 items-center gap-0.5">
          {!sortActive && (
            <span className="cursor-grab text-gray-300 opacity-0 group-hover:opacity-100" aria-hidden="true">
              <GripVertical size={13} />
            </span>
          )}
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={"Markera " + task.title}
            className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-milou-500"
          />
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleExpand()}
            aria-label={expanded ? "Dölj underobjekt" : "Visa underobjekt"}
            title={subtasks.length ? `${doneSubs}/${subtasks.length} underobjekt klara` : "Underobjekt"}
            className={`flex shrink-0 items-center gap-0.5 rounded px-0.5 py-0.5 text-gray-400 transition-colors hover:bg-gray-200 ${
              subtasks.length ? "" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <ChevronRight
              size={13}
              strokeWidth={2.25}
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            {subtasks.length > 0 && (
              <span className="text-[10px] font-semibold">{subtasks.length}</span>
            )}
          </button>

          {editing ? (
            <EditInput
              value={task.title}
              className="flex-1"
              onCancel={onStopEdit}
              onCommit={(v) => {
                if (v) onUpdateTask(task.id, { title: v });
                onStopEdit();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              title={task.title}
              className={`min-w-0 flex-1 truncate text-left text-sm ${
                task.status === "done" ? "text-gray-400 line-through" : "text-gray-800"
              }`}
            >
              {task.title}
            </button>
          )}

          {task.repeat && (
            <span
              className="shrink-0 text-gray-400"
              title={"Upprepas: " + REPEAT_LABEL[task.repeat]}
            >
              <Repeat size={11} />
            </span>
          )}

          {!editing && (
            <button
              type="button"
              onClick={() => onOpen(task.id)}
              title="Öppna"
              aria-label="Öppna objektet"
              className="relative shrink-0 rounded p-1 text-gray-300 opacity-0 transition-colors hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
            >
              <Maximize2 size={13} />
              {hasDetail && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-milou-500" />
              )}
            </button>
          )}
        </div>

        {visibleCols.map((col) => (
          <div key={col.key} className="flex min-w-0 items-center justify-center">
            {renderCell(col.key)}
          </div>
        ))}

        <div className="flex items-center justify-center">
          <button
            ref={menuRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Fler åtgärder"
            className="rounded p-1 text-gray-300 opacity-0 transition-colors hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <Popover
              anchorRef={menuRef}
              onClose={() => {
                setMenuOpen(false);
                setMoveOpen(false);
              }}
              width={210}
              align="right"
            >
              <PopItem
                onClick={() => {
                  onOpen(task.id);
                  setMenuOpen(false);
                }}
              >
                <Maximize2 size={13} /> Öppna
              </PopItem>
              <PopItem
                onClick={() => {
                  onToggleExpand(true);
                  setMenuOpen(false);
                }}
              >
                <CornerDownRight size={13} /> Lägg till underobjekt
              </PopItem>
              <PopItem
                onClick={() => {
                  onDuplicateTask(task.id);
                  setMenuOpen(false);
                }}
              >
                <Copy size={13} /> Duplicera
              </PopItem>
              <PopItem onClick={() => setMoveOpen((v) => !v)}>
                <ArrowUpDown size={13} /> Flytta till
                <ChevronRight
                  size={12}
                  className={`ml-auto transition-transform ${moveOpen ? "rotate-90" : ""}`}
                />
              </PopItem>
              {moveOpen &&
                lists
                  .filter((l) => l.id !== list.id)
                  .map((l) => (
                    <PopItem
                      key={l.id}
                      indent
                      onClick={() => {
                        onMoveTask(task.id, l.id);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                      {l.name}
                    </PopItem>
                  ))}
              <PopSeparator />
              <PopItem
                danger
                onClick={() => {
                  onDeleteTask(task.id);
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={13} /> Ta bort
              </PopItem>
            </Popover>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-l-4 bg-gray-50/60" style={{ borderLeftColor: list.color }}>
          {subtasks.map((sub) => (
            <SubtaskRow
              key={sub.id}
              sub={sub}
              users={users}
              visibleCols={visibleCols}
              onUpdate={onUpdateSubtask}
              onDelete={onDeleteSubtask}
            />
          ))}
          <div
            className="grid items-center gap-2 border-b border-gray-100 px-2"
            style={{ gridTemplateColumns: gridTemplate(visibleCols) }}
          >
            <span className="flex h-9 items-center justify-center text-gray-300">
              <Plus size={12} strokeWidth={2} />
            </span>
            <input
              value={subInput}
              placeholder="Lägg till underobjekt"
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitSub();
                if (e.key === "Escape") setSubInput("");
              }}
              onBlur={commitSub}
              className="w-full bg-transparent py-1 text-xs text-gray-700 outline-none placeholder:text-gray-300"
            />
            {visibleCols.map((c) => (
              <div key={c.key} />
            ))}
            <div />
          </div>
        </div>
      )}
    </Fragment>
  );

  function renderCell(key: TodoColumnKey) {
    switch (key) {
      case "person":
        return (
          <PersonCell
            userId={task.assigned_to}
            users={users}
            onChange={(v) => onUpdateTask(task.id, { assigned_to: v })}
          />
        );
      case "status":
        return (
          <StatusPill
            status={task.status}
            onChange={(v) => onUpdateTask(task.id, { status: v }, "status")}
          />
        );
      case "priority":
        return (
          <PriorityPill
            priority={task.priority}
            onChange={(v) => onUpdateTask(task.id, { priority: v })}
          />
        );
      case "date":
        return (
          <DateCell
            value={task.due_date}
            overdue={overdue}
            onChange={(v) => onUpdateTask(task.id, { due_date: v }, "date")}
          />
        );
      case "timeline":
        return (
          <TimelineCell
            start={task.start_date}
            end={task.end_date}
            color={list.color}
            onChange={(s, e) => onUpdateTask(task.id, { start_date: s, end_date: e })}
          />
        );
      case "group":
        return (
          <GroupCell listId={list.id} lists={lists} onChange={(to) => onMoveTask(task.id, to)} />
        );
    }
  }
}

function SubtaskRow({
  sub,
  users,
  visibleCols,
  onUpdate,
  onDelete,
}: {
  sub: TodoSubtask;
  users: UserOption[];
  visibleCols: typeof COLUMNS;
  onUpdate: (id: string, updates: Partial<TodoSubtask>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className="group grid items-center gap-2 border-b border-gray-100 px-2"
      style={{ gridTemplateColumns: gridTemplate(visibleCols) }}
    >
      <span className="flex h-9 items-center justify-center text-gray-300">
        <CornerDownRight size={13} strokeWidth={1.75} />
      </span>

      <div className="flex min-w-0 items-center pl-4">
        {editing ? (
          <EditInput
            value={sub.title}
            className="flex-1"
            onCancel={() => setEditing(false)}
            onCommit={(v) => {
              if (v) onUpdate(sub.id, { title: v });
              setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={sub.title}
            className={`min-w-0 flex-1 truncate text-left text-xs ${
              sub.status === "done" ? "text-gray-400 line-through" : "text-gray-600"
            }`}
          >
            {sub.title}
          </button>
        )}
      </div>

      {visibleCols.map((col) => (
        <div key={col.key} className="flex min-w-0 items-center justify-center">
          {col.key === "person" && (
            <PersonCell
              userId={sub.assigned_to}
              users={users}
              size={22}
              onChange={(v) => onUpdate(sub.id, { assigned_to: v })}
            />
          )}
          {col.key === "status" && (
            <StatusPill
              small
              status={sub.status}
              onChange={(v) => onUpdate(sub.id, { status: v, completed: v === "done" })}
            />
          )}
          {col.key === "date" && (
            <DateCell
              value={sub.due_date}
              overdue={isOverdue(sub)}
              onChange={(v) => onUpdate(sub.id, { due_date: v })}
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => onDelete(sub.id)}
          aria-label="Ta bort underobjekt"
          className="rounded p-1 text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
