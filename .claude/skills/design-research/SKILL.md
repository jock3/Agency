---
name: design-research
description: |
  Research skill for discovering, evaluating, and codifying UI/UX design patterns
  into reusable Agency skills. Use when you want an agent to search for best
  practices in a specific design area and produce a ready-to-commit skill file.
  Run with claude-opus-4-8 for highest-quality synthesis.
---

# Design Research Skill

## Purpose

Research a UI/UX design topic, evaluate sources, and produce a complete skill file
ready to be saved under `.claude/skills/<topic>/SKILL.md`.

**Recommended model**: `claude-opus-4-8`
**Recommended tool access**: `WebSearch`, `WebFetch`, `Read`, `Write`

---

## How to Invoke

```
Research <topic> design patterns and produce a skill file for the Agency monorepo.
Use the design-research skill protocol.
```

Examples:
- "Research accessibility patterns for dark theme web apps"
- "Research animation and motion design for React/Tailwind"
- "Research form UX — validation, error states, loading feedback"
- "Research responsive layout patterns for board/table UIs"

---

## Research Protocol

When this skill is active, follow these steps in order:

### 1. Define the scope (before searching)

State clearly:
- What design problem this covers
- What the Agency apps already do (reference existing skills: `dark-theme-design`, `tailwind-component-patterns`, `board-ui-patterns`, `nextjs-supabase`)
- What gap this research fills

### 2. Search sources

Search in this priority order:

1. **Authoritative references first**
   - MDN Web Docs (accessibility, CSS, HTML semantics)
   - W3C / WCAG guidelines (contrast, ARIA, keyboard nav)
   - Tailwind CSS docs (utility classes, config options)
   - React docs (hooks, event handling patterns)

2. **Respected design systems**
   - Linear's design language (closest to our aesthetic)
   - Vercel/Next.js design (dark theme done well)
   - Radix UI primitives (accessibility-first components)
   - shadcn/ui (Tailwind component conventions)

3. **Community knowledge**
   - CSS Tricks, Smashing Magazine (for nuanced dark mode techniques)
   - web.dev (performance + UX intersection)

**Avoid**: Medium posts, DEV.to tutorials, YouTube summaries — these restate
what's already in docs but with more noise.

### 3. Evaluate what you find

For each pattern or technique found, answer:
- Does it work with Tailwind utility classes, or does it require custom CSS?
- Does it fit the existing dark theme scale (#141414 → #e5e5e5)?
- Is it something an agent would get wrong without explicit guidance?
- Is there a common pitfall or browser inconsistency to warn about?

Discard anything that:
- Requires a UI library we don't use (MUI, Chakra, etc.)
- Only applies to light themes
- Is already covered in an existing Agency skill

### 4. Structure the findings

Organise into these sections (use only the ones that apply):

```markdown
## Overview
One paragraph — what this skill covers and when to use it.

## Core Patterns
The 3–6 most important, copy-paste-ready patterns with code examples.

## Configuration
Any tailwind.config.ts / globals.css changes needed.

## Accessibility Rules
WCAG requirements, ARIA attributes, keyboard behaviour. Mandatory if the
topic touches interactive elements.

## Common Pitfalls
Table: Mistake | Fix. Only include pitfalls that are non-obvious.

## Browser / Platform Notes
Only include if there are real cross-browser differences (like [color-scheme:dark]
on date inputs, or scrollbar-width browser support).

## References
3–5 links maximum — only the most authoritative sources used.
```

### 5. Write the skill file

Output a complete, ready-to-commit `SKILL.md` with:

```yaml
---
name: <kebab-case-topic>
description: |
  One or two sentences. What it covers. When to use it.
  Mention which existing skills it complements.
---
```

Then the full content following the structure above.

**Quality bar**: An agent reading this skill for the first time should be able to
implement the patterns correctly without needing to look anything up. If a pattern
requires more than one lookup to understand, explain it more.

---

## Existing Skills (don't duplicate)

Before researching, check what's already covered:

| Skill | Already covers |
|-------|---------------|
| `dark-theme-design` | Color scale, typography, inputs, buttons, checkboxes, scrollbars, pitfalls |
| `tailwind-component-patterns` | Grid layouts, badges, skeletons, empty states, progress bars, inline editing, keyboard shortcuts |
| `board-ui-patterns` | Group sections, task rows, click-to-cycle, inline add row, toolbar, event bus |
| `nextjs-supabase` | Auth, API layer, Supabase schema, Vercel deploy, TypeScript conventions |

---

## Output Format

Produce exactly two things:

1. The complete `SKILL.md` content (ready to write to `.claude/skills/<name>/SKILL.md`)
2. A one-paragraph summary of what you found and what you decided NOT to include and why

Do not produce: long lists of raw search results, link dumps, or unstructured notes.
The output should be the skill file, not research notes.
