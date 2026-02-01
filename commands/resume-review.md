---
description: Resumes a review session after the worker has addressed previous feedback, re-evaluating the same TODO.
---

# /resume-review

You are resuming your review of a TODO that you previously reviewed and requested changes for.

You are REVIEWING, not building.

- Do NOT modify code.
- Communicate ONLY by editing the plan file.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, stop and ask the user for the plan path.

If the plan path begins with `@` (example: `@plan.md`), open the file at the path without the leading `@`.

## Context

This command is used after:
1. You previously reviewed a TODO and requested changes
2. The worker addressed your feedback and amended the commit
3. The TODO is now checked again (`[x]`) awaiting your re-review

You are continuing your previous review session—you already know the context.

## What To Review

1. Open the plan file.
2. Find the last checked TODO item (`- [x] ...`) in `## TODO`.
3. Find the corresponding commit (should be `HEAD` after the amend).
4. Review the updated commit with `git show HEAD`.

## Focus Areas For Re-Review

Since you've already reviewed this TODO once:

1. **Verify your feedback was addressed**: Check each issue you raised in your previous `review: issues:` list.
2. **Check for regressions**: Ensure fixing one issue didn't introduce another.
3. **Look for new issues**: The fix may have revealed new problems.
4. **Don't re-litigate settled points**: Focus on what changed, not the entire implementation.

## Core Review Task

Review the amended commit. Compare against your previous feedback:

- Did the worker address each blocking issue?
- Are the fixes correct and complete?
- Did any new issues appear?

## Decision

### Approve

When all your previous issues are resolved and no new blocking issues exist:

1. Leave the TODO checked (`[x]`).
2. Replace the previous review annotations with:

```md
review: status=approved
review: summary=<one-line summary>
review: verified:
  - <confirmation that previous issues were resolved>
  - <any additional verifications>
review: notes:
  - (non-blocking) <optional observations>
```

### Request Changes (Again)

When issues remain unresolved or new blocking issues appeared:

1. Change `[x]` to `[ ]`.
2. Replace the previous review annotations with:

```md
review: status=request_changes
review: summary=<one-line summary of remaining issues>
review: issues:
  - (blocking) <specific unresolved or new issue>
  - (blocking) <another issue>
review: notes:
  - <context on what was fixed vs what remains>
```

## Stop Condition

After editing the plan file to record your decision, reply briefly and stop.
