# Current State Audit & Improvement Plan
Created: 2026-06-24 | Status: In progress

This document provides a comprehensive audit of the **fredplex/nordvpn** codebase, workflows, and documentation. It highlights structural inconsistencies, workflow inefficiencies, and maintenance gaps introduced during recent rapid updates, and proposes a phased implementation plan for remediation.

---

## 1. Executive Summary & Assessment

The `fredplex/nordvpn` project is in a highly functional state:
* **Automation**: The daily checker (`check-nordvpn-release.yml`) automatically builds, verifies, and publishes dev images before opening clean draft PRs.
* **CD Release Gate**: Merging the PR triggers the release pipeline (`publish.yml`), which builds production images, runs automated smoke tests, pushes `:latest` and semver tags, and creates GitHub Releases.
* **Failsafe Design**: The `00-firewall` cont-init script properly drop-protects traffic on initialization.

However, several gaps in **workspace hygiene**, **code duplication**, **testing parity**, and **local vs. CI workflow alignment** have been identified.

---

## 2. Dev Workflow vs. Production Promotion Workflow

The table below contrasts the processes, inputs, and outputs of the two workflows:

| Characteristic | Dev / Test Workflow | Production Promotion Workflow |
|---|---|---|
| **Trigger** | Daily cron version checker, manual UI dispatch, or local `task dev-*` tasks. | Push/merge to `main` with `Dockerfile` changes, tag push, or manual UI dispatch. |
| **Primary Goal** | Fast, low-risk testing of new versions or code changes without releasing to public users. | Official release of tested changes to public users on Docker Hub. |
| **Version Resolution** | Dynamic: can override `NORDVPN_VERSION` (e.g. `latest` or explicit version), fallback to pinned. | Pinned: parses and strictly uses `NORDVPN_VERSION` and `IMAGE_VERSION` defined in the `Dockerfile`. |
| **Build Execution** | Compiles image from current commit, injecting overrides if specified. | Compiles image from merged commit, using pinned parameters. |
| **Verification Gate** | CI runs 3 stateless checks; local runs 4 checks (including runtime daemon check). | CI runs 3 stateless checks; local runs 4 checks before tag push. |
| **Output Image Tags** | `:dev` (moving), `:dev-<sha>` (immutable), `:<image_version>-dev` (traceable release version). | `:latest` (moving), `:<image_version>` (traceable/immutable release tag). |
| **Metadata baked inside** | `IMAGE_VERSION=<image_version>-dev` | `IMAGE_VERSION=<image_version>` (e.g., `5.5.1`) |
| **Git Tag Lifecycle** | None. No tags are pushed to git. | Automated: creates and pushes git release tag back to the repository via `gh release create`. |

---

## 3. Analysis: Rebuild vs. Promotion & Tagging Designs

### Rebuild vs. Promotion Trade-off
Under a traditional "Artifact Promotion" model, a compiled image from dev is directly tagged and pushed to production without rebuilding. In this project, **promotion requires a full rebuild**. 

* **Why a rebuild is necessary**: The container metadata design relies on baking variables at compile time.
  * The production image must contain `ENV IMAGE_VERSION=<semver>` and standard OCI labels representing the release tag.
  * The dev image contains `ENV IMAGE_VERSION=<image_version>-dev`.
  * To change this metadata and bake the correct release version, the image **must** be re-compiled from the Dockerfile.
* **Consequence**: This introduces a slight risk that external factors (e.g., changes in upstream Ubuntu base packages or dependencies pulled during the production build) could cause a drift between what was tested in dev and what is pushed to production.
* **Mitigation**: The production build pipeline runs the same smoke-test validations as the dev pipeline before pushing to Docker Hub. We will also unify the local and CI smoke-test suites (see Gap B).

### Tagging Design Alignment
To unify the tagging design between development and production, we adopt the following recommendation:

1. **Tag Alignment**:
   * **Dev builds** will be tagged with a moving `:dev` tag and an image-version specific tag with a `-dev` suffix (e.g., `:5.5.2-dev`), mirroring production's `:latest` and `:5.5.2`.
   * **Inside-container metadata** (`IMAGE_VERSION` environment variable and labels) will be set to `<image_version>-dev` (e.g., `5.5.2-dev`) instead of the raw `dev-<sha>`.
   * **Absolute commit tagging** is retained using `:dev-<sha>` to ensure developers can trace any dev container back to its source commit.
2. **Benefits of this design**:
   * Pulling the dev image for Unraid testing uses the project's own version scheme (`5.5.2-dev`) instead of the third-party client version (`dev-5.1.0`), making the relationship between the tested dev image and the final production release explicit and obvious.
   * Container metadata verification (`IMAGE_VERSION` environment check) evaluates the actual release metadata structure, rather than a raw hash format.

---

## 4. Newly Identified Gaps & Inefficiencies

### Gap A: Workspace Hygiene & Stale Rules
* **Unpruned Rules**: `.ai/rules/engineering-rules.md` and `.ai/rules/security-rules.md` still contain boilerplate sections for unrelated archetypes (e.g. Web UI/BFF, API/Backend Services) that should have been deleted. This dilutes the focus of rules meant for a local script/CLI archetype.
* **Stale Plans and Debug Logs**: Completed implementation plans (e.g., `dev-workflow.md`, `unified-builds.md`) and the resolved debug report `publish-dev-smoke-test-failure.md` are sitting in the root of `/plans/` and `/debug/` instead of being moved to their respective `/archive/` subfolders.

### Gap B: Smoke Test Code Duplication
* **Redundant Inline YAML Code**: The GitHub Actions workflows `publish-dev.yml` and `publish.yml` manually duplicate inline bash code to run the 3 stateless smoke tests (label validation, `--version` check, and `iptables` drop policy verify).
* **Maintenance Overhead**: If a smoke-test command changes, it must be edited in three separate places: `scripts/verify.sh`, `publish.yml`, and `publish-dev.yml`.

### Gap C: CI/Local Testing Disparity
* **CI skips runtime verification**: `scripts/verify.sh` performs Check 4 (starting a container for 12 seconds to verify s6 starts `nordvpnd` and creates `nordvpnd.sock`). CI workflows omit this check and only run stateless checks.
* **Risk**: Init-stage s6 crashes (such as capabilities or environment problems) that break the daemon on startup will pass CI but fail locally.

### Gap D: Git Trigger Path-Filter Discrepancy
* **The Discrepancy**: Documentation in `SESSION_NOTES.md` and `docs/build-and-publish.md` states that the `publish.yml` trigger on the `main` branch includes a path filter (`paths: ['Dockerfile']`) to bypass running on unrelated commits. However, in `publish.yml`, the trigger definition lacks this path filter.
* **Impact**: Unrelated commits (e.g., documentation edits, helper script tweaks) merged to `main` trigger the production release workflow unnecessarily, wasting GHA runner time.

### Gap E: Duplicated Repo Scraping Logic
* **Duplication**: The logic to query `https://repo.nordvpn.com/...` using `curl` and `grep` to parse the latest NordVPN version is duplicated across four files:
  1. `scripts/check-version.sh`
  2. `scripts/dev-latest.sh`
  3. `.github/workflows/publish-dev.yml`
  4. `.github/workflows/check-nordvpn-release.yml`
* **Impact**: If the NordVPN Debian package repository format changes, all four files will break and must be updated individually.

### Gap F: Version Bump Doc Mismatch
* **Mismatch**: `AGENTS.md` states that running `task bump` updates all 5 version locations including `.ai/current.md`. However, `bump.sh` was recently updated to *not* touch `.ai/current.md` to prevent overwriting narrative handoff state.
* **Impact**: Contradictory rules for version bumps.

### Gap G: Taskfile Default Precondition UX
* Running `task` (default) fails with a hard error (`Variable .GIT_TAG is not set`) if HEAD is not tagged. This is a rough UX constraint for developers just running the command to confirm status on untagged commits.

---

## 5. Proposed Recommendations

1. **Prune and Redact Rules**: Clean up `.ai/rules/engineering-rules.md` and `security-rules.md`, removing all unused Web and API boilerplate.
2. **Archive Completed Files**: Create the appropriate `/archive/` folders and sweep completed plans/debug logs into them.
3. **Consolidate Repo Scraping Logic**: Extract the Debian repo scraping query into a single helper script `scripts/get-latest-version.sh` that outputs the clean version string. Make other scripts and workflows call this helper.
4. **Fix Git Trigger Path Filter**: Add `paths: ['Dockerfile']` to the branch-push trigger in `publish.yml` to align the implementation with the documentation and avoid redundant CI runs.
5. **Refactor `verify.sh` for Reuse**: Modify `scripts/verify.sh` to accept an optional image reference (e.g., `bash scripts/verify.sh fredplex/nordvpn:dev-abc1234`).
6. **Unify CI and Local Tests**: Replace the duplicated inline shell checks in GHA YAML files with a single step running `bash scripts/verify.sh <image_ref>`.
7. **Run Runtime Check in CI**: Let `verify.sh` run its runtime daemon socket check in CI (which takes only 12 seconds and runs cleanly on GitHub runners since they support docker capabilities).
8. **Unify Dev Tags**: Update `Taskfile.yml` and dev scripts to support tagging/pushing `:dev-<nordvpn_version>` and `:<image_version>-dev` locally.
9. **Align Version Bump Documentation**: Update `AGENTS.md` and other documentation files to correctly specify that `.ai/current.md` must be hand-updated during version bumps.
10. **Improve Taskfile Default UX**: Modify the default task in `Taskfile.yml` to display info gracefully or warn instead of failing when HEAD is untagged.

---

## 6. Proposed Changes

Below are the files targeted for modification across the codebase:

### Workspace Hygiene & Rules
#### [MODIFY] [engineering-rules.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/.ai/rules/engineering-rules.md)
* Prune Web and API sections. Keep only CLI/Library and Shared standards.

#### [MODIFY] [security-rules.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/.ai/rules/security-rules.md)
* Prune Web API boundaries. Keep only Local Script/CLI and Shared principles.

#### [MODIFY] [AGENTS.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/AGENTS.md)
* Update the "Version bump locations" section to indicate `.ai/current.md` is hand-maintained, matching the actual `bump.sh` script behavior.

#### [DELETE] / [MOVE] plans to archive
* Move `dev-workflow.md`, `dockerfile-optimizations.md`, `fix-bump-preserve-current-md.md`, `fix-publish-dev-smoke-test.md`, `streamline-workflow.md`, `unified-builds.md`, `user-guide.md`, and `version-mechanism-refactor.md` into `.ai/plans/archive/`.

#### [DELETE] / [MOVE] debug logs to archive
* Move `publish-dev-smoke-test-failure.md` to `.ai/debug/archive/publish-dev-smoke-test-failure.md` (creating `/archive/` directory first).

---

### Scripts & Workflows
#### [NEW] [get-latest-version.sh](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/scripts/get-latest-version.sh)
* Add a simple bash script that queries the NordVPN Debian package pool and prints the latest clean version string (e.g. `5.1.0`).

#### [MODIFY] [check-version.sh](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/scripts/check-version.sh)
* Refactor to use `scripts/get-latest-version.sh` for fetching the latest version.

#### [MODIFY] [dev-latest.sh](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/scripts/dev-latest.sh)
* Refactor to use `scripts/get-latest-version.sh` for fetching the latest version.

#### [MODIFY] [check-nordvpn-release.yml](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/.github/workflows/check-nordvpn-release.yml)
* Refactor the version-check step to call `scripts/get-latest-version.sh`.
* Pass the computed suggested image version with a `-dev` suffix as the `image_version` input to the dev workflow.

#### [MODIFY] [publish-dev.yml](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/.github/workflows/publish-dev.yml)
* Refactor inputs to accept `image_version` (defaulting to the parsed Dockerfile version with a `-dev` suffix if blank).
* Refactor the version-resolve step to call `scripts/get-latest-version.sh` when `nordvpn_version` input is `"latest"`.
* Build-push tags: tag and push `fredplex/nordvpn:<image_version>-dev` matching the production tag structure.
* Remove the inline duplicate smoke tests.
* Add a step to run `bash scripts/verify.sh fredplex/nordvpn:dev-${{ github.sha }}`.

#### [MODIFY] [publish.yml](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/.github/workflows/publish.yml)
* Add `paths: ['Dockerfile']` to the push trigger.
* Remove the inline duplicate smoke tests.
* Add a step to run `bash scripts/verify.sh fredplex/nordvpn:temp-release`.

#### [MODIFY] [verify.sh](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/scripts/verify.sh)
* Refactor to accept an optional image reference argument (defaulting to the local git-hash tag if not specified).
* Optimize runtime check to log warnings/info clearly when run inside headless CI environments.

---

### Local Dev Tooling
#### [MODIFY] [Taskfile.yml](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/Taskfile.yml)
* Update `dev-build` and `dev-push` to tag and push the `:dev-<nordvpn_version>` and `:<image_version>-dev` tags matching the CI behavior.
* Make the default task print tag information if present, or fall back to git hash gracefully without throwing a precondition error.

#### [MODIFY] [dev-build.sh](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/scripts/dev-build.sh)
* Append the version-specific tags (`dev-${version}` and `${image_version}-dev`) to the local build output.

---

## 7. Execution Plan

The execution is split into four phases:

### Phase 1: Workspace Hygiene, Docs & Scraping Consolidation (Risk: Low) - [COMPLETE]
* [x] 1. Prune `.ai/rules/engineering-rules.md` and `.ai/rules/security-rules.md`.
* [x] 2. Move completed plans and debug logs to `/archive/` directories.
* [x] 3. Update version bump details in `AGENTS.md`.
* [x] 4. Create `scripts/get-latest-version.sh` and refactor `check-version.sh` and `dev-latest.sh` to call it.
* [x] 5. Verify version checking works locally.

### Phase 2: Workflow Refactoring & CI Unification (Risk: Medium) - [COMPLETE]
* [x] 1. Edit `scripts/verify.sh` to support dynamic image references:
   ```bash
   IMAGE_REF="${1:-${REGISTRY}/${IMAGE}:${GIT_HASH}}"
   ```
* [x] 2. Test `scripts/verify.sh` locally with both standard and custom overrides.
* [x] 3. Update `publish-dev.yml` to call `scripts/get-latest-version.sh` and run `scripts/verify.sh`.
* [x] 4. Update `publish.yml` to add the `paths` filter, remove duplicate tests, and call `scripts/verify.sh`.
* [x] 5. Update `check-nordvpn-release.yml` to call `scripts/get-latest-version.sh` and pass version parameters.
* [x] 6. Trigger manual dev workflows in GHA to verify the unified tests execute and pass cleanly.

### Phase 3: Local Dev tag Alignment & Taskfile UX (Risk: Low) - [COMPLETE]
* [x] 1. Update `scripts/dev-build.sh` and `scripts/dev-latest.sh` to extract the compiled NordVPN version and apply the `:dev-${version}` and `:<image_version>-dev` tags.
* [x] 2. Update `Taskfile.yml`'s `dev-push` to push the new tags.
* [x] 3. Modify the `default` task precondition in `Taskfile.yml` to output commit info without requiring a git tag.
* [x] 4. Verify all tasks function locally.

### Phase 4: Reference Documentation Updates (Risk: Low)
Update references to GHA triggers, unified testing, scraping helpers, and new dev tags:
1. **[architecture.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/docs/architecture.md)**: Update the data flow diagram, build manifestation table, and gotchas list to document the new `paths` filter, `get-latest-version.sh` scraper, and `:dev-<version>`/`:<image_version>-dev` dev tags.
2. **[build-and-publish.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/docs/build-and-publish.md)**: Document `image-version-dev` tagging, trigger path updates, `verify.sh` runner execution in CI, and options for manual workflows.
3. **[quick-build-checklist.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/docs/quick-build-checklist.md)**: Align local dev/production quick checklists, adding references to `:dev-<version>` and `:<image_version>-dev` tagging verification commands.
4. **[user-guide.md](file:///c:/Users/fredp/Documents/GitHub/nordvpnplex/docs/user-guide.md)**: Update flowcharts, task commands tables, dev build instructions, and GHA lists to reflect all consolidated and aligned logic.

---

## 8. Verification Plan

### Automated Tests
* Run `task verify` locally to ensure the refactored verify script still functions cleanly against local test builds.
* Trigger GHA validations by pushing the task branch: GHA should successfully build and run the PR validations.

### Manual Verification
* Run `task dev-latest` and check local docker images: verify that the dev tags (including `:<image_version>-dev`) are successfully applied to the local image.
* Dispatch GHA `Publish Dev to Docker Hub` manually from the GitHub UI to ensure the CI validation step runs and passes via the unified `verify.sh` script.
* Review updated markdown files in `/docs` to ensure they render cleanly and have no broken cross-links.
