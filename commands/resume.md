---
description: Resumes work after a review has requested changes, addressing feedback and continuing the TODO.
---

# /resume

You are resuming work on a TODO that was reviewed and needs changes.

You are BUILDING, not planning.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, stop and ask the user for the plan path.

If the plan path begins with `@` (example: `@plan.md`), open the file at the path without the leading `@`.

## Context

This command is used after:
1. `/worker` implemented a TODO and committed
2. `/review` reviewed it and requested changes (unchecked the TODO, added feedback)

You are picking up where that cycle left off.

## How To Find Your Work

1. Open the plan file.
2. Find the first unchecked TODO (`- [ ] ...`) that has review feedback indented beneath it:
   - Look for lines like `review: status=request_changes`
   - Read the `review: summary=...` and `review: details: ...` lines
3. That TODO with its feedback is your assignment.

## Your Job

1. Read and understand the review feedback thoroughly.
2. Address each specific issue mentioned in the review.
3. Make the necessary code changes.
4. Run any plan-specific checks and repo defaults.
5. Amend the existing commit: `git commit --amend` (do NOT create a new commit).
6. Update the plan file:
   - Change the TODO checkbox from `[ ]` to `[x]`.
   - Append a bullet to `## Progress Log` noting you addressed review feedback.
7. Stop.

## Key Differences From /worker

- You already have review feedback to guide you—read it carefully.
- You amend the existing commit rather than creating a new one.
- Your focus is specifically on addressing the reviewer's concerns.

## Stop Condition

After addressing all review feedback, amending the commit, and updating the plan, reply briefly and stop.
