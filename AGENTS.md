# Agent Patterns

## version-bump
Triggered manually. See CLAUDE.md for workflow.
Input: new NordVPN version string
Steps: locate → diff → confirm → apply → build → update state
Never: auto-push, modify build scripts, bump base image