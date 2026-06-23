# Plan: Version mechanism refactor

Status: **Complete**
Author: Claude Sonnet 4.6
Date: 2026-06-22

---

## Problem summary

The current version-display mechanism has five issues:

1. **`>>` bug** — `RUN echo ${IMAGE_VERSION} >> /.version` appends rather than overwrites.
   Partial cache hits cause duplicate version strings in the file and garbled banner output.

2. **Non-standard storage** — `/.version` at the filesystem root has no Docker/Linux convention
   behind it. Cannot be queried without starting a container.

3. **Wrong layer** — `version_message` runs in the CMD chain alongside VPN startup logic.
   It belongs in `cont-init.d` (the project's established pattern for init-time work).

4. **No OCI labels** — CLAUDE.md already flags this: *"ARG IMAGE_VERSION should move or add
   org.opencontainers.image.version at some point."* Labels are the standard mechanism:
   queryable externally, visible in Docker Hub, tool-friendly.

5. **`verify.sh` coupled to the file** — checking `/.version` via `cat` ties the smoke-test
   to an implementation detail that shouldn't need to exist.

---

## Proposed changes

### Dockerfile

**Remove:**
- `RUN echo ${IMAGE_VERSION} >> /.version`
- `version_message &&` from CMD
- `chmod 0755 /usr/bin/version_message` from the chmod block
- Stale comment: `# set tags before docker-publish only! ...` (replaced by task release)

**Add:**
```dockerfile
# OCI standard image labels — queryable via: docker inspect <image> --format '{{json .Config.Labels}}'
LABEL org.opencontainers.image.title="nordvpn-unraid" \
      org.opencontainers.image.description="NordVPN Linux client Docker image for Unraid" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.vendor="fredplex" \
      org.opencontainers.image.source="https://github.com/fredplex/nordvpnplex"

# Expose version as ENV so scripts inside the container can read it at runtime
ENV IMAGE_VERSION=${IMAGE_VERSION}
```

**Resulting CMD** (cleaner, no banner step):
```dockerfile
CMD nord_login && nord_config && nord_connect && nord_watch
```

---

### New: `rootfs/etc/cont-init.d/00-version`

Replaces `rootfs/usr/bin/version_message`. Runs during s6 init — before any service starts —
which is where init-time logging belongs.

```bash
#!/bin/bash
echo "--------------------------"
echo "NordVPN Docker Client v.${IMAGE_VERSION}"
echo "--------------------------"
```

No shebang change needed. LF line endings required (.gitattributes covers this).

---

### Remove: `rootfs/usr/bin/version_message`

No longer referenced in Dockerfile CMD or anywhere else after this change.

---

### Update: `scripts/verify.sh` — check 1

**Current:** starts a container just to `cat /.version`
```bash
ACTUAL_VERSION="$(docker run --rm "${IMAGE_REF}" cat /.version 2>/dev/null || echo 'ERROR')"
if [[ "${ACTUAL_VERSION}" == "${GIT_HASH}" ]]; then ...
```

**Proposed:** use `docker inspect` — no container startup, faster and more reliable
```bash
ACTUAL_VERSION="$(docker inspect "${IMAGE_REF}" \
  --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep '^IMAGE_VERSION=' | cut -d= -f2 || echo 'ERROR')"
if [[ "${ACTUAL_VERSION}" == "${GIT_HASH}" ]]; then ...
```

Same logic, same pass/fail — local builds embed the git hash via `--build-arg IMAGE_VERSION=<hash>`,
published builds embed the semver tag. Behaviour unchanged, mechanism cleaner.

---

### Update: `AGENTS.md`

- Remove `/.version` reference from `version_message` description in file map
- Update `version_message` entry to `00-version` (cont-init.d)
- Note that `IMAGE_VERSION` ENV is the runtime version source

---

### Update: `docs/build-and-publish.md`

- Update the note about `/.version` vs ENV in section 4.3 (Publish workflow)
- Update `task verify` expected output section to reflect label/ENV check

---

## Files changed

| File | Action |
|---|---|
| `Dockerfile` | Remove `/.version` write, add OCI labels, add `ENV IMAGE_VERSION`, clean CMD and chmod |
| `rootfs/etc/cont-init.d/00-version` | Create — version banner in s6 init |
| `rootfs/usr/bin/version_message` | Delete |
| `scripts/verify.sh` | Update check 1 to use `docker inspect` ENV instead of `cat /.version` |
| `AGENTS.md` | Update file map description |
| `docs/build-and-publish.md` | Update version mechanism references |

---

## What does NOT change

- The `IMAGE_VERSION` ARG in Dockerfile stays — it's the canonical source used by `task bump`
- Local builds still embed the git hash (via `--build-arg IMAGE_VERSION=<hash>` in `task docker-build`)
- Published builds still embed the semver tag (via `--build-arg IMAGE_VERSION=<tag>` in publish.yml)
- `task verify` still catches a wrong version — only the check mechanism changes
- The startup log banner still appears — just earlier (cont-init.d) and without a file dependency

---

## Open questions for the owner

1. Keep `rootfs/usr/bin/version_message` as a standalone utility (callable manually inside
   a running container), or delete it entirely?
2. Any other OCI label fields to add? Common ones: `org.opencontainers.image.created`,
   `org.opencontainers.image.revision` (git hash). Both can be passed as build args.
