---
description: Completes a plan by creating a pull request with a description generated from the plan file.
---

# /finish

You are finishing a plan and submitting a pull request.

You are FINISHING, not building.

- Do NOT modify any code files.
- You MAY update the plan file to add a final progress log entry.

## User Provided Arguments

$ARGUMENTS

If the plan file path is missing, stop and ask the user for the plan path.

## Pre-Flight Check

1. Open the plan file.
2. Check the `## TODO` section for any unchecked items (`- [ ] ...`).

**If unchecked TODOs exist:**

Stop and ask the user:
> "Not all TODOs are checked. Are you sure you want to finish this plan?"

Only proceed if the user confirms. If they don't confirm, stop.

**If all TODOs are checked:**

Proceed to create the PR.

## Create the Pull Request

1. Generate a PR title from `## Title` in the plan (or summarize the objective).
2. Generate a PR description using the plan:
   - Include the **Objective**
   - Include **Success Criteria** (as a checklist)
   - Summarize what was done (from `## Progress Log`)
   - Note any **Assumptions** or **Constraints** that reviewers should know
3. Run `gh pr create` with the generated title and description.
4. Add a final entry to `## Progress Log` noting the PR was created (include the PR URL if available).

## PR Description Template

```md
## Summary

{Brief summary from Plan Summary or Objective}

## Changes

{Bulleted list summarizing the commits/TODOs completed}

## Success Criteria

- [ ] {criterion 1}
- [ ] {criterion 2}
...

## Notes for Reviewers

{Any assumptions, constraints, or context reviewers should know}
```

## Stop Condition

After creating the PR and updating the plan, reply with the PR URL and stop.
