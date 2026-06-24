#!/usr/bin/env bash
# create-swarm-repo.sh — Bootstrap jock3/swarm from this Agency repo
#
# Run from the root of your local jock3/Agency clone:
#   bash scripts/create-swarm-repo.sh
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth login)
#   - OR manually create jock3/swarm on github.com first (public, no README)

set -euo pipefail

AGENCY_ROOT="$(git rev-parse --show-toplevel)"
SWARM_REMOTE="https://github.com/jock3/swarm.git"
WORK_DIR="$(mktemp -d)"

trap 'echo; echo "Work dir left at: $WORK_DIR (rm -rf to clean up)"; ' EXIT

echo "[swarm] Creating swarm repo content in $WORK_DIR ..."
echo ""

# ── 1. Create directory structure ────────────────────────────────────────────
mkdir -p \
  "$WORK_DIR/.claude/skills/dark-theme-design" \
  "$WORK_DIR/.claude/skills/tailwind-component-patterns" \
  "$WORK_DIR/.claude/skills/board-ui-patterns" \
  "$WORK_DIR/.claude/skills/nextjs-supabase" \
  "$WORK_DIR/.claude/skills/design-research" \
  "$WORK_DIR/.claude/helpers"

# ── 2. Copy skill files from Agency ──────────────────────────────────────────
for SKILL in dark-theme-design tailwind-component-patterns board-ui-patterns nextjs-supabase design-research; do
  SRC="$AGENCY_ROOT/.claude/skills/$SKILL/SKILL.md"
  if [ ! -f "$SRC" ]; then
    echo "[swarm] ERROR: skill file not found: $SRC" >&2
    exit 1
  fi
  cp "$SRC" "$WORK_DIR/.claude/skills/$SKILL/SKILL.md"
  echo "[swarm]   Copied skill: $SKILL"
done

# ── 3. Copy helpers ───────────────────────────────────────────────────────────
cp "$AGENCY_ROOT/.claude/helpers/pre-push-build.sh" "$WORK_DIR/.claude/helpers/"
chmod +x "$WORK_DIR/.claude/helpers/pre-push-build.sh"
echo "[swarm]   Copied helper: pre-push-build.sh"

# ── 4. Write settings template ────────────────────────────────────────────────
cat > "$WORK_DIR/.claude/settings.template.json" << 'SETTINGS_EOF'
{
  "customInstructions": "Follow CLAUDE.md guidelines. Use concurrent execution for all operations.",
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push)",
      "Bash(git branch:*)",
      "Bash(git checkout:*)",
      "Bash(git fetch:*)",
      "Bash(git pull:*)",
      "Bash(ls:*)",
      "Bash(npx:*)",
      "Bash(node:*)",
      "Bash(which:*)",
      "Bash(pwd)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Bash(rm -rf /)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/helpers/pre-push-build.sh\"",
            "timeout": 120000
          }
        ]
      }
    ]
  },
  "skills": {
    "source": ".claude/skills",
    "enabled": true
  }
}
SETTINGS_EOF
echo "[swarm]   Wrote: .claude/settings.template.json"

# ── 5. Write CLAUDE.md ────────────────────────────────────────────────────────
cat > "$WORK_DIR/CLAUDE.md" << 'CLAUDE_EOF'
# Agency Swarm — Behavioral Rules

## Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing an existing file to creating a new one
- NEVER commit secrets, credentials, or .env files
- ALWAYS read a file before editing it
- NEVER proactively create documentation files unless explicitly requested

## Stack

Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Vercel

## Design Skills Available

Load these when building or modifying UI in any Agency app:

- `dark-theme-design` — color scale, typography, inputs, buttons, dark-mode pitfalls
- `tailwind-component-patterns` — grid layouts, badges, skeletons, progress bars, inline editing
- `board-ui-patterns` — Monday.com board: groups, rows, click-to-cycle, inline add
- `nextjs-supabase` — full-stack patterns: auth, API layer, Supabase, Vercel deploy
- `design-research` — protocol for researching new design areas (use Opus)

## Pre-push Hook

`.claude/helpers/pre-push-build.sh` runs `npm run build` for any changed app before
pushing. Blocks the push if the build fails. Wire it in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/helpers/pre-push-build.sh\"",
        "timeout": 120000
      }]
    }]
  }
}
```
CLAUDE_EOF
echo "[swarm]   Wrote: CLAUDE.md"

# ── 6. Write README.md ────────────────────────────────────────────────────────
cat > "$WORK_DIR/README.md" << 'README_EOF'
# Agency Swarm

Shared Claude Code swarm for Agency apps — skills, agent definitions, helpers, and configuration.

## What's in here

| Path | Purpose |
|------|---------|
| `.claude/skills/` | Reusable skill files loaded by Claude Code agents |
| `.claude/helpers/` | Hook scripts (pre-push build check, etc.) |
| `.claude/settings.template.json` | Copy this to `.claude/settings.json` in your app repo |
| `bootstrap.sh` | One-command setup: adds this repo as a submodule + links skills |
| `CLAUDE.md` | Behavioral rules for all agents |

## Skills

| Skill | What it covers |
|-------|---------------|
| `dark-theme-design` | Color scale, typography, inputs, buttons, pitfalls |
| `tailwind-component-patterns` | Grid layouts, badges, skeletons, inline editing, composition rules |
| `board-ui-patterns` | Monday.com board architecture — groups, rows, add row, toolbar |
| `nextjs-supabase` | Auth, API layer, Supabase schema, Vercel deploy, TypeScript conventions |
| `design-research` | Protocol for researching new design topics and producing skill files |

## Connect to an app repo

```bash
# In your app repo:
curl -s https://raw.githubusercontent.com/jock3/swarm/main/bootstrap.sh | bash
```

Or manually:

```bash
git submodule add https://github.com/jock3/swarm .swarm
bash .swarm/bootstrap.sh
```

## Update skills in all connected repos

```bash
# In any connected repo:
git submodule update --remote .swarm
bash .swarm/bootstrap.sh  # re-links any new skills
```
README_EOF
echo "[swarm]   Wrote: README.md"

# ── 7. Write bootstrap.sh ─────────────────────────────────────────────────────
cat > "$WORK_DIR/bootstrap.sh" << 'BOOTSTRAP_EOF'
#!/usr/bin/env bash
# bootstrap.sh — connect an app repo to the jock3/swarm
#
# Usage (from inside your app repo root):
#   bash bootstrap.sh
#
# Or one-liner from any new repo:
#   curl -s https://raw.githubusercontent.com/jock3/swarm/main/bootstrap.sh | bash

set -euo pipefail

SWARM_REPO="https://github.com/jock3/swarm.git"
SWARM_DIR=".swarm"

echo "[agency-swarm] Setting up swarm connection..."

# ── 1. Add submodule if not already present ──────────────────────────────────
if [ ! -d "$SWARM_DIR/.git" ] && [ ! -f "$SWARM_DIR/.git" ]; then
  if git submodule status "$SWARM_DIR" 2>/dev/null | grep -q '^-'; then
    git submodule update --init "$SWARM_DIR"
  else
    git submodule add "$SWARM_REPO" "$SWARM_DIR"
  fi
  echo "[agency-swarm] Submodule added: $SWARM_DIR"
else
  echo "[agency-swarm] Updating submodule..."
  git submodule update --remote "$SWARM_DIR"
fi

# ── 2. Link skills into .claude/skills ───────────────────────────────────────
mkdir -p .claude/skills

for skill_dir in "$SWARM_DIR/.claude/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  target=".claude/skills/$skill_name"
  if [ ! -e "$target" ]; then
    # Use relative symlink so it works after clone
    ln -sf "../../$SWARM_DIR/.claude/skills/$skill_name" "$target"
    echo "[agency-swarm]   Linked skill: $skill_name"
  else
    echo "[agency-swarm]   Skill already exists (skipped): $skill_name"
  fi
done

# ── 3. Copy helpers ───────────────────────────────────────────────────────────
mkdir -p .claude/helpers

for helper in "$SWARM_DIR/.claude/helpers"/*; do
  name=$(basename "$helper")
  dest=".claude/helpers/$name"
  if [ ! -e "$dest" ]; then
    cp "$helper" "$dest"
    chmod +x "$dest" 2>/dev/null || true
    echo "[agency-swarm]   Copied helper: $name"
  fi
done

# ── 4. Create settings.json from template if none exists ─────────────────────
if [ ! -f ".claude/settings.json" ]; then
  cp "$SWARM_DIR/.claude/settings.template.json" ".claude/settings.json"
  echo "[agency-swarm]   Created .claude/settings.json from template"
else
  echo "[agency-swarm]   .claude/settings.json already exists (skipped)"
fi

# ── 5. Copy CLAUDE.md if none exists ─────────────────────────────────────────
if [ ! -f "CLAUDE.md" ]; then
  cp "$SWARM_DIR/CLAUDE.md" "CLAUDE.md"
  echo "[agency-swarm]   Created CLAUDE.md from swarm"
else
  echo "[agency-swarm]   CLAUDE.md already exists (skipped)"
fi

echo ""
echo "[agency-swarm] Done! Stage the changes:"
echo "  git add .gitmodules $SWARM_DIR .claude CLAUDE.md"
echo "  git commit -m 'feat: connect to agency-swarm'"
BOOTSTRAP_EOF
chmod +x "$WORK_DIR/bootstrap.sh"
echo "[swarm]   Wrote: bootstrap.sh"

# ── 8. Initialize git repo ────────────────────────────────────────────────────
echo ""
echo "[swarm] Initializing git repo..."
cd "$WORK_DIR"
git init -b main
git config user.email "agent@agency" 2>/dev/null || true
git config user.name "Agency Agent" 2>/dev/null || true
git add .
git commit -m "feat: initial agency swarm — skills, helpers, bootstrap"

# ── 9. Create GitHub repo (if gh CLI available) ───────────────────────────────
echo ""
if command -v gh &>/dev/null; then
  echo "[swarm] Creating jock3/swarm on GitHub via gh CLI..."
  gh repo create jock3/swarm --public --description "Shared Claude Code swarm for Agency apps" 2>/dev/null \
    || echo "[swarm] Repo may already exist — continuing with push..."
else
  echo "[swarm] gh CLI not found."
  echo "[swarm] Create the repo manually at: https://github.com/new"
  echo "[swarm]   Name: swarm  |  Owner: jock3  |  Public  |  No README"
  echo ""
  read -r -p "Press Enter once the repo is created..."
fi

# ── 10. Push ──────────────────────────────────────────────────────────────────
echo ""
echo "[swarm] Pushing to $SWARM_REMOTE ..."
git remote add origin "$SWARM_REMOTE"
git push -u origin main

echo ""
echo "[swarm] Done! jock3/swarm is live."
echo ""
echo "Next: connect this Agency repo to the swarm:"
echo "  cd $(git -C "$AGENCY_ROOT" rev-parse --show-toplevel)"
echo "  git submodule add https://github.com/jock3/swarm .swarm"
echo "  bash .swarm/bootstrap.sh"
echo "  git add .gitmodules .swarm .claude CLAUDE.md"
echo "  git commit -m 'feat: connect to agency-swarm'"
echo "  git push"
