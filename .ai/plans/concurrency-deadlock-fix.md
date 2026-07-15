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

3. **Configuration pattern causing the collision**  
   All three workflows (`check-base-image.yml`, `check-nordvpn-release.yml`, `publish-dev.yml`) declare the same concurrency group formula:
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```
   When `check-base-image.yml` calls `publish-dev.yml` as a reusable workflow (lines 62-70), `github.workflow` inside the callee evaluates to the **caller's** workflow name ("Check Base Image"), not the callee's own "Publish Dev to Docker Hub". This is documented GitHub behavior for the `workflow_call` context. The result: both the caller and callee land in the same concurrency group `Check Base Image-refs/heads/main`, so the callee's job is blocked by the caller's run holding that group → GitHub detects a workflow waiting on its own group → deadlock → cancellation.
   - `check-nordvpn-release.yml` has the identical pattern and also calls `publish-dev.yml` (lines 59-66) — same latent deadlock. It has not tripped yet only because the daily cron usually finds no NordVPN update and short-circuits at the `check-version` job before the `publish-dev` job runs.

4. **Affected workflows**  
   - `.github/workflows/check-base-image.yml:8-10` — caller (observed deadlock)
   - `.github/workflows/check-nordvpn-release.yml:14-16` — caller (latent deadlock, same pattern)
   - `.github/workflows/publish-dev.yml:41-43` — reusable callee (collides with whichever caller invoked it)

5. **Impact**  
   - Unnecessary workflow cancellations.
   - Delivery friction and nondeterministic CI/CD behavior for `main`.
   - Potential repeated deadlock/cancel loops when workflows trigger each other or run close together.
   - `check-nordvpn-release.yml` will deadlock the first time a NordVPN update is detected on a day when no other run is already in flight — a latent bug that will surface at the worst time (a real release day).

---

## Fix Strategy

### Goal
Ensure each workflow (especially `check-base-image` and `publish-dev`) has a **distinct, stable, and branch-aware** concurrency group.

### Recommended pattern
Use workflow-specific prefixes (or `github.workflow_ref`) so group keys cannot collide.

#### Option A (explicit workflow-specific prefixes) — recommended
```yaml
# check-base-image.yml
concurrency:
  group: check-base-image-${{ github.ref }}
  cancel-in-progress: true
```

```yaml
# check-nordvpn-release.yml
concurrency:
  group: check-nordvpn-release-${{ github.ref }}
  cancel-in-progress: true
```

```yaml
# publish-dev.yml
concurrency:
  group: publish-dev-${{ github.ref }}
  cancel-in-progress: true
```

> The `github.repository` prefix is omitted — this is a single-repo workflow with no fork-based runs, so it would only add noise to the group string shown in the Actions UI.

#### Option B (generic unique-by-workflow reference)
```yaml
concurrency:
  group: ${{ github.workflow_ref }}-${{ github.ref }}
  cancel-in-progress: true
```

> Either option works. Option A is easiest to reason about and audit, and produces the cleanest group strings in the Actions UI.

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
   - **Pre-merge (limited)**: The deadlock only manifests on `refs/heads/main` because the group includes `github.ref`. Testing on a feature branch resolves to `refs/heads/fix/...` — a different group — so it **cannot reproduce the deadlock**. Pre-merge validation is limited to YAML lint / confirming the group strings are now distinct by inspection.
   - **Post-merge (real verification)**: After merge to `main`, trigger each workflow via `workflow_dispatch` on `main` and confirm no deadlock cancellation occurs. The monthly cron (`check-base-image.yml`) and daily cron (`check-nordvpn-release.yml`) will exercise the fix naturally over subsequent cycles — confirm no deadlock cancellations appear in the Actions history over the next few runs.
   - The fix is verified by **absence post-merge**, not by a positive pre-merge test.

5. **Document**
   - Add a one-line comment near each `concurrency:` block noting that group keys must stay unique across caller + reusable workflows, so the pattern is not copy-pasted back into a future workflow.

6. **Session close**
   - Update `.ai/current.md`, `.ai/tasks/active.md`, and `.ai/SESSION_NOTES.md` per the session-close protocol (`.ai/workflows/session-close.md`).
   - Archive this plan to `.ai/plans/archive/` via `git mv`.

---

## Suggested Concrete Edits

### `.github/workflows/check-base-image.yml`
```yaml
concurrency:
  group: check-base-image-${{ github.ref }}
  cancel-in-progress: true
```

### `.github/workflows/check-nordvpn-release.yml`
```yaml
concurrency:
  group: check-nordvpn-release-${{ github.ref }}
  cancel-in-progress: true
```

### `.github/workflows/publish-dev.yml`
```yaml
concurrency:
  group: publish-dev-${{ github.ref }}
  cancel-in-progress: true
```

---

## Acceptance Criteria

- No workflow cancellation due to deadlock for `Check Base Image-refs/heads/main`.
- `check-base-image`, `check-nordvpn-release`, and `publish-dev` can execute independently without concurrency-group collision.
- Re-runs on `main` respect `cancel-in-progress` only within their own workflow group.
- Post-merge: `workflow_dispatch` triggers of all three workflows on `main` complete without deadlock cancellation.
- No `Dockerfile`, `rootfs/**`, or `Taskfile.yml` changes — the `build-validate.yml` IMAGE_VERSION-bump guard does not apply.

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
