# Quick Build & Release Checklist

One-page operator reference for common build and release tasks.

> **Windows prerequisite**: Docker Desktop must use **WSL2 backend** with WSL integration
> enabled, and Git Bash must be installed. Without WSL2, bash-based tasks (`verify`,
> `dev-build`, `dev-latest`, `dev-clean`) will fail. Verify:
> 1. Docker Desktop → Settings → General → "Use WSL 2 based engine" is checked
> 2. Docker Desktop → Settings → Resources → WSL Integration → your distro is enabled
> 3. `bash --version` works in your terminal

---

## Test Build (Local)

Use this for validating changes before publishing.

```powershell
# 1. Start Docker Desktop
# 2. Open the repo in PowerShell
cd c:\Users\fredp\Documents\GitHub\nordvpnplex

# 3. Build
task docker-build

# 4. Verify
task verify
```

**Expected output**:
```
=== Verifying fredplex/nordvpn:<hash> ===
    NordVPN target: 4.5.0

--- Stateless checks ---
  PASS  IMAGE_VERSION env = <hash>
  PASS  nordvpn --version = 4.5.0
  PASS  iptables OUTPUT policy DROP (kill-switch functional)

--- Runtime check (daemon socket) ---
  PASS  nordvpnd socket present at /run/nordvpn/nordvpnd.sock

=== 4 passed | 0 failed | 0 warnings ===
```

---

## Check for New NordVPN Version

Run this manually to check for updates (GitHub also runs this weekly on Mondays).

```powershell
task check-version
```

If a new version is available, GitHub will open a draft PR automatically. You can also trigger it manually via:
- GitHub → Actions → Check NordVPN Release → Run workflow

---

## Bump to New Version (Manual)

If you want to bump immediately without waiting for the GitHub draft PR:

```powershell
# Example: upgrade from 4.5.0 to 4.6.0, image version 5.5.0 to 5.6.0
task bump NORDVPN_VERSION=4.6.0 IMAGE_VERSION=5.6.0
```

Review the `git diff` output. If it looks correct:

```powershell
git add Dockerfile README.md CLAUDE.md .ai/current.md
git commit -m "chore: bump NordVPN 4.5.0 → 4.6.0"
```

Then proceed to "Release to Docker Hub" below.

---

## Release to Docker Hub (Local Manual Fallback)

Use this path if you need to manually tag and push a release from your local command line, bypassing the automatic merge-triggered tagging.

**Prerequisites:**
- Local build passes: `task docker-build` and `task verify`
- All changes are committed (working tree is clean)
- Docker Hub secrets are configured in GitHub (`DOCKER_USERNAME`, `DOCKER_TOKEN`)

```powershell
# This creates and pushes the git tag
# Reads both versions from Dockerfile — no manual input needed
task release
```

**What it does:**
- Creates an annotated git tag
- Pushes the tag
- GitHub Actions automatically builds and publishes the production image to Docker Hub

**Monitor:**
- GitHub → Actions → Publish to Docker Hub
- Once complete, image is available at:
  - `fredplex/nordvpn:latest`
  - `fredplex/nordvpn:<tag>` (e.g., `fredplex/nordvpn:5.6.0`)

---

## GitHub-Based CI Build

Use this to validate your changes via GitHub without pushing to Docker Hub.

```powershell
# 1. Create a branch
git checkout -b feature/my-change

# 2. Make your change (any file is fine)
# 3. Commit and push
git add <files>
git commit -m "..."
git push -u origin feature/my-change

# 4. Open a PR to main
# Go to: https://github.com/fredplex/nordvpnplex → New Pull Request

# GitHub automatically runs build-validate.yml (no push to Docker Hub)
```

---

## Dev Build (Testing)

Use this to build and push a dev image for testing without affecting the production `:latest` tag.

### Local dev build and push

```powershell
# Build with currently pinned NordVPN version
task dev-build

# Build with a specific NordVPN version
task dev-build NORDVPN_VERSION=4.6.0

# Auto-discover newest NordVPN version and build with it
task dev-latest

# Push to Docker Hub (requires docker login)
task dev-push
```

**What it does:**
- Tags the image as `fredplex/nordvpn:dev` (moving) and `fredplex/nordvpn:dev-<hash>` (immutable)
- Sets `IMAGE_VERSION=dev-<hash>` inside the container
- Never touches `:latest` or creates git tags

### Consuming the dev image

```powershell
docker pull fredplex/nordvpn:dev
```

In Unraid: change your container template repository to `fredplex/nordvpn:dev`.
Switch back to `fredplex/nordvpn:latest` when done testing.

### CI dev build (GitHub Actions)

1. GitHub → **Actions** → **Publish Dev to Docker Hub**
2. Click **Run workflow**
3. NordVPN version: blank = pinned, `latest` = auto-discover, or type `x.y.z`
4. Click **Run workflow** — builds, smoke-tests, pushes `:dev` + `:dev-<sha>`

### Cleanup

```powershell
task dev-clean
```

---

## Typical Release Workflow

This is the standard automated flow after a new NordVPN version is detected:

1. **Pull and Test the Dev Container**
   - Grab the tag from the draft PR:
     ```powershell
     docker pull fredplex/nordvpn:dev-<version>
     ```
   - Verify that the container runs and connects successfully.

2. **Review draft PR on GitHub**
   - Confirm `IMAGE_VERSION` in the `Dockerfile` is correct.
   - Click **Merge pull request** to approve and trigger the production release.

3. **Monitor the Pipeline**
   - Watch the build/smoke-tests/publish process under **GitHub → Actions → Publish to Docker Hub**.

4. **Pull Git Tag**
   - Run a pull locally to sync the automatically created Git Release Tag:
     ```powershell
     git pull
     ```

5. **Update `.ai/current.md`**
   - Update version numbers and build date.

Done. Image is on Docker Hub.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `task docker-build` fails | Ensure Docker Desktop is running |
| `task verify` fails on iptables | Docker Desktop on Windows/Mac needs `NET_ADMIN` capability; this is normal if the container can't check it |
| `task verify` fails on nordvpn version | Rebuild without cache: `docker build --no-cache --platform linux/amd64 . -f Dockerfile -t "fredplex/nordvpn:$(git log --format='%h' -n 1)"` |
| `task release` says "tag already exists" | The version has already been released; increment `IMAGE_VERSION` or `NORDVPN_VERSION` in Dockerfile first |
| `task release` says "working tree not clean" | Commit all changes: `git status` to see what's pending |

---

## Key Files Reference

- **Build config:** [Dockerfile](../Dockerfile)
- **Tasks:** [Taskfile.yml](../Taskfile.yml)
- **Current state:** [.ai/current.md](../.ai/current.md)
- **Full guide:** [build-and-publish.md](build-and-publish.md)
