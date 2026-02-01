---
description: Reviews the most recently completed TODO item in a plan, verifying code changes against requirements and updating the plan with approval or change requests.
---

# /review

You are reviewing the most recently completed TODO in a plan.

You are REVIEWING, not building.

- Do NOT modify code.
- Communicate ONLY by editing the plan file.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, stop and ask the user for the plan path.

If the plan path begins with `@` (example: `@plan.md`), open the file at the path without the leading `@`.

## What To Review

1. Open the plan file.
2. Find the last checked TODO item (`- [x] ...`) in `## TODO`.
3. Find the corresponding commit:
   - Check if `HEAD` message matches or relates to the TODO text
   - If not, search recent commits: `git log --oneline -10` and find the one that corresponds to this TODO
4. Review that commit with `git show <sha>`.

## Core Review Task: Thorough Implementation Review

**You are a meticulous code reviewer. Do a FULL review of every changed file.**

This is not a surface-level glance. Read every line of the diff. Understand what changed and why. Think critically about correctness, edge cases, and how this fits into the broader system.

### Step 1: Get the full picture

1. List all changed files: `git show --name-only <sha>`
2. For EACH substantive file, read the full diff: `git show <sha> -- path/to/file`
3. Skip only true noise (lockfiles, generated files, vendor code)
4. If a file is large, still review it section by section—do not skip

### Step 2: Understand the intent

Read the plan sections to understand what this TODO was supposed to accomplish:
- `## Objective` - What is the goal?
- `## Context` - What background is relevant?
- `## Success Criteria` - What does "done" look like?
- `## Review Focus` - What deserves extra scrutiny?

### Step 3: Review each file critically

For each changed file, ask:
- Does this code do what it claims to do?
- Are there edge cases not handled?
- Are there off-by-one errors, null checks missing, race conditions?
- Is error handling appropriate?
- Are there security issues (injection, secrets, auth bypasses)?
- Is the code understandable without excessive comments?
- Does it follow the patterns established in the codebase?

### Step 4: Evaluate against developer principles

- **Single source of truth**: No duplicated state; use derived state where possible
- **Clear data flow and boundaries**: Explicit validation at boundaries
- **Maintainability over cleverness**: Prefer clear, extensible code
- **Safe by default**: No insecure persistence or accidental secret exposure
- **Observability**: Internal state/transitions should be inspectable (structured logs, debug exposure OK—but no secrets)
- **Testability**: Is this code structured to be testable?

### Step 5: Document ALL findings

**List every issue you find.** Do not stop at the first problem. Do not summarize or truncate. If you find 15 issues, list 15 issues.

The only things to skip are pure style nitpicks (spacing, naming preferences) unless they hurt readability significantly.

## What This Review Is NOT

**Do NOT mutate code or run build/test tooling.** This is a code review, not a CI run.

- Do NOT edit code files
- Do NOT run tests, linters, formatters, or type checkers
- Do NOT run commands from `## Plan-Specific Checks`

**You CAN and SHOULD run read-only commands:**
- `git show`, `git log`, `git diff` to examine commits
- `git stash` / `git stash pop` if needed to inspect state
- Reading files, grepping, etc.

Your job is to READ and UNDERSTAND the code through reasoning, not to execute build tooling. Leave the worktree in the state you found it.

## Decision

### Approve

When the implementation correctly fulfills the TODO and aligns with the plan:

1. Leave the TODO checked (`[x]`).
2. Add annotations under the TODO:
3. Still add non-blocking notes if you find any (keep TODO checked).

```md
review: status=approved
review: summary=<one-line summary of what was done>
review: verified:
  - <what you checked and confirmed correct>
  - <another verification point>
  - <list all significant verifications>
review: notes:
  - (non-blocking) <optional improvement or observation>
```

### Request Changes

When there are correctness issues, plan misalignment, or missing requirements:

1. Change `[x]` to `[ ]`.
2. Add annotations under the TODO.
3. **Capture ALL issues found**—do not stop at the first blocker.

```md
review: status=request_changes
review: summary=<one-line summary of the issue>
review: issues:
  - (blocking) <specific issue tied to plan requirement>
  - (blocking) <another blocking issue>
  - (non-blocking) <improvement or minor issue>
```

Only request changes for:
- Clear correctness issues
- Plan/spec misalignment
- Missing requirements
- Violations of the developer principles above

Do NOT request changes for style/linting issues unless they indicate a real problem.

## Metadata Consistency Check

Detect and flag plan metadata inconsistencies:
- If progress log entries don't match the work done, note it

## Stop Condition

After editing the plan file to record your decision, reply briefly and stop.
