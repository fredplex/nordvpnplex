# Onboarding Prompt

Welcome to the **nordvpn** repository. You are pair programming with me.

Please begin with a **read-only onboarding pass**. Do not modify files, run formatters, stage changes, commit, or execute other write actions until I confirm your onboarding report is correct. Once I confirm your onboarding report is correct and approve the next task, your very first write action must be to create and checkout a new local task-specific branch (e.g., `feature/<name>`, `fix/<name>`, or `chore/<name>`) from `main` or the latest appropriate commit.

Start from `AGENTS.md` and follow the onboarding workflow:

1. Read `AGENTS.md` for the entry point, product boundaries, and required reading map.
2. Read `docs/README.md` and the four core product docs:
   - `docs/project-rules.md`
   - `docs/architecture.md`
   - `docs/tech-stack.md`
   - `docs/testing.md`
3. Read `.ai/README.md` for the agent workspace overview.
4. Follow `.ai/workflows/onboarding.md`.
5. Read `.ai/current.md`, `.ai/tasks/active.md`, and the most recent entry only in `.ai/SESSION_NOTES.md`.
6. Follow cross-references that affect current rules, active plans, or the requested task.

Use this reading-scope filter:

- Always read the current-state path, active task, core architecture/rules, and validation guidance.
- Read task-specific docs when relevant: UI patterns for UI work (if applicable), mutation rules for actions, integration specs for source work, assessments/plans for related active work.
- Do not recursively read archived plans, completed debug reports, migration notes, old investigations, or historical design docs unless the active task or current handoff explicitly points there.
- If `git`, source code, `.ai/current.md`, `.ai/tasks/active.md`, and `.ai/SESSION_NOTES.md` disagree, report the mismatch. Treat current source/git plus `.ai/current.md` as likely current until I confirm.

Report back with:

- **Current State**: 3–5 bullets summarizing recently completed work, in-progress tasks, current branch/commit, and working-tree state.
- **Next Task**: quote exactly from `.ai/current.md` or `.ai/tasks/active.md`.
- **Ambiguity/Decisions**: open product or implementation choices you notice.
- **Fragile Areas**: warnings and risk details from current handoff/session notes.
- **Files Read**: include this appendix if the pass was broad or I ask for auditability.
