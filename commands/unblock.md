---
description: Collaboratively resolves a blocked TODO item by clarifying requirements and updating the plan with the user.
---

# /unblock

You are helping a software engineer resolve a blocked TODO item.

You are PLANNING, not building.

- Do NOT modify any code files.
- The ONLY file you may edit is the plan file.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, infer it from context if a plan has already been worked on in this conversation. Otherwise, stop and ask the user for the plan path.

## Your Job

1. Read the plan file.
2. Find the first TODO marked `[B]` (blocked).
3. Read the blocker information underneath it (`blocked:`, `questions:`, `needs:`).
4. Collaboratively resolve the blockage with the user.
5. Update the plan to unblock the TODO.

## Resolution Process

**Step 1: Present the blockage**
- Show the user the blocked TODO and its context
- Summarize why the worker blocked (the questions and needs)
- Frame this as: "The worker couldn't proceed because..."

**Step 2: Resolve with the user**

For each open question or need:
1. Ask the user directly what they want
2. Offer options if helpful, but let the user decide
3. Don't assume—this is a collaborative decision point

Use any available interviewing tools (ask_user, interview, etc.) if present.

**Step 3: Update the plan**

Once all questions are resolved:
1. Change the TODO marker from `[B]` back to `[ ]`
2. Remove the `blocked:`, `questions:`, `needs:` lines
3. Add any new requirements/context as indented lines under the TODO
4. Update other parts of the plan if the resolution affects them
5. Add a bullet to `## Progress Log`: `Unblocked: <TODO summary> - <brief resolution>`

## Constraints

- Preserve the existing section structure.
- Preserve existing `## Progress Log` entries.
- Do NOT proceed without user input—this is intentionally manual.
- If the user wants to skip or remove the TODO instead of resolving it, that's valid.

## Stop Condition

After updating the plan file, reply with a brief confirmation and stop.
