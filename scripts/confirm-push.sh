#!/usr/bin/env bash
set -euo pipefail

echo "================================================================"
echo "⚠️  WARNING: DIRECT DOCKER HUB PUSH DETECTED"
echo "================================================================"
echo "You are pushing directly to Docker Hub from your local machine."
echo "It is highly recommended to let GitHub Actions handle releases"
echo "to ensure deterministic builds and complete automated checks."
echo "================================================================"
echo ""

# Read confirmation from stdin
if [ -t 0 ]; then
  read -p "Are you sure you want to proceed with a direct push? (y/N): " -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Push aborted."
    exit 1
  fi
else
  echo "Non-interactive shell detected. Direct push is only allowed interactively."
  exit 1
fi
