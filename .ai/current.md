<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Version Logs Release Gap (2026-07-10)

**Status**: Debugged and fixed why the startup version-log feature (merged 2026-07-09) never
reached Docker Hub despite matching the running Unraid image's digest — Docker Hub `latest`
was a build from the day before the feature merged, and the feature's own merge carried no
`IMAGE_VERSION` bump, so the publish workflow's release gate correctly bypassed it. All 3
remediation phases implemented and validated on the task branch: an image-only version bump
(5.5.4 → 5.5.5) to ship the stranded feature, a hard-fail PR guard in `build-validate.yml`
that catches any future runtime-affecting change (`Dockerfile`/`rootfs/**`) merged without an
`IMAGE_VERSION` bump, and tooling/doc cleanup (`bump.sh` gained an optional Changelog-summary
argument so feature/fix bumps aren't mislabeled "Base image refresh"; corrected several
present-tense docs that still cited the pre-refresh base image digest or claimed `bump.sh`
edits `CLAUDE.md`).

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Version Logs Release Gap — 2026-07-10
- Container Startup Version Logs — 2026-07-09
- Build & Release Pipeline Review & Optimization — 2026-07-09

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base
image digest refresh (monthly cron).

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run
successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to
improve local build reproducibility.

---

## Session Handoff — 2026-07-10 (Version Logs Release Gap)

### What was just completed

| Commit | Change |
|--------|--------|
| `203e92a` | Debug findings + 3-phase remediation plan (`.ai/plans/version-logs-release-gap.md`) |
| `9b60b5f` | Phase A — bump `IMAGE_VERSION` 5.5.4 → 5.5.5 to ship the stranded feature; corrected Changelog wording |
| `fbdacc1` | Phase B — added a hard-fail guard to `build-validate.yml`: fails any PR that changes `Dockerfile`/`rootfs/**` without an `IMAGE_VERSION` bump; documented in `docs/build-and-publish.md` §4.2 |
| `faf5e8e` | Phase C — `bump.sh` gained an optional `CHANGELOG_SUMMARY` third argument; swept 14 files for the stale "bump.sh edits CLAUDE.md" claim and the rotated base-image digest citation |

### Stopping point

- Working tree: clean. All 3 phases committed on the task branch.
- Final pre-integration gates re-run on `faf5e8e` (HEAD): `task docker-build` passed;
  `task verify` — 3 passed, 0 failed, 1 known WARN (fake-token container exit — expected).

### Decisions / reasoning

- **Root cause was a release-pipeline gap, not a code or environment bug**: the feature
  worked correctly everywhere it was actually built (local, and would have worked in any
  published image) — it just was never included in a published image, because the merge
  that introduced it changed `Dockerfile`/`rootfs` but not `ARG IMAGE_VERSION`, and
  `publish.yml`'s release gate only publishes on version-bump diffs.
- **Fixed forward with a normal bump rather than a special-case release path** — Phase A is
  the same mechanism every other release uses; no one-off tooling needed.
- **Guard is a hard fail, not a warning** (owner's explicit choice) — any Dockerfile/rootfs
  change alters shipped image bytes, so silently-stranded runtime changes are a correctness
  gap, not a style preference.
- **Guard validated against real git history**, not just written and trusted: replayed
  against PR #12's actual diff (fails, as intended), this branch's diff (passes), and a
  docs-only commit (skipped as not applicable).
- **`bump.sh`'s new third argument is additive** — the 2-argument automated call sites
  (`check-nordvpn-release.yml`, `check-base-image.yml`) are untouched and still produce their
  original wording; only manual/feature bumps need to pass the new summary argument.

### Fragile areas

- **Local `bash` PATH ambiguity in this session's shell**: Windows' `C:\WINDOWS\system32\bash.exe`
  (WSL) resolves ahead of Git Bash on `PATH` in some PowerShell sessions in this environment;
  WSL's `docker` CLI can't see Docker Desktop's local image cache, so `task verify` fails
  there with a false "image not found". Prepending `C:\Program Files\Git\bin` to `PATH` for
  the session fixes it. Not a repo issue — flagging in case it recurs.
- Carried forward: s6 init daemon capability requirements during stateless `task verify` on
  local Docker Desktop setups.
