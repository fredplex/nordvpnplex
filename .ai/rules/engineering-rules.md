<!-- prime: version=3.0.0 template=.ai/rules/engineering-rules.md date=2026-06-30 -->
---
paths:
  - "**"
applies_to: "Container / CLI archetype"
---

# Engineering Rules

Implementation rules for coding in **nordvpn**.

---

## 1. Container & Local Script / CLI Archetype Rules

*Rules for local tools, container configurations, and shell scripts.*

### Design Constraints
- Maintain zero runtime dependencies outside of standard Unix utilities and the base image unless explicitly approved in the project spec.
- File system mutations must be atomic (tmp-then-rename) to prevent corruption.
- Scope all write operations strictly inside the resolved target directory.
- Avoid side-effects inside templates or pure logic helper functions.

---

## Shared Development Standards (All Projects)

### Error Handling
- Use normalized error categories, not raw error messages.
- Never expose internal paths, credentials, or stack traces in error responses.

### Commit Discipline
- One logical change per commit.
- Never commit directly to `main` — always use task-specific branches (`feature/<name>`, `fix/<name>`, `chore/<name>`).
- Use semantic commit prefixes: `feat`, `fix`, `chore`, `test`, `refactor`, `docs`.
  Scope is optional but conventional — use the domain or area changed: `feat(rootfs):`, `fix(ci):`, `chore(handoff):`.
  Both `feat:` and `feat(scope):` are valid. A scope is recommended when the change is confined to one area;
  omit when the change is cross-cutting.

---

## Documentation Sync Rule

When a change alters behavior, architecture, features, rules, tech stack, or user-facing
workflows, updating documentation is **part of the change — not optional follow-up**.

**Rule: update both the `docs/` file and its `.ai/` working copy in the same commit as
the change. Do not defer.**

See `.ai/workflows/implementation.md` — *Documentation Sync* for the pairs table and
full protocol.
