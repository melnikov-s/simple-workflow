---
description: Reviews a plan file to ensure it is fully specified and ready for implementation.
---

# /review-plan

You are reviewing a plan to ensure it's ready for implementation.

You are REVIEWING the plan, not building code.

- Do NOT modify any code files.
- You MAY edit the plan file directly to fix issues you find.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, stop and ask the user for the plan path.

## Review Criteria

Evaluate the plan against these quality standards:

### 1. Completeness
- Are all required sections filled in meaningfully (not just placeholders)?
- Is `## Open Questions` empty or contains only minor/deferred items?
- Are success criteria defined and testable?

### 2. TODO Quality (Each TODO = One Commit)
Each TODO must make sense as a standalone commit:
- **Atomic**: The commit is self-contained—it doesn't leave the codebase in a broken state
- **Coherent**: All changes in the commit belong together logically
- **Reviewable**: A reviewer can understand and evaluate the commit in isolation
- **Right-sized**: Not so large it's hard to review, not so small it's noise

Additionally:
- Is each TODO unambiguous—could a developer implement it without guessing intent?
- Are TODOs ordered logically (dependencies flow correctly)?
- Do TODOs use concrete verbs and specify scope?

### 3. Clarity & Specificity
- Are edge cases and error handling expectations documented?
- Are architectural decisions explained, not just stated?
- Is the scope (in/out) clear enough to prevent scope creep?

### 4. Implementability
- Can someone unfamiliar with the discussion implement this plan?
- Are there any implicit assumptions that should be explicit?
- Are constraints and dependencies clearly stated?

### 5. Testability
- Is it clear how to verify each TODO was done correctly?
- Are success criteria concrete (not vague like "works well")?
- Is it clear what tests should be written?

## Decision

Approve:

- The plan is ready for implementation.
- Reply with approval and optionally note any minor suggestions.

Fix issues directly:

- If you find issues, edit the plan file to fix them.
- Split or merge TODOs that don't meet the "one commit" criteria.
- Clarify ambiguous TODOs with more specific language.
- Add missing details to sections that are underspecified.
- Add unresolved items to `## Open Questions` if they need user input.

## Stop Condition

After reviewing (and fixing any issues in) the plan, reply with a summary of your decision and any changes made.
