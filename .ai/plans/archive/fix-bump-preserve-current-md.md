# Fix — `bump.sh` clobbers `.ai/current.md`

Created: 2026-06-24 | Status: Pending review

## Background

The automated NordVPN 5.1.0 draft PR (#3, branch `auto/nordvpn-5.1.0`) was opened by
the `check-nordvpn-release` workflow's `create-pr` job, which runs `scripts/bump.sh`.
The version-pinned edits were correct, but the PR also **overwrote `.ai/current.md`**,
replacing the human/agent-maintained handoff (the onboarding entry point — "Recently
shipped" history, open issues, fragile-area notes) with a terse generated stub. The
stub also injected stale release instructions (`git tag … && git push --tags`) that
contradict the unified pipeline (merging the PR auto-triggers `publish.yml`).

Root cause: `bump.sh` lines 45–82 do `cat > .ai/current.md` with a CI/local templated
heredoc — a full overwrite, not a targeted edit.

## Scope

In scope:
- Remove the `.ai/current.md` generation block from `scripts/bump.sh` (both CI and
  local branches).
- Update `bump.sh` header comment to state `current.md` is intentionally left for
  humans/agents to maintain.
- Add a closing reminder to the script output.

Out of scope:
- No change to the version-pinned `sed` edits (Dockerfile, README.md, CLAUDE.md) —
  those are correct.
- No change to the workflows themselves.
- No change to the format/content of `.ai/current.md`.

## Changes

| File | Line(s) | Change |
|------|---------|--------|
| `scripts/bump.sh` | 8–9 | Rewrite header comment: `current.md` no longer auto-generated |
| `scripts/bump.sh` | 45–82 | Delete the `# 4. .ai/current.md` block (CI + local heredocs) |
| `scripts/bump.sh` | end | Add reminder: update `.ai/current.md` by hand |

## Execution Order

| # | Action | Commit prefix |
|---|--------|---------------|
| 1 | Edit `bump.sh` (remove current.md handling) | `fix(scripts):` |
| 2 | Merge to `main` (checker runs bump.sh from main) | merge |
| 3 | Close PR #3, delete `auto/nordvpn-5.1.0` | — |
| 4 | Re-run `check-nordvpn-release` → clean PR | — |

## Validation

- `bash -n scripts/bump.sh` — syntax check.
- Dry-run the script logic mentally / locally: after the change, a bump touches only
  Dockerfile, README.md, CLAUDE.md.
- End-to-end: the re-run `check-nordvpn-release` PR diff must NOT include
  `.ai/current.md`.

## Open Questions

- Should `bump.sh` instead update only a single "Current Pinned Version" line in
  `current.md` (targeted `sed`) rather than dropping it entirely? Decision: drop it —
  `current.md` is a narrative handoff, not a generated artifact; a partial sed would
  still risk drift. The pinned version already lives in CLAUDE.md (which bump.sh does
  maintain).
