# Plan: Streamline the Build & Update Workflow

Status: **Tier 1 complete | Tier 2 complete | Tier 3 deferred**
Author: Claude (Opus 4.8 / Sonnet 4.6)
Date: 2026-06-22

---

## Guiding principle (non-negotiable)

The owner keeps a **human gate at build and push**. Nothing here auto-pushes an image or
auto-merges a version bump. The human still:
- reviews any proposed version change,
- runs the build locally to verify,
- creates the git tag and pushes it.

What we are eliminating:
- manually watching the NordVPN release page,
- hand-editing the same version string in multiple files,
- eyeball-only verification of the built image,
- silent breakage from wrong package versions or line endings,
- manual `docker push` / `docker tag` commands after local verification.

---

## Owner decisions (recorded 2026-06-22)

| Question | Decision |
|---|---|
| Taskfile edits | **Approved** for R2, R3, R6, R9 |
| CI | **Approved** — local verification (R6) + 3 GitHub Actions workflows (see Tier 2) |
| Renovate | **Removed entirely** — `renovate.json` deleted |
| NordVPN deb path | **Confirmed** — `…/pool/main/n/nordvpn/` already implemented in `scripts/check-version.sh` |
| Single source of truth | **Approved** — README.md / CLAUDE.md version lines are tool-generated, never hand-edited |

---

## Target workflow (once all tiers complete)

```
task check-version                              ← manual check, or wait for weekly GitHub PR
task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y.y.y  ← edits all files + shows diff
task docker-build                               ← local build for verification
task verify                                     ← smoke-test: version, daemon, kill-switch
git add -p && git commit                        ← human reviews and commits
git tag -a <IMAGE_VERSION> -m "bump to NordVPN <NORDVPN_VERSION>"
git push --tags                                 ← triggers GitHub publish action
```

`task docker-push` and `task docker-publish` become obsolete once Tier 2 is live.

---

## Tier 1 — Local ergonomics ✅ COMPLETE

### R1. Single source of truth ✅
`Dockerfile` ARGs are canonical. `README.md`, `CLAUDE.md`, and `.ai/current.md` are all
updated by `scripts/bump.sh` — never hand-edited.

### R2. `task bump NORDVPN_VERSION=x IMAGE_VERSION=y` ✅
[scripts/bump.sh](../../scripts/bump.sh) validates format, verifies the package exists,
edits all 4 locations in one shot, and prints `git diff`. Does not commit/tag/build/push.

### R3. `task check-version` ✅
[scripts/check-version.sh](../../scripts/check-version.sh) scrapes
`https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/`, shows latest 5 available
versions vs. pinned, and prints the exact `task bump` command if an update is available.

### R4. Renovate removed ✅
`renovate.json` deleted. No further action needed.

---

## Tier 2 — GitHub Actions + local smoke-test

Three independent GitHub Actions workflows + one local task. Each is shippable on its own.

### R5. Weekly version-detection cron
**Problem:** Nobody is reliably watching for NordVPN releases.
**Workflow:** `.github/workflows/check-nordvpn-release.yml`
- Trigger: cron, every Monday 08:00 UTC
- Steps: run `scripts/check-version.sh`; if a newer version exists, run `scripts/bump.sh`
  with the new version and open a **draft PR**
- The PR title states the new version; body shows the diff and instructs the human to set
  `IMAGE_VERSION` before merging
- **Never builds or pushes.** Human reviews, adjusts `IMAGE_VERSION`, merges, then builds locally.
- Requires: `GITHUB_TOKEN` (automatic in Actions — no extra secrets needed)

### R6. `task verify` — local smoke-test
**Problem:** Verification after `task docker-build` is eyeball-only.
**Proposal:** [scripts/verify.sh](../../scripts/verify.sh) + Taskfile task that:
1. Starts the just-built image with `--cap-add=NET_ADMIN --cap-add=NET_RAW` and no TOKEN
2. Asserts `/.version` contains the expected git hash (local build behaviour — see AGENTS.md)
3. Asserts `nordvpn --version` reports the expected `NORDVPN_VERSION`
4. Asserts the daemon socket `/run/nordvpn/nordvpnd.sock` appears within 10s
5. Asserts iptables OUTPUT chain policy is DROP (kill-switch active)
6. Stops and removes the container
- Runs entirely without a live VPN token or internet connection

### R7. PR build-validation CI
**Problem:** Dockerfile/script errors only surface during a manual local build.
**Workflow:** `.github/workflows/build-validate.yml`
- Trigger: pull_request (any branch → main)
- Steps: `docker build --platform linux/amd64` — **build only, no push, no registry login**
- Catches: broken `apt-get install`, Dockerfile syntax errors, bad `COPY` paths, script
  permission issues
- This is a safety net, not a release pipeline

### R_publish. Tag-triggered publish (replaces `task docker-publish`)
**Problem:** Manual `docker tag` + `docker push` after local verification is error-prone
and requires Docker credentials locally.
**Workflow:** `.github/workflows/publish.yml`
- Trigger: push of a tag matching `[0-9]+.[0-9]+.[0-9]+` (e.g. `5.6.0`)
- Steps: `docker build` → push `:latest` + `:<tag>` to Docker Hub
- Requires two repo secrets: `DOCKER_USERNAME`, `DOCKER_TOKEN`
- **Human gate is the tag push** — the owner still creates and pushes the tag manually;
  this just removes the need to run `task docker-publish` locally
- Makes `task docker-push` and `task docker-publish` obsolete (can be removed or kept for
  local fallback)

---

## Tier 3 — Docs polish (deferred)

### R8. Project-specific README rewrite
Replace the verbatim `bubuntux/nordvpn` copy with a README specific to this fork: correct
image name, Unraid usage notes, the env-var table from AGENTS.md, real `## Changelog`.
**Effort:** M. **Touches:** `README.md`.

### R9. Auto-generated Changelog from tags
Derive `## Changelog` entries from annotated git tag messages — the convention
`"bump to NordVPN x.x.x"` already carries the needed text.
**Effort:** S (depends on R8). **Touches:** `Taskfile.yml`, `README.md`.

---

## Implementation order for Tier 2

Recommended sequence (each independently shippable):

1. **R6** (`task verify`) — pure local, no GitHub setup needed, immediate value
2. **R_publish** (tag-triggered publish) — needs Docker Hub token added to repo secrets;
   eliminates the biggest remaining manual step
3. **R7** (PR build validation) — low-effort safety net; add alongside R_publish
4. **R5** (weekly cron PR) — implement last; depends on R_publish being in place so the
   human's post-merge flow is already streamlined

---

## Constraints honored throughout
- No auto-push of any image — tag push is always a manual human action
- No base-image bumps without explicit instruction
- Human reviews every version change diff before committing
- `rootfs/` LF line endings respected in any generated scripts
- Taskfile edits limited to approved tasks: R2, R3, R6, R9
