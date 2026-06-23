# Security Rules

Trust boundaries and security controls for **nordvpn**.

Choose the sections below that match your project archetype and delete the others:

---

## 1. Client-Server / Web API Security Boundaries

*Security controls for web, mobile, or backend API projects. Delete if N/A.*

### Trust Model
```
Untrusted: Browser / client / user inputs
Trusted:   Server-side controllers, domain layer, database, secrets store
```
All enforcement must occur at the server boundary. Client validation is only for UX.

### Secrets & Credentials
- Keep database credentials, API keys, and connection strings server-side only.
- Never expose credentials via client-accessible environment variables or include them in client-side builds.
- Strip internal database fields and raw server paths before responding to the client.

---

## 2. Local Script / CLI Security Boundaries

*Security controls for CLI utilities, local tools, and libraries. Delete if N/A.*

### Directory Containment
- Restrict all write operations strictly inside the resolved target directory path to prevent directory traversal attacks (e.g. path injection containing `../`).
- Resolve all path inputs using `path.resolve()` and validate them before writing.

### Command Execution Safety
- Keep command execution bounded. If calling `execSync`, ensure inputs are validated, sanitized, or escaped to avoid shell command injections.

---

## Shared Security Principles (All Projects)

### Input Validation
- Validate and sanitize all inputs at the entrypoint boundary.
- Handle malformed inputs gracefully without crashing or leaking details.

### Redaction in Logs
- Never log passwords, tokens, API keys, or raw request payloads containing sensitive personal details.
- Avoid printing full stack traces to the user output.
