<!-- prime: version=3.0.0 template=.ai/plans/container-startup-version-logs.md date=2026-07-09 -->
# Plan — Container Startup Version Logs

This plan addresses the missing image version logs and defines how to print the base image version during container startup.

## Phases

### Phase A: Fix Custom Log Version
- Update the shebang of `rootfs/etc/cont-init.d/00-version` to `#!/command/with-contenv bash` so that s6-overlay environment importer loads container environment variables.
- Validation: Build image locally, run, and check that custom version outputs correct value (instead of being empty).

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
