# Dockerfile Optimizations

Created: 2026-06-23 | Status: Pending review

## Background

The Dockerfile has accumulated a few suboptimal patterns over time — unnecessary `apt-get upgrade`, missing `--no-install-recommends`, a separate `chmod` layer with per-file enumeration, the `wireguard` metapackage instead of `wireguard-tools`, and inconsistent indentation. Applying these fixes will reduce image size, speed up builds, and improve maintainability without changing runtime behavior.

## Scope

What's in:
- Remove `apt-get upgrade -y` from the RUN layer
- Add `--no-install-recommends` to both `apt-get install` calls
- Consolidate COPY + chmod into a single layer using `COPY --chmod=0755`
- Replace `wireguard` metapackage with `wireguard-tools`
- Normalize tabs-to-spaces indentation on the rm -rf lines
- Extract `nordvpn-release` version to an `ARG` (optional stretch goal)

What's explicitly out:
- No Dockerfile restructuring or multi-stage builds
- No base image changes
- No changes to rootfs/ scripts, CI, or runtime behavior

## Changes

### Phase 1 — Core size/speed wins
| File | Line(s) | Change |
|------|---------|--------|
| `Dockerfile` | 21 | Remove `apt-get upgrade -y &&` |
| `Dockerfile` | 22, 26 | Add `--no-install-recommends` to both install calls |
| `Dockerfile` | 23 | Replace `wireguard` with `wireguard-tools` |

### Phase 2 — Layers and indentation
| File | Line(s) | Change |
|------|---------|--------|
| `Dockerfile` | 36–48 | Replace `COPY /rootfs /` + `RUN chmod ...` with `COPY --chmod=0755 /rootfs /` |
| `Dockerfile` | 30–34 | Normalize tab indentation to spaces |

### Phase 3 — Extract repo package ARG (optional)
| File | Line(s) | Change |
|------|---------|--------|
| `Dockerfile` | 7 (after IMAGE_VERSION) | Add `ARG NORDVPN_RELEASE='1.0.0'` |
| `Dockerfile` | 23 | Use `${NORDVPN_RELEASE}` in the URL |

## Execution Order

| # | Phase | Action | Commit prefix |
|---|-------|--------|---------------|
| 1 | 1 | Apply core size/speed wins | `chore(dockerfile):` |
| 2 | 2 | Consolidate COPY + chmod, fix indentation | `chore(dockerfile):` |
| 3 | 3 | Extract nordvpn-release version ARG | `chore(dockerfile):` |
| 4 | — | `task docker-build` + `task verify` | validation |

## Validation

- `task docker-build` must succeed
- `task verify` must pass all 4 checks
- Zero runtime behavioral change

## Open Questions

- Is `COPY --chmod=0755` supported in the base image's Docker version? (Docker CE 24+ and Docker Desktop 4.24+ include BuildKit by default — verify on owner's Windows setup if proceeding.)
