#!/usr/bin/env bash
# Pre-push build check: runs `npm run build` for any apps/todo or apps/mediaplan
# changes about to be pushed. Blocks the push (exit 2) if the build fails.
#
# Claude Code PreToolUse hook — receives tool call JSON on stdin.
# Exit 0 = allow, exit 2 = block (message printed to stderr shown to Claude).

set -euo pipefail

# Read the Bash command from stdin JSON
COMMAND=$(cat /dev/stdin | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('input',{}).get('command',''))" 2>/dev/null || true)

# Only act on git push commands
if [[ "$COMMAND" != git\ push* ]]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

# Detect which apps have uncommitted or recently staged changes
CHANGED=$(git -C "$PROJECT_DIR" diff --name-only HEAD 2>/dev/null; git -C "$PROJECT_DIR" diff --cached --name-only 2>/dev/null) || true

APPS_TO_BUILD=()

if echo "$CHANGED" | grep -q "^apps/todo/"; then
  APPS_TO_BUILD+=("todo")
fi
if echo "$CHANGED" | grep -q "^apps/mediaplan/"; then
  APPS_TO_BUILD+=("mediaplan")
fi

# If nothing specific changed, check if any app files exist in last commit
if [ ${#APPS_TO_BUILD[@]} -eq 0 ]; then
  LAST_COMMIT=$(git -C "$PROJECT_DIR" diff --name-only HEAD~1 HEAD 2>/dev/null) || true
  if echo "$LAST_COMMIT" | grep -q "^apps/todo/"; then
    APPS_TO_BUILD+=("todo")
  fi
  if echo "$LAST_COMMIT" | grep -q "^apps/mediaplan/"; then
    APPS_TO_BUILD+=("mediaplan")
  fi
fi

if [ ${#APPS_TO_BUILD[@]} -eq 0 ]; then
  exit 0
fi

FAILED=()
for APP in "${APPS_TO_BUILD[@]}"; do
  APP_DIR="$PROJECT_DIR/apps/$APP"
  if [ ! -f "$APP_DIR/package.json" ]; then
    continue
  fi
  echo "[pre-push] Building $APP..." >&2
  if ! (cd "$APP_DIR" && npm run build 2>&1); then
    FAILED+=("$APP")
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "" >&2
  echo "[pre-push] BUILD FAILED for: ${FAILED[*]}" >&2
  echo "[pre-push] Fix the build errors before pushing." >&2
  exit 2
fi

echo "[pre-push] All builds passed." >&2
exit 0
