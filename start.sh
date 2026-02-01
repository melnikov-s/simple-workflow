#!/usr/bin/env bash
set -euo pipefail

# Start working on a plan by creating a worktree and branch
#
# Usage: ./start .plans/add-auth.md
#
# This will:
#   1. Create a branch named after the plan (e.g., add-auth)
#   2. Create a worktree as a sibling directory (e.g., ../myproject--add-auth)
#   3. Move the plan file into the worktree as plan.md

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <plan-file>"
    echo "Example: $0 .plans/add-auth.md"
    exit 1
fi

PLAN_FILE="$1"

if [[ ! -f "$PLAN_FILE" ]]; then
    echo "Error: Plan file not found: $PLAN_FILE"
    exit 1
fi

# Extract name from filename (remove path and .md extension)
PLAN_NAME="$(basename "$PLAN_FILE" .md)"

# Get repo name from current directory
REPO_NAME="$(basename "$(pwd)")"

# Worktree path as sibling
WORKTREE_PATH="../${REPO_NAME}--${PLAN_NAME}"

# Branch name same as plan name
BRANCH_NAME="$PLAN_NAME"

echo "Creating worktree for plan: $PLAN_NAME"
echo "  Branch: $BRANCH_NAME"
echo "  Worktree: $WORKTREE_PATH"
echo ""

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "Branch '$BRANCH_NAME' already exists, using it..."
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
    echo "Creating new branch '$BRANCH_NAME'..."
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
fi

# Move plan file into worktree as plan.md
mv "$PLAN_FILE" "$WORKTREE_PATH/plan.md"

echo ""
echo "✓ Worktree created at: $WORKTREE_PATH"
echo "✓ Plan moved to: $WORKTREE_PATH/plan.md"
echo ""
echo "To start working:"
echo "  cd $WORKTREE_PATH"
