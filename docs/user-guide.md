# User Guide — Owner Reference

Complete operational reference for the **fredplex/nordvpn** project owner.

---

## Table of contents

1. [What is this?](#1-what-is-this)
2. [How it works](#2-how-it-works)
3. [Task commands](#3-task-commands)
4. [GitHub Actions](#4-github-actions)
5. [Version bump workflow](#5-version-bump-workflow)
6. [Runtime environment variables](#6-runtime-environment-variables)
7. [One-time setup — Docker Hub credentials in GitHub](#7-one-time-setup--docker-hub-credentials-in-github)
8. [Troubleshooting](#8-troubleshooting)
9. [Dev builds for testing](#9-dev-builds-for-testing)

---

## 1. What is this?

**fredplex/nordvpn** is a custom Docker image that packages the official NordVPN Linux client
for use as a network gateway on Unraid NAS systems. Other containers route all their internet
traffic through it using `--net=container:vpn`. A hardened iptables kill switch fires at
container startup — before the VPN connects — so no traffic leaks if the VPN fails to start.

The image is built on `ghcr.io/linuxserver/baseimage-ubuntu:noble` (linuxserver.io's Ubuntu
Noble base, which includes the s6 process supervisor). NordVPN is installed at build time from
the official Debian package repo, pinned to a specific version.

**Required run flags**:
- `--restart=unless-stopped` — the CMD chain (`nord_login → nord_config → nord_connect → nord_watch`) exits if the VPN becomes unrecoverable. Docker restart policy is the recovery mechanism.
- `--cap-add=NET_ADMIN --cap-add=NET_RAW` — required for iptables kill switch and WireGuard.

**Health reporting**: The container exposes a HEALTHCHECK (`nordvpn status | grep -q "Status: Connected"`). Unraid's dashboard and `docker ps` show `(healthy)` once the tunnel connects, and `(unhealthy)` if it drops. With NordLynx the container is typically healthy within 5 seconds.

---

## 2. How it works

```mermaid
flowchart TD
    A([NordVPN package repo]) -->|Daily GitHub Action\nor manual trigger| B[Check for new version]
    B -->|New version found| C[GHA: Build Dev Image & Verify]
    C --> D[GHA: Push dev tags to Docker Hub]
    D --> E[GHA: Open draft PR\nwith dev image test links]
    E -->|Owner pulls dev image\ntests on Unraid| F[Owner Reviews Draft PR]
    F -->|PR Merged by Owner| G[GHA Release Pipeline:\nBuild Production & Verify]
    G --> H[GHA: Push :latest & :x.y.z to Docker Hub]
    H --> I[GHA: Publish GitHub Release\ntag + notification email]
    I --> J([Production Release Complete])
```

### Responsibility Matrix

| Step / Stage | Executed By | Purpose / Responsibility |
|--------------|-------------|--------------------------|
| **Version Detection** | GitHub Actions Cron (Daily) | Scrapes the NordVPN repo to detect if a new package exists. |
| **Dev Image & Smoke Test** | GitHub Actions Workflow | Automatically builds, runs unified smoke tests (verify.sh), and publishes dev tags on version detection. |
| **Draft PR Creation** | GitHub Actions Workflow | Bumps version configurations and opens a draft PR containing tests/instructions. |
| **Verification & Testing** | Owner (Human) | Pulls the newly generated version-aligned dev tag (`:<image_version>-dev`) and tests it on a real Unraid system. |
| **Release Approval** | Owner (Human Gate) | Merges the draft PR into the `main` branch to trigger production deployment. |
| **Production Build & Test** | GitHub Actions Workflow | Rebuilds the production release image and runs unified smoke tests (verify.sh). |
| **Docker Hub Release** | GitHub Actions Workflow | Publishes `:latest` and `:<IMAGE_VERSION>` production tags. |
| **Git Release & Notification** | GitHub Actions Workflow | `gh release create` creates the version tag + a **GitHub Release**; publishing the Release emails repo watchers (the success notification). |
| **Failure Notification** | GitHub | Native GitHub Actions emails notify the owner if any release step fails. |
| **Fallback Release** | Owner (Human CLI) | Pushing a tag locally (`task release`) still works to trigger production publish directly. |

> **Notifications — agent / human / GitHub**: The **AI agent** only implements
> release/workflow changes on a branch and never merges or pushes to remote without
> approval — it does not receive notifications. **GitHub** publishes the Release and
> sends the native emails. The **owner** receives the success (GitHub Release) and
> failure (Actions) emails and decides the next action. One-time setup: **Watch →
> Custom → Releases** (see [§7](#7-one-time-setup--docker-hub-credentials-in-github)).
> No SMTP or extra secrets — `gh release create` uses the built-in `GITHUB_TOKEN`.

### Human gates — never automated away

| Gate | Why it exists / How it works |
|------|------------------------------|
| **Test the Dev Build** | Pull `fredplex/nordvpn:<image_version>-dev` to verify connectivity and compatibility before release. |
| **PR Review and Merge** | You decide exactly when the release happens by reviewing the parameters and merging the PR. |
| **Manual Fallback Release** | If bypass is needed, local `task release` commands can manually tag and push. |

---

## 3. Task commands

All local operations use [Taskfile](https://taskfile.dev). Run from the repo root.

### Quick reference

| Command | Purpose | Standard workflow? |
|---------|---------|-------------------|
| `task` | Print current git tag and hash | Anytime |
| `task check-version` | Check NordVPN repo for newer versions | Before bumping |
| `task bump NORDVPN_VERSION=x IMAGE_VERSION=y` | Apply version bump to 3 files (Dockerfile, README, CLAUDE) | After confirming new version |
| `task docker-build` | Build local test image (tagged with git hash) | After merging bump |
| `task verify` | Smoke-test the local image (4 credentialless checks) | After docker-build |
| `task verify-live TOKEN_FILE=<path>` | Real-token Spain egress test — mandatory pre-release gate | After verify passes, before release |
| `task release` | Create annotated git tag + push → triggers publish | After verify-live passes |
| `task env` | Print all environment variables (alphabetical) | Debugging |
| `task docker-push` | Push image with git-hash tag directly to Docker Hub | Advanced / bypass GA |
| `task docker-publish` | Tag + push as `:latest` and `:<git-tag>` directly | Advanced / bypass GA |
| `task dev-build` | Build `:dev`, `:dev-<hash>`, `:dev-<version>`, and `:<image_version>-dev` | Dev testing |
| `task dev-latest` | Auto-discover newest NordVPN + build dev tags | Dev testing |
| `task dev-push` | Push all dev tags to Docker Hub | Dev testing |
| `task dev-clean` | Remove local `:dev` and `:dev-*` images | Cleanup |

---

### `task` (no args)

Prints the current git tag and commit hash. Requires the current commit to have an
annotated tag — useful for confirming what version is checked out.

```
Version:    5.5.4
GIT Commit: a1b2c3d
```

---

### `task check-version`

Scrapes `https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/` and compares
the latest available `.deb` version against the version pinned in `Dockerfile`. Prints the
exact `task bump` command to run if a newer version is available. No files are changed.

```
Pinned:    5.2.0
Available: 5.3.0

New version available. Run:
  task bump NORDVPN_VERSION=5.3.0 IMAGE_VERSION=5.5.5
```

---

### `task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y.y.y`

Updates 3 version-pinned files in one shot:

| File | Field |
|------|-------|
| `Dockerfile` | `ARG NORDVPN_VERSION` and `ARG IMAGE_VERSION` |
| `README.md` | "Current image" and version comments |
| `CLAUDE.md` | `## Current Pinned Version` block |

Before touching any file, the script verifies that
`nordvpn_<NORDVPN_VERSION>_amd64.deb` exists in the official repo. It then prints a
`git diff` for review. **Does not commit, tag, build, or push.**

Both arguments are required:
```bash
task bump NORDVPN_VERSION=4.6.0 IMAGE_VERSION=5.6.0
```

---

### `task docker-build`

Builds the image for local testing:

```bash
docker build --platform linux/amd64 . -f Dockerfile \
  -t "fredplex/nordvpn:<git-hash>" \
  --build-arg="IMAGE_VERSION=<git-hash>"
```

The git commit hash is injected as `IMAGE_VERSION` — so local test images carry the hash,
not a semver. Only published images (via the GitHub Action) carry the semantic version.
This is intentional — `task verify` confirms the hash is present.

---

### `task verify`

Smoke-tests the locally built image with 4 credentialless checks (fake token, no tunnel connection):

| # | Check | How |
|---|-------|-----|
| 1 | `IMAGE_VERSION` env = git hash | `docker inspect` |
| 2 | `nordvpn --version` = `NORDVPN_VERSION` | One-shot container |
| 3 | iptables OUTPUT policy = DROP (kill switch) | One-shot container with `NET_ADMIN` |
| 4 | nordvpnd socket at `/run/nordvpn/nordvpnd.sock` | 12s runtime check |

> **Windows users**: `task verify` now works natively in Git Bash. WSL2 is no longer required for this command (`verify.sh` handles the MSYS path-mangling issue internally). The dev-build scripts (`task dev-build`, `task dev-latest`) still require WSL2.

Expected output on pass:
```
=== Verifying fredplex/nordvpn:<hash> ===
    NordVPN target: 5.2.0

--- Stateless checks ---
  PASS  IMAGE_VERSION env = <hash>
  PASS  nordvpn --version = 5.2.0
  PASS  iptables OUTPUT policy DROP (kill-switch functional)

--- Runtime check (daemon socket) ---
  PASS  nordvpnd socket present at /run/nordvpn/nordvpnd.sock

=== 4 passed | 0 failed | 0 warnings ===
```

---

### `task verify-live TOKEN_FILE=<path>`

The mandatory pre-release gate — runs after `task verify` passes. `task verify` cannot validate tunnel connectivity (it uses a fake token). This command:
1. Reads the NordVPN token from `TOKEN_FILE` (never printed, never in logs)
2. Starts the image with real credentials and `CONNECT=Spain`
3. Polls `nordvpn status` until connected (up to 120s)
4. Reports the Spain exit IP via `ipinfo.io`

```bash
task verify-live TOKEN_FILE=/path/to/your/nordvpn-token
```

> **Security**: The token must be in a file outside the repo. Never pass it as a CLI argument or env var that gets logged.

---

### `task release`

Reads `IMAGE_VERSION` and `NORDVPN_VERSION` directly from `Dockerfile` — no manual input.

Pre-flight checks:
- Working tree must be clean (fails if uncommitted changes exist)
- Tag must not already exist (prevents accidental double-release)

Then:
1. Creates annotated tag: `git tag -a <IMAGE_VERSION> -m "bump to NordVPN <NORDVPN_VERSION>"`
2. Pushes the tag: `git push --tags`
3. The tag push triggers the **Publish to Docker Hub** GitHub Action automatically

After running, monitor the publish at **GitHub → Actions → Publish to Docker Hub**.

---

### `task env`

Prints all environment variables in the current shell, sorted alphabetically. Useful for
debugging environment issues during local development.

---

### `task docker-push` and `task docker-publish`

Lower-level commands that push images **directly** from your local Docker daemon to Docker Hub
without going through GitHub Actions. Use only when you need to bypass the standard
tag-push publish path.

- `task docker-push` — depends on `docker-build`; pushes `fredplex/nordvpn:<git-hash>`
- `task docker-publish` — depends on `docker-push`; additionally tags and pushes `:latest`
  and `:<git-tag>`. Requires an annotated git tag on HEAD.

**Prefer `task release`** for normal version bumps — it produces a clean audit trail via the
GitHub Actions publish log.

---

## 4. GitHub Actions

### Quick reference

| Workflow | Trigger | Manual trigger? | Pushes image? |
|----------|---------|----------------|---------------|
| Check NordVPN Release | Daily 08:00 UTC | Yes — Actions UI | Yes (`:dev-<version>`) |
| Build Validation | Pull request to `main` | No (open a draft PR) | No |
| Publish to Docker Hub | Push/merge to `main` (Dockerfile bump), tag push, or manual | Yes — Actions UI & tag | Yes (production) |
| Publish Dev to Docker Hub | Manual or Reusable Workflow call | Yes — Run workflow | Yes (:dev & :dev-<sha>) |
| Check Base Image | Monthly, 1st at 09:00 UTC | Yes — Actions UI | Yes (`:dev-<version>` via reusable dev workflow) |

---

### Check NordVPN Release

**File:** `.github/workflows/check-nordvpn-release.yml`
**Trigger:** Daily at 08:00 UTC (cron), or manually via the GitHub Actions UI

What it does:
1. Scrapes the NordVPN Debian repo for the latest available version
2. Compares it against `NORDVPN_VERSION` pinned in `Dockerfile`
3. If newer:
   - Triggers the reusable `publish-dev` workflow to build and verify a dev image for the new version.
   - Runs `scripts/bump.sh` to update version pins in the repository.
   - Opens a **draft PR** on branch `auto/nordvpn-<version>` containing links and instructions to test the new dev image.
4. If already up to date: exits cleanly with no PR

**To trigger manually:**
1. GitHub → **Actions** → **Check NordVPN Release**
2. Click **Run workflow** → select branch `main` → **Run workflow**
3. If a new version is found, a dev build is created and a draft PR appears automatically.

**Secrets needed:** `DOCKER_USERNAME` and `DOCKER_TOKEN` (for the dev build stage).

---

### Build Validation

**File:** `.github/workflows/build-validate.yml`
**Trigger:** Any pull request targeting `main`

What it does:
- Runs `docker build --platform linux/amd64`
- No login, no push — catches Dockerfile errors and broken `apt-get install` before merge
- Fails the PR check if the build fails

**To trigger manually:** There is no manual trigger. Open a draft PR from your branch to `main` to run it on demand.

**Secrets needed:** None.

---

### Publish to Docker Hub (Release Pipeline)

**File:** `.github/workflows/publish.yml`
**Triggers:**
- **Push / Merge to `main`**: Fired automatically when a pull request is merged into `main`. The workflow checks if the `Dockerfile` version `ARG`s were modified in the commit (using `paths` filters); if so, it builds, runs unified smoke tests (`verify.sh`), publishes production tags, and pushes the Git tag back to the repository.
- **Git Tag push**: Pushing a semver tag (e.g. `5.6.0`) will build, test, and publish that version directly.
- **Manual Trigger**: Triggered via **Actions → Publish to Docker Hub → Run workflow** with optional version input overrides.

What it does:
1. Resolves target versions (reads from tag name, manual input, or parsed from the `Dockerfile`).
2. Runs Layer 2 checks to confirm an actual version modification is present (if triggered by branch push).
3. Logs in to Docker Hub and builds the image.
4. Runs unified smoke tests via `scripts/verify.sh` (validates `IMAGE_VERSION` label/variable, `nordvpn --version`, iptables kill-switch, and nordvpnd socket).
5. If tests pass, pushes production tags:
   - `fredplex/nordvpn:latest`
   - `fredplex/nordvpn:<version>` (e.g. `fredplex/nordvpn:5.6.0`)
6. Creates a **GitHub Release** (version tag + release notes) via `gh release create` (auth: built-in `GITHUB_TOKEN`), which sends a native notification email to repo watchers. Workflow failures are emailed natively via GitHub Actions notifications. See [§7 Step 4](#7-one-time-setup--docker-hub-credentials-in-github).

**Secrets needed:** `DOCKER_USERNAME` and `DOCKER_TOKEN` (the Release step needs no extra secrets — it uses `GITHUB_TOKEN`).

---

### Publish Dev to Docker Hub

**File:** `.github/workflows/publish-dev.yml`
**Trigger:** Manual — GitHub Actions UI (`workflow_dispatch`), or reusable workflow call (`workflow_call`) from the version checker.

What it does:
1. Resolves the NordVPN version (pinned, explicit override, or auto-discover via `"latest"`).
2. Builds the image with `IMAGE_VERSION=<image_version>-dev` (e.g. `5.5.1-dev`).
3. Pushes tags to Docker Hub:
   - `fredplex/nordvpn:dev` (moving tag)
   - `fredplex/nordvpn:dev-<sha>` (immutable hash tag)
   - `fredplex/nordvpn:dev-<nordvpn_version>` (traceable version tag)
   - `fredplex/nordvpn:<image_version>-dev` (aligned dev tag)
4. Runs unified smoke tests (`verify.sh`) before reporting success.

**To trigger manually:**
1. GitHub → **Actions** → **Publish Dev to Docker Hub**
2. Click **Run workflow**
3. Choose NordVPN version:
   - **Blank** — use pinned version
   - **`latest`** — auto-discover newest from NordVPN repo
   - **Explicit** (e.g. `4.6.0`) — use that version
4. Click **Run workflow**

**Secrets needed:** `DOCKER_USERNAME` and `DOCKER_TOKEN`.
For full details, see [§9 Dev builds for testing](#9-dev-builds-for-testing).

---

### Check Base Image

**File:** `.github/workflows/check-base-image.yml`
**Trigger:** Monthly, 1st of each month at 09:00 UTC (cron), or manually via the GitHub Actions UI

What it does:
1. Resolves the latest digest for `ghcr.io/linuxserver/baseimage-ubuntu:noble` without pulling the image.
2. Compares it against the digest pinned in the `Dockerfile`'s `FROM` line.
3. If a newer digest is available:
   - Triggers the reusable `publish-dev` workflow to build and verify a dev image against the new base.
   - Runs `scripts/bump.sh` (patch increment) and bumps the digest pin in the `Dockerfile`.
   - Opens a **draft PR** on branch `auto/base-image-<suggested_image_version>`.
4. If already up to date: exits cleanly with no PR.

Bridges the gap between the digest pin (which keeps builds deterministic) and linuxserver.io's periodic base-image rebuilds (which carry Ubuntu security patches and s6-overlay updates that `apt-get upgrade` cannot reach — those are baked into the base layers). See `docs/architecture.md` > "Why the base image changes" for the full rationale.

**To trigger manually:**
1. GitHub → **Actions** → **Check Base Image**
2. Click **Run workflow** → select branch `main` → **Run workflow**
3. If a new digest is found, a dev build is created and a draft PR appears automatically.

**Secrets needed:** None (`GITHUB_TOKEN` is automatic for the digest check; `DOCKER_USERNAME`/`DOCKER_TOKEN` are used by the reusable dev-build stage it triggers).

For the full owner-facing walkthrough, see [§5 Rebuilding / Refreshing the Base Image](#rebuilding--refreshing-the-base-image).

---

## 5. Version bump workflow

### Path A — Automated (Recommended)

The daily GitHub Action automatically detects new versions, publishes a dev container, and opens a draft PR. Your steps:

**1. Test the Dev Build**
- The draft PR template will link the auto-built dev image. Pull and test this image on Unraid or another test environment:
  ```bash
  docker pull fredplex/nordvpn:<image_version>-dev
  ```
- Verify the VPN connects and network routing works as expected.

**2. Review the draft PR on GitHub**
- Confirm `IMAGE_VERSION` in `Dockerfile` is correct (automation suggests a patch bump — modify in the PR if you want a minor/major bump instead).
- Check the [NordVPN release notes](https://nordvpn.com/blog/nordvpn-linux-release-notes/) for breaking changes.

**3. Merge the PR**
- Once verified, merge the draft PR into `main`. **Merging the PR is the explicit release trigger.**

**4. Monitor the Pipeline**
- Merging the PR triggers the `Publish to Docker Hub` pipeline automatically. 
- GHA builds the image, runs unified smoke tests via `verify.sh`, publishes to Docker Hub, and pushes the Git tag back to the repository. Monitor this under **GitHub → Actions → Publish to Docker Hub**.

**5. Pull Git Tag**
- Once the pipeline succeeds, run `git pull` locally to fetch the automatically created Git Release Tag:
  ```bash
  git pull
  ```

---

### Path B — Fallback / Manual

Use this if you want to bump immediately without waiting for the daily checker, or if you prefer to build/verify locally.

**1. Check what is available**
```bash
task check-version
```

**2. Apply the bump**
```bash
task bump NORDVPN_VERSION=4.6.0 IMAGE_VERSION=5.6.0
```
Review the printed diff for correctness.

**3. Commit and push**
```bash
git add Dockerfile README.md CLAUDE.md
git commit -m "chore: bump NordVPN 5.2.0 → 5.3.0"
git push origin main
```
Merging to `main` will automatically trigger the release pipeline (which runs build/smoke-tests/push and pushes the git tag).

*Alternatively, to release completely from CLI (bypassing automated git tagging):*
```bash
task docker-build
task verify
task verify-live TOKEN_FILE=/path/to/token   # Mandatory: real NordLynx egress gate
task release     # Tags git locally and pushes, triggering publish workflow
```

---

### Rebuilding / Refreshing the Base Image

Because the base image is pinned to a specific digest (e.g. `noble@sha256:...`) in the `Dockerfile`, standard rebuilds will not pull any newer base image layers unless the digest pin is modified.

#### Scenario A: You want to update the base image to the latest security patch
If a newer base image is available and you want to upgrade:
1. **Via GitHub Actions (One-click)**: Go to **Actions → Check Base Image** and run the workflow manually (or wait for the monthly cron on the 1st of the month).
   * If a new base image is available, GHA automatically bumps the digest pin in the `Dockerfile`, increments the container patch version (`IMAGE_VERSION`), runs a dev build, and opens a draft PR. You test and merge to release.
2. **Locally**:
   * Run `task check-base`. If an update is available, the script prints the latest digest.
   * Update the pinned digest on line 1 of the `Dockerfile`.
   * Run `task bump NORDVPN_VERSION=<current> IMAGE_VERSION=<new_patch_version>` to update version pins.
   * Run `task docker-build` and `task verify-live TOKEN_FILE=<path>` to test, then commit and push to `main` (or run `task release`).

#### Scenario B: You want to rebuild the container with the *existing* base image
If you made changes to scripts inside `rootfs/` or want to force a clean build without updating the base image digest:
1. **Via GitHub Actions**: Go to **Actions → Publish to Docker Hub**, click **Run workflow**, and run it (optionally overriding the version inputs).
2. **Locally**: Commit your changes and run `task release` to tag the repository and trigger the release CD workflow.

---

## 6. Runtime environment variables

These are set when running the container, not at build time.

| Variable | Default | Notes |
|----------|---------|-------|
| `TOKEN` | — | NordVPN account token. Required unless `TOKENFILE` is set. |
| `TOKENFILE` | — | Path to a file containing the token. Use with Docker secrets. |
| `CONNECT` | recommended server | Country, city, server, or group string passed to `nordvpn connect` |
| `TECHNOLOGY` | `NordLynx` | `NordLynx` (WireGuard) or `OpenVPN` |
| `DNS` | — | Up to 3 servers, comma- or semicolon-delimited. Setting this disables CyberSec. |
| `CYBER_SEC` | — | `Enable` / `Disable` |
| `FIREWALL` | — | `Enable` / `Disable` |
| `OBFUSCATE` | — | `Enable` / `Disable` — OpenVPN only |
| `PROTOCOL` | — | `TCP` or `UDP` — OpenVPN only |
| `MESHNET` | — | `Enable` / `Disable` |
| `ALLOWLOCAL` | — | Comma-delimited Meshnet device names allowed to access this device's local network |
| `ALLOWROUTE` | — | Comma-delimited Meshnet device names allowed to route traffic through this device |
| `LAN_DISCOVERY` | — | `on` / `off` |
| `ALLOW_LIST` | — | Comma-delimited domains accessible outside the VPN tunnel |
| `WHITELIST` | — | Legacy alias for `ALLOW_LIST`. Both are supported; prefer `ALLOW_LIST`. |
| `NET_LOCAL` | — | CIDR(s) for local network routes, e.g. `192.168.1.0/24` |
| `NET6_LOCAL` | — | IPv6 CIDR(s) for local network routes |
| `PORTS` | — | Semicolon-delimited ports to whitelist (UDP + TCP) |
| `PORT_RANGE` | — | Port range to whitelist, e.g. `9091 9095` |
| `PRE_CONNECT` | — | Shell command to run before connecting |
| `POST_CONNECT` | — | Shell command to run after a successful connection |
| `CHECK_CONNECTION_INTERVAL` | `300` | Seconds between watchdog connectivity polls |
| `CHECK_CONNECTION_URL` | `www.google.com` | URL used by the watchdog to verify connectivity |

**Minimum required:** `TOKEN` (or `TOKENFILE`). Everything else is optional.

---

## 7. One-time setup — Docker Hub credentials in GitHub

The publish workflow needs credentials to push to Docker Hub. This is a one-time setup
(repeat only if you rotate the token).

### Step 1 — Create a Docker Hub access token

1. Log in to [hub.docker.com](https://hub.docker.com)
2. Click your avatar (top right) → **Account Settings**
3. Left sidebar → **Security** → **New Access Token**
4. Name it `github-nordvpn-publish`
5. Set permissions to **Read, Write, Delete**
6. Click **Generate** — **copy the token now; it is shown only once**

### Step 2 — Add secrets to the GitHub repo

1. GitHub repo → **Settings** tab
2. Left sidebar → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add both entries:

| Name | Value |
|------|-------|
| `DOCKER_USERNAME` | `fredplex` |
| `DOCKER_TOKEN` | the token copied in Step 1 |

### Step 3 — Verify the secrets are wired up

Push a test tag to confirm the workflow runs end-to-end:

```bash
git tag -a 0.0.1-test -m "secret test — delete after"
git push --tags
```

Watch **Actions → Publish to Docker Hub**. If the login step passes, the secrets are correct.
Delete the test tag afterwards:

```bash
git push --delete origin 0.0.1-test
git tag -d 0.0.1-test
```

### Step 4 — Enable release notifications (no secrets)

Release notifications are GitHub-native — no SMTP server, no third-party action, no extra
secrets. Enable them once:

1. **Success emails** — on the repo, click **Watch → Custom → check "Releases"**. The
   publish workflow ends by creating a **GitHub Release**, which emails Release watchers.
2. **Failure emails** — **Settings → Notifications → Actions** → confirm failed-workflow
   emails are enabled (default). These notify you if any release step fails.

---

## 8. Troubleshooting

### `task bump` fails with "Package not found"

The version you specified is not yet in the NordVPN Debian repo. The package can lag the
release announcement by hours or days. Run `task check-version` to see what is actually
available, then retry.

### `task verify` — `nordvpn --version` reports wrong version

The image was built with cached layers. Run `task docker-build` again — Taskfile does not
use the build cache. If the problem persists, force a no-cache build:

```bash
docker build --no-cache --platform linux/amd64 . -f Dockerfile \
  -t "fredplex/nordvpn:$(git log --format="%h" -n 1)"
```

### `task verify` — iptables check fails on Docker Desktop (Windows/Mac)

`NET_ADMIN` capability is required. Ensure Docker Desktop is running and that the container
is not being blocked by a security policy. To inspect manually:

```bash
docker run --rm --cap-add=NET_ADMIN --cap-add=NET_RAW fredplex/nordvpn:<hash> \
  /bin/bash -c "update-alternatives --set iptables /usr/sbin/iptables-legacy; iptables -L"
```

### `task release` fails — "Working tree is not clean"

You have uncommitted changes. Stage and commit them (or stash if they are not part of this
release) before running `task release`.

### `task release` fails — "Tag already exists"

The `IMAGE_VERSION` in `Dockerfile` matches an existing git tag. Either the version was
already released, or you forgot to bump `IMAGE_VERSION`. Run `task check-version` to
confirm the current pinned version and check `git tag` for existing tags.

### Publish workflow fails at login step

Verify both `DOCKER_USERNAME` and `DOCKER_TOKEN` secrets exist in **Settings → Secrets
and variables → Actions**. Regenerate the token at hub.docker.com if it has expired, then
update the `DOCKER_TOKEN` secret.

### Publish workflow produces the wrong `:latest` tag

`docker/build-push-action` always pushes `:latest` as specified in the workflow tags list.
If a tag was pushed in error, log in to Docker Hub and manually retag `:latest` to the
correct version, or re-run the correct tag's workflow via a fresh tag push.

### Draft PR `IMAGE_VERSION` is wrong

The daily action suggests a patch bump (`5.5.0 → 5.5.1`). If the release warrants a minor
or major version bump, edit `Dockerfile` line 7 (`ARG IMAGE_VERSION`) directly in the PR
before merging.

### Daily action opened a PR for an already-pinned version

This can happen if the repo's default branch is ahead of the PR branch. Close the PR, pull
the latest `main`, and re-run the workflow manually via the GitHub Actions UI.

---

## 9. Dev builds for testing

Dev images let you test the container — with the current or a new NordVPN version — without
going through the full release ceremony. Dev images live under the `:dev` tag on Docker Hub,
separate from `:latest` and semver tags.

> **Windows users**: Docker Desktop must use the **WSL2 backend** with WSL integration
> enabled, and Git Bash must be installed. Without WSL2, the dev build tasks will fail with
> `sed: executable file not found` or similar errors. See
> [§2 Prerequisites in build-and-publish.md](build-and-publish.md#2-prerequisites) for setup.

### Quick reference

| Command | Purpose |
|---------|---------|
| `task dev-build` | Build `:dev`, `:dev-<hash>`, `:dev-<version>`, and `:<image_version>-dev` with pinned version |
| `task dev-build NORDVPN_VERSION=x.y.z` | Build dev tags with a specific NordVPN version |
| `task dev-latest` | Auto-discover newest NordVPN version + build dev tags with it |
| `task dev-push` | Push all dev tags to Docker Hub |
| `task dev-clean` | Remove all local `:dev` and `:dev-*` images |

### Dev Tagging Conventions

Every dev build produces four tags pointing to the same image:

- **`:dev`** — moving tag, always the latest dev build. Use in Unraid templates for testing.
- **`:dev-<hash>`** — immutable, traceable to the exact git commit hash.
- **`:dev-<nordvpn_version>`** — version-traceable tag (e.g. `dev-4.6.0`), allowing easy validation of specific NordVPN package releases.
- **`:<image_version>-dev`** — version-aligned dev tag (e.g. `5.5.1-dev`), matching production image version metadata structures.

All four tags point to the same image. `IMAGE_VERSION` inside the container is set to `<image_version>-dev` (e.g. `5.5.1-dev`) so you can confirm you're running a dev build via `docker inspect`.

### Local workflow

**Test the currently pinned version:**
```bash
task dev-build
task dev-push
```

**Test a specific new NordVPN version:**
```bash
task dev-build NORDVPN_VERSION=4.6.0
task dev-push
```

**Auto-discover the newest available NordVPN version and test it:**
```bash
task dev-latest
task dev-push
```

### CI workflow (GitHub Actions)

Trigger a dev build without local Docker:

1. GitHub → **Actions** → **Publish Dev to Docker Hub**
2. Click **Run workflow**
3. Choose NordVPN version:
   - **Blank** — use pinned version from `Dockerfile`
   - **`latest`** — auto-discover newest from NordVPN repo
   - **Explicit** (e.g. `4.6.0`) — use that exact version
4. Click **Run workflow**

The workflow builds, runs unified smoke tests via `verify.sh`, and pushes the 4 dev tags (including `:dev`, `:dev-<sha>`, `:dev-<version>`, and `:<image_version>-dev`) to Docker Hub.

### Consuming the dev image

```bash
docker pull fredplex/nordvpn:5.5.1-dev
```

In Unraid: update your container template repository to `fredplex/nordvpn:<image_version>-dev` (or `dev`). Switch back
to `fredplex/nordvpn:latest` when done testing.

### Cleanup

```bash
task dev-clean
```

### When to use dev vs production

| Scenario | Use |
|----------|-----|
| Test a new NordVPN version before bumping | `task dev-latest` → test → then `task bump` |
| Validate container changes in Unraid | `task dev-build` → `task dev-push` → test in Unraid |
| Smoke-test via CI | Actions → Publish Dev |
| Official release | `task release` (production path) |

> **Warning**: `:dev` is overwritten on every push. Not for production. Use `:<image_version>-dev` or `:dev-<hash>` if
> you need to pin to a specific dev build.
