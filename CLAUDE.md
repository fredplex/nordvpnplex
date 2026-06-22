# nordvpn-unraid — Claude Code Context

## Purpose
Builds a NordVPN Docker container optimized for Unraid. Rebuilt manually each
time NordVPN releases a new client version. No CI automation — this is a
deliberate human-in-the-loop update cycle.

## Repo Layout
- `Dockerfile`          — primary build file; version numbers live here
- `taskfile.yml`        — local build using taskfile build tool from http://taskfile.dev
- `README.md`           — typical project README file

## Version Bump Locations (ALL must be updated together)
1. `Dockerfile` — ARG NORDVPN_VERSION 
2. `Dockerfile` — ARG IMAGE_VERSION should move or add org.opencontainers.image.version at some point
3. `README.md`  — "Current version: x.x.x" badge / line

## Standard Update Workflow
1. Confirm new NordVPN version number with me before touching any file
2. Show a diff of every change before applying
1. Do NOT push — I push manually after verifying the local image

## NordVPN Version Source
Official releases: https://nordvpn.com/blog/nordvpn-linux-release-notes/
Package: https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/

## Constraints
- Never bump base image (e.g. debian:bookworm-slim) without explicit instruction
- Never modify Taskfile.yml unless asked
- Changelog entries go in README.md under ## Changelog, newest first

## Current Pinned Version
<!-- Update this after each successful rebuild -->
NordVPN: x.x.x  |  Image tag: fredplex/nordvpn-unraid:x.x.x  |  Built: YYYY-MM-DD