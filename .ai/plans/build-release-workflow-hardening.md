# Plan: Build & Release Workflow — Doc Drift Fixes + Reliability Hardening

**Date**: 2026-07-05
**Branch**: `claude/nordvpnplex-onboarding-a1n6pb` (owner confirmed — stay on this branch, no rename)
**Status**: In progress — Autonomous execution per `.ai/workflows/implementation.md`. Pre-run commit: `abaef726ce2f67b91f071d2a5d0b82370027b7cd`.

## Execution Progress

| Phase | Description | Commit prefix | Status |
|-------|-------------|---------------|--------|
| A | Fix `CLAUDE.md` conflict markers + add guard to `bump.sh` | `fix:` | Done |
| B | Fix stale header comment in `check-nordvpn-release.yml` | `docs:` | Done |
| C | Correct cadence/smoke-test-count in `docs/build-and-publish.md` | `docs:` | Done |
| D | Add Check Base Image workflow docs to `docs/user-guide.md` | `docs:` | Done |
| E | Auto-append Changelog entries in `bump.sh` + backfill `README.md` | `feat:` | Done |
| F | Add `verify-live` checklist item to draft PR bodies | `feat:` | Pending |
| G | Guard against concurrent bump-PR races | `feat:` | Pending |

> **Environment note**: this sandbox has no `task` CLI and no live Docker build available, so the `definition-of-done.md` gates (`task docker-build`, `task verify`) cannot be executed literally here. No phase in this plan touches `Dockerfile` or `rootfs/`, so the production build/runtime gates are not implicated. Substitute validation used per phase: `bash -n` for shell scripts, `python3 -c "import yaml; yaml.safe_load(...)"` for GitHub Actions YAML, and manual proofreading/`grep` cross-checks for doc accuracy. The owner should still run `task docker-build && task verify` locally before merging as a final confirmation.

---

## Background

Owner asked for a review of `docs/user-guide.md` and `docs/build-and-publish.md` and an honest assessment of the build/release workflow. The review cross-checked both docs against each other and against the actual source of truth (`.github/workflows/*.yml`, `scripts/*.sh`, `Taskfile.yml`, git history) rather than trusting the docs at face value, per `AGENTS.md`'s "source is runtime truth" rule.

Verdict: the pipeline's *design* (human gates, dev/prod tag separation, layered testing, GitHub-native notifications, digest-pinned base image with a refresh cadence) is solid — better than most personal-project CI. The weaknesses found are documentation/comment drift that has compounded on itself, plus a couple of unenforced gates and a race condition between two automations. One of the findings (the `CLAUDE.md` conflict markers) is an active, currently-broken file, not just stale prose.

---

## Findings

### Finding 1 — `CLAUDE.md` has unresolved git conflict markers committed to `main`, and automation has been silently editing inside them (highest priority)

`CLAUDE.md` currently contains literal `<<<<<<< HEAD` / `=======` / `>>>>>>> 5c8b10361c...` markers (lines 21–38), introduced at merge commit `5c8b103` (2026-07-01, "Merge pull request #5 ... refresh base image") and never resolved. Both sides of the conflict carry real content that should be kept:
- HEAD side: "First write action: create a task branch — `type/name` — before any file edits."
- Incoming side: the "Full onboarding workflow" pointer, the `## Constraints` list, and the `## Current Pinned Version` block.

`scripts/bump.sh` does a blind `sed` for the `NordVPN: ... | Image tag: ... | Built: ...` line in `CLAUDE.md`. That line is still findable inside the leftover conflict block, so the automated 5.1.0 → 5.2.0 bump (`4507832`, merged today via PR #8) successfully rewrote a version string sandwiched inside a broken merge — silently perpetuating the defect through a second release cycle instead of surfacing it. This is not cosmetic: it fed contradictory "first write action" instructions into this very session's onboarding.

### Finding 2 — The workflow's own source comment is stale, not just the docs

`.github/workflows/check-nordvpn-release.yml` lines 3–5:
```
# Runs weekly to detect new NordVPN versions in the official package repo.
# ...
# The owner reviews, confirms IMAGE_VERSION, merges, then builds and tags manually.
```
The actual cron is `0 8 * * *` (**daily**), and merging the PR **auto-triggers** `publish.yml` via its `paths: Dockerfile` push filter — there is no manual build/tag step. This comment describes an earlier design that no longer matches the code beneath it.

### Finding 3 — `docs/build-and-publish.md` is stale and internally inconsistent

- Calls the daily checker a **"Weekly version check"** and says "without waiting for Monday" (§4.1, §6) — wrong; confirmed daily via the workflow's cron.
- States **"3 smoke tests"** in the architecture diagram (§1), the workflow-at-a-glance diagram (§3), the dev CI path (§3.5), and the step-by-step release walkthrough (§5 step 4) — but `scripts/verify.sh` and the `Taskfile.yml verify` task both confirm **4 checks** (the 4th, a runtime nordvpnd-socket check, was added later). §4.3 and §4.4 of the *same file* correctly describe all 4 checks, confirming this is incremental drift rather than a deliberate simplification.
- `docs/user-guide.md` is more current and correct on both counts (says "Daily 08:00 UTC" and "4 credentialless checks"), but its own §4 GitHub Actions quick-reference table lists only 4 workflows — **the monthly "Check Base Image" workflow is missing from the table and has no dedicated subsection**, unlike the other four. It only gets a passing mention under §5 "Rebuilding / Refreshing the Base Image."

### Finding 4 — `README.md`'s `## Changelog` (a hard `CLAUDE.md` constraint) has gone stale

Last entry is dated 2026-06-27. At least three releases/re-primes have landed since (base image → 5.5.2, template re-prime v3.7.7, NordVPN 5.2.0 / image 5.5.3), none logged. `scripts/bump.sh` never touches the Changelog section, and neither automated workflow writes to it — it is a purely manual step that both the human and automated paths have skipped every time since 2026-06-27. This will keep drifting indefinitely under the current design.

### Finding 5 — The `verify-live` real-egress gate is unenforced on the *recommended* release path

Per `docs/user-guide.md` §5 Path A (labeled "Recommended"), the owner is asked to informally "pull and test the dev image" before merging the draft PR. Nothing requires `task verify-live` (the real-token Spain-egress test both docs call "mandatory") to actually run before merge on this path — it's only wired as a hard prerequisite in the manual CLI fallback (Path B, `task docker-build && task verify && task verify-live && task release`). The one gate the docs describe as "mandatory" has no enforcement mechanism on the path most releases will actually take.

### Finding 6 — Two automations can race on the same bump-touched files

Both `check-nordvpn-release.yml` (daily) and `check-base-image.yml` (monthly) call `scripts/bump.sh` against `Dockerfile`, `README.md`, and `CLAUDE.md`, each opening its own `auto/*` draft PR. Neither workflow checks whether an `auto/*` bump PR is already open before running. If both land in the same window (plausible once a month, when the base-image cron and a NordVPN release happen to coincide), whichever merges second will either conflict or silently overwrite the first PR's version fields, since both scripts write to the same lines using the values pinned in `Dockerfile` *at workflow-run time*.

### Finding 7 (minor, informational) — `publish.yml`'s bump-detection heuristic assumes single-commit merges

`publish.yml`'s push-to-`main` path detects a version bump via `git diff HEAD~1 HEAD -- Dockerfile`. This is correct as long as the only way to land on `main` is a single merge/squash commit per PR (true today). It's an undocumented assumption, not a live bug — flagged so it doesn't silently break if the branch/merge strategy ever changes. No action proposed beyond a code comment; listed here for completeness, not a phase.

---

## Proposed Changes

### Phase A — Fix the broken `CLAUDE.md` (do first, blocks nothing else, highest value) — **APPROVED**

**File**: `CLAUDE.md`

Resolve the conflict by hand, keeping content from both sides:
- Keep "First write action: create a task branch..." as part of the Session Start Protocol section.
- Keep the `## Constraints` list and `## Current Pinned Version` block from the incoming side.
- Remove all three marker lines (`<<<<<<<`, `=======`, `>>>>>>>`).

Add a guard to `scripts/bump.sh` so this class of bug can't recur silently:
```bash
# Before editing anything — refuse to touch a file with leftover conflict markers
for f in Dockerfile README.md CLAUDE.md; do
  if grep -qE '^(<{7}|={7}|>{7})' "$f"; then
    echo "ERROR: $f has unresolved merge conflict markers — refusing to edit." >&2
    exit 1
  fi
done
```

### Phase B — Fix the stale source comment in `check-nordvpn-release.yml`

**File**: `.github/workflows/check-nordvpn-release.yml` (lines 3–5)

Replace with accurate text, e.g.:
```
# Runs daily to detect new NordVPN versions in the official package repo.
# If a newer version is found, builds+verifies a dev image, then opens a draft PR
# with the bump already applied. Merging the PR auto-triggers publish.yml (production
# build, smoke tests, and Docker Hub push) via its Dockerfile path filter.
```

### Phase C — Correct `docs/build-and-publish.md`

**File**: `docs/build-and-publish.md`

- §4.1 heading and body: "Weekly version check" → "Daily version check"; "Every Monday at 08:00 UTC" → "Every day at 08:00 UTC"; drop the "without waiting for Monday" phrasing in §6.
- §1 architecture diagram, §3 diagram, §3.5 CI path, §5 step 4: "3 smoke tests" / "3 stateless smoke tests" → "4 smoke tests", matching the accurate wording already used in §4.3/§4.4 (add the nordvpnd socket check to the enumerated list in §3.5).

### Phase D — Give the Check Base Image workflow first-class treatment in `docs/user-guide.md`

**File**: `docs/user-guide.md`

- Add a row to the §4 "Quick reference" workflows table: `Check Base Image | Monthly cron (1st, 09:00 UTC) | Yes — Actions UI | Yes (:dev tags via publish-dev)`.
- Add a `### Check Base Image` subsection under §4, mirroring the structure of the other four workflow subsections (File / Trigger / What it does / To trigger manually / Secrets needed), sourced from `check-base-image.yml` and the existing (accurate) content in `docs/build-and-publish.md` §4.5.

### Phase E — Changelog: auto-append on bump — **APPROVED (auto-append chosen)**

**File**: `README.md`, `scripts/bump.sh`

Extend `scripts/bump.sh` to append a one-line placeholder Changelog entry (date + "NordVPN X → Y" or "Base image refresh — IMAGE_VERSION X → Y") under `README.md`'s `## Changelog` (newest first) every time it runs, so the entry can no longer be silently skipped — the human/agent still fleshes out the detail before merging the bump PR, but the line itself always exists. Backfill the missing entries as part of this phase.

**Deviation from the plan text (flagged, not silent)**: backfilled only the 2 entries that changed the shipped image (base image → 5.5.2; NordVPN 5.2.0 / image 5.5.3) — the "template re-prime v3.7.7" event was workspace/`.ai`-only with zero Dockerfile/rootfs/runtime impact (confirmed via its own session-close notes: "Validation: N/A — workspace-only change"). README's Changelog is user-facing and its two existing entries are both image/build-relevant, so a pure agent-tooling re-prime doesn't belong there — it's already correctly recorded in `.ai/SESSION_NOTES.md`. Happy to add it if the owner disagrees.

### Phase F — Strengthen the `verify-live` gate on the recommended path — **APPROVED (visible checklist item only)**

**Files**: `.github/workflows/check-nordvpn-release.yml`, `.github/workflows/check-base-image.yml`, draft PR body templates

Add an explicit unchecked checklist item to both workflows' draft PR body — "- [ ] Ran `task verify-live TOKEN_FILE=...` against the dev image and confirmed Spain egress" — so it's a visible, individually-checkable gate rather than folded into vague "test the dev image" prose. Owner confirmed this lightweight visibility bump is sufficient for now; branch-protection / required-check enforcement is explicitly out of scope for this pass (GitHub can't block merge on an unchecked markdown checkbox without that separate, larger effort — noted as a known limitation, not solved here).

### Phase G — Prevent concurrent bump-PR races

**Files**: `.github/workflows/check-nordvpn-release.yml`, `.github/workflows/check-base-image.yml`

Add a step early in each workflow's `create-pr` job that checks for existing open PRs from `auto/*` branches (via `gh pr list --head auto/... --state open` or a broader `auto/` prefix search) and skips PR creation (with a clear log message) if one is already open, rather than proceeding and risking a second bump PR that conflicts with the first.

---

## Scope Boundaries

### In scope
- `CLAUDE.md` conflict resolution + `bump.sh` guard (Phase A)
- Stale workflow comment fix (Phase B)
- `docs/build-and-publish.md` cadence/smoke-test-count corrections (Phase C)
- `docs/user-guide.md` Check Base Image workflow documentation (Phase D)
- Changelog mechanism + backfill (Phase E)
- `verify-live` gate visibility improvement (Phase F)
- Concurrent-bump-PR guard (Phase G)

### Out of scope
- Rewriting `verify.sh` or `publish.yml`'s bump-detection heuristic (Finding 7) — no live bug, just noted for awareness.
- Any change to `Taskfile.yml` beyond what's already pre-approved (none needed for this plan).
- Bumping the base image or NordVPN version themselves.
- Re-litigating the archetype-section cleanup in `definition-of-done.md` / `engineering-rules.md` — separate, already-tracked fragile area.

---

## Validation

- Phase A: `grep -RE '^(<{7}|={7}|>{7})' CLAUDE.md README.md Dockerfile` returns nothing; re-run `bash scripts/bump.sh <current> <current>`-style dry check (or a throwaway version) to confirm the new guard fires correctly against an intentionally-broken test file, then confirm it's silent against clean files.
- Phase B/C/D: doc-only changes — proofread against the actual `.yml` cron lines and `verify.sh` check count; no build required.
- Phase E: confirm `README.md` Changelog has entries for all releases since 2026-06-27 in newest-first order.
- Phase F/G: workflow YAML changes — validate with `actionlint` if available, otherwise careful manual review; these can't be fully exercised without waiting for the next real cron fire or a manual `workflow_dispatch` test run.
- No changes to `Dockerfile`, `rootfs/`, or runtime behavior in any phase — `task docker-build` / `task verify` are not expected to be affected, but worth a confirmation run since Phase A touches `CLAUDE.md` referenced by tooling.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Resolving the `CLAUDE.md` conflict by hand could drop content neither side "wins" | Read both sides fully before editing (already done in Finding 1); keep everything, don't pick a side. |
| `bump.sh` guard could false-positive on legitimate `---` YAML frontmatter or similar | Anchor the regex to the exact 7-char conflict marker prefixes at line start; scoped to the 3 files `bump.sh` already edits. |
| Phase G's "skip if PR already open" check could mask a genuinely-needed second bump if the first PR stalls unmerged for weeks | Log clearly when skipping, and mention the open PR number/link in the log so it surfaces on the next run rather than silently vanishing. |
| Phase F doesn't actually block merge (GitHub limitation) | Documented as a partial mitigation, not a solved problem — owner may want to revisit with branch protection rules as a separate, larger change. |

---

## Files to Change

| File | Action | Phase |
|------|--------|-------|
| `CLAUDE.md` | Resolve conflict markers, keep both sides' content | A |
| `scripts/bump.sh` | Add conflict-marker guard before editing | A |
| `.github/workflows/check-nordvpn-release.yml` | Fix stale header comment (Finding 2); add open-PR guard (Phase G) | B, G |
| `docs/build-and-publish.md` | Fix cadence wording + smoke-test count in 4 locations | C |
| `docs/user-guide.md` | Add Check Base Image row + subsection to §4 | D |
| `README.md` | Backfill missing Changelog entries | E |
| `scripts/bump.sh` | Auto-append a Changelog placeholder line on every bump | E |
| `.github/workflows/check-base-image.yml` | Add open-PR guard (Phase G) | G |
| PR body templates in both `create-pr` jobs | Add explicit `verify-live` checklist item | F |

---

## Owner Decisions — RESOLVED (2026-07-05)

1. **Resolve the `CLAUDE.md` conflict (Phase A)** — **Approved.**
2. **Changelog mechanism (Phase E)** — **Auto-append** a placeholder line via `bump.sh` on every bump.
3. **`verify-live` gate strength (Phase F)** — **Visible checklist item** in the draft PR body only (no branch-protection/required-check work in this pass).
4. **Scope for this pass** — **All phases A–G.**
5. **Branch** — **Stay on** `claude/nordvpnplex-onboarding-a1n6pb`; no rename.

All decisions are locked in above. Implementation has **not** started — awaiting explicit go-ahead to begin Phase A.
