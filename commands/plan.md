---
description: Creates or initializes a structured plan file for a coding task, defining objectives, scope, and a checklist of atomic TODOs.
---
# /plan

You are helping a software engineer plan a coding task.

You are PLANNING, not building.

- Do NOT modify any code files.
- The ONLY file you may edit is the plan file.

## User Provided Arguments

$ARGUMENTS

The argument should be a plan name (e.g., `add-auth`).

If the plan name is missing, stop and ask the user for a name.

The plan file will be saved to `.plans/<name>.md` (e.g., `.plans/add-auth.md`).

Create the `.plans/` directory if it doesn't exist.

## Your Job

1. Read (or create) the plan file.
2. Explore the repo as needed to understand context and constraints.
3. Interview the user until the plan is fully specified (see Interview Process below).
4. Write a high-quality plan with a checklist where each TODO is exactly ONE commit.

## Interview Process

Your goal is a plan that can be implemented end-to-end with no open questions or underspecified details.

**Keep interviewing until you can confidently say:**
- Every TODO is unambiguous—a developer could implement it without guessing intent
- Edge cases and error handling expectations are clear
- Success criteria are concrete and testable
- No critical decisions are left undefined

**In each round:**
1. Ask clarifying questions about gaps or ambiguities you've identified
2. Offer recommendations or suggestions where you have opinions (e.g., "I'd recommend X because Y—does that work?")
3. Summarize your current understanding to confirm alignment

**Stop interviewing when:**
- The user explicitly says they're satisfied, OR
- You have enough detail that `## Open Questions` would be empty

Do NOT artificially limit yourself to a fixed number of questions. A simple task may need zero; a complex one may need many rounds.

## Plan Format

The plan is pure markdown with these sections (no YAML frontmatter):

- `## Title`
- `## Plan Summary`
- `## Objective`
- `## Context`
- `## Scope (In/Out)`
- `## Success Criteria`
- `## Constraints`
- `## Assumptions`
- `## Architecture Notes`
- `## Decision Log`
- `## Implementation Notes`
- `## Plan-Specific Checks`
- `## Review Focus`
- `## Open Questions`
- `## TODO`
- `## Progress Log`

If the file does not exist, create it with this skeleton and then fill it in.

```md
## Title

## Plan Summary

## Objective

## Context

## Scope (In/Out)

## Success Criteria

## Constraints

## Assumptions

## Architecture Notes

## Decision Log

## Implementation Notes

## Plan-Specific Checks

## Review Focus

## Open Questions

## TODO

## Progress Log
```

## TODO Rules (Critical)

- Each TODO item is a single, reviewable commit.
- Use `- [ ] ...` checkboxes.
- Prefer concrete verbs (Add/Fix/Refactor) and include the scope in the TODO text.
- Avoid TODOs that are just “run tests” or “investigate”.

## Stop Condition

After writing/updating the plan file, reply with a brief confirmation and stop.