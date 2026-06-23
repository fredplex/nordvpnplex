# Review Checklist

Code review checklist for changes in this repository.

Choose the sections below that match your project archetype and delete the others:

---

## 1. Web UI / BFF Archetype Checklist

*Delete if N/A.*

- [ ] Client components import only feature hooks and shared UI primitives (no backend service SDKs).
- [ ] Feature hooks call same-origin API routes only.
- [ ] No secrets or internal credentials are leaked to the browser bundle.
- [ ] Every dynamic badge, counter, and status indicator has a `data-testid="{entity}-{id}-{element}"` in the same commit.
- [ ] Browser verification completed (checking null, empty, and happy paths).

---

## 2. API / Backend Service Archetype Checklist

*Delete if N/A.*

- [ ] API routes validate and sanitize inputs at the entry boundary.
- [ ] API responses normalize data and redact internal database or server fields.
- [ ] Secrets stay server-side (retrieved from secure env variables).
- [ ] Boundary timeouts are bounded on external calls.

---

## 3. CLI / Library / SDK Archetype Checklist

*Delete if N/A.*

- [ ] All package dependencies are Node.js built-in modules or explicitly approved packages.
- [ ] File writes are atomic, using safe temp-and-rename writes.
- [ ] Scoped file operations remain strictly inside targetDir boundaries.
- [ ] Template generators are side-effect free and output generic code.

---

## Shared Quality Standards (All Projects)

### Testing
- [ ] Logic changes have corresponding unit and integration tests.
- [ ] Test coverage goals are met (e.g. happy/unhappy paths).
- [ ] Temporary files or environment variables used in tests are cleaned up.

### Commit Hygiene
- [ ] One logical change per commit.
- [ ] Semantic prefixes are used (`feat`, `fix`, `chore`, `test`, `refactor`, `docs`).
