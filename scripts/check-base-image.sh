#!/usr/bin/env bash
set -euo pipefail
# Compare pinned base image digest in Dockerfile vs latest published digest.
# Run from repo root. Requires: docker buildx

IMAGE="ghcr.io/linuxserver/baseimage-ubuntu:noble"
PINNED=$(grep "ARG BASE_DIGEST=" Dockerfile | sed "s/ARG BASE_DIGEST='//;s/'$//")

echo "Checking : ${IMAGE}"
echo "Pinned   : ${PINNED}"

LATEST=$(docker buildx imagetools inspect "${IMAGE}" \
  --format '{{.Manifest.Digest}}')

echo "Latest   : ${LATEST}"
echo ""

if [[ "${PINNED}" == "${LATEST}" ]]; then
  echo "Up to date — base image digest is current."
else
  echo "Base image update available!"
  echo ""
  echo "Review linuxserver.io release notes before bumping:"
  echo "  https://github.com/linuxserver/docker-baseimage-ubuntu/releases"
  echo ""
  echo "To bump, run the GHA workflow or update Dockerfile BASE_DIGEST line to:"
  echo "  ARG BASE_DIGEST='${LATEST}'"
fi
