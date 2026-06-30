<!-- prime: version=3.0.0 template=.ai/rules/mutation-rules.md date=2026-06-30 -->
---
paths:
  - "Dockerfile"
  - "rootfs/**"
  - "scripts/**"
  - "Taskfile.yml"
  - ".github/workflows/**"
---

# Mutation Rules

---

## Core Principle

**Read-only is the default. Mutations are exceptions.**
State-changing operations must be explicitly scoped, approved, and guarded.

---

## Mutation Taxonomy

### This Project (Docker container build)

- **Observational**: Reading files, running `docker inspect`, checking version info. No approval needed.
- **Safe mutations**: Version bumps (via `task bump`), documentation edits, rootfs script edits. Require owner confirmation before applying.
- **Publish gate**: Building and pushing Docker images. **Always requires human** — run `task docker-build`, `task verify`, then `task release`. Never automate the publish step.
- **Forbidden**: Pushing to remote without instruction, bumping base image without instruction, modifying Taskfile.yml without instruction.

---

## Currently Approved

- `version bump` — via `task bump` or direct Dockerfile/README.md/CLAUDE.md edits. Show diff first, wait for approval. `.ai/current.md` is hand-maintained — bump.sh no longer writes it (fixed 2026-06-24).
- `rootfs/ script edits` — cont-init.d, services.d, usr/bin scripts. Show diff first, wait for approval.
- `documentation updates` — AGENTS.md, CLAUDE.md, docs/, .ai/ files.
- `GitHub Actions workflow edits` — when explicitly requested.
- `Taskfile.yml: env: DOCKER_BUILDKIT: "1"` — top-level env block addition (approved 2026-06-26). Ensures BuildKit for `COPY --chmod`. No other Taskfile.yml edits are pre-approved.
- `Taskfile.yml: task verify-live` — new task added after `verify` (approved 2026-06-26). Wraps `scripts/connect-test.sh`. No other Taskfile.yml edits are pre-approved.

---

## Required Protections

### For version bumps
1. **Verify package exists first** — check `https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/` for the `.deb` before editing any file.
2. **Confirm versions with owner** — do not assume what the new version strings should be.
3. **Show diff before applying** — never silently edit version-sensitive files.
4. **All 5 locations in one commit** — Dockerfile (×2), README.md, CLAUDE.md. `.ai/current.md` is updated manually.

### For rootfs/ edits
1. **LF line endings** — CRLF causes `bad interpreter` errors inside the container.
2. **Atomic adds** — new cont-init.d scripts must use the correct filename prefix to control ordering.
3. **Never block init** — no sleep loops or background processes in cont-init.d scripts.

### Publish gate (always human)
1. `task docker-build` — owner verifies the image builds locally.
2. `task verify` — owner runs smoke tests (4 checks must pass).
3. `task release` — owner creates tag and pushes; triggers GitHub publish workflow.
4. Never run `git push` or `git push --tags` on behalf of the owner.
