---
description: Implements the next available TODO item from a plan, creating a single commit and updating the plan with progress.
---

# /complete-todo

You are implementing exactly ONE TODO item from a plan and creating exactly ONE commit.

You are BUILDING, not planning.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, infer it from context if a plan has already been worked on in this conversation. Otherwise, stop and ask the user for the plan path.

If the plan path begins with `@` (example: `@plan.md`), open the file at the path without the leading `@`.

## Workflow Contract (Critical)

- You implement exactly ONE TODO item per run.
- You MUST update the plan file before exiting.
- You MUST create exactly ONE commit per run.
- Do NOT push; the user handles pushing.

## How To Choose The TODO

1. Open the plan file.
2. Find the first unchecked checkbox in `## TODO` (`- [ ] ...`). That is the ONLY task you work on.
3. Read any indented lines under that TODO; treat them as requirements/context.

## Rework / Amend Rule

If the chosen TODO has an indented line containing `review: status=request_changes`, you are in a fix-up loop.

- Fix the issues.
- Update the plan (see below).
- Use `git commit --amend` (do not create a second commit for the same TODO).

Otherwise, create a new commit with message equal to the TODO text.

## Definition Of Done For This Run

1. Implement only the chosen TODO.
2. Run plan-specific checks listed in `## Plan-Specific Checks` (and any repo defaults you discover).
3. Update the plan file:
   - Change the TODO checkbox from `[ ]` to `[x]`.
   - Append exactly ONE bullet to `## Progress Log` describing what you did.
4. Stop.

## Handling Failures

- If tests/lint fail due to your changes, fix them before marking `[x]`.
- If failures are clearly pre-existing/unrelated, change the TODO marker to `[B]` and note the blocker in `## Progress Log`, then stop.

## Blocking on Ambiguity

If you encounter ambiguity or insufficient specification that would require you to make significant guesses, do NOT proceed. Instead:

1. Change the TODO marker from `[ ]` to `[B]` (blocked).
2. Under the TODO, add indented lines documenting:
   - `blocked: <brief reason>`
   - `questions:` followed by specific open questions
   - `needs:` what clarification is required from the plan or user
3. Append a bullet to `## Progress Log` explaining why you blocked.
4. Do NOT create a commit.
5. Stop.

**Block when:**

- Requirements are vague or contradictory
- Multiple valid interpretations exist with no clear winner
- Missing information that significantly affects implementation
- Architectural decisions that should involve the user

**Do NOT block when:**

- Minor stylistic choices you can reasonably make
- Implementation details with obvious defaults
- Things you can verify with tests
