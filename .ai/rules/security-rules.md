<!-- prime: version=3.0.0 template=.ai/rules/security-rules.md date=2026-07-17 -->
---
paths:
  - "**"
applies_to: "Container / CLI archetype"
---

# Security Rules

Trust boundaries and security controls for **nordvpn**.

---

## 1. Local Script & Container / CLI Security Boundaries

*Security controls for CLI utilities, local tools, libraries, and containers.*

### Directory Containment
- Restrict all write operations strictly inside the resolved target directory path to prevent directory traversal attacks (e.g. path injection containing `../`).
- Resolve all path inputs using absolute paths and validate them before writing.

### Command Execution Safety
- Keep command execution bounded. If calling shell execution, ensure inputs are validated, sanitized, or escaped to avoid shell command injections.

---

## Shared Security Principles (All Projects)

### Input Validation
- Validate and sanitize all inputs at the entrypoint boundary.
- Handle malformed inputs gracefully without crashing or leaking details.

### Redaction in Logs
- Never log passwords, tokens, API keys, or raw request payloads containing sensitive personal details.
- Avoid printing full stack traces to the user output.
