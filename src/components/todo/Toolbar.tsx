"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  EyeOff,
  Filter,
  GanttChart,
  Plus,
  Rows3,
  Search,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Popover, { PopItem, PopLabel, PopSeparator } from "./Popover";
import Avatar from "./Avatar";
import ReminderBell from "./ReminderBell";
import { COLUMNS, PRIORITIES, STATUSES } from "@/lib/todo/constants";
import type { UserOption } from "@/lib/api/todo";
import type { TodoColumnKey, TodoPriority, TodoStatus } from "@/lib/types";
import type { SortState } from "./TaskGroup";

export interface Filters {
  statuses: TodoStatus[];
  priorities: Exclude<TodoPriority, "none">[];
  persons: string[];
  overdue: boolean;
}

export const EMPTY_FILTERS: Filters = {
  statuses: [],
  priorities: [],
  persons: [],
  overdue: false,
};

export type BoardView = "table" | "timeline" | "calendar";

interface Props {
  onNewTask: () => void;
  onNewGroup: () => void;
  search: string;
  setSearch: (v: string) => void;
  users: UserOption[];
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  sort: SortState | null;
  setSort: Dispatch<SetStateAction<SortState | null>>;
  hiddenCols: TodoColumnKey[];
  setHiddenCols: (next: TodoColumnKey[]) => void;
  onOpenAutomations: () => void;
  automationsOn: number;
  view: BoardView;
  setView: (v: BoardView) => void;
  onToast: (msg: string) => void;
}

const BTN = "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors";
const GHOST = `${BTN} text-gray-600 hover:bg-gray-100`;
const GHOST_ON = `${BTN} bg-milou-50 text-milou-600`;

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function Toolbar({
  onNewTask,
  onNewGroup,
  search,
  setSearch,
  users,
  filters,
  setFilters,
  sort,
  setSort,
  hiddenCols,
  setHiddenCols,
  onOpenAutomations,
  automationsOn,
  view,
  setView,
  onToast,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);

  const personRef = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const sortRef = useRef<HTMLButtonElement>(null);
  const hideRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const filterCount =
    filters.statuses.length +
    filters.priorities.length +
    filters.persons.length +
    (filters.overdue ? 1 : 0);

  const views: [BoardView, typeof Rows3, string][] = [
    ["table", Rows3, "Tabell"],
    ["timeline", GanttChart, "Tidslinje"],
    ["calendar", CalendarDays, "Kalender"],
  ];

  return (
    <div
      role="toolbar"
      aria-label="Tavlans verktyg"
      className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-6 py-2.5"
    >
      <button
        type="button"
        onClick={onNewTask}
        className={`${BTN} bg-milou-500 font-medium text-white hover:bg-milou-400`}
      >
        <Plus size={15} strokeWidth={2.5} /> Nytt objekt
      </button>
      <button type="button" onClick={onNewGroup} className={GHOST}>
        <Plus size={14} /> Grupp
      </button>

      <div className="mx-1 h-5 w-px bg-gray-200" />

      <div role="tablist" aria-label="Vy" className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
        {views.map(([v, Icon, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Icon size={14} /> <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mx-1 h-5 w-px bg-gray-200" />

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Sök"
          className={search ? GHOST_ON : GHOST}
        >
          <Search size={14} /> {!searchOpen && !search && "Sök"}
        </button>
        {(searchOpen || search) && (
          <input
            ref={searchRef}
            value={search}
            placeholder="Sök objekt…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearch("");
                setSearchOpen(false);
              }
            }}
            onBlur={() => {
              if (!search) setSearchOpen(false);
            }}
            className="w-44 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-milou-300"
          />
        )}
      </div>

      <button
        ref={personRef}
        type="button"
        onClick={() => setPersonOpen((v) => !v)}
        className={filters.persons.length ? GHOST_ON : GHOST}
      >
        <Users size={14} /> Person
        {filters.persons.length > 0 && <Chip>{filters.persons.length}</Chip>}
      </button>
      {personOpen && (
        <Popover anchorRef={personRef} onClose={() => setPersonOpen(false)} width={208}>
          <PopLabel>Filtrera på person</PopLabel>
          {users.map((u) => (
            <PopItem
              key={u.id}
              onClick={() => setFilters((f) => ({ ...f, persons: toggle(f.persons, u.id) }))}
            >
              <Avatar name={u.name} size={22} />
              <span className="flex-1 truncate">{u.name}</span>
              {filters.persons.includes(u.id) && <Check size={14} />}
            </PopItem>
          ))}
          {filters.persons.length > 0 && (
            <PopItem onClick={() => setFilters((f) => ({ ...f, persons: [] }))}>
              <X size={13} /> Rensa
            </PopItem>
          )}
        </Popover>
      )}

      <button
        ref={filterRef}
        type="button"
        onClick={() => setFilterOpen((v) => !v)}
        className={filterCount ? GHOST_ON : GHOST}
      >
        <Filter size={14} /> Filter{filterCount > 0 && <Chip>{filterCount}</Chip>}
      </button>
      {filterOpen && (
        <Popover anchorRef={filterRef} onClose={() => setFilterOpen(false)} width={250}>
          <PopLabel>Status</PopLabel>
          <div className="flex flex-wrap gap-1 px-2 pb-1.5">
            {STATUSES.map((s) => (
              <FilterPill
                key={s.key}
                color={s.color}
                on={filters.statuses.includes(s.key)}
                onClick={() => setFilters((f) => ({ ...f, statuses: toggle(f.statuses, s.key) }))}
              >
                {s.label}
              </FilterPill>
            ))}
          </div>
          <PopLabel>Prioritet</PopLabel>
          <div className="flex flex-wrap gap-1 px-2 pb-1.5">
            {PRIORITIES.map((p) => (
              <FilterPill
                key={p.key}
                color={p.color}
                on={filters.priorities.includes(p.key)}
                onClick={() =>
                  setFilters((f) => ({ ...f, priorities: toggle(f.priorities, p.key) }))
                }
              >
                {p.label}
              </FilterPill>
            ))}
          </div>
          <PopSeparator />
          <PopItem onClick={() => setFilters((f) => ({ ...f, overdue: !f.overdue }))}>
            <span className="h-2 w-2 rounded-full bg-red-500" /> Endast försenade
            {filters.overdue && <Check size={14} className="ml-auto" />}
          </PopItem>
          {filterCount > 0 && (
            <PopItem onClick={() => setFilters(EMPTY_FILTERS)}>
              <X size={13} /> Rensa alla filter
            </PopItem>
          )}
        </Popover>
      )}

      <button
        ref={sortRef}
        type="button"
        onClick={() => setSortOpen((v) => !v)}
        className={sort ? GHOST_ON : GHOST}
      >
        <ArrowUpDown size={14} /> Sortera
      </button>
      {sortOpen && (
        <Popover anchorRef={sortRef} onClose={() => setSortOpen(false)} width={196}>
          <PopLabel>Sortera inom grupper</PopLabel>
          {[
            { key: "title", label: "Namn" },
            { key: "status", label: "Status" },
            { key: "priority", label: "Prioritet" },
            { key: "date", label: "Datum" },
          ].map((opt) => (
            <PopItem
              key={opt.key}
              onClick={() =>
                setSort((s) =>
                  s && s.key === opt.key
                    ? s.dir === "asc"
                      ? { key: opt.key, dir: "desc" }
                      : null
                    : { key: opt.key, dir: "asc" },
                )
              }
            >
              <span className="flex-1">{opt.label}</span>
              {sort?.key === opt.key &&
                (sort.dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
            </PopItem>
          ))}
          {sort && (
            <PopItem
              onClick={() => {
                setSort(null);
                setSortOpen(false);
              }}
            >
              <X size={13} /> Manuell ordning
            </PopItem>
          )}
        </Popover>
      )}

      <button
        ref={hideRef}
        type="button"
        onClick={() => setHideOpen((v) => !v)}
        className={hiddenCols.length ? GHOST_ON : GHOST}
      >
        <EyeOff size={14} /> Dölj{hiddenCols.length > 0 && <Chip>{hiddenCols.length}</Chip>}
      </button>
      {hideOpen && (
        <Popover anchorRef={hideRef} onClose={() => setHideOpen(false)} width={196}>
          <PopLabel>Visa kolumner</PopLabel>
          {COLUMNS.map((c) => (
            <PopItem
              key={c.key}
              onClick={() =>
                setHiddenCols(
                  hiddenCols.includes(c.key)
                    ? hiddenCols.filter((x) => x !== c.key)
                    : [...hiddenCols, c.key],
                )
              }
            >
              <span className="flex-1">{c.label}</span>
              {!hiddenCols.includes(c.key) && <Check size={14} />}
            </PopItem>
          ))}
        </Popover>
      )}

      <span className="flex-1" />

      <ReminderBell onToast={onToast} />

      <button
        type="button"
        onClick={onOpenAutomations}
        className={automationsOn > 0 ? `${BTN} bg-amber-50 text-amber-700` : GHOST}
      >
        <Zap size={14} strokeWidth={2.25} /> Automatisera
        {automationsOn > 0 && <Chip amber>{automationsOn}</Chip>}
      </button>
    </div>
  );
}

function Chip({ children, amber = false }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <span
      className={`ml-0.5 rounded-full px-1.5 text-[11px] font-semibold ${
        amber ? "bg-amber-200 text-amber-800" : "bg-milou-100 text-milou-600"
      }`}
    >
      {children}
    </span>
  );
}

function FilterPill({
  children,
  color,
  on,
  onClick,
}: {
  children: React.ReactNode;
  color: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={on ? { background: color, borderColor: color } : { borderColor: color, color }}
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        on ? "text-white" : "bg-white"
      }`}
    >
      {children}
    </button>
  );
}
