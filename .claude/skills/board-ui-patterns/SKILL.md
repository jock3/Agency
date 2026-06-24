---
name: board-ui-patterns
description: |
  Monday.com-style board UI patterns: collapsible groups, inline add rows,
  column headers, group progress bars, and the full data-flow architecture
  for grouped task lists. Use when building board/table views in Agency apps.
---

# Board UI Patterns

The board layout in `apps/todo` (TaskList + TaskItem + GroupSection) is the canonical reference. These patterns cover the full architecture — from data grouping to inline editing to keyboard navigation.

---

## Data Architecture

### Grouping tasks

```typescript
// Groups are computed from tasks + lists — never stored in state
interface Group {
  id: string;       // list.id or "__inbox__"
  name: string;
  color: string;
  tasks: TodoTask[];
}

function computeGroups(tasks: TodoTask[], lists: TodoList[], view: View): Group[] {
  if (isListView(view)) {
    // Single-group: the current list
    return [{ id: view, name: list.name, color: list.color, tasks }];
  }

  // Multi-group: bucket by list_id
  const byList: Record<string, TodoTask[]> = {};
  for (const task of tasks) {
    const key = task.list_id ?? "__inbox__";
    if (!byList[key]) byList[key] = [];
    byList[key].push(task);
  }

  const groups: Group[] = [];

  // Inbox first (null list_id)
  if (byList["__inbox__"]?.length) {
    groups.push({ id: "__inbox__", name: "Inkorg", color: "#E60330", tasks: byList["__inbox__"] });
  }

  // Then each list in sidebar order
  for (const list of lists) {
    if (byList[list.id]?.length) {
      groups.push({ id: list.id, name: list.name, color: list.color, tasks: byList[list.id] });
    }
  }

  return groups;
}
```

Only show groups that have tasks — empty groups are hidden unless it's a list view.

### Add-task state

```typescript
// One state value: which group is in add mode (null = none)
const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

// "n" shortcut → open first group's add row
const firstGroupIdRef = useRef<string | null>(null);
firstGroupIdRef.current = groups[0]?.id ?? null;

useEffect(() => {
  const handler = () => setAddingToGroup(firstGroupIdRef.current);
  document.addEventListener("todo:new-task", handler);
  return () => document.removeEventListener("todo:new-task", handler);
}, []);
```

Using a ref (not state) for `firstGroupId` avoids stale closure issues in the event listener.

---

## Group Section Structure

```
GroupSection
├── Group header (colored left border, collapse toggle, name, count)
└── [when not collapsed]
    ├── Column headers row
    ├── Task rows (TaskItem × n)
    ├── Add task row (inline input OR "Lägg till objekt" button)
    └── Footer (item count + progress bar)
```

### Group header

```tsx
<div
  className="flex items-center gap-2.5 px-4 py-2.5 bg-[#1c1c1c] select-none"
  style={{ borderLeft: `3px solid ${group.color}` }}
>
  {/* Collapse chevron */}
  <button onClick={() => setCollapsed(!collapsed)} className="text-[#555] hover:text-[#888] transition-colors">
    <svg className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {/* Group name — colored to match the group */}
  <span className="text-sm font-semibold" style={{ color: group.color }}>
    {group.name}
  </span>

  {/* Item count — muted */}
  <span className="text-xs text-[#555]">{total} objekt</span>
</div>
```

**Left border**: `3px solid` — thinner than typical (4px) to keep it refined. Color comes from the list/group color.

### Column headers

```tsx
const COL = "grid-cols-[40px_minmax(0,1fr)_150px_110px_110px_40px]";

<div className={`grid ${COL} px-1 py-1.5 bg-[#181818] border-b border-[#222]`}>
  <div />
  <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase pl-1">Objekt</div>
  <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase">Status</div>
  <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase">Prioritet</div>
  <div className="text-[10px] text-[#444] font-medium tracking-wide uppercase">Datum</div>
  <div />
</div>
```

Column headers are `text-[#444]` (one stop fainter than labels) — they label the board, not the user's content.

---

## Task Row (TaskItem)

### Full row pattern

```tsx
<div
  onClick={onSelect}
  className={clsx(
    `group grid ${colClass} border-b border-[#1e1e1e] cursor-pointer transition-colors`,
    isSelected ? "bg-[#222]" : "hover:bg-[#1e1e1e]"
  )}
>
  {/* Col 1: Checkbox */}
  <div className="flex items-center justify-center py-2.5">
    <button onClick={handleComplete} className={...}>
  </div>

  {/* Col 2: Title */}
  <div className="flex items-center py-2.5 pr-2 min-w-0">
    <span className={clsx("text-sm truncate", completed ? "line-through text-[#555]" : "text-[#d4d4d4]")}>
      {task.title}
    </span>
  </div>

  {/* Col 3: Status — click to cycle */}
  <div className="flex items-center py-2 px-1">
    <button onClick={cycleStatus} style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
      className="text-xs px-2 py-1 rounded font-medium whitespace-nowrap w-full text-center
        hover:opacity-80 transition-opacity">
      {statusCfg.label}
    </button>
  </div>

  {/* Col 4: Priority — click to cycle, hidden when "none" until group-hover */}
  <div className="flex items-center py-2 px-1">
    {task.priority !== "none" ? (
      <button onClick={cyclePriority} style={{ ... }} className="... w-full text-center">
        {priorityCfg.label}
      </button>
    ) : (
      <button onClick={cyclePriority}
        className="text-[#2d2d2d] hover:text-[#555] w-full text-center
          text-base leading-none opacity-0 group-hover:opacity-100 transition-opacity">
        +
      </button>
    )}
  </div>

  {/* Col 5: Due date */}
  <div className="flex items-center py-2 px-1">
    {dueDateNode ?? <svg className="... opacity-0 group-hover:opacity-100" .../>}
  </div>

  {/* Col 6: Delete — reveal on hover */}
  <div className="flex items-center justify-center py-2.5">
    <button onClick={onDelete}
      className="opacity-0 group-hover:opacity-100 text-[#3d3d3d] hover:text-red-400 transition-all">
      <svg className="w-3.5 h-3.5" .../>
    </button>
  </div>
</div>
```

### Click-to-cycle pattern

```typescript
const cycleStatus = (e: React.MouseEvent) => {
  e.stopPropagation(); // prevent row selection
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length];
  onUpdate({ status: next });
};

const cyclePriority = (e: React.MouseEvent) => {
  e.stopPropagation();
  const idx = PRIORITIES.indexOf(task.priority);
  onUpdate({ priority: PRIORITIES[(idx + 1) % PRIORITIES.length] });
};
```

Always `e.stopPropagation()` on column buttons — the row itself is clickable and would trigger selection.

### Due date display

```typescript
const dueDateNode = (() => {
  if (!task.due_date) return null;
  const date = parseISO(task.due_date);
  const label = format(date, "d MMM", { locale: sv });
  if (task.status === "klar") return <span className="text-xs text-[#555]">{label}</span>;
  if (isToday(date))          return <span className="text-xs text-milou-400 font-medium">Idag</span>;
  if (isPast(date))           return <span className="text-xs text-red-400 font-medium">Försenad</span>;
  return                             <span className="text-xs text-[#888]">{label}</span>;
})();
```

Four states: completed (dim), today (brand), overdue (red), future (muted). Uses `date-fns` with `sv` locale for Swedish month names.

---

## Inline Add Row

Two states: button (passive) → input (active).

```tsx
{isAddingTask ? (
  <div className={`grid ${COL} border-b border-[#1e1e1e] bg-[#1c1c1c] px-1`}>
    <div className="flex items-center justify-center py-2.5">
      <div className="w-4 h-4 rounded-full border-2 border-[#3d3d3d]" /> {/* placeholder checkbox */}
    </div>
    <input
      autoFocus
      value={newTitle}
      onChange={(e) => setNewTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter")  submitAdd();
        if (e.key === "Escape") { setNewTitle(""); onCloseAdd(); }
      }}
      onBlur={submitAdd}  // save on click-away (even empty → just closes)
      placeholder="Ny uppgift…"
      className="text-sm text-[#e5e5e5] bg-transparent outline-none placeholder:text-[#444] py-2.5"
    />
  </div>
) : (
  <button
    onClick={onOpenAdd}
    className="flex items-center gap-2 px-4 py-2 text-xs text-[#444] hover:text-[#777]
      border-b border-[#1e1e1e] w-full hover:bg-[#1c1c1c] transition-colors"
  >
    <svg className="w-3 h-3" ...><path d="M12 4v16m8-8H4" /></svg>
    Lägg till objekt
  </button>
)}
```

`onBlur={submitAdd}` means clicking anywhere else saves (if non-empty) or cancels. `autoFocus` on the input opens the keyboard immediately.

### Submit logic

```typescript
const listId = group.id === "__inbox__" ? null : group.id;

const submitAdd = () => {
  if (newTitle.trim()) onCreate(newTitle.trim(), listId);
  setNewTitle("");
  onCloseAdd();
};
```

Always pass `listId` explicitly to `onCreate` — don't rely on the view state in the parent. The group knows its own list association.

---

## Group Footer (Progress Bar)

```tsx
<div className="flex items-center gap-3 px-4 py-2 bg-[#181818]">
  <span className="text-xs text-[#444]">{total} objekt</span>
  {total > 0 && (
    <div className="flex-1 h-1 rounded-full overflow-hidden bg-[#252525] flex">
      {done > 0 && (
        <div style={{ width: `${(done/total)*100}%`, backgroundColor: "#10b981" }}
          className="transition-all" />
      )}
      {inProgress > 0 && (
        <div style={{ width: `${(inProgress/total)*100}%`, backgroundColor: "#f59e0b" }}
          className="transition-all" />
      )}
      {cancelled > 0 && (
        <div style={{ width: `${(cancelled/total)*100}%`, backgroundColor: "#ef4444" }}
          className="transition-all" />
      )}
    </div>
  )}
</div>
```

Segment order: done → in-progress → cancelled. Unstarted tasks take up the empty `bg-[#252525]` remainder — no segment needed.

---

## Toolbar Pattern

```tsx
<div className="flex items-center gap-1.5 mt-4 flex-wrap">
  {/* Primary CTA */}
  <button onClick={onAdd}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-milou-500 hover:bg-milou-600
      text-white text-xs font-medium rounded-lg transition-colors mr-1">
    <svg className="w-3 h-3" ...><path d="M12 4v16m8-8H4" /></svg>
    Nytt objekt
  </button>

  {/* Search */}
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border
    border-[#2d2d2d] hover:border-[#3d3d3d] transition-colors">
    <svg className="w-3 h-3 text-[#555] shrink-0" ...>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
    <input
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Sök"
      className="bg-transparent outline-none text-[#e5e5e5] placeholder:text-[#555] w-24 text-xs"
    />
  </div>

  {/* Passive filter buttons */}
  {["Filter", "Sortera"].map((label) => (
    <button key={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border
        border-[#2d2d2d] hover:border-[#3d3d3d] text-xs text-[#666] hover:text-[#aaa] transition-colors">
      {label}
    </button>
  ))}
</div>
```

Search is embedded in a bordered pill — not a standalone input with a label. Width `w-24` expands naturally with `flex`.

---

## Event Bus Pattern (cross-component triggers)

When a toolbar action needs to target a specific group's add row but the toolbar doesn't know which group exists:

```typescript
// Dispatcher (toolbar / keyboard shortcut)
document.dispatchEvent(new CustomEvent("todo:new-task"));

// Listener (TaskList — knows about groups)
useEffect(() => {
  const handler = () => setAddingToGroup(firstGroupIdRef.current);
  document.addEventListener("todo:new-task", handler);
  return () => document.removeEventListener("todo:new-task", handler);
}, []);
```

Use a `ref` for `firstGroupId` (not state) so the event listener always has the current value without needing to be re-registered.

---

## Prop Flow Summary

```
page.tsx
  tasks (all, filtered by view + search)
  └── TaskList
        groups (computed)
        └── GroupSection × n
              isAddingTask, onOpenAdd, onCloseAdd
              └── TaskItem × n
                    onSelect, onComplete, onDelete, onUpdate(Partial<Task>)
              └── AddRow (inline input)
                    onCreate(title, listId)
```

`onUpdate` takes `Partial<TodoTask>` — TaskItem only sends the fields it changes (`{ status }` or `{ priority }`). The parent (page.tsx) handles syncing derived fields (e.g. `completed` from `status`).
