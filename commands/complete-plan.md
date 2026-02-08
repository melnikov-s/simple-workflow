---
description: Completes an entire plan by iterating through all TODO items, using sub-agents for implementation and review, with a configurable number of review iterations per TODO.
---

# /complete-plan

You are completing an ENTIRE plan end-to-end, orchestrating sub-agents for implementation and review.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, infer it from context if a plan has already been worked on in this conversation. Otherwise, stop and ask the user for the plan path.

If the plan path begins with `@` (example: `@plan.md`), open the file at the path without the leading `@`.

## Step 1: Ask for Review Iterations

Before starting any work, ask the user:

> How many review iterations do you want per TODO item? (e.g., 0 = no review, 1 = implement + review + fix, 2 = implement + review + fix + re-review + fix, etc.)

Wait for the answer before proceeding. Store this as `MAX_REVIEW_ITERATIONS`.

## Step 2: Process Each TODO

Open the plan file and work through every unchecked TODO (`- [ ] ...`) in order, one at a time. For each TODO:

### 2a. Implementation (Sub-Agent)

Launch a sub-agent to implement the TODO. **Pass the sub-agent the full contents of the plan file** (read and include the entire file in the sub-agent prompt) so it has complete context — objective, scope, constraints, architecture notes, implementation notes, and all prior progress.

The sub-agent must follow the complete-todo workflow:

- Implement exactly ONE TODO item.
- Run plan-specific checks listed in `## Plan-Specific Checks` (and any repo defaults).
- Update the plan file: change `[ ]` to `[x]` and append a bullet to `## Progress Log`.
- Create exactly ONE commit with message equal to the TODO text.
- Do NOT push.

**If the sub-agent marks the TODO as `[B]` (blocked):** Stop the entire plan. Report the blocker to the user and do not continue to the next TODO.

### 2b. Review Loop (Sub-Agents)

If `MAX_REVIEW_ITERATIONS > 0`, run up to `MAX_REVIEW_ITERATIONS` review cycles:

**Review sub-agent:** Pass the sub-agent the full contents of the plan file (re-read it first to capture any updates from the implementation sub-agent).
- Review the most recently completed TODO following the review workflow.
- Read the commit diff with `git show`.
- Evaluate against the plan's objective, success criteria, and review focus.
- Record the decision in the plan file under the TODO:
  - `review: status=approved` — move on.
  - `review: status=request_changes` — the TODO is unchecked back to `[ ]` with issues listed.

**If approved:** Stop the review loop for this TODO and move to the next TODO.

**If changes requested:** Launch a new implementation sub-agent to fix the issues. Pass it the full contents of the plan file (re-read it first). This sub-agent must:
- Read the review annotations under the TODO.
- Fix the issues.
- Use `git commit --amend` (not a new commit).
- Re-check the TODO as `[x]` and update `## Progress Log`.

Then launch another review sub-agent (if iterations remain).

**If all review iterations are exhausted without approval:** Mark the TODO with a note in the progress log that max review iterations were reached, leave it checked as `[x]`, and move on to the next TODO.

### 2c. Reload the Plan

After each TODO (and its review loop) completes, re-read the plan file to get the current state before processing the next TODO.

## Handling Failures

- If tests/lint fail due to changes, the implementation sub-agent should fix them before marking `[x]`.
- If failures are clearly pre-existing/unrelated, the sub-agent changes the TODO marker to `[B]` and notes the blocker in `## Progress Log`. **Stop the entire plan** and report to the user.

## Blocking on Ambiguity

If a sub-agent encounters ambiguity:

1. It changes the TODO marker to `[B]` (blocked).
2. It documents the blocker under the TODO with `blocked:`, `questions:`, and `needs:` lines.
3. It appends a bullet to `## Progress Log`.
4. It does NOT create a commit.

**The orchestrator (you) must stop the entire plan when a TODO is blocked.** Report the blocker to the user.

## Workflow Contract (Critical)

- Process ALL unchecked TODOs in order, one at a time.
- Use a NEW sub-agent for each implementation attempt and each review.
- Each implementation creates exactly ONE commit (or amends the existing one on rework).
- Do NOT push; the user handles pushing.
- Stop immediately on any `[B]` blocker.
- Always re-read the plan file between TODOs.

## Stop Condition

When all TODOs are checked `[x]` (or the plan is blocked), reply with a brief summary of what was completed and stop.
