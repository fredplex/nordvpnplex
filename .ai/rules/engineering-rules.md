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

## 2. Shared Development Standards (All Projects)

### Error Handling
- Use normalized error categories, not raw error messages.
- Never expose internal paths, credentials, or stack traces in error responses.

### Commit Discipline
- One logical change per commit.
- Never commit directly to `main` — always use task-specific branches (`feature/<name>`, `fix/<name>`, `chore/<name>`).
- Use semantic commit prefixes (`feat`, `fix`, `chore`, `test`, `refactor`, `docs`).

