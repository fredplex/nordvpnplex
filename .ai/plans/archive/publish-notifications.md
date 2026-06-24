# Publish notifications — go GitHub-native

Created: 2026-06-24 | Status: Complete (merged via `chore/publish-native-notify`; commits `7c61b2a` + `add8fdc`)

## Background

There is currently no notification when the production release pipeline runs.
`publish.yml` ends by pushing a **git tag** (`Tag git release` step), which is silent —
a pushed tag does not notify anyone. So a successful publish to Docker Hub produces no
signal; the owner only learns of it by checking the Actions tab or Docker Hub.

An earlier draft added a third-party SMTP email action (`dawidd6/action-send-mail`)
requiring four secrets (SMTP host/port/user + a Gmail app password). That was reverted
in favour of a GitHub-native approach with no third-party action and no SMTP secrets.

## The two notification cases, natively

| Case | Native mechanism | Code needed |
|------|------------------|-------------|
| **Failure** ("bad") | GitHub already emails the run's actor / scheduled-workflow editor when a run fails. Controlled by **Settings → Notifications → Actions**. | None — settings only |
| **Success** ("good") | A published **GitHub Release** emails everyone **watching the repo for Releases**. | Replace the tag step with `gh release create` |

`gh` is GitHub's own CLI, pre-installed on runners and authenticated by the built-in
`GITHUB_TOKEN` (`github.token`). No new secrets. `gh release create` creates the tag
**and** the Release in one call, so it replaces the existing manual tag step.

## Roles in this change (agent / human / GitHub)

This is the role split the documentation must make explicit:

| Actor | Responsibility for release notifications |
|-------|------------------------------------------|
| **AI agent** | Implements the workflow change + doc updates **on a branch**; shows diffs; never merges or pushes to remote without explicit owner approval. The agent does **not** receive or act on notifications. |
| **Human (owner)** | **One-time setup**: enable repo **Watch → Custom → Releases** (to receive success emails) and confirm **Settings → Notifications → Actions** failure emails are on. **Ongoing**: receives the success (GitHub Release) and failure (Actions) emails and decides what to do. Remains the merge/release gate. |
| **GitHub** | Runs `publish.yml`; `gh release create` (auth = built-in `GITHUB_TOKEN`) creates the tag + Release; GitHub's notification system then emails **watchers on Release publish** and emails the **actor/owner on workflow failure**. No third-party service, no secrets. |

## Scope

In scope:
- **Phase 1 (code)**: Replace the `Tag git release` step in `.github/workflows/publish.yml`
  with a `Publish GitHub Release` step (`gh release create`) that creates the tag +
  release and thereby triggers GitHub's native release-published notification.
- **Phase 2 (docs)**: Document the design change and the agent/human/GitHub roles across
  the five product docs (see the per-file table below).

Out of scope:
- No SMTP / third-party email action (reverted).
- No notifications on the daily checker or dev builds — the checker already
  self-announces via its draft PR, and failures are covered by native Actions emails.
- No change to build/smoke-test/push logic.
- Pre-existing unrelated doc drift (e.g. "weekly" vs "daily" cron wording, stale
  `/.version` reference in build-and-publish.md §4.3) is **not** corrected here — flagged
  for a separate docs pass to keep this change focused.

## Changes

### Phase 1 — `.github/workflows/publish.yml` (code)

Replace the `Tag git release` step (currently ~lines 160–176: sets git identity, dedups,
creates an annotated tag, pushes it; guarded by
`release_needed == 'true' && github.ref_type != 'tag'`) with:

```yaml
      - name: Publish GitHub Release
        if: steps.release_version.outputs.release_needed == 'true'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          TAG="${{ steps.release_version.outputs.image_version }}"
          NORD_VER="${{ steps.release_version.outputs.nordvpn_version }}"
          if gh release view "$TAG" >/dev/null 2>&1; then
            echo "Release $TAG already exists. Skipping."
            exit 0
          fi
          gh release create "$TAG" \
            --target "${{ github.sha }}" \
            --title "nordvpn $TAG — NordVPN ${NORD_VER}" \
            --notes "Published \`fredplex/nordvpn:latest\` and \`:$TAG\` to Docker Hub. NordVPN client ${NORD_VER}. Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

Decisions (confirmed by owner): lightweight tag is fine (release notes carry the context),
explicit one-line notes (not `--generate-notes`), and the `github.ref_type != 'tag'` guard
is dropped so the manual `task release` path also produces a Release/notification. The
`gh release view` check prevents duplicate-release errors; `--target ${{ github.sha }}`
pins the tag to the release commit on the merge-to-main path. `contents: write` is already
on the job.

### Phase 2 — Documentation updates

Each file gets the design change described and the agent/human/GitHub roles made explicit.

| File | Section(s) | Change |
|------|-----------|--------|
| `docs/architecture.md` | Data Flow → "Release workflow" ASCII (lines ~18–40) | Replace the bottom-right `Git Tag push (back to repo)` node with `GitHub Release (creates tag + native notification email)`. |
| `docs/architecture.md` | Key Architectural Decisions (after "Human-in-the-loop publish gate", ~line 129) | Add a new decision **"Release notifications — GitHub-native"**: context (silent tag push), decision (`gh release create` for success + native Actions emails for failure), rationale (no third-party action / no SMTP secrets; real Releases page), consequences (owner must Watch → Releases; lightweight tag), and the agent/human/GitHub role split. |
| `docs/build-and-publish.md` | §1 Architecture overview diagram (lines ~25–41) | `Auto-creates & pushes Git Tag back to repo` → `Publishes GitHub Release (creates tag + sends notification email)`. |
| `docs/build-and-publish.md` | §3 diagram (lines ~104–109) + "who does what" → "Publishing and tagging (automated)" (lines ~124–127) | Update the tagging line to "Publishes a GitHub Release (tag + release notes), which sends a native notification email to repo watchers." |
| `docs/build-and-publish.md` | §4.3 Tag-triggered publish (and §4 intro) | Note that the publish job now finishes by **creating a GitHub Release** (tag + release) on both the merge and tag paths, and that this is what produces the success notification. |
| `docs/build-and-publish.md` | New subsection **§4.5 Release notifications** (or appended to §7) | Document: success = GitHub Release email to watchers; failure = native Actions email to actor/owner; **one-time owner setup** (Watch → Custom → Releases; confirm Settings → Notifications → Actions). Secrets needed: none (`GITHUB_TOKEN`). Include the agent/human/GitHub roles table. |
| `docs/feature-state.md` | Build & Release Tooling table | Add row: `Release notifications (GitHub Release + native failure email)` — ✅ Implemented — "publish.yml creates a GitHub Release on success (notifies watchers); GitHub emails on workflow failure. No secrets." Update the existing `GitHub Actions: publish` row note to mention "creates a GitHub Release (tag) + notification". |
| `docs/feature-state.md` | Recently Shipped + Last Updated | Add a 2026-06-24 entry for native release notifications; bump `Last Updated` to 2026-06-24. |
| `docs/quick-build-checklist.md` | "Typical Release Workflow" (step 3 Monitor, ~lines 195–202) | Add: "On success you receive a **GitHub Release** email; on failure, a GitHub Actions email. (One-time: Watch → Custom → Releases.)" |
| `docs/user-guide.md` | §2 mermaid (node `I`, line ~45) | `GHA: Auto-create & push Git Release Tag` → `GHA: Publish GitHub Release (tag + notification email)`. |
| `docs/user-guide.md` | §2 Responsibility Matrix (lines ~51–61) | Rename the `Git Release Tagging` row to `Git Release & Notification` (Executed By: GitHub Actions) and add a clarifying line: GitHub sends the release email to watchers; the owner receives/acts on it; the agent only implements. Optionally add an explicit `Notification (success/failure)` row keyed to GitHub. |
| `docs/user-guide.md` | §4 "Publish to Docker Hub" → step 6 (line ~300) | Change "Automatically creates the corresponding Git tag and pushes it back" to "Creates a **GitHub Release** (tag + release notes), which sends a native notification email to repo watchers." Note secrets: none beyond `GITHUB_TOKEN`. |
| `docs/user-guide.md` | §7 One-time setup (or new §7 note) | Add notification opt-in: Watch → Custom → Releases; confirm Settings → Notifications → Actions failure emails. State no SMTP/secrets required. |

A shared **roles table** (agent / human / GitHub) is added to at least `architecture.md`
(decision block) and `user-guide.md` (responsibility matrix area), so the human, agent,
and GitHub responsibilities are unambiguous in the canonical docs.

## Execution Order

| # | Phase | Action | Commit prefix |
|---|-------|--------|---------------|
| 1 | 1 | Replace tag step with `gh release create` in `publish.yml` | `chore(ci):` |
| 2 | 2 | Apply the doc updates (5 files) | `docs:` |
| 3 | — | Owner: set Watch → Releases + confirm Actions failure emails | — |
| 4 | — | Merge to `main` (with approval) | merge |
| 5 | — | Validate on next real release (or a manual `workflow_dispatch`) | — |

(Phases 1 and 2 can be one commit or two — owner's preference. Both reviewed before merge.)

## Validation

- `bash -n` on the embedded release script; YAML structure preserved (change is within the
  job's steps list).
- Docs: internal consistency check — no remaining "pushes Git Tag back" wording in the five
  files where it described the release step; roles table present in architecture.md and
  user-guide.md.
- End-to-end: the next release (or a manual `publish.yml` dispatch with version inputs)
  creates a GitHub Release for the image version and sends a native email to the owner
  (once watching Releases). Confirm the Release appears under the repo's Releases tab and
  the tag still points at the correct commit.

## Open Questions

- **Existing tags** (`5.5.0`, `5.5.1`, …) won't retroactively become Releases — only future
  releases get a Release object. Backfill is optional and out of scope. (Recommend: skip.)
- **One commit or two** for code vs docs. (Recommend: two — `chore(ci):` then `docs:`.)
