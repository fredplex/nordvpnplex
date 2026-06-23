# Product Documentation

This folder contains the comprehensive product, architecture, and operational documentation for **nordvpn**.

---

## Quick Navigation

**Start here**:
- **`AGENTS.md`** (repo root) — agent onboarding entry point
- **`docs/user-guide.md`** — owner's complete operational reference (commands, workflows, env vars)
- **`docs/quick-build-checklist.md`** — one-page checklist for local build, verify, bump, release, and troubleshooting
- **`docs/project-rules.md`** — product vision and boundaries
- **`docs/architecture.md`** — architecture philosophy and design decisions

---

## Documentation Structure

### Core Product Specs

- **`project-rules.md`** — product vision, boundaries, and governance. What we build, what we don't, why.
- **`feature-state.md`** — authoritative feature inventory. Current state of all features, implementation status, known issues.
- **`feature-roadmap.md`** — phase plan and future direction. *(create when needed)*

### Architecture & Design

- **`architecture.md`** — core architecture philosophy, layer discipline, architectural decisions.
- **`tech-stack.md`** — technology choices, rationale, and dependency versions.
- **`domain-models.md`** — entity definitions and domain layer contracts. *(create when needed)*
- **`ui-patterns.md`** — reusable UI patterns, component library guidance. *(Web/UI projects only — create when needed)*

### Deployment & Operations

- **`deployment.md`** — deployment guide. *(create when needed)*
- **`build-pipeline.md`** — CI/CD pipeline and release process. *(create when needed)*

### Integrations

- **`integrations/`** folder — all external integrations and data sources. *(create when needed)*

### Testing & Quality

- **`testing.md`** — testing strategy, framework configuration, and coverage expectations.

### Reference & Historical

- **`archive/`** folder — completed projects, deprecated docs. *(create when needed)*

---

## Key Principles

- **Current source is runtime truth.** If docs and code disagree, source wins. Report the mismatch.
- **`docs/` is comprehensive; `.ai/` is the working subset.** Major decisions have full context here.
- **Keep docs and code in sync.** When behavior changes, update both the `docs/` file and the corresponding `.ai/` working copy.

---

## Cross-References

| Topic | `docs/` | `.ai/` working copy |
|-------|---------|-------------------|
| Architecture | `architecture.md` | `.ai/memory/architecture-decisions.md` |
| Features | `feature-state.md` | `.ai/memory/project-state.md` |
| Rules | `project-rules.md` | `.ai/rules/` |
| Testing | `testing.md` | `.ai/workflows/validation.md` |
