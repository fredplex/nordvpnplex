<!-- prime: version=3.0.0 template=.ai/plans/container-startup-version-logs.md date=2026-07-09 -->
# Plan — Container Startup Version Logs (Revision 1)

This plan addresses the missing image version logs and defines how to print the base image version during container startup, using the formal semver wrapper version in local and release builds.

## Phases

### Phase A: Fix Custom Log Version
- Update the shebang of `rootfs/etc/cont-init.d/00-version` to `#!/command/with-contenv bash`.
- (Revision 1): Adjust `Taskfile.yml` to pass `{{.IMAGE_VERSION}}-dev+{{.GIT_HASH}}` to `IMAGE_VERSION` in `task docker-build` to preserve the semver version in local test runs.
- (Revision 1): Adjust `scripts/verify.sh` to use substring containment for version verification.
- Validation: Build image locally, run, and check that custom version outputs the full semver version string.

### Phase B: Print Base Image Version in Branding Block
- Update `Dockerfile` to create a `/build_version` file during build, writing both `IMAGE_VERSION` and `BASE_DIGEST` to it.
- Validation: Build image locally, run, and verify the branding block outputs both variables.

---

## Verification Plan

### Automated Tests
- Run `task docker-build` to verify successful local compile.
- Run `task verify` on the host to ensure all basic smoke tests pass.

### Manual Verification
- Start a test container, inspect `docker logs` to verify version banners in both custom and LSIO init branding, and clean up.
