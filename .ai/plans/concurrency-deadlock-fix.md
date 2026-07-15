# GitHub Actions Concurrency Deadlock: Assessment, Findings, and Fix Plan

## Assessment

A GitHub Actions workflow run in `fredplex/nordvpnplex` was canceled with:

> "Canceling since a deadlock was detected for concurrency group: 'Check Base Image-refs/heads/main' between a top level workflow and 'publish-dev'"

This indicates a **workflow concurrency configuration collision** rather than a build/test/runtime code failure.

The problem occurs when at least two workflows (or a caller workflow plus a reusable workflow) resolve to the **same** `concurrency.group` string on the same ref (`refs/heads/main`), causing cancel/block behavior and eventual deadlock detection.

---

## Findings

1. **Primary cause**  
   Both the top-level workflow and `publish-dev` are using (directly or effectively) the same concurrency group key for `main`.

2. **Observed conflicting group**  
   - `Check Base Image-refs/heads/main`

3. **Likely configuration pattern causing the collision**  
   - Shared group formula across workflows, e.g. `${{ github.workflow }}-${{ github.ref }}` in multiple places where `github.workflow` resolves the same or is propagated similarly through reusable workflow context.
   - Concurrency declared in both caller and called workflow with overlapping group values.

4. **Impact**  
   - Unnecessary workflow cancellations.
   - Delivery friction and nondeterministic CI/CD behavior for `main`.
   - Potential repeated deadlock/cancel loops when workflows trigger each other or run close together.

---

## Fix Strategy

### Goal
Ensure each workflow (especially `check-base-image` and `publish-dev`) has a **distinct, stable, and branch-aware** concurrency group.

### Recommended pattern
Use workflow-specific prefixes (or `github.workflow_ref`) so group keys cannot collide.

#### Option A (explicit workflow-specific prefixes)
```yaml
concurrency:
  group: ${{ github.repository }}-check-base-image-${{ github.ref }}
  cancel-in-progress: true
```

```yaml
concurrency:
  group: ${{ github.repository }}-publish-dev-${{ github.ref }}
  cancel-in-progress: true
```

#### Option B (generic unique-by-workflow reference)
```yaml
concurrency:
  group: ${{ github.repository }}-${{ github.workflow_ref }}-${{ github.ref }}
  cancel-in-progress: true
```

> Either option works. Option A is easiest to reason about and audit.

---

## Implementation Plan

1. **Inspect workflow files**
   - `.github/workflows/check-base-image.yml`
   - `.github/workflows/publish-dev.yml`
   - Any reusable workflow files they call.

2. **Normalize concurrency groups**
   - Replace shared/ambiguous group formulas with unique workflow-specific groups.
   - Ensure caller and callee do not share identical group keys.

3. **Decide concurrency ownership**
   - Preferred: keep concurrency at top-level workflows.
   - If reusable workflows also need concurrency, make their group explicitly different from callers.

4. **Validate behavior**
   - Push change to branch.
   - Trigger both workflows on `main` (or via test branch + `workflow_dispatch`).
   - Confirm no deadlock cancellation occurs and each workflow behaves as intended.

5. **Document**
   - Add short note in workflow comments explaining why group keys must stay unique.

---

## Suggested Concrete Edits

### `.github/workflows/check-base-image.yml`
```yaml
concurrency:
  group: ${{ github.repository }}-check-base-image-${{ github.ref }}
  cancel-in-progress: true
```

### `.github/workflows/publish-dev.yml`
```yaml
concurrency:
  group: ${{ github.repository }}-publish-dev-${{ github.ref }}
  cancel-in-progress: true
```

---

## Acceptance Criteria

- No workflow cancellation due to deadlock for `Check Base Image-refs/heads/main`.
- `check-base-image` and `publish-dev` can execute independently without concurrency-group collision.
- Re-runs on `main` respect `cancel-in-progress` only within their own workflow group.

---

## Rollback Plan

If unintended queue/cancel behavior appears after deployment:
1. Revert the concurrency changes commit.
2. Re-run affected workflows.
3. Re-apply fix with Option B (`github.workflow_ref`) if naming assumptions were incorrect.

---

## Notes

- This is a CI orchestration/configuration issue; application code changes are not required.
- Keep group keys deterministic and human-readable for easier future debugging.
