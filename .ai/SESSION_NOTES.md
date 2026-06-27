# Session Notes

Append-only log of session closes. Newest entry at the top.
Each entry: `## Session Close — YYYY-MM-DD (task name)`

---

## Session Close — 2026-06-27 (base image refresh cadence implementation)

### What was done this session

| # | Item | Commit |
|---|------|--------|
| 1 | Phase A: Local check script `scripts/check-base-image.sh` created & marked executable | `89f71f5` |
| 2 | Phase B: GitHub Actions workflow `.github/workflows/check-base-image.yml` created | `aba8a41` |
| 3 | Phase C: Taskfile command `task check-base` added | `f412b4b` |
| 4 | Phase D: Updated current status, active tasks, AGENTS.md, and build-and-publish.md | `6716c56` |

### Key decisions

- Fully followed Autonomous mode checklist: recorded pre-run commit hash (`297dd095fb1fee57803f7f85ac20935bf1cf8426`), validated and committed each phase individually, and waited for owner approval before remote push.
- Verified local check script execution under Git Bash to prevent Windows path/WSL mangling issues.

### Stopping point

- **Status**: Complete — all 4 phases of base image refresh cadence implemented. Branch `chore/base-image-refresh-plan` successfully pushed to origin.
- **Branch**: `chore/base-image-refresh-plan`
- **Working tree**: Clean
- **Pending owner action**: Merge `chore/base-image-refresh-plan` PR to `main` on GitHub.

### Fragile areas

- Shell script line endings must strictly preserve LF endings to prevent bad interpreter issues.
- `scripts/check-base-image.sh` uses `docker buildx imagetools inspect`. Ensure BuildKit/Buildx is active and integrated with Docker Desktop.
- Monthly cron trigger executes on the 1st of each month at 09:00 UTC. Ensure secrets `DOCKER_USERNAME` and `DOCKER_TOKEN` are active for automated draft PR/dev builds.

---

## Session Close — 2026-06-27 (base image refresh — plan only, on hold)

### What was done this session

| # | Item |
|---|------|
| 1 | Full onboarding pass — confirmed `main` at `1e44fd7`, clean working tree, stable maintenance posture |
| 2 | Audited the base image update gap: digest pinned 2026-06-26, no detection or refresh mechanism exists |
| 3 | Wrote `.ai/plans/base-image-refresh.md` — comprehensive plan covering problem statement, audit, all owner decisions, and full workflow/script designs |
| 4 | All 5 owner decisions resolved (see plan §Owner Decisions) |
| 5 | Branch `chore/base-image-refresh-plan` created; plan committed and pushed |

### Key decisions made this session

- **Versioning model clarified**: `IMAGE_VERSION` tracks the container, not NordVPN. Any rebuild for any reason — base refresh, security fix, config bug, NordVPN bump — produces a new `IMAGE_VERSION`. This is the authoritative statement going forward.
- **Base refresh = first-class release**: A base image digest bump always pairs with a `IMAGE_VERSION` patch increment, triggers a dev build, and fires the full production release pipeline on merge. Same process as a NordVPN version bump.
- **Monthly cadence**: GHA cron `0 9 1 * *` (1st of each month, 09:00 UTC).
- **Dev build on detection**: Yes — mirrors `check-nordvpn-release.yml` pattern; a pre-tested dev image is available on Docker Hub before the owner reviews the draft PR.
- **`task check-base` approved**: Taskfile.yml modification approved for Phase C.
- **`apt-get upgrade` revisit**: Deferred — revisit after first successful monthly base refresh.

### Stopping point

- **Status**: Plan written, all decisions resolved. Implementation ON HOLD — owner pausing to accumulate agent credits.
- **Branch**: `chore/base-image-refresh-plan` — plan doc only; no scripts or workflows written yet.
- **Working tree**: Clean after commit.
- **No validation needed**: This session produced no Dockerfile, rootfs, or script changes.

### What the next agent must do

Read `.ai/plans/base-image-refresh.md` in full before touching anything. The plan is fully designed and approved — the next agent executes it, it does not redesign it.

Implementation order (Phases A → B → C → D):

1. **Phase A** — Create `scripts/check-base-image.sh` (local diagnostic script; see plan §Phase A for the exact script).
2. **Phase B** — Create `.github/workflows/check-base-image.yml` (monthly GHA cron; see plan §Phase B for the full workflow YAML). This workflow calls `publish-dev.yml` as a reusable workflow — confirm `publish-dev.yml` still exists and its `with:` inputs match (`nordvpn_version`, `image_version`) before wiring.
3. **Phase C** — Add `task check-base` entry to `Taskfile.yml` (approved; see plan §Phase C for the exact YAML block). This is a Taskfile.yml modification — normally frozen, but explicitly approved for this task.
4. **Phase D** — Update `.ai/current.md`, `.ai/tasks/active.md`, `AGENTS.md` Known Issues, `docs/build-and-publish.md`.

Use **Supervised mode** (one phase per human gate) — each phase is independently testable and reviewable. Do not batch phases into one commit.

### Fragile areas (unchanged from previous session)

- Base digest `noble@sha256:53411508…` must not change without explicit instruction.
- `# syntax` directive must NOT be added to Dockerfile.
- Token for `task verify-live` stays outside the repo.
- `.ai/current.md` is hand-maintained.
- s6 + capabilities: stateless `docker run` checks must use `--entrypoint /bin/bash`.

---

## Session Close — 2026-06-26 (prime-ai-docs v1.2.1 template update)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | `docs/architecture.md` — merged backup into new template: all Phase 6 project content (10 ADRs, versioning design, layer discipline, 8 gotchas); added Caching Strategy + Auth Model sections | `8257459` |
| 2 | `.ai/README.md` — restored "Stable maintenance" phase text and full prompts bullet list (including `execute-plan-prompt.md`) | `8257459` |
| 3 | `.ai/prompts/execute-plan-prompt.md` — added (new from template) | `8257459` |
| 4 | `.ai/prompts/intermediate-phase-prompt.md`, `session-close-prompt.md` — template updates | `8257459` |
| 5 | `.ai/workflows/implementation.md` — template update | `8257459` |
| 6 | `PRIME.md`, `prime-ai-docs.mjs`, `.ai-prime-manifest.json/.version/.versions.json` — prime infrastructure committed | `8257459` |

### Key decisions

- **PRIME.md merge protocol followed**: new template structure wins; project-specific content extracted from backup and placed into equivalent sections; new sections (Caching Strategy, Auth Model) filled with nordvpn-appropriate content; never copied old file wholesale.
- **`.ai-prime-backup/` not committed**: ephemeral working artifact; left in working tree only.
- **Committed directly to `main`**: no feature branch (acknowledged; not protocol-compliant; user approved).

### Validation

- No Dockerfile/rootfs/scripts changed — `task verify` not required.
- `docs/` and `.ai/` files only.

### Fragile areas

- Same as previous session (base digest, syntax directive, token outside repo, s6+capabilities).

---

## Session Close — 2026-06-26 (Dockerfile optimization — implementation)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Phase 6 (verify-live formalization) added to master plan | `a0324e8` |
| 2 | Phase 0 — baseline captured | `chore/dockerfile-optimization` |
| 3 | Phase 1 — hygiene: maintainer fix, ARG NORDVPN_RELEASE, curl hardening, libc6 removal, autoclean→clean, .dockerignore expanded, shebang fixes, verify.sh MSYS fix, DOCKER_BUILDKIT=1, task verify-live + connect-test.sh, README --restart note | `ff6dc1d` |
| 4 | Phase 2 — COPY --chmod=0755 (replaces chmod block; all 19 scripts confirmed executable) | `f113840` |
| 5 | Phase 3 — base image digest pin (noble@sha256:53411508…) | `ce029b9` |
| 6 | Phase 4 — wireguard→wireguard-tools, iptables explicit, net-tools/iputils-ping removed; verify-live PASS (Spain #195 Madrid, NordLynx, 77.243.86.224) | `6031fe0` |
| 7 | Phase 5 — HEALTHCHECK (interval=60s, start-period=45s; healthy at t=5s; verify-live PASS Spain #170 Madrid, 192.145.39.2) | `b92d971` |
| 8 | Phase 6 — documentation sync (all docs/, .ai/, AGENTS.md, CLAUDE.md, README.md) | this commit |

### Key decisions

- **Two-tier testing model**: `task verify` (credentialless, CI-safe) + `task verify-live` (real NordLynx egress, Spain). `task verify` is structurally blind to tunnel connectivity — `task verify-live` is the only pre-release gate that validates it. Both are now required before `task release`.
- **COPY --chmod on Windows**: NTFS has no exec bit; `COPY --chmod=0755` stamps modes at copy time via BuildKit — deterministic on both Windows and Linux CI.
- **`# syntax` directive rejected** (experiment F2): triggers 401 from Docker Hub for the BuildKit frontend in this environment. BuildKit satisfied by `DOCKER_BUILDKIT=1` in Taskfile env block.
- **wireguard-tools validated** (Phase 4 verify-live): NordLynx connects successfully with `wireguard-tools` + without the `wireguard` metapackage.
- **Base digest pin** (Phase 3): `noble@sha256:53411508…` makes the "never bump base without instruction" CLAUDE.md constraint enforceable. Future: adopt a base-refresh cadence.
- **HEALTHCHECK** (Phase 5): healthy at t=5s with NordLynx (first health check runs immediately; NordLynx connects before the 45s start-period).

### Validation

- `task verify`: 3/0/1 on all phases (3 pass, 0 fail, 1 warn — expected on Windows with fake token)
- `task verify-live`: PASS on Phases 4 and 5 (Spain, NordLynx, real egress confirmed)
- `docker ps` health: `(healthy)` confirmed at t=5s

### Fragile areas

- **Base digest**: manually maintained; `noble@sha256:53411508…`; do not remove the pin.
- **`# syntax` directive**: must NOT be added to the Dockerfile in this environment.
- **Token for verify-live**: scratchpad path; never commit.
- **Taskfile.yml**: only two pre-approved changes (DOCKER_BUILDKIT env + verify-live task).

### Next steps

1. Merge `chore/dockerfile-optimization` to `main` (owner approval required)
2. Watch for next NordVPN release (daily checker handles detection)
3. Future: design base-refresh cadence (deferred)

---

## Session Close — 2026-06-25 (Dockerfile optimization — planning session)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Onboarding pass — read AGENTS.md, all 4 core product docs, .ai/ workspace, current.md, active.md, SESSION_NOTES (last entry) | (read-only) |
| 2 | Dockerfile review — initial analysis of the 52-line Dockerfile, produced summary of findings and recommendations | (read-only) |
| 3 | Plan written — `.ai/plans/dockerfile-optimization.md` (initial version) | (untracked file) |
| 4 | Deep analysis — re-read all 19 rootfs scripts, Taskfile.yml, verify.sh, bump.sh, dev-build.sh, get-latest-version.sh, all 3 GHA workflows, .gitattributes, .dockerignore, git ls-files --stage rootfs/ | (read-only) |
| 5 | Plan revised — corrected 3 wrong recommendations, added 9 new findings, tiered into Tier 1 (clear wins) / Tier 2 (owner decisions) / Tier 3 (future) | (untracked file) |
| 6 | Added "Complete Reasoning" section to the plan documenting the full two-pass analysis process and rationale for each finding | (untracked file) |

### Key decisions

- **`curl` is a runtime dependency, not build-only.** The initial plan recommended `apt-get purge -y curl` at the end of the install block. Deep analysis found `nord_watch:9` uses `curl -Is -m 30` to poll `CHECK_CONNECTION_URL` every 300s. Removing `curl` would silently break the watchdog. Recommendation retracted.
- **The `chmod` block is necessary but suboptimal.** Initial plan called it "unnecessary overhead." Git index inspection revealed 18 of 19 rootfs files are `100644` (non-executable) — the `chmod` block is the only thing making them executable. Revised recommendation: set executable bits in git via `git update-index --chmod=+x`, then remove the `chmod` block. Rationale is "eliminate a fragile build step," not "remove gratuitous overhead."
- **`apt-get upgrade` is a decision point, not a clear win.** AGENTS.md Key Boundaries explicitly prohibits bumping the base image without instruction. Given that constraint, `apt-get upgrade` may be the only security-patching mechanism. Moved to Tier 2 (owner decision) with full tradeoff documented.
- **Tiering logic**: Tier 1 = no behavior change, no risk, no owner decision. Tier 2 = tradeoff or requires testing. Tier 3 = future/out of scope.
- **No code changes made.** This was a planning session only. The plan awaits owner approval before any implementation begins.

### Validation

- Not run — no code changes were made (planning session only). The plan defines its own validation criteria (`task docker-build` + `task verify` + script executability check) for when implementation begins.

### Fragile areas

- **No branch was created.** The onboarding report was not explicitly confirmed before the user redirected to the Dockerfile review task. The plan file (`.ai/plans/dockerfile-optimization.md`) is an untracked file on `main`. The session-close commit will include it.
- **Tier 2 `wireguard` removal is risky.** If approved, must test NordLynx connectivity (not just socket existence) — the NordVPN .deb may or may not auto-install `wireguard` as a dependency. Unknown without inspecting the package.
- **`nord_watch` shebang uses `/usr/bin/bash`** (not `/bin/bash`) and does not use `with-contenv`. Works on Noble (merged-usr) and the env vars it reads are Docker ENV vars (not s6 container env vars). The plan recommends fixing the path to `/bin/bash` but NOT adding `with-contenv` — if it ain't broke, don't fix it.

### Next steps (for the next session)

1. Owner reviews `.ai/plans/dockerfile-optimization.md` and decides on Tier 2 items
2. First write action: `git checkout -b chore/dockerfile-optimization` from `main`
3. Implement Tier 1 phases (executable bits → shebangs → .dockerignore → Dockerfile refactor)
4. Run `task docker-build` + `task verify`
5. If Tier 2 approved, implement and re-validate

---

## Session Close — 2026-06-24 (current state audit & workflows unification)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Hygiene cleanup — pruned stale/unused boilerplate, moved old plans/debug files to archive | `ef7fcd6` |
| 2 | Consolidated version scraping — created `scripts/get-latest-version.sh`, refactored checking scripts | `ef7fcd6` |
| 3 | Parameterized `verify.sh` — supported custom IMAGE_REF, expected NORDVPN/IMAGE versions | `388f7c0` |
| 4 | CI Test Unification — call `verify.sh` instead of duplicate tests in GHA workflows, added paths filter on main merges | `388f7c0` |
| 5 | Aligned dev builds — updated scripts and Taskfile to build, tag, and push `:dev`, `:dev-<hash>`, `:dev-<version>`, and `:<image_version>-dev` (and bake `<image_version>-dev` in container metadata) | `31c49aa`, `537c9ae` |
| 6 | Refactored Taskfile default command and preconditions to handle headless/tagless checkouts gracefully | `31c49aa` |
| 7 | Documentation updates — updated all reference documentation and audit checklists | `537c9ae` |

### Key decisions

- **Consolidate Web scrapers into single script**: `scripts/get-latest-version.sh` now manages all HTML parsing and sorting of official Debian pool releases, providing a unified version source for dev builds and automatic daily checks.
- **Unify CI and local smoke tests**: Calling `verify.sh` with parameterization ensures all verification gates (stateless and runtime) are running identical code locally and inside GitHub Actions runner environments.
- **Bake aligned dev tags into container metadata**: Setting `IMAGE_VERSION` to `<image_version>-dev` inside development builds ensures container logs banner and labels cleanly identify dev builds while adhering to standard production metadata schemas.

### Validation

- Local: `task dev-build` built, tagged `:5.5.1-dev` and `:dev-${version}` successfully.
- Local: `bash scripts/verify.sh fredplex/nordvpn:5.5.1-dev 5.1.0 5.5.1-dev` passed all 4 checks cleanly.
- Remote: Pushed to remote branch `chore/audit-improvements`. Ready for owner final review.

---

## Session Close — 2026-06-24 (native release notifications)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | `publish.yml` — replaced `Tag git release` with `Publish GitHub Release` (`gh release create`, built-in `GITHUB_TOKEN`, no secrets) | `7c61b2a` |
| 2 | Docs — release-notification design + agent/human/GitHub roles across all 5 product docs (architecture, build-and-publish §4.5, feature-state, quick-build-checklist, user-guide §7 Step 4) | `add8fdc` |
| 3 | `.ai/plans/publish-notifications.md` — plan (archived on close) | `7c61b2a` |
| 4 | Handoff docs (current.md, SESSION_NOTES, tasks, memory) | `this commit` |

### Background

After shipping 5.1.0, the owner asked how they'd be notified of workflow results. The
production release was silent (a bare tag push notifies no one). An SMTP email step was
drafted then **reverted** in favour of a GitHub-native approach.

### Key decisions

- **GitHub-native only, no secrets.** Success = `gh release create` publishes a GitHub
  Release → native email to repo watchers. Failure = GitHub's built-in Actions emails.
  No SMTP, no third-party action, no app password. Bonus: a real Releases page.
- **Replace, don't add.** `gh release create` makes the tag **and** the Release, so it
  replaces the old manual tag step. Dropped the `github.ref_type != 'tag'` guard so the
  manual `task release` path also notifies; `gh release view` dedups.
- **Lightweight tag accepted** (was annotated) — release notes carry the context.
- **Skip backfilling** existing tags (`5.5.0`, `5.5.1`) into Releases — only future
  releases get a Release object.

### Roles captured in docs (agent / human / GitHub)

- **Agent**: implements on a branch, shows diffs, never merges/pushes without approval;
  receives no notifications.
- **Human (owner)**: one-time Watch → Releases + confirm Actions failure emails; receives
  and acts on success/failure emails; remains the release gate.
- **GitHub**: runs the workflow, `gh release create` makes the tag + Release, emails
  watchers on release and the owner on failure.

### Validation

- `bash -n` on the release step: clean. Consistency grep: no stale "pushes Git Tag back"
  wording remains in the five docs.
- **Pending owner action**: set **Watch → Custom → Releases** so the success emails
  arrive. End-to-end proof comes on the next real release (or a manual `publish.yml`
  dispatch), which will create a GitHub Release + email.

### Fragile areas

- **Notifications require owner opt-in**: without Watch → Releases, the success email is
  not delivered (the workflow still succeeds and the Release still appears).
- **Lightweight vs annotated tag**: future tooling that expects an annotated release tag
  message should read the GitHub Release notes instead.

---

## Session Close — 2026-06-24 (bump.sh fix + NordVPN 5.1.0 release)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | `scripts/bump.sh` — stop overwriting `.ai/current.md`; bumps now edit only Dockerfile/README/CLAUDE | `64208df` → merge `8cc1082` |
| 2 | Closed stale auto PR #3 + branch (carried the clobbered current.md); re-ran checker → clean PR #4 | — |
| 3 | Merged PR #4 (NordVPN 4.5.0 → 5.1.0, image 5.5.1) | `aa54713` → merge `c52bd52` |
| 4 | `publish.yml` release CD — smoke tests pass, pushed `:latest` + `:5.5.1`, git tag `5.5.1` | run `28110330929` |
| 5 | Handoff docs (current.md, SESSION_NOTES.md, tasks, project-state) | `this commit` |

### What happened (sequence)

1. The daily checker had failed earlier because `publish-dev`'s nordvpn-version smoke test ran through s6 init without `NET_ADMIN` (fixed earlier this session, `fc8a147`). Re-running the checker produced draft PR #3 — but `bump.sh` had **clobbered `.ai/current.md`** with a templated stub.
2. Rather than patch the PR, we fixed the root cause: removed the `current.md` generation from `bump.sh` entirely (it's narrative handoff state, not a generated artifact). Merged to `main` first so the checker would use the fixed script.
3. Closed PR #3, deleted `auto/nordvpn-5.1.0`, re-ran the checker → clean PR #4 (only Dockerfile/README/CLAUDE, +5/−5).
4. Owner tested `dev-5.1.0`: container started clean, connected to Spain #189 (NordLynx/UDP), real egress confirmed via a Madrid exit IP (no leak).
5. Merged PR #4 → `publish.yml` released: 3/3 smoke tests passed, `:latest` + `:5.5.1` pushed, git tag `5.5.1` created.

### Key decisions

- **`bump.sh` should not generate `.ai/current.md`.** It is human/agent-maintained handoff narrative; auto-templating it destroyed history and injected stale release instructions. The pinned version still lives in CLAUDE.md (which bump.sh maintains).
- **Fix-then-regenerate over patch-the-PR.** Merging the bump.sh fix to `main` before re-running the checker gave a clean PR with no manual fixups.

### Naming note

- Git tag / Docker version tag = **IMAGE_VERSION = `5.5.1`**; bundled NordVPN client = **`5.1.0`**. Don't conflate them.

### Fragile areas

- **`.ai/current.md` is now hand-maintained on every bump** — bump.sh no longer touches it. After merging a release PR, update `current.md` + `CLAUDE.md` built date by hand (CLAUDE.md version line is still auto-bumped).
- **s6 init + capabilities** (unchanged): stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.

---

## Session Close — 2026-06-24 (fix/publish-dev-smoke-test)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | `.github/workflows/publish-dev.yml` — "nordvpn version" smoke test now runs via `--entrypoint /bin/bash` to bypass s6 init | `fc8a147` |
| 2 | `.github/workflows/publish.yml` — same fix on the production release CD (identical latent bug) | `fc8a147` |
| 3 | `.ai/debug/publish-dev-smoke-test-failure.md` — root-cause investigation | `fc8a147` |
| 4 | `.ai/plans/fix-publish-dev-smoke-test.md` — fix plan (2 phases) | `fc8a147` |
| 5 | Merge to `main` | `3e80185` |
| 6 | Handoff docs (current.md, SESSION_NOTES.md, tasks, memory gotcha) | `this commit` |

### Root cause

Today's daily checker detected NordVPN `5.1.0` and triggered `publish-dev`. The image built and pushed, but the "nordvpn version" smoke test failed: `expected '5.1.0', got ''`. The step ran `docker run --rm <image> nordvpn --version` through the image's default s6-overlay `/init` entrypoint **without `NET_ADMIN`**. `00-firewall`'s `iptables -P …` commands fail without that capability, s6 treats the failed `cont-init.d` script as fatal and halts before exec'ing the CMD, so `nordvpn --version` never ran → empty stdout → FAIL. Not a packaging problem; the image was fine.

### Key decisions

- **Fix in the test invocation, not the init script.** `00-firewall` must stay fail-closed at real runtime; softening it to satisfy a test would weaken the kill-switch invariant. The fix overrides the entrypoint instead, mirroring `scripts/verify.sh:49`.
- **Fixed both workflows.** `publish.yml` (production release CD) had the identical untrapped pattern and would have failed the same way when the 5.1.0 PR is merged.

### Validation

- Local: `bash -n` syntax check of the edited command passed; diff reviewed (change is contained in the `run: |` block scalar, YAML structure intact). No `yaml`/`yq`/`actionlint` tooling in the local env.
- **Pending (owner)**: end-to-end confirmation requires a real workflow run — **Publish Dev to Docker Hub** → `workflow_dispatch` with `nordvpn_version: latest`. This exercises the exact path that failed today.

### Fragile areas

- **s6 init + capabilities**: any `docker run` that must reach the CMD (e.g. `nordvpn --version`) without `--cap-add=NET_ADMIN` must override the entrypoint (`--entrypoint /bin/bash`) to bypass s6 init — otherwise `00-firewall` aborts init. Recorded in `.ai/memory/architecture-decisions.md` Gotchas.
- **Debian repo package expiry** (unchanged): NordVPN purges old debs; default builds of deprecated versions can fail.

---

## Session Close — 2026-06-23 (feature/unified-builds)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | `.github/workflows/publish-dev.yml` — converted to reusable workflow, added `:dev-<version>` tags | `3cbf9f5` |
| 2 | `.github/workflows/check-nordvpn-release.yml` — daily cron, auto-trigger dev build & verify, PR template body update | `475ca72` |
| 3 | `.github/workflows/publish.yml` — redesigned as CD release on PR merge, manual dispatch option, local smoke test, git tag push | `475ca72` |
| 4 | `scripts/verify.sh` — added `--entrypoint /bin/bash` override to bypass s6 init for stateless version check | `ce02c0b` |
| 5 | `.gitattributes` — updated for script/file paths; normalized all files to LF endings | `64c5751` |
| 6 | Documentation updates — `docs/build-and-publish.md`, `docs/user-guide.md`, `docs/quick-build-checklist.md` | `475ca72` |
| 6b| Added Versioning Design guide to `docs/architecture.md` and updated `docs/feature-state.md` | `4e088e2` |
| 7 | `.ai/tasks/` — updated task checklists and archives | `this commit` |
| 8 | `.ai/current.md` & `SESSION_NOTES.md` — updated project state files | `this commit` |

### Key decisions

- **Safety Checks in release CD pipeline**: Configured the push trigger on `main` branch to require both a path filter (`paths: ['Dockerfile']`) and a git diff grep check verifying that the versions were actually bumped. This guarantees we don't build/deploy on unrelated merges.
- **Stateless Verification Overrides**: Overriding the entrypoint to `/bin/bash` in `verify.sh` resolves s6 `/init` setup failures caused by lack of networking privileges and missing `$HOME` during testing, which makes local verification robust on Windows and limited capability environments.
- **Git Tag CD Release Loop**: When a PR version bump is merged, GHA automatically tags the commit and pushes the tag, trigger-matching release tags, which publishes standard semver tagged images to Docker Hub.

### Validation

- Bounded local testing: `task docker-build` and `task verify` run and pass cleanly using temporary version `4.6.0` override (as `4.5.0` has been deprecated and deleted from the NordVPN Debian package pool).
- Docker inspect checks (IMAGE_VERSION metadata check, nordvpn version extraction, iptables drop rule checks) all completed successfully.

### Fragile areas

- **Debian Repo Package Expiry**: NordVPN package availability in the Debian repository is subject to upstream purging. If old versions are purged, local default builds will fail, requiring a manual bump or dev override build.
- **LF Line Ending Strictness**: Line endings for scripts in `/scripts` and `/rootfs` must strictly remain LF. If checked out on Windows and auto-converted by git, they will cause execution failures inside the container.

---

## Session Close — 2026-06-23 (feature/dev-workflow)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | `Taskfile.yml` — `dev-build`, `dev-push`, `dev-latest`, `dev-clean` tasks | `e6da122` |
| 2 | `.github/workflows/publish-dev.yml` — CI dev workflow with 3 smoke tests | `e6da122` |
| 3 | `scripts/dev-build.sh`, `dev-latest.sh`, `dev-clean.sh` — extracted for cross-platform | `52ea716` |
| 4 | `docs/build-and-publish.md` — §3.5 Dev workflow + §4.4 + §2 WSL2 prereqs | `e6da122`, `d096d65` |
| 5 | `docs/user-guide.md` — §9 Dev builds + Publish Dev subsection + WSL2 note | `e6da122`, `d096d65` |
| 6 | `docs/quick-build-checklist.md` — Dev Build section + WSL2 prereqs | `e6da122`, `d096d65` |
| 7 | `docs/feature-state.md` — 5 dev workflow entries | `e6da122` |
| 8 | `README.md` — WSL2 requirement note | `d096d65` |
| 9 | `.ai/plans/dev-workflow.md` — implementation plan | `e6da122` |
| 10 | `.ai/current.md` — handoff updates | `e6da122`, this commit |

### Key decisions

- **Dual tagging**: `:dev` (moving, consumer-facing) + `:dev-<hash>` (immutable, traceable)
- **CI smoke tests**: 3 stateless checks run post-push in the workflow; runtime daemon check deferred as too heavy for CI
- **`task dev-latest`**: always builds with the newest available version (even if same as pinned) — "latest available, I want a dev image of it"
- **Cross-platform**: inline bash extracted to `scripts/dev-*.sh` following existing project pattern; Windows requires WSL2 + Docker Desktop integration + Git Bash
- **`task dev-clean`**: silent on missing images — safe to run anytime
- **WSL2 docs**: added to README.md, build-and-publish.md (§2 + §3.5), user-guide.md (§9), quick-build-checklist.md

### Validation

- `task dev-latest` confirmed working (exit 0) on Windows with WSL2
- All YAML syntax errors resolved
- No npm/test framework — project validation is `task docker-build` + `task verify`

### Fragile areas

- `:dev` tag is overwritten on every push — not for production
- Windows users MUST have WSL2 + Docker Desktop WSL integration enabled
- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3 deferred
- CI smoke tests add ~30s to the `publish-dev` workflow — acceptable for manual trigger

---

## Session Close — 2026-06-23 (docs/quick-build-checklist)

### Completed this session

| # | Item |
|---|------|
| 1 | Added an operator-focused build/release checklist at `docs/quick-build-checklist.md` covering local build, verify, bump, release, and GitHub PR validation |
| 2 | Added a docs index entry so the checklist is discoverable from `docs/README.md` |
| 3 | Updated `.ai/current.md` and `.ai/tasks/active.md` with the new handoff state |

### Key decisions

- Kept the checklist concise and copy-paste oriented; the full operational details remain in `docs/user-guide.md` and `docs/build-and-publish.md`.
- This change is documentation-only and does not alter runtime behavior.

### Validation

- Not run — docs-only change; the repository’s local validation path relies on `task`, which is not installed in the current shell environment.

### Fragile areas

- The local validation workflow depends on the `task` binary being available; the current environment reported `task: The term 'task' is not recognized`.

---

## Session Close — 2026-06-23 (docs/user-guide)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Created `docs/user-guide.md` — complete owner operational reference | d5e1002 |
| 2 | Added index entry in `docs/README.md` pointing to the new guide | d5e1002 |
| 3 | Created `.ai/plans/user-guide.md` — approved plan committed alongside the work | d5e1002 |

### Key decisions

- Scope correction mid-plan: Docker Hub credentials setup was initially excluded ("stays in build-and-publish.md"), added back in after owner review — a user guide must be self-contained
- Mermaid diagram approved for the workflow flowchart (owner preference)
- `task docker-push` / `task docker-publish` documented for the first time — not covered in any prior doc
- New doc does not replace `docs/build-and-publish.md`; both coexist (build-and-publish is agent+human detailed reference; user-guide is owner quick reference)
- User guide will feed future README.md rewrite (Tier 3, not yet approved)

### Validation

- Not run — docs-only changes, no Dockerfile or rootfs modifications

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3, deferred
- `CLAUDE.md` pinned version block needs update after next bump

---

## Session Close — 2026-06-23 (chore/prime-template-update)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Applied prime-ai-docs 1.1.0 template — merged new structural additions into our AGENTS.md | 616fd82 |
| 2 | `.ai/README.md` updated to 1.0.1 — filled in current phase placeholder | 616fd82 |
| 3 | Added `.ai-prime-versions.json` — per-file version record for future smart updates | 616fd82 |

### Key decisions

- New file structure wins (PRIME.md protocol): extracted only the new structural sections from 1.1.0 template (Version subsection in Required Reading; Use a Branch-Based Workflow in Working Rules) — our nordvpn content preserved verbatim from backup
- `.ai-prime-versions.json` committed (not gitignored) — required so smart update mode works on future re-primes

### Validation

- Not run — docs-only changes, no Dockerfile or rootfs modifications

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3, deferred
- `CLAUDE.md` pinned version block needs update after next bump

---

## Session Close — 2026-06-23 (ai-docs-merge)

### Completed this session

| # | Item | Commit |
|---|------|--------|
| 1 | Merged nordvpn-specific content from `.ai-prime-backup/` into all new template files | 22dcb8c |
| 2 | AGENTS.md — full project overview, s6 architecture, startup sequence, env vars table (21 vars), file map, version bump workflow, GitHub Actions reference | 22dcb8c |
| 3 | CLAUDE.md — task commands (replacing npm), all constraints, pinned version block | 22dcb8c |
| 4 | `.ai/memory/project-state.md`, `architecture-decisions.md` — filled with nordvpn posture and 5 key decisions | 22dcb8c |
| 5 | `.ai/rules/mutation-rules.md` — nordvpn taxonomy, currently approved mutations, publish gate rules | 22dcb8c |
| 6 | `docs/architecture.md`, `tech-stack.md`, `project-rules.md`, `feature-state.md`, `testing.md` — all filled | 22dcb8c |
| 7 | `.ai/tasks/active.md` — NordVPN 4.6.x watchlist checklist | 22dcb8c |

### Key decisions

- PRIME.md merge protocol applied: new file structure wins; human-authored content extracted from backup into equivalent sections — not copied wholesale
- No placeholder text (`<...>`) remains in any file
- Backup directory (`.ai-prime-backup/`) deleted by owner after merge confirmed complete

### Validation

- Not run — docs-only changes, no Dockerfile or rootfs modifications

### Fragile areas

- `README.md` still mirrors upstream `bubuntux/nordvpn` — Tier 3, deferred
- `CLAUDE.md` pinned version block needs update after next bump

---

## Session Close — 2026-06-23 (Initial scaffold)

### Completed this session

| # | Item |
|---|------|
| 1 | Scaffolded AI agent docs via `prime-ai-docs.mjs` |

### Key decisions

- Standard `.ai/` + `docs/` structure adopted from AI-AGENT-SYSTEM-BLUEPRINT.md.

### Known follow-ups

- Fill in all placeholder sections in `AGENTS.md`, `docs/`, and `.ai/memory/` before first agent session.
