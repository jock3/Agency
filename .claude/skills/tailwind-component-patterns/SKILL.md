---
name: tailwind-component-patterns
description: |
  Reusable Tailwind CSS component patterns for the Agency monorepo dark theme.
  Covers grid layouts, badge systems, animated transitions, empty states, loading
  skeletons, and composition rules. Use when building or extending UI components
  in apps/todo or apps/mediaplan.
---

# Tailwind Component Patterns

Concrete, copy-paste patterns used across the Agency apps. All assume the dark theme color scale — see `dark-theme-design` skill for the palette.

---

## Grid Layouts

### Board table row (Monday.com-style)

```tsx
// Define the column template once at the top of the file
const COL = "grid-cols-[40px_minmax(0,1fr)_150px_110px_110px_40px]";

// Apply consistently to: column headers, task rows, add-task row
<div className={`grid ${COL} border-b border-[#1e1e1e]`}>
  <div /> {/* checkbox col */}
  <div>Title</div>
  <div>Status</div>
  <div>Priority</div>
  <div>Date</div>
  <div /> {/* actions col */}
</div>
```

Key rules:
- First col `40px`: always a checkbox or icon — never text
- Title col `minmax(0,1fr)`: `min-w-0` prevents overflow, use `truncate` on text inside
- Fixed cols (`150px`, `110px`): status needs more room than priority/date
- Last col `40px`: delete/action icon, hidden by default (`opacity-0 group-hover:opacity-100`)

### Sidebar + main + detail (three-column shell)

```tsx
<div className="flex h-screen bg-[#141414] overflow-hidden">
  <aside className="w-16 shrink-0 ...">        {/* 64px icon sidebar */}
  <main className="flex flex-1 min-w-0 overflow-hidden">
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden"> {/* task list */}
    <aside className="w-80 shrink-0 ...">      {/* 320px detail panel */}
  </main>
</div>
```

`min-w-0` on flex children prevents content from breaking the layout when the detail panel is open.

---

## Badge / Pill System

### Status badge (colored background)

```tsx
// Config object pattern — define once, use everywhere
const STATUS_CONFIG = {
  ej_paborjad: { label: "Ej påbörjad", bg: "#2d2d2d", color: "#777" },
  pagar:       { label: "Pågår",        bg: "#f59e0b", color: "#1c1c1c" },
  klar:        { label: "Klar",         bg: "#10b981", color: "#fff" },
  avbruten:    { label: "Avbruten",     bg: "#ef4444", color: "#fff" },
};

// Render
<button
  style={{ backgroundColor: cfg.bg, color: cfg.color }}
  className="text-xs px-2 py-1 rounded font-medium whitespace-nowrap
    w-full text-center hover:opacity-80 transition-opacity"
>
  {cfg.label}
</button>
```

### Priority badge (tinted background)

```tsx
const PRIORITY_CONFIG = {
  none:   { label: "—",     bg: "transparent", color: "#3d3d3d" },
  low:    { label: "Låg",   bg: "#1e3a5f",     color: "#60a5fa" },
  medium: { label: "Medel", bg: "#3d2400",     color: "#f59e0b" },
  high:   { label: "Hög",   bg: "#3d0012",     color: "#f87171" },
};
```

**Tint formula**: take the accent color, drop it to 10-15% lightness for the bg, keep full saturation for text. This achieves legibility with minimal visual weight.

### Active/inactive toggle pill group

```tsx
// Pattern: array of values, one active at a time
{OPTIONS.map(({ value, label }) => {
  const active = current === value;
  return (
    <button
      key={value}
      onClick={() => onChange(value)}
      style={active ? { backgroundColor: cfg.bg, color: cfg.color } : {}}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
        active
          ? "border-transparent"
          : "bg-transparent text-[#555] border-[#2d2d2d] hover:border-[#3d3d3d] hover:text-[#888]"
      }`}
    >
      {label}
    </button>
  );
})}
```

---

## Loading Skeletons

```tsx
// Pulse skeleton rows
<div className="space-y-3">
  {[...Array(3)].map((_, i) => (
    <div
      key={i}
      className="h-28 rounded-xl bg-[#1c1c1c] animate-pulse"
      style={{ animationDelay: `${i * 80}ms` }}
    />
  ))}
</div>
```

Stagger delays (`i * 80ms`) make it feel less mechanical. Use `bg-[#1c1c1c]` not `bg-gray-800` — matches the card level of the scale.

---

## Empty States

```tsx
function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="text-center py-16 select-none">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-base font-medium text-[#888]">{title}</p>
      <p className="text-sm text-[#555] mt-1">{subtitle}</p>
    </div>
  );
}
```

Padding: `py-16` minimum. `select-none` prevents accidental text selection. Keep emoji at `text-4xl` — bigger feels toy-like.

---

## Transitions & Animation

### Collapse chevron
```tsx
<svg className={`w-3 h-3 transition-transform ${collapsed ? "-rotate-90" : ""}`} ...>
  <path d="M19 9l-7 7-7-7" />
</svg>
```

### Fade-in on mount (Tailwind only, no JS)
```tsx
// Use opacity-0 → opacity-100 with a short duration
className="transition-opacity duration-150"
// Toggle the opacity class on mount via useEffect + useState
```

### Color/opacity transitions
```tsx
// All interactive elements: transition-colors or transition-all
className="transition-colors"   // for bg/text/border changes
className="transition-opacity"  // for reveal-on-hover
className="transition-all"      // when multiple props animate together (use sparingly)
```

Always use `duration-150` or rely on Tailwind default (150ms). Never go above 200ms for micro-interactions.

---

## Progress Bar (Multi-Segment)

```tsx
// Proportional colored segments, no gaps
<div className="flex-1 h-1 rounded-full overflow-hidden bg-[#252525] flex">
  {done > 0 && (
    <div
      style={{ width: `${(done / total) * 100}%`, backgroundColor: "#10b981" }}
      className="transition-all"
    />
  )}
  {inProgress > 0 && (
    <div
      style={{ width: `${(inProgress / total) * 100}%`, backgroundColor: "#f59e0b" }}
      className="transition-all"
    />
  )}
  {cancelled > 0 && (
    <div
      style={{ width: `${(cancelled / total) * 100}%`, backgroundColor: "#ef4444" }}
      className="transition-all"
    />
  )}
</div>
```

`h-1` (4px) keeps it subtle. `rounded-full` on the container + `overflow-hidden` clips the inner divs cleanly without needing per-segment border radius.

---

## Icon Buttons & SVG Conventions

All icons use `stroke="currentColor"` — set the color on the button, not the SVG.

```tsx
// Standard icon sizes
// Small action (delete, close): w-3 h-3 or w-3.5 h-3.5, strokeWidth={2}
// Medium nav (sidebar icons):   w-4 h-4, strokeWidth={1.5}
// Large display:                w-5 h-5+, strokeWidth={1.5}

// Icon button wrapper — always explicit size, never trust icon to fill
<button className="text-[#444] hover:text-[#888] transition-colors">
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
    stroke="currentColor" strokeWidth={1.5}>
    ...
  </svg>
</button>
```

**Stroke widths by weight**:
- `strokeWidth={1.5}` — nav/display icons (light, elegant)
- `strokeWidth={2}` — action icons (clear intent)
- `strokeWidth={2.5}` — emphasis (plus sign, checkmark in CTA)
- `strokeWidth={3}` — tiny checkmarks inside 16px boxes (needs extra weight to read)

---

## Inline Editing Pattern

```tsx
// Title that edits on click — save on blur or Enter
const [value, setValue] = useState(initial);

const save = () => {
  const trimmed = value.trim();
  if (trimmed && trimmed !== initial) onSave(trimmed);
  else setValue(initial); // revert if empty or unchanged
};

<input
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onBlur={save}
  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
  className="w-full text-base font-semibold text-[#e5e5e5]
    bg-transparent border-none outline-none focus:ring-0 p-0"
/>
```

Key: `bg-transparent border-none outline-none focus:ring-0 p-0` — the input is invisible until focused. Blur triggers save; Escape should revert (add `if (e.key === "Escape") { setValue(initial); e.currentTarget.blur(); }`).

---

## Keyboard Shortcut Pattern

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
      (e.target as HTMLElement).tagName
    );
    if (e.key === "n" && !inInput) {
      e.preventDefault();
      // trigger action
    }
    if (e.key === "Escape") {
      // close/cancel
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, []);
```

Always guard shortcuts with `!inInput` — never fire when the user is typing.

---

## Composition Rules

1. **One `group` per interactive row** — enables reveal-on-hover for child elements
2. **`shrink-0` on fixed-width panels** — prevents flex from squishing sidebars
3. **`min-w-0` on flex-1 children** — prevents text overflow breaking layouts
4. **`overflow-hidden` on the shell, `overflow-y-auto scrollbar-thin` on scroll regions** — never put scroll on the root
5. **`select-none` on non-interactive text regions** (labels, empty states, group headers) — prevents accidental selection
6. **Avoid `!important`** — if you need it, the specificity is wrong; restructure classes instead
