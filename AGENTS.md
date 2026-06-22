# Agent Patterns

## Project overview

This repo builds a custom Docker image (`fredplex/nordvpn`) that packages the official NordVPN Linux client for use as a VPN gateway container on Unraid NAS systems. Other containers route their traffic through it via `--net=container:vpn`.

Key characteristics:
- Based on `ghcr.io/linuxserver/baseimage-ubuntu:noble` (brings the s6 process supervisor)
- NordVPN is installed at build time from the official Debian package repo, pinned to a specific version
- A hardened iptables kill switch fires before the VPN connects, so no traffic leaks if the VPN fails to start
- Reconnection is handled by a watchdog script (`nord_watch`) that polls on a configurable interval
- **No CI.** Builds and publishes are done manually by the owner after verifying the image locally
- The owner is the sole maintainer; all destructive or publish actions require explicit approval

---

## Technology primers

### s6 process supervisor
The base image uses [s6-overlay](https://github.com/just-containers/s6-overlay), a process supervisor built into the linuxserver.io base images. It replaces a traditional init system inside the container:
- `rootfs/etc/cont-init.d/` scripts run **once at startup**, in filename order (00, 10, 20 …), before any services start — they must exit cleanly
- `rootfs/etc/services.d/nordvpn/run` is a **long-running managed service**; if it exits, s6 restarts it automatically
- `s6-svc -wR -t /var/run/s6/services/nordvpn` (used in `nord_watch`) sends a controlled restart signal to the nordvpn service
- Do not add sleep loops or background processes to cont-init.d scripts — they block subsequent init stages

### Taskfile
[Taskfile](https://taskfile.dev) is a YAML-based task runner (similar to Make). Install with `task --version`. Key tasks in this project:
- `task docker-build` — builds a local test image tagged with the **git commit hash** (not the semver version; see note below)
- `task docker-publish` — builds, pushes the hash-tagged image, then re-tags and pushes `:latest` and `:<GIT_TAG>`; requires a git tag on HEAD
- `task` (no args) — prints the current git tag and hash; fails if no tag is set on HEAD

---

## version-bump

Triggered manually by the owner when NordVPN releases a new client version.

### Inputs
- `NORDVPN_VERSION` — NordVPN package version (e.g. `4.5.0`)
- `IMAGE_VERSION` — Docker image tag version (e.g. `5.5.0`); incremented independently of NORDVPN_VERSION

### Before editing any file — verify the package exists
Confirm the new NordVPN version is present in the official Debian package repo before touching anything:
```
https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/
```
Look for `nordvpn_<NORDVPN_VERSION>_amd64.deb`. If the file is not listed, do not proceed — the build will fail at the `apt-get install` step.

### Version bump locations — ALL must change in one commit
| File | Location | Field |
|---|---|---|
| `Dockerfile` | line 6 | `ARG NORDVPN_VERSION='x.x.x'` |
| `Dockerfile` | line 7 | `ARG IMAGE_VERSION='x.x.x'` |
| `README.md` | "Current version" line | badge or plain text |
| `CLAUDE.md` | `## Current Pinned Version` block | update after successful build |
| `.ai/current.md` | all fields | update after owner confirms the image is good |

### Steps
1. Confirm both version strings with owner before touching any file
2. Verify the package exists in the repo (see above)
3. Show a unified diff of every planned change; wait for approval
4. Apply changes
5. Owner runs `task docker-build` locally to verify the image
6. Owner creates the git tag manually: `git tag -a <IMAGE_VERSION> -m "bump to NordVPN <NORDVPN_VERSION>"`
7. Owner pushes tag and runs `task docker-publish`
8. Update `.ai/current.md` to reflect the new version, build date, and pushed tags

### Hard constraints
- Never push to the remote — owner pushes manually after verifying the local image
- Never bump the base image (`ghcr.io/linuxserver/baseimage-ubuntu:noble`) unless explicitly instructed
- Never modify `Taskfile.yml` unless explicitly instructed
- Changelog entries go in `README.md` under `## Changelog`, newest first

---

## The `.ai/` folder

Contains two persistent state files that agents should read at the start of every session and update as work completes. They are the source of truth for current project state between conversations.

### `.ai/current.md` — session state
Tracks what version the image is currently at, what the last action was, what the next action should be, and any open issues. **Update this file after every successful version bump** to reflect the new versions, build date, and Docker tag pushed.

Fields to keep current:
- `Status` — e.g. `Idle / Up to date at NordVPN 4.5.0`
- `Last Action` — what was built, verified, and pushed, with date
- `Next Action` — what to watch for or do next
- `Open Issues` — anything blocking or deferred

### `.ai/prompts.md` — canonical trigger prompt
Contains the standard prompt the owner pastes when a new NordVPN version is available. Agents should treat this as the authoritative description of the version-bump workflow trigger. Do not modify this file unless the workflow itself changes.

---

## Project file map

```
Dockerfile                        — primary build; version ARGs live here
Taskfile.yml                      — local build/publish tasks (do not modify)
README.md                         — user docs + Changelog
CLAUDE.md                         — AI context and workflow rules
AGENTS.md                         — this file
docs/
  build-and-publish.md            — full human + agent reference: workflow, triggers, manual steps, secrets setup
.gitattributes                    — enforces LF line endings on all rootfs/ scripts
.ai/
  current.md                      — live session state (update after each bump)
  prompts.md                      — canonical trigger prompt for version-bump workflow
rootfs/
  etc/
    cont-init.d/
      00-firewall                 — iptables kill switch (drops all traffic before VPN is up)
      10-tun                      — creates /dev/net/tun if missing
      20-inet / 20-inet6          — IPv4/IPv6 interface setup
      30-route / 30-route6        — routing table setup for local network access
      40-allowlist                — punches iptables holes for ALLOW_LIST domains (and legacy WHITELIST alias)
    services.d/nordvpn/
      run                         — s6 service: starts nordvpnd daemon
      finish                      — s6 finish hook
      data/check                  — s6 readiness check
  usr/bin/
    version_message               — prints /.version at startup (contains IMAGE_VERSION or git hash; see note)
    nord_login                    — authenticates via TOKEN / TOKENFILE env var
    nord_config                   — applies TECHNOLOGY, DNS, FIREWALL, MESHNET, LAN_DISCOVERY env vars
    nord_connect                  — connects with exponential backoff retry; runs PRE/POST_CONNECT hooks
    nord_watch                    — polls CHECK_CONNECTION_URL; triggers s6 restart on failure
    dockerNetworks / dockerNetworks6 — Docker network helpers
```

### Container startup sequence
`version_message → nord_login → nord_config → nord_connect → nord_watch`

### Line endings — critical on Windows
`.gitattributes` enforces **LF** line endings for all files under `rootfs/`. Shell scripts with CRLF endings will fail inside the container with `bad interpreter` or silent parse errors. When creating or editing any `rootfs/` file on Windows, verify your editor is not converting to CRLF. Git handles this automatically on checkout via `.gitattributes`, but double-check when creating new scripts.

### `docker-build` vs `docker-publish` — image version behavior
`task docker-build` passes `--build-arg="IMAGE_VERSION={{.GIT_HASH}}"`, which **overrides** the `ARG IMAGE_VERSION` in the Dockerfile. Local test builds therefore write the git commit hash into `/.version` and use it as the Docker tag — not the semantic version. Only `task docker-publish` produces an image tagged with the semver `IMAGE_VERSION`. When reviewing `version_message` output on a local test build, seeing the hash instead of a version number is expected and correct.

---

## Environment variables (runtime)

| Variable | Default | Notes |
|---|---|---|
| `TOKEN` | — | NordVPN account token (required unless TOKENFILE set) |
| `TOKENFILE` | — | Path to file containing the token (docker secrets) |
| `CONNECT` | recommended server | Country/server/city/group string |
| `TECHNOLOGY` | `NordLynx` | `NordLynx` or `OpenVPN` |
| `DNS` | — | Up to 3 servers, comma/semicolon delimited; disables CyberSec |
| `CYBER_SEC` | — | `Enable` / `Disable` |
| `FIREWALL` | — | `Enable` / `Disable` |
| `OBFUSCATE` | — | `Enable` / `Disable` (OpenVPN only) |
| `PROTOCOL` | — | `TCP` or `UDP` (OpenVPN only) |
| `MESHNET` | — | `Enable` / `Disable` |
| `ALLOWLOCAL` | — | Comma-delimited Meshnet device names allowed to access this device's local network |
| `ALLOWROUTE` | — | Comma-delimited Meshnet device names allowed to route traffic through this device |
| `LAN_DISCOVERY` | — | `on` / `off` |
| `ALLOW_LIST` | — | Comma-delimited domains accessible outside the VPN |
| `WHITELIST` | — | Legacy alias for `ALLOW_LIST`; both are supported, prefer `ALLOW_LIST` for new configs |
| `NET_LOCAL` | — | CIDR(s) for local network routes, e.g. `192.168.1.0/24` |
| `NET6_LOCAL` | — | IPv6 CIDR(s) for local network routes |
| `PORTS` | — | Semicolon-delimited ports to whitelist (UDP+TCP) |
| `PORT_RANGE` | — | Port range to whitelist, e.g. `9091 9095` |
| `PRE_CONNECT` | — | Shell command to run before connecting |
| `POST_CONNECT` | — | Shell command to run after successful connection |
| `CHECK_CONNECTION_INTERVAL` | `300` | Seconds between watchdog polls |
| `CHECK_CONNECTION_URL` | `www.google.com` | URL used to verify connectivity |

---

## Tag / release naming convention

- Git tag = `IMAGE_VERSION` (e.g. `5.5.0`) — set **before** running `task docker-publish`
- Docker tags published: `:latest` and `:<IMAGE_VERSION>` (e.g. `fredplex/nordvpn:5.5.0`)
- The git tag comment convention: `"bump to NordVPN <NORDVPN_VERSION>"`

---

## GitHub Actions workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `.github/workflows/build-validate.yml` | PR → main | Runs `docker build` only — no push. Catches Dockerfile errors early. |
| `.github/workflows/publish.yml` | Push of semver tag (e.g. `5.6.0`) | Builds and pushes `:latest` + `:<tag>` to Docker Hub. Requires `DOCKER_USERNAME` and `DOCKER_TOKEN` repo secrets. |
| `.github/workflows/check-nordvpn-release.yml` | Weekly cron (Mon 08:00 UTC) + manual | Checks the NordVPN package repo; opens a draft PR if a newer version is available. |

### Required GitHub repo secrets
Set these in **Settings → Secrets and variables → Actions** before the publish workflow will work:
- `DOCKER_USERNAME` — Docker Hub username (`fredplex`)
- `DOCKER_TOKEN` — Docker Hub access token (generate at hub.docker.com → Account Settings → Security)

---

## Known issues / open items

- **README.md** currently mirrors the upstream `bubuntux/nordvpn` project (badges, examples, and issue links all point there). A project-specific README with the actual Changelog section is still needed (Tier 3 / R8).
