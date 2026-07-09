# Build & Release Pipeline Review — Gaps, Simplification, Plan

Created: 2026-07-09 | Status: Pending review

## Background — why this is needed

Owner requested a deep review of the Docker build & release workflow — docs, GitHub
Actions, scripts, Taskfile, Dockerfile — looking for gaps, optimization, simplification,
and human-comprehensibility. This is the analysis and proposed remediation plan. No code
is changed in this document; each phase below becomes a commit only after owner approval.

**Repo state note**: The local branch has been fast-forwarded to `main` (commit `5e1e9d6`), which includes the 5.5.4 base image digest bump (PR #9). The branch is now fully reconciled.


---

## Scope

**In scope**: `.github/workflows/*.yml`, `scripts/*.sh`, `Taskfile.yml`, `Dockerfile`,
`docs/build-and-publish.md`, `docs/user-guide.md`, `.ai/current.md`, `.ai/tasks/active.md`.

**Out of scope**: archetype cruft in `definition-of-done.md`/`engineering-rules.md` (known
fragile area, separate owner decision), `.ai/GUIDE.md` inaccuracies, commit-signing
environment issue, `task verify-live` token handling.

---

## Findings

### Finding 1 — BUG (high): base-image dev build tests the *old* base, not the new one

`check-base-image.yml` calls `publish-dev` **before** the digest is bumped in `Dockerfile`.
`publish-dev` only overrides `NORDVPN_VERSION` / `IMAGE_VERSION` via build-args — the
`FROM ...@sha256:...` digest is read from the `Dockerfile` at build time, which still
holds the **old** digest. So the "pre-tested dev image" that the draft PR tells the owner
to pull and validate on Unraid is built on the **old** base image. It does not exercise the
new base image at all.

The NordVPN-version path is not affected (version is a build-arg), but the base-image path
is functionally broken analogically.

**Fix direction**: parameterize the digest — declare `ARG BASE_DIGEST=` before `FROM` in the
Dockerfile and pass the new digest as a `build-arg`/`workflow_call` input from
`check-base-image.yml`. Then the dev build actually validates the new base before the PR.

### Finding 2 — DOC DRIFT (high): `task bump` docs claim 5 locations incl `.ai/current.md`; the script does not touch it

`scripts/bump.sh` explicitly does **not** edit `.ai/current.md` (header comment lines 8–10;
confirmed by `.ai/memory/project-state.md`). It edits three files: `Dockerfile`,
`README.md`, `CLAUDE.md`. Yet:

- `docs/user-guide.md` §3 (L98, L143–151) says "all 5 version locations" and the table lists
  `.ai/current.md` as a bump target.
- `docs/build-and-publish.md` §4.5 (L346) correctly says `Dockerfile`, `README.md`,
  `CLAUDE.md` — but §5 Option B (L403, L436, L440) lists `.ai/current.md` in the diff, the
  summary, and the `git add`. The `git add .ai/current.md` stages nothing.

Two docs contradict each other and the script.

### Finding 3 — DOC DUPLICATION / COMPLEXITY (high): `user-guide.md` and `build-and-publish.md` overlap ~70%

GitHub Actions triggers, dev workflow, one-time setup, and troubleshooting are duplicated
nearly verbatim across both files. Drift has already occurred (Finding 2; stale example
versions). Two sources of truth for the same pipeline is the largest ongoing maintenance
burden and the root cause of most doc drift.

### Finding 4 — FRAGILITY (medium): `bump.sh` Changelog auto-append writes a `<!-- TODO -->` placeholder that accumulates

`bump.sh` inserts:
`- **<date>** — <summary> <!-- TODO: expand with real details before merging -->`

If the owner/agent merges without replacing it, literal TODO lines accumulate in
`README.md`. The generated one-line summary is already accurate; the TODO adds friction
without value. (Already flagged in `.ai/current.md` fragile areas.)

### Finding 5 — OPTIMIZATION (medium): `publish.yml` and `publish-dev.yml` build the image **twice**

Both build once with `load: true` (for `verify.sh`), then a **second** `docker/build-push-action`
run with `push: true`. Two full image builds per release. Since this image is single-platform
(`linux/amd64`), the tested, locally-loaded image could be pushed directly with `docker push`
after verify passes — halving build time and guaranteeing tested-image == published-image
(today a cache miss in the second build could in theory diverge).

### Finding 6 — SAFETY (medium): `task docker-push` / `task docker-publish` bypass the human publish gate

Per `.ai/memory/project-state.md`, pushing to remote and publishing without a human-created
git tag are **forbidden unless separately approved**. Yet `Taskfile.yml` ships `docker-push`
and `docker-publish` (tags `:latest` + `:<git-tag>` directly to Docker Hub, no GHA audit
trail), documented as "advanced / bypass GA". This is a foot-gun that contradicts the stated
governance posture.

### Finding 7 — SIMPLIFY (medium): version source-of-truth fragmentation

`NORDVPN_VERSION` / `IMAGE_VERSION` are duplicated across `Dockerfile`, `README.md`
(machine comment + "Current image" line), and `CLAUDE.md` (pinned block). `bump.sh` keeps
them in sync, but drift already exists (README Changelog missing the 5.5.4 entry). The
`CLAUDE.md` and README "Current image" duplicates are redundant with `Dockerfile` and could
be derived/dropped to shrink the drift surface.

### Finding 8 — DRIFT (low): automated-path checklist still lists `task release`

`.ai/tasks/active.md` "Ready Follow-Ups → Watch for NordVPN Next release" checklist includes
`task release` as a step. In the automated path, **merging the PR triggers `publish.yml` which
auto-creates the git tag** via `gh release create`. Running `task release` afterwards would
fail (tag exists) or duplicate. Stale.

### Finding 9 — OPTIMIZATION (low): `build-validate.yml` builds but runs no smoke tests

A PR could pass build but break runtime (e.g. a `rootfs/` script change that breaks s6 init).
Optionally run `verify.sh` on PRs (runners support `NET_ADMIN`). Low value vs CI cost.

### Finding 10 — OPTIMIZATION (low): no `concurrency` groups on publish workflows

Rapid successive pushes/merges can start duplicate `publish.yml` runs. Add
`concurrency: { group: publish, cancel-in-progress: false }` to dedupe.

### Finding 11 — DRIFT (low): stale example versions and sample output in docs

`docs/user-guide.md` `task` sample shows `Version 5.5.0` (actual output is `Version: 5.5.0`
— with colon — per `Taskfile.yml`); example versions like `4.5.0`/`4.6.0` appear throughout
long after the image moved past `5.5.x`. Cosmetic but erodes trust.

### Finding 12 — MINOR (low): `task release` uses `git push --tags`

Pushes **all** local tags, not just the new one. `git push origin "<tag>"` is narrower and
safer.

---

## Recommendations summary

| # | Finding | Severity | Recommend | Touches |
|---|---------|----------|-----------|--------|
| 1 | Base dev-build tests old base | high | Parameterize digest via `ARG BASE_DIGEST` | Dockerfile, workflows, docs |
| 2 | `task bump` doc drift | high | Correct to 3 files; remove `.ai/current.md` | docs |
| 3 | Doc duplication | high | Consolidate; cross-link instead of copy | docs |
| 4 | Changelog TODO placeholder | medium | Drop TODO; emit generated one-liner | bump.sh, docs |
| 5 | Double build in publish | medium | Build once, push tested image | workflows |
| 6 | `docker-push`/`docker-publish` bypass | medium | Deprecate/remove or gate (owner decision) | Taskfile, docs |
| 7 | Version duplication | medium | Dockerfile = single source (owner decision) | bump.sh, README, CLAUDE.md, docs |
| 8 | Stale `task release` checklist | low | Fix checklist | active.md |
| 9 | No PR smoke tests | low | Optional verify on PRs (owner decision) | build-validate.yml |
| 10 | No concurrency groups | low | Add `concurrency` workflows |
| 11 | Stale doc examples | low | Refresh versions | docs |
| 12 | `git push --tags` | low | Push single tag | Taskfile.yml |

---

## Changes — phase by phase

Phases are ordered: drift/safety fixes first, then the functional bug, then larger
refactors. Each phase = one commit. Phases that need owner decisions are marked **[DECISION]**.

### Phase A — Fix `task bump` doc drift (Findings 2, 11)
- `docs/user-guide.md` §3: "all 5 locations" → "3 files (Dockerfile, README.md, CLAUDE.md)";
  drop `.ai/current.md` row from the bump table.
- `docs/build-and-publish.md` §5 Option B: remove `.ai/current.md` from diff list, summary,
  and `git add`.
- Refresh stale example versions in both docs; fix `task` sample output colon.

### Phase B — Base-image dev-build functional fix (Finding 1)
- `Dockerfile`: add `ARG BASE_DIGEST=` before `FROM`, make `FROM ghcr.io/...:noble@${BASE_DIGEST}`.
- `publish-dev.yml`: add `base_digest` input to both `workflow_dispatch` and `workflow_call`;
  pass it as `BASE_DIGEST` build-arg.
- `check-base-image.yml`: pass `latest_digest` to `publish-dev`; the dev image now builds
  against the **new** base. Note the `Dockerfile` digest pin still gets written in
  `create-pr` (the FROM line uses the ARG default = current pinned digest when not
  overridden, preserving local build determinism).
- `docs/build-and-publish.md` §4.5 + `docs/user-guide.md` §4 Check Base Image: document the
  fix.
- **Validation**: in the plan, note we cannot run GHA locally — owner triggers a manual
  `Check Base Image` run to confirm the dev image is built on the new digest (check the
  digest in the dev image's base layer / `docker image inspect` of the pulled dev tag).

### Phase C — Drop Changelog TODO placeholder (Finding 4)
- `scripts/bump.sh`: replace the TODO line with the generated one-liner only; remove the two
  "Reminder: replace TODO …" echoes (keep the `.ai/current.md` hand-maintained reminder).
  Optionally: add a CI guard in the bump workflows that fails if a `<!-- TODO` marker is in
  `README.md` before merge.
- `docs/build-and-publish.md` / `docs/user-guide.md`: update the bump description to drop
  the TODO-expand step.

### Phase D — Consolidate docs (Finding 3)  *[DECISION: target structure]*
- Establish **`docs/build-and-publish.md`** as the canonical deep pipeline reference
  (architecture, triggers, why, notifications, troubleshooting deep-dive).
- Slim **`docs/user-guide.md`** to owner quick-start: "what is this", responsibility matrix,
  task command quick-ref, the happy-path bump workflow, dev-build quick-ref, and **links**
  into `build-and-publish.md` for triggers/setup/troubleshooting instead of restating them.
- Remove the duplicated troubleshooting block from one file (keep canonical in
  `build-and-publish.md`, link from user-guide).
- Update both tables-of-contents and cross-references.

### Phase E — Single-build push in publish workflows (Finding 5)  *[DECISION: risk]*
- `publish.yml` + `publish-dev.yml`: build once with `load: true` + explicit tags, run
  `verify.sh`, then `docker push <each tag>` from the runner's Docker daemon (single
  platform `linux/amd64` makes this safe). Removes the second build.
- Keep `docker/setup-buildx-action` for the build (BuildKit) but push via plain `docker push`.
- **Validation**: confirm pushed tags' digests match the locally verified image (`docker
  inspect --format '{{.Id}}'` before push == what lands on Docker Hub). Owner runs a real
  release or a manual `Publish Dev` to confirm.

### Phase F — Deprecate/gate direct-publish tasks (Finding 6)  *[DECISION: keep vs remove]*
- Option F1 (recommended): remove `task docker-push` and `task docker-publish` from
  `Taskfile.yml` and their doc rows (release goes only through `task release` → GHA).
- Option F2: keep but add a `preconditions` check that requires an env var like
  `CONFIRM_BYPASS_GHA=1` to discourage accidental use.
- Update `docs/user-guide.md` §3 quick-reference accordingly.

### Phase G — Version source-of-truth consolidation (Finding 7)  *[DECISION]*
- Make `Dockerfile` the single source of `NORDVPN_VERSION` / `IMAGE_VERSION`.
- Remove the README "Current image" line and `<!-- current-version: ... -->` comment and the
  `CLAUDE.md` pinned-version block (or replace with a single line that points to the
  Dockerfile). `bump.sh` then edits only the `Dockerfile` + appends the README Changelog
  entry.
- **Owner decision** because `CLAUDE.md`'s pinned block may be referenced by agent prompts
  / other tooling — confirm it's safe to drop.

### Phase H — Small drift + optimizations (Findings 8, 10, 12)
- `.ai/tasks/active.md`: remove `task release` from the automated-path "Watch for NordVPN
  Next release" checklist (merge auto-tags).
- `Taskfile.yml` `release`: `git push --tags` → `git push origin "{{.DF_IMAGE}}"`.
- `publish.yml` + `publish-dev.yml`: add `concurrency` groups.

### Phase I — Optional: PR smoke tests (Finding 9)  *[DECISION]*
- `build-validate.yml`: after the build step, run `scripts/verify.sh` with `NET_ADMIN`.
- Revisit only if owner wants stronger pre-merge gating (the `paths`-filtered publish gate
  already catches most issues post-merge).

### Phase J — Versioning Design Documentation
- Add a new "Versioning Design & Release Flow" section to `docs/user-guide.md` and/or `docs/build-and-publish.md` detailing the separation of `NORDVPN_VERSION` and `IMAGE_VERSION` and how they manifest across Dev, Prod, and Local test builds.

### Phase K — Session close
- Update `.ai/current.md`, `.ai/tasks/active.md`, `.ai/SESSION_NOTES.md`; archive this plan.

---

## Execution Order

| Step | Phase | Commit message prefix | Needs approval before commit? |
|------|-------|-----------------------|-------------------------------|
| 1 | A | `docs:` | no (pure doc + reconcile) |
| 2 | B | `fix:` | yes — touches Dockerfile + workflows |
| 3 | C | `fix:` | no (script + docs) |
| 4 | D | `docs:` | yes — large doc rewrite |
| 5 | E | `refactor:` | yes — release pipeline risk |
| 6 | F | `chore:` | yes — owner decision F1/F2 |
| 7 | G | `refactor:` | yes — owner decision |
| 8 | H | `chore:` | no |
| 9 | I | `feat:` | yes — PR gating change |
| 10 | J | `docs:` | no |
| 11 | K | `chore(handoff):` | yes — before push |

---

## Validation

- **Static (per Phase)**: `bash -n scripts/*.sh`; `python3 -c "import yaml; yaml.safe_load(...)"` on changed workflows; `grep` for residual `.ai/current.md` bump references and `<!-- TODO` markers.
- **Build/runtime gate**: `task docker-build && task verify` for any phase touching `Dockerfile`/`rootfs/` (Phase B). Other phases are docs/workflow-only.
- **Functional confirmation of Phase B (base-image fix)**: owner manually triggers `Check Base Image`; confirm the produced dev image's base-layer digest equals the new `LATEST` digest, not the old pin.
- **Functional confirmation of Phase E (single-build push)**: owner runs a manual `Publish Dev` (or the next real release) and confirms Docker Hub tags' digests match the locally verified image.
- **Definition-of-done**: see `.ai/workflows/definition-of-done.md`.

> Note: the `task` CLI and a Docker daemon are not guaranteed in every agent sandbox. Where
> they are unavailable, substitute checks (syntax/YAML-parse/grep) are used and the owner is
> asked to run the real gates locally.

---

## Open Questions (need owner decisions before implementation)

1. **Phase B approach**: approve the `ARG BASE_DIGEST` parameterization of the Dockerfile
   `FROM` line as the fix for the base-image dev-build bug? (Alternative: reorder
   `check-base-image.yml` to commit the digest to the `auto/base-image-*` branch first and
   point `publish-dev`'s checkout at that branch — more moving parts, not recommended.)
2. **Phase D structure**: confirm `build-and-publish.md` = canonical deep ref,
   `user-guide.md` = slim quick-start + links? Or the reverse?
3. **Phase E**: approve restructuring `publish.yml`/`publish-dev.yml` to a single build +
   `docker push` (release-pipeline risk) vs. leaving the double-build as-is?
4. **Phase F**: remove `task docker-push` / `task docker-publish` (F1, recommended) or gate
   behind a confirm flag (F2)?
5. **Phase G**: approve dropping the `CLAUDE.md` pinned-version block and the README
   "Current image" / `current-version` comment so `Dockerfile` is the sole version source?
   (Confirm no tooling reads those.)
6. **Phase I**: add PR-level smoke tests to `build-validate.yml`, or skip?