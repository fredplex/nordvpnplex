# Build & Publish Process

This document covers the complete lifecycle for updating, building, and publishing the
`fredplex/nordvpn` Docker image — from detecting a new NordVPN release through to the
image appearing on Docker Hub. It is written for both humans and AI agents.

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Complete workflow at a glance](#3-complete-workflow-at-a-glance)
4. [Automated triggers (GitHub Actions)](#4-automated-triggers-github-actions)
5. [Step-by-step: version bump and publish](#5-step-by-step-version-bump-and-publish)
6. [Manual triggers](#6-manual-triggers)
7. [One-time setup: Docker Hub credentials in GitHub](#7-one-time-setup-docker-hub-credentials-in-github)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture overview

```
NordVPN package repo ──► Weekly GitHub Action ──► Draft PR (human reviews)
                                                        │
                                                        ▼
                                               Human merges PR
                                                        │
                                                        ▼
                                         task docker-build  (local)
                                                        │
                                                        ▼
                                           task verify  (local)
                                                        │
                                                        ▼
                                          task release
                                                        │
                                                        ▼
                                       GitHub Action: publish ──► Docker Hub
                                        fredplex/nordvpn:latest
                                        fredplex/nordvpn:<tag>
```

### Human gates (deliberate — never automated away)

| Gate | Why it exists |
|---|---|
| Review and merge the draft PR | Confirm `IMAGE_VERSION`, review diff, check release notes |
| Run `task docker-build` locally | Verify the image actually builds on your machine |
| Run `task verify` locally | Confirm the right NordVPN version is installed and kill-switch works |
| Create and push the git tag | Controls exactly when the publish fires — you decide the moment |

---

## 2. Prerequisites

### Local tools

| Tool | Install | Purpose |
|---|---|---|
| Docker Desktop | [docker.com](https://www.docker.com/products/docker-desktop/) | Build and run images locally |
| Taskfile | [taskfile.dev](https://taskfile.dev/installation/) | Run build tasks (`task` command) |
| Git | [git-scm.com](https://git-scm.com/) | Tag and push releases |
| curl + bash | Included in Git Bash on Windows | Used by helper scripts |

### GitHub repo secrets (one-time setup — see [Section 7](#7-one-time-setup-docker-hub-credentials-in-github))

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username (`fredplex`) |
| `DOCKER_TOKEN` | Docker Hub access token with Read & Write permission |

---

## 3. Complete workflow at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│  DETECTION                                                          │
│  Automated (weekly) or manual: task check-version                   │
│  → new version found → GitHub opens a draft PR                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Human reviews draft PR
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BUMP                                                               │
│  Confirm IMAGE_VERSION in PR, merge                                 │
│  (or run locally: task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y) │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Human runs locally
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BUILD & VERIFY (local)                                             │
│  task docker-build   ← builds image tagged with git hash           │
│  task verify         ← smoke-tests version, kill-switch, daemon    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Human creates and pushes tag
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PUBLISH (GitHub Actions — automatic on tag push)                   │
│  task release                                                       │
│  → creates annotated tag, pushes it                                 │
│  → GitHub Action builds and pushes :latest + :<tag> to Docker Hub  │
└─────────────────────────────────────────────────────────────────────┘
```

### In plain language — who does what

**Detecting a new NordVPN release**
- GitHub Actions runs automatically every Monday, OR
- You run `task check-version` locally, OR
- An agent runs `task check-version` on request
- If a new version is found → GitHub Actions opens a **draft PR** with all files already bumped

**Reviewing the bump (human)**
- Open the draft PR on GitHub
- Confirm `IMAGE_VERSION` is correct (automation suggests a patch bump)
- Skim the [NordVPN release notes](https://nordvpn.com/blog/nordvpn-linux-release-notes/) for anything breaking
- Merge the PR

**Building and verifying (human, local)**
- `git pull`
- `task docker-build` — builds the image locally, tagged with the git hash
- `task verify` — checks NordVPN version, kill-switch, and daemon socket
- If anything fails, fix and rebuild before continuing

**Publishing (human triggers, GitHub does the work)**
- `task release` — creates the annotated git tag and pushes it
- GitHub Actions automatically builds and pushes `fredplex/nordvpn:latest` + `fredplex/nordvpn:<tag>` to Docker Hub

**If an agent is doing a manual bump (no automated PR)**
- Agent runs `task bump NORDVPN_VERSION=x.x.x IMAGE_VERSION=y.y.y`
- Agent shows the diff and waits for human approval
- Human takes over from the build step onward — agent never builds, tags, or pushes

**What is never automated**
- Merging a PR
- Running the local build and verify
- Pushing the git tag

---

## 4. Automated triggers (GitHub Actions)

Three workflows run automatically. None of them push an image without a human-created git tag.

### 4.1 Weekly version check

**File:** `.github/workflows/check-nordvpn-release.yml`
**Trigger:** Every Monday at 08:00 UTC (cron), or manually (see [Section 6](#6-manual-triggers))
**What it does:**
1. Scrapes `https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/n/nordvpn/` for available `.deb` versions
2. Compares the latest available version against the `NORDVPN_VERSION` pinned in `Dockerfile`
3. If a newer version exists:
   - Runs `scripts/bump.sh` with the new version and a suggested `IMAGE_VERSION` (current patch + 1)
   - Opens a **draft PR** on branch `auto/nordvpn-<version>`
4. If already up to date: exits cleanly with no PR

**Human action required:** Review the draft PR, confirm or adjust `IMAGE_VERSION`, then merge.
**Secrets needed:** None (`GITHUB_TOKEN` is automatic).

---

### 4.2 PR build validation

**File:** `.github/workflows/build-validate.yml`
**Trigger:** Any pull request targeting `main`
**What it does:**
- Runs `docker build --platform linux/amd64`
- No login, no push, no registry credentials needed
- Fails the PR check if the Dockerfile has errors or `apt-get install` fails

**Human action required:** Fix the Dockerfile or scripts if the check fails before merging.
**Secrets needed:** None.

---

### 4.3 Tag-triggered publish

**File:** `.github/workflows/publish.yml`
**Trigger:** Push of a git tag matching `[0-9]+.[0-9]+.[0-9]+` (e.g. `5.6.0`)
**What it does:**
1. Logs in to Docker Hub using repo secrets
2. Runs `docker build --platform linux/amd64` with `IMAGE_VERSION=<tag>` passed as a build arg
   (so `/.version` inside the published image contains the semantic version, not a git hash)
3. Pushes two tags to Docker Hub:
   - `fredplex/nordvpn:latest`
   - `fredplex/nordvpn:<tag>` (e.g. `fredplex/nordvpn:5.6.0`)

**Human action required:** Create and push the git tag (see Step 5 below).
**Secrets needed:** `DOCKER_USERNAME` and `DOCKER_TOKEN` (see [Section 7](#7-one-time-setup-docker-hub-credentials-in-github)).

> **Note on image version vs. git hash:**
> `task docker-build` (local) passes the git commit hash as `IMAGE_VERSION` via `--build-arg`,
> so local test images have the hash in the `IMAGE_VERSION` environment variable and OCI label.
> Published images receive the semver tag as `IMAGE_VERSION`. This is intentional —
> `task verify` checks for the hash (confirming the local build); the published image carries
> the human-readable version. Query version without running the container:
> `docker inspect <image> --format '{{index .Config.Labels "org.opencontainers.image.version"}}'`

---

## 5. Step-by-step: version bump and publish

### Option A — Automated path (recommended)

When the weekly action detects a new version, it opens a draft PR. The steps from that point:

**1. Review the draft PR on GitHub**
- Check the diff: `Dockerfile`, `README.md`, `CLAUDE.md`, `.ai/current.md`
- Confirm `IMAGE_VERSION` is appropriate (automation suggests a patch bump)
- Check the [NordVPN release notes](https://nordvpn.com/blog/nordvpn-linux-release-notes/) for breaking changes
- Merge the PR when satisfied

**2. Pull the merged changes locally**
```bash
git pull
```

**3. Build the image locally**
```bash
task docker-build
```
This builds `fredplex/nordvpn:<git-hash>` for testing.

**4. Smoke-test the image**
```bash
task verify
```
Expected output:
```
=== Verifying fredplex/nordvpn:<hash> ===
    NordVPN target: 4.6.0

--- Stateless checks ---
  PASS  IMAGE_VERSION env = <hash>
  PASS  nordvpn --version = 4.6.0
  PASS  iptables OUTPUT policy DROP (kill-switch functional)

--- Runtime check (daemon socket) ---
  PASS  nordvpnd socket present at /run/nordvpn/nordvpnd.sock

=== 4 passed | 0 failed | 0 warnings ===
```

**5. Tag and push to trigger the publish workflow**
```bash
task release
```
This reads `IMAGE_VERSION` and `NORDVPN_VERSION` directly from the Dockerfile — no manual
input required. It will:
- Confirm the working tree is clean (fails if uncommitted changes exist)
- Confirm the tag does not already exist (prevents accidental double-release)
- Create the annotated git tag: `git tag -a <IMAGE_VERSION> -m "bump to NordVPN <NORDVPN_VERSION>"`
- Push the tag: `git push --tags`

Monitor the resulting publish workflow at:
**GitHub → Actions → Publish to Docker Hub**

---

### Option B — Fully manual path

Use this if you want to bump immediately without waiting for the weekly action.

**1. Check what's available**
```bash
task check-version
```
Output shows pinned version, available versions, and the exact `task bump` command to run.

**2. Apply the bump**
```bash
task bump NORDVPN_VERSION=4.6.0 IMAGE_VERSION=5.6.0
```
This script:
- Validates the version format
- Confirms `nordvpn_4.6.0_amd64.deb` exists in the official repo
- Updates `Dockerfile`, `README.md`, `CLAUDE.md`, `.ai/current.md`
- Shows `git diff` for review

**3. Review and commit**
```bash
git diff          # review changes
git add Dockerfile README.md CLAUDE.md .ai/current.md
git commit -m "chore: bump NordVPN 4.5.0 → 4.6.0"
```

**4–5.** Same as Option A steps 3–5 (`task docker-build` → `task verify` → `task release`).

---

## 6. Manual triggers

### Trigger the version check manually

Useful when you want to check for a new NordVPN release without waiting for Monday.

**Option 1 — Local:**
```bash
task check-version
```

**Option 2 — GitHub Actions UI:**
1. Go to the repo on GitHub → **Actions** tab
2. Left sidebar → **Check NordVPN Release**
3. Click **Run workflow** → select branch `main` → **Run workflow**
4. Watch the run; if a new version is found, a draft PR appears automatically

---

### Trigger the publish workflow manually

The publish workflow fires on a tag push. The easiest way:
```bash
task release
```
This reads both versions from the Dockerfile and handles tagging and pushing in one step.
There is no "Run workflow" button in the GitHub UI for this workflow — the tag push is the trigger, and the tag name becomes the Docker image tag.

---

### Trigger the build validation manually

The build-validate workflow runs on PRs automatically. To run it manually on any branch:
1. Go to **Actions → Build Validation**
2. There is no manual trigger for this workflow — it only fires on pull requests
3. To test it: open a draft PR from your branch to `main`

---

## 7. One-time setup: Docker Hub credentials in GitHub

The publish workflow needs credentials to push to Docker Hub. This is a one-time setup per repo.

### Step 1 — Create a Docker Hub access token

1. Log in to [hub.docker.com](https://hub.docker.com)
2. Click your avatar (top right) → **Account Settings**
3. Left sidebar → **Security** → **New Access Token**
4. Give it a descriptive name: `github-nordvpn-publish`
5. Set permissions to **Read, Write, Delete**
6. Click **Generate** — **copy the token now, it is only shown once**

### Step 2 — Add secrets to the GitHub repo

1. Go to the repo on GitHub → **Settings** tab
2. Left sidebar → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each entry:

| Name | Value |
|---|---|
| `DOCKER_USERNAME` | `fredplex` |
| `DOCKER_TOKEN` | the token copied in Step 1 |

### Step 3 — Verify the secrets are wired up

After adding both secrets, push any semver tag to confirm the workflow runs end-to-end:
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

---

## 8. Troubleshooting

### `task bump` fails with "Package not found"
The version you specified is not yet in the NordVPN Debian repo. Wait for the package to be
published (can lag the release announcement by hours or days) or run `task check-version` to
see what is actually available.

### `task verify` — `nordvpn --version` reports wrong version
The image was built with cached layers. Run:
```bash
docker build --no-cache --platform linux/amd64 . -f Dockerfile -t "fredplex/nordvpn:$(git log --format="%h" -n 1)"
```
or simply `task docker-build` again — Taskfile does not cache.

### `task verify` — iptables check fails on Docker Desktop (Windows/Mac)
`NET_ADMIN` capability is required. Ensure Docker Desktop is running and that the container
is not being blocked by a security policy. The stateless iptables check runs a one-shot
container; if it fails, inspect the output with:
```bash
docker run --rm --cap-add=NET_ADMIN --cap-add=NET_RAW fredplex/nordvpn:<hash> \
  /bin/bash -c "update-alternatives --set iptables /usr/sbin/iptables-legacy; iptables -L"
```

### Publish workflow fails at login step
Verify both `DOCKER_USERNAME` and `DOCKER_TOKEN` secrets exist in **Settings → Secrets and
variables → Actions**. Regenerate the token at hub.docker.com if it has expired.

### Publish workflow produces the wrong `:latest` tag
`docker/build-push-action` always pushes `:latest` as specified in the workflow tags list.
If a tag push was made in error, log in to Docker Hub and manually retag `:latest` to the
correct version, or re-run the correct tag's publish workflow via a fresh tag push.

### Draft PR IMAGE_VERSION is wrong
The weekly action suggests a patch bump. If the release warrants a minor or major bump,
edit `Dockerfile` line 7 (`ARG IMAGE_VERSION`) in the PR before merging. The rest of the
files will be updated on merge by the PR's existing commits.

### Weekly action opened a PR for an already-pinned version
This can happen if the repo's default branch is ahead of the PR branch. Close the PR,
pull the latest `main`, and re-run the workflow manually via the GitHub Actions UI.
