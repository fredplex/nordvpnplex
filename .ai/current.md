# Current Session State

## Status
Pending build — NordVPN 5.1.0 bump opened as draft PR

## Last Action
Automated PR opened on 2026-06-24 for NordVPN 5.1.0 / image 5.5.1.

## Next Action
1. Review and merge PR auto/nordvpn-5.1.0 (confirm IMAGE_VERSION first)
2. Run: task docker-build && task verify
3. git tag -a 5.5.1 -m "bump to NordVPN 5.1.0" && git push --tags

## Open Issues
- None
