# Engineering Rules

Implementation rules for coding in **nordvpn**.

Choose the sections below that match your project archetype and delete the others:

---

## 1. Web UI / BFF Archetype Rules

*Rules for client-server web apps (Next.js, Vite, React, etc.). Delete if N/A.*

### Data Access & Security
- UI components call feature hooks / state layer only.
- Feature hooks call same-origin API routes only.
- External API calls and database connections must stay server-side.
- Secrets must never be exposed via client-accessible environment variables.
- Mock data must be encapsulated in the data layer.

### UX & Browser Verification
- Every dynamic badge, counter, and status indicator must carry a `data-testid="{entity}-{id}-{element}"` attribute in the same commit.
- For any UI change, browser verification is mandatory before closing: start dev server, navigate to affected surfaces, check empty/null states.

---

## 2. API / Backend Service Archetype Rules

*Rules for backend servers (Express, Fastify, Go, Python, etc.). Delete if N/A.*

### Layer boundaries
- Routes/Controllers → Service/Domain Layer → Adapters/DB.
- Never leak raw database queries or third-party service responses to the client. Normalize all output.
- Bounded timeouts on all external calls. Handle failures gracefully without crashing.

---

## 3. CLI / Library / SDK Archetype Rules

*Rules for local tools, modules, or libraries. Delete if N/A.*

### Design Constraints
- Maintain zero runtime dependencies unless explicitly approved in the project spec.
- File system mutations must be atomic (tmp-then-rename) to prevent corruption.
- Scopes all write operations strictly inside the resolved target directory.
- Avoid side-effects inside templates or pure logic helper functions.

---

## Shared Development Standards (All Projects)

### Error Handling
- Use normalized error categories, not raw error messages.
- Never expose internal paths, credentials, or stack traces in error responses.

### Commit Discipline
- One logical change per commit.
- Never commit directly to `main` — always use task-specific branches (`feature/<name>`, `fix/<name>`, `chore/<name>`).
- Use semantic commit prefixes (`feat`, `fix`, `chore`, `test`, `refactor`, `docs`).
