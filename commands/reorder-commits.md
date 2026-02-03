---
description: Reorder commits on a branch by architectural layer for easier review
---

# Reorder Commits for Review

Rearranges commits into the order you would build things if starting from scratch.

## Core Concept

When developers build features, they often start from where they notice the need and work backward. This creates commits in _discovery order_.

For reviewers, reorder into _construction order_: the sequence you would follow if building the feature from the ground up, thinking about what needs to exist before the next piece can be built.

Ask: **"If I were building this from scratch, what would I build first? What comes next?"**

Each commit should only touch things that could exist at that point in the build sequence.

## Steps

### 1. List commits

```bash
git log --oneline main..HEAD
```

### 2. Understand the feature

Read through all commits to understand what's being built:

```bash
git show <sha>
```

### 3. Imagine building it from scratch

If you were implementing this feature with no existing code, what order would you build the pieces?

What needs to exist before the next thing can be built?

### 4. Map commits to that sequence

Reorder commits to match the logical construction order.

### 5. Get confirmation

Present the proposed order to the user.

### 6. Execute

```bash
git reset --hard main
```

For each commit in new order:

```bash
git show <sha> --format="" | git apply
git add -A
git commit -m "<original message>"
```

### 7. Verify

```bash
git log --oneline main..HEAD
```
