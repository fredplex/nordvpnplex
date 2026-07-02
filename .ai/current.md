<!-- prime: version=3.0.2 template=.ai/current.md date=2026-07-01 -->
# Current Project State

## Template re-prime v3.7.7 + testing.md merge (2026-07-02)

**Status**: AI workspace re-primed to templates v3.7.7. `GUIDE.md` and `definition-of-done.md` accepted as template-pure (no customization lost). `docs/testing.md` merged — real NordVPN testing content (two-tier verify/verify-live model, 4-check table, HEALTHCHECK behavior, troubleshooting) restored under the new template's section structure; generic JS-framework sections removed. (`fa82c87`, `20ac94a`)

### Recently Completed

> Keep the last 3 entries. Prune older items at session close — the full history lives in `SESSION_NOTES.md`.

- Template re-prime v3.7.7 + testing.md merge — 2026-07-02 (fa82c87, 20ac94a)
- prime-ai-docs v3.5.0 re-prime — 2026-07-01 (534c709)
- Fix check-base-image verify + docs — 2026-07-01 (2febec9, 6d1f7f5, 63549bd, 12ad5e6)

### Next step

None queued — awaiting direction. Watching for the next NordVPN release (daily cron) and base image digest refresh (monthly cron). Both automatically open draft PRs and publish tested dev builds.

**Future work logged**: Reconsider `apt-get upgrade` — once the base-refresh cadence has run successfully a few times, evaluate whether to remove `apt-get upgrade` from the Dockerfile to improve local build reproducibility.

---

## Session Handoff — 2026-07-02 (Template re-prime v3.7.7 + testing.md merge)

### What was just completed

| Commit | Change |
|--------|--------|
| `fa82c87` | Re-prime backup merge: `GUIDE.md` (3.5.0→3.5.3) + `definition-of-done.md` (3.0.2→3.0.3) accepted template-pure; `docs/testing.md` (3.0.4→3.0.5) merged — real project content restored under new template structure |
| `20ac94a` | Tracked `.ai-prime-manifest.json` update from the v3.7.7 run (left uncommitted after the prime commit) |
| this commit | Session close — current.md, active.md, SESSION_NOTES.md updated |

### Stopping point

- Working tree: clean of task work, commits `fa82c87` + `20ac94a`.
- Validation: N/A — workspace-only change; no source, Dockerfile, or rootfs changes (consistent with prior re-prime sessions).
- `.claude/settings.json` / `.claude/settings.local.json` intentionally left untracked this session — confirmed as personal machine config, not project config.

### Decisions / reasoning

- GUIDE.md guard fired again (3.5.0→3.5.3) — human ran the script directly (same pattern as the prior re-prime). Session picked up at GUIDE Step 5.
- Backup at `.ai-prime-backup/2026-07-02-00-02-29/`. Classification: `GUIDE.md` + `definition-of-done.md` Template-pure — no customization lost; `definition-of-done.md`'s update also auto-fixed the previously-flagged npm→`task` command drift. `docs/testing.md` is Project-specific — the regenerated template had replaced all real content with generic JS-framework boilerplate (Unit/Integration/E2E, Mock Data); restored the two-tier verify/verify-live model, 4-check table, HEALTHCHECK behavior, and troubleshooting from the backup under the new template's headings, dropping the non-applicable generic sections.
- `.ai-prime-manifest.json` staged and committed on explicit request, despite `GUIDE.md` Step 6 saying not to (it describes the file as gitignored — it is not, and has been tracked across multiple prior prime commits).
- `.claude/settings.json` staging was blocked by the auto-mode self-modification classifier (would have written a Bash permission allowlist into the shared repo); left untracked pending a deliberate decision on gitignoring `.claude/`.

### Fragile areas

- **Archetype sections still present in `definition-of-done.md`** (`hasArchetypeMarkers: true` confirmed in the v3.7.7 manifest) — Web UI/BFF, API/Backend, and CLI/Library/SDK sections are all still in the file, and none cleanly fits an infra/Docker-image project. Deferred across at least two re-prime sessions now; needs a human decision on which (if any) archetype to keep, or whether to write custom review-checklist content. `engineering-rules.md` likely carries the same three sections (not touched this run — unconfirmed).
- **`.ai/GUIDE.md` Step 6 is inaccurate about `.ai-prime-manifest.json`**: it instructs agents not to stage the file, describing it as a "gitignored runtime artifact." It is not in `.gitignore` and is git-tracked. Either the guide text or the ignore behavior should be corrected — neither has happened yet.
- **Base digest must be updated manually**: Dockerfile is pinned to `noble@sha256:53411508…`. A future base-refresh requires an explicit digest change — do not remove the pin.
- **`# syntax` directive must NOT be added to Dockerfile**: Triggers a 401 from Docker Hub for the BuildKit frontend in this environment.
- **Token for `task verify-live` stays outside the repo**: Never commit, print, or pass as CLI arg.
- **`.ai/current.md` is hand-maintained**: `bump.sh` no longer touches it. After any release PR, update this file by hand. `CLAUDE.md` (including the Built date) is handled automatically by `task bump`.
- **s6 init + capabilities**: Stateless `docker run` checks must use `--entrypoint /bin/bash` to bypass `00-firewall` when `NET_ADMIN` isn't granted.
- **`AGENTS.md` still has unfilled template placeholders** (Architecture section, Key Boundaries lists, Current posture line) — pre-existing, not touched this session.
