---
name: dark-theme-design
description: |
  Dark theme design system for the Agency monorepo apps. Covers the complete
  color scale, typography rules, input/border conventions, interactive states,
  and common dark-mode pitfalls. Use whenever building or modifying UI in
  apps/todo or apps/mediaplan.
---

# Dark Theme Design System

## Color Scale

The entire UI is built on a single 9-stop neutral scale. Memorize these — never reach for Tailwind's built-in grays.

| Token | Hex | Role |
|-------|-----|------|
| `bg-main` | `#141414` | Page background, main pane |
| `bg-panel` | `#1a1a1a` | Sidebar, detail panel, modals |
| `bg-card` | `#1c1c1c` | Group headers, hovered rows, cards |
| `bg-header` | `#181818` | Column headers, footers, table bands |
| `bg-input` | `#252525` | All inputs, textareas, selects, dropdowns |
| `border-default` | `#252525` | Dividers, panel edges |
| `border-input` | `#2d2d2d` | Input outlines at rest |
| `border-hover` | `#3d3d3d` | Input outlines on hover |
| `text-primary` | `#e5e5e5` | Headings, active items |
| `text-body` | `#d4d4d4` | Body copy, task titles |
| `text-muted` | `#888` | Descriptions, helper text |
| `text-label` | `#555` | Section headers (always uppercase + tracking-wider) |
| `text-faint` | `#444` | Placeholders, disabled icons |
| `text-dim` | `#3d3d3d` | Barely-visible affordance icons |

### Accent Colors

| Purpose | Hex | Tailwind |
|---------|-----|----------|
| Primary action / brand | `#E60330` | `milou-500` |
| Primary hover | `#c0021f` | `milou-600` |
| Primary soft focus | `#E60330` + `20` opacity | `milou-500/20` |
| Success / complete | `#10b981` | `emerald-500` |
| Warning / in-progress | `#f59e0b` | `amber-400` |
| Danger / cancelled | `#ef4444` | `red-500` |
| Info / low priority | `#60a5fa` | `blue-400` |

---

## Typography Rules

- **Font**: Komet (body), Verveine (display/logo only)
- **Base size**: 14px (`text-sm`) for most UI; 12px (`text-xs`) for labels, badges, metadata
- **Section labels**: always `text-[10px] font-medium text-[#555] uppercase tracking-wider`
- **Headings**: `text-xl font-semibold text-[#e5e5e5]` (page title), `text-base font-semibold` (panel title)
- **Never** use Tailwind's `text-gray-*` — always use the hex tokens above

```tsx
// Section label pattern — used everywhere
<label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-2">
  Status
</label>
```

---

## Input & Form Conventions

All inputs share the same base style. Never deviate.

```tsx
// Text input
<input className="w-full text-sm border border-[#2d2d2d] bg-[#252525] rounded-lg px-3 py-1.5
  focus:outline-none focus:ring-1 focus:ring-milou-500
  text-[#e5e5e5] placeholder:text-[#444]" />

// Textarea
<textarea className="w-full text-sm text-[#d4d4d4] bg-[#252525] rounded-xl px-3 py-2.5
  border border-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-milou-500
  resize-none scrollbar-thin placeholder:text-[#444]" />

// Select
<select className="w-full text-sm border border-[#2d2d2d] bg-[#252525] rounded-lg px-3 py-1.5
  focus:outline-none focus:ring-1 focus:ring-milou-500 text-[#e5e5e5]" />

// Date input — MUST add [color-scheme:dark] or the native picker renders light
<input type="date" className="text-sm border border-[#2d2d2d] bg-[#252525] rounded-lg
  px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-milou-500
  text-[#e5e5e5] [color-scheme:dark]" />
```

**Focus ring**: always `focus:ring-1 focus:ring-milou-500` — never `focus:ring-blue-*`.

---

## Button Styles

### Primary (CTA)
```tsx
<button className="px-3 py-1.5 bg-milou-500 hover:bg-milou-600 text-white
  text-xs font-medium rounded-lg transition-colors">
```

### Ghost / secondary
```tsx
<button className="px-3 py-1.5 rounded-lg border border-[#2d2d2d]
  hover:border-[#3d3d3d] text-xs text-[#666] hover:text-[#aaa] transition-colors">
```

### Icon button
```tsx
<button className="text-[#444] hover:text-[#888] hover:bg-[#252525]
  rounded-md p-1 transition-all">
```

### Danger (destructive)
```tsx
<button className="text-xs text-[#555] hover:text-red-400 transition-colors">
```

### Active pill (e.g. status/priority toggle)
```tsx
// Active: colored bg from config
style={{ backgroundColor: cfg.bg, color: cfg.color }}
className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border border-transparent"

// Inactive
className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border
  bg-transparent text-[#555] border-[#2d2d2d] hover:border-[#3d3d3d] hover:text-[#888]"
```

---

## Interactive States

### Row hover (table/list rows)
```tsx
// Default
className="border-b border-[#1e1e1e] cursor-pointer transition-colors hover:bg-[#1e1e1e]"

// Selected
className="border-b border-[#1e1e1e] bg-[#222]"
```

### Reveal-on-hover (delete buttons, affordance icons)
```tsx
// Hidden by default, visible on parent group-hover
<button className="opacity-0 group-hover:opacity-100 transition-all">
// Parent row must have className="group ..."
```

### Checkbox (round, milou on check)
```tsx
<button className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
  transition-all shrink-0 ${
    checked ? "bg-milou-500 border-milou-500" : "border-[#3d3d3d] hover:border-milou-400"
  }`}>
  {checked && <svg className="w-2 h-2 text-white" ...><polyline points="20 6 9 17 4 12" /></svg>}
</button>
```

### Square subtask checkbox
```tsx
<button className={`w-4 h-4 rounded border-2 flex items-center justify-center
  transition-all shrink-0 ${
    checked ? "bg-milou-500 border-milou-500" : "border-[#3d3d3d] hover:border-milou-400"
  }`}>
```

---

## Scrollbars

Always apply `scrollbar-thin` to any scrollable container:

```css
/* globals.css */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}
.scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
```

```tsx
<div className="overflow-y-auto scrollbar-thin">
```

---

## Panel / Aside Layout

```tsx
// Right detail panel
<aside className="w-80 border-l border-[#252525] bg-[#1a1a1a] flex flex-col h-full shrink-0">
  {/* Header */}
  <div className="flex items-center justify-between px-5 py-4 border-b border-[#252525]">
  {/* Body */}
  <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-5">
  {/* Footer */}
  <div className="px-5 py-3 border-t border-[#252525] flex items-center justify-between">
```

---

## Common Dark Mode Pitfalls

| Pitfall | Fix |
|---------|-----|
| Native date picker shows white background | Add `[color-scheme:dark]` to `<input type="date">` |
| Select dropdown shows light options | Add `bg-[#252525] text-[#e5e5e5]` to both `<select>` and `<option>` |
| SVG icons invisible on dark bg | Use `stroke="currentColor"` + set text color on the button wrapper |
| Focus ring disappears | Use `focus:ring-1 focus:ring-milou-500` not `focus:ring-2` (too thick on dark) |
| Placeholder too bright | Always `placeholder:text-[#444]` — never `placeholder:text-gray-400` |
| Borders invisible | Use `#2d2d2d` not `#1f1f1f` — the delta needs to be at least 15 steps |
| `text-gray-*` bleeds through | Never use Tailwind gray — always use hex tokens from the scale above |
