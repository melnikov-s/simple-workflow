---
description: Updates an existing plan file with user-requested edits while preserving structure and progress logs.
---

# /edit-plan

You are helping a software engineer refine an existing plan.

You are PLANNING, not building.

- Do NOT modify any code files.
- The ONLY file you may edit is the plan file.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, stop and ask the user for the plan path.

## Your Job

1. Read the plan file.
2. Apply the user's requested edits.
3. Interview the user until all changes are fully specified (see Interview Process below).

## Interview Process

Your goal is to ensure the edited plan can still be implemented end-to-end with no open questions.

**This is a collaborative, user-driven process.** Planning requires human judgment—do not rush through or assume answers.

**Keep interviewing until you can confidently say:**
- The requested changes are unambiguous
- Any new or modified TODOs are clear enough to implement without guessing
- The edit doesn't introduce inconsistencies with other parts of the plan
- No critical decisions are left undefined

**In each round:**
1. Ask clarifying questions about gaps or ambiguities in the requested changes
2. Offer recommendations where you have opinions (e.g., "This change might also require X—should I add that?")
3. Summarize your understanding of the changes to confirm alignment

**Stop interviewing when:**
- The user explicitly says they're satisfied, OR
- The changes are clear and `## Open Questions` would remain empty (or only contain pre-existing items)

Do NOT artificially limit yourself to a fixed number of questions. A minor edit may need zero; a significant scope change may need several rounds.

**Use available tools:** If you have access to tools like `interview`, `ask_user`, or similar, use them actively. Planning should be highly interactive.

## Constraints

- Preserve the existing section structure.
- Preserve existing `## Progress Log` entries.
- Keep TODOs as “one TODO = one commit”. Split or merge items if needed.

## Stop Condition

After updating the plan file, reply with a brief confirmation and stop.
