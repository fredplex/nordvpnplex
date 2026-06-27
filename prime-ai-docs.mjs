#!/usr/bin/env node
/**
 * prime-ai-docs.mjs
 *
 * Scaffolds the AI agent collaboration system (.ai/ + docs/) in a new or existing repo.
 * No external dependencies — Node.js built-ins only.
 *
 * Usage:
 *   node prime-ai-docs.mjs                     # interactive, targets cwd
 *   node prime-ai-docs.mjs ../other-project    # interactive, targets another dir
 *   node prime-ai-docs.mjs --dry-run           # preview what would be created/skipped, no writes
 *   node prime-ai-docs.mjs --overwrite         # re-generate all files, auto-backup existing (prompts for confirmation)
 *   node prime-ai-docs.mjs --overwrite --no-backup  # re-generate without creating a backup
 *   node prime-ai-docs.mjs --version          # print template version and exit
 *   node prime-ai-docs.mjs --help             # print usage help menu and exit
 *   node prime-ai-docs.mjs --yes \
 *     --name "My App" \
 *     --description "A platform for X" \
 *     --stack "Next.js, TypeScript, Prisma" \
 *     --install "npm ci" \
 *     --dev "npm run dev" \
 *     --validate "npm run validate:local" \
 *     --test "npm run test:e2e"
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const TEMPLATE_VERSION = '1.2.1'

// Per-file version map — each value is the TEMPLATE_VERSION when that template was last changed.
// When a template changes: bump TEMPLATE_VERSION and update the matching entry here in the same commit.
const FILE_VERSIONS = {
  'CLAUDE.md':                               '1.0.0',
  'AGENTS.md':                               '1.1.0',
  '.ai/README.md':                           '1.2.0',
  '.ai/current.md':                          '1.0.0',
  '.ai/SESSION_NOTES.md':                    '1.0.0',
  '.ai/rules/engineering-rules.md':          '1.0.0',
  '.ai/rules/security-rules.md':             '1.0.0',
  '.ai/rules/mutation-rules.md':             '1.0.0',
  '.ai/workflows/onboarding.md':             '1.0.0',
  '.ai/workflows/implementation.md':         '1.2.0',
  '.ai/workflows/validation.md':             '1.0.0',
  '.ai/workflows/review.md':                 '1.0.0',
  '.ai/tasks/active.md':                     '1.0.0',
  '.ai/tasks/completed.md':                  '1.0.0',
  '.ai/prompts/onboarding-prompt.md':        '1.0.0',
  '.ai/prompts/intermediate-phase-prompt.md':'1.2.0',
  '.ai/prompts/session-close-prompt.md':     '1.2.0',
  '.ai/prompts/execute-plan-prompt.md':      '1.2.0',
  '.ai/memory/project-state.md':             '1.0.0',
  '.ai/memory/architecture-decisions.md':    '1.0.0',
  'docs/README.md':                          '1.0.0',
  'docs/architecture.md':                    '1.2.1',
  'docs/project-rules.md':                   '1.0.0',
  'docs/feature-state.md':                   '1.0.0',
  'docs/tech-stack.md':                      '1.0.0',
  'docs/testing.md':                         '1.0.0',
}

const F = '```' // fence — avoids escaping backticks inside template literals

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { targetDir: null, yes: false, overwrite: false, dryRun: false, noBackup: false, version: false, help: false, flags: {} }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--yes') { args.yes = true; continue }
    if (arg === '--overwrite') { args.overwrite = true; continue }
    if (arg === '--dry-run') { args.dryRun = true; continue }
    if (arg === '--no-backup') { args.noBackup = true; continue }
    if (arg === '--version') { args.version = true; continue }
    if (arg === '--help' || arg === '-h') { args.help = true; continue }
    const eqMatch = arg.match(/^--([a-z-]+)=(.+)$/)
    if (eqMatch) { args.flags[eqMatch[1]] = eqMatch[2]; continue }
    const spMatch = arg.match(/^--([a-z-]+)$/)
    if (spMatch && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args.flags[spMatch[1]] = argv[++i]; continue
    }
    if (!arg.startsWith('--')) args.targetDir = arg
  }
  return args
}

// ── Target dir + project defaults ─────────────────────────────────────────────

function resolveTargetDir(argTargetDir) {
  return argTargetDir ? path.resolve(process.cwd(), argTargetDir) : process.cwd()
}

function readPackageJson(targetDir) {
  const p = path.join(targetDir, 'package.json')
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
}

function detectPackageManager(targetDir) {
  if (fs.existsSync(path.join(targetDir, 'bun.lockb'))) return 'bun'
  if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

// ── Context collection ────────────────────────────────────────────────────────

async function collectContext(args, targetDir) {
  const pkg = readPackageJson(targetDir)
  const pm = detectPackageManager(targetDir)
  const ci = pm === 'npm' ? 'npm ci' : `${pm} install`
  const run = (s) => `${pm} run ${s}`
  const dirName = path.basename(targetDir)

  const defaults = {
    name:        args.flags.name        || pkg?.name        || dirName,
    description: args.flags.description || pkg?.description || '',
    stack:       args.flags.stack       || '',
    install:     args.flags.install     || ci,
    dev:         args.flags.dev         || run('dev'),
    validate:    args.flags.validate    || run('validate:local'),
    test:        args.flags.test        || run('test:e2e'),
    date:        new Date().toISOString().slice(0, 10),
  }

  if (args.yes) {
    if (!defaults.name) {
      console.error('❌  --yes mode requires at least --name "..."')
      process.exit(1)
    }
    return defaults
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise(res => rl.question(q, res))

  console.log('\n📋  AI Docs Primer — let\'s collect a few details\n')

  const ctx = { date: defaults.date }
  const prompt = (label, def) => ask(`  ${label}${def ? ` [${def}]` : ''}: `)

  ctx.name        = (await prompt('Project name',                  defaults.name)).trim()        || defaults.name
  ctx.description = (await prompt('One-line description',          defaults.description)).trim() || defaults.description
  ctx.stack       = (await prompt('Tech stack (comma-separated)',  defaults.stack)).trim()       || defaults.stack
  ctx.install     = (await prompt('Install command',               defaults.install)).trim()     || defaults.install
  ctx.dev         = (await prompt('Dev server command',            defaults.dev)).trim()         || defaults.dev
  ctx.validate    = (await prompt('Static validation gate',        defaults.validate)).trim()    || defaults.validate
  ctx.test        = (await prompt('Runtime / E2E test command',    defaults.test)).trim()        || defaults.test

  rl.close()
  return ctx
}

// ── File generator ────────────────────────────────────────────────────────────

function writeFile(fullPath, content) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  const tmp = `${fullPath}.prime-tmp`
  fs.writeFileSync(tmp, content, 'utf8')
  fs.renameSync(tmp, fullPath)
}

function makeTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-')
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1
    if (pa[i] < pb[i]) return -1
  }
  return 0
}

function readDeployedVersions(targetDir) {
  const versionsPath = path.join(targetDir, '.ai-prime-versions.json')

  if (fs.existsSync(versionsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(versionsPath, 'utf8'))
      return data.files || {}
    } catch {
      return {}
    }
  }

  // Backward compat: .ai-prime-versions.json absent — read .ai-prime-version for baseline.
  // Assume all template files were deployed at that version so only genuinely changed
  // templates get updated on the first smart-update run.
  const primePath = path.join(targetDir, '.ai-prime-version')
  if (fs.existsSync(primePath)) {
    const content = fs.readFileSync(primePath, 'utf8')
    const match = content.match(/v(\d+\.\d+\.\d+)/)
    const version = match ? match[1] : '0.0.0'
    const assumed = {}
    for (const relPath of Object.keys(FILE_VERSIONS)) assumed[relPath] = version
    return assumed
  }

  return {}
}

function backupFiles(templates, targetDir, timestamp, dryRun = false, filter = null) {
  const results = []
  for (const relPath of Object.keys(templates)) {
    if (filter !== null && !filter.includes(relPath)) continue
    const srcPath = path.join(targetDir, relPath)
    if (!fs.existsSync(srcPath)) continue
    const destPath = path.join(targetDir, '.ai-prime-backup', timestamp, relPath)
    if (dryRun) {
      results.push({ path: relPath, status: 'would-backup' })
      continue
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(srcPath, destPath)
    results.push({ path: relPath, status: 'backed-up' })
  }
  return results
}

function generateFiles(templates, targetDir, overwrite, dryRun = false, deployedVersions = null, fileVersions = null) {
  const smartUpdate = deployedVersions !== null && fileVersions !== null
  return Object.entries(templates).map(([relPath, fn]) => {
    const fullPath = path.join(targetDir, relPath)
    const exists = fs.existsSync(fullPath)

    if (!exists) {
      if (!dryRun) writeFile(fullPath, fn())
      return { path: relPath, status: dryRun ? 'would-create' : 'created' }
    }

    if (overwrite) {
      if (!dryRun) writeFile(fullPath, fn())
      return { path: relPath, status: dryRun ? 'would-overwrite' : 'overwritten' }
    }

    if (smartUpdate) {
      const deployed = deployedVersions[relPath] ?? '0.0.0'
      const current  = fileVersions[relPath]  ?? TEMPLATE_VERSION
      if (compareVersions(current, deployed) > 0) {
        if (!dryRun) writeFile(fullPath, fn())
        return { path: relPath, status: dryRun ? 'would-update' : 'updated', fromVersion: deployed, toVersion: current }
      }
      return { path: relPath, status: 'current' }
    }

    return { path: relPath, status: dryRun ? 'would-skip' : 'skipped' }
  })
}

// ── Manifest ──────────────────────────────────────────────────────────────────

function writeVersionFile(targetDir) {
  const content = `vibe-coding-template v${TEMPLATE_VERSION}
Primed: ${new Date().toISOString()}

To check if a newer version of the template is available:
  node prime-ai-docs.mjs --version

To update: see PRIME.md — "If you are updating templates (re-prime)"
`
  fs.writeFileSync(path.join(targetDir, '.ai-prime-version'), content, 'utf8')
}

function writeVersionsFile(targetDir, deployedVersions, results) {
  // Start from whatever was deployed before this run, then patch in files touched this run.
  const files = { ...deployedVersions }
  for (const r of results) {
    if (['created', 'updated', 'overwritten'].includes(r.status) && FILE_VERSIONS[r.path]) {
      files[r.path] = FILE_VERSIONS[r.path]
    }
  }
  const content = JSON.stringify({
    writtenWith: TEMPLATE_VERSION,
    primed: new Date().toISOString(),
    files,
  }, null, 2) + '\n'
  fs.writeFileSync(path.join(targetDir, '.ai-prime-versions.json'), content, 'utf8')
}

function writeManifest(targetDir, ctx, mode, results) {
  const manifest = {
    templateVersion: TEMPLATE_VERSION,
    primedAt: new Date().toISOString(),
    targetDir,
    mode,
    context: ctx,
    files: results,
  }
  fs.writeFileSync(
    path.join(targetDir, '.ai-prime-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

function printSummary(targetDir, results, dryRun = false, backupResults = [], backupDir = null, mode = 'init') {
  const created     = results.filter(r => r.status === 'created')
  const updated     = results.filter(r => r.status === 'updated')
  const overwritten = results.filter(r => r.status === 'overwritten')
  const current     = results.filter(r => r.status === 'current')
  const skipped     = results.filter(r => r.status === 'skipped')
  const wouldCreate = results.filter(r => r.status === 'would-create')
  const wouldUpdate = results.filter(r => r.status === 'would-update')
  const wouldSkip   = results.filter(r => r.status === 'would-skip')
  const wouldBackup = backupResults.filter(r => r.status === 'would-backup')
  const backedUp    = backupResults.filter(r => r.status === 'backed-up')

  const completionLabel = mode === 'update' ? 'update complete' : 'prime complete'
  const header = dryRun
    ? `🔍  AI Agent Docs v${TEMPLATE_VERSION} — dry run (no files written)\n`
    : `✅  AI Agent Docs v${TEMPLATE_VERSION} — ${completionLabel}\n`
  console.log(`\n${header}`)
  console.log(`    Target: ${targetDir}\n`)

  // ── Dry run output ──────────────────────────────────────────────────────────
  if (dryRun) {
    if (wouldBackup.length) {
      console.log(`  Would back up (${wouldBackup.length}):`)
      wouldBackup.forEach(r => console.log(`    📦  ${r.path}`))
      console.log()
    }
    if (wouldUpdate.length) {
      console.log(`  Would update (${wouldUpdate.length}):`)
      wouldUpdate.forEach(r => console.log(`    ♻️   ${r.path}  (${r.fromVersion} → ${r.toVersion})`))
      console.log()
    }
    if (wouldCreate.length) {
      console.log(`  Would create (${wouldCreate.length}):`)
      wouldCreate.forEach(r => console.log(`    ✅  ${r.path}`))
      console.log()
    }
    if (wouldSkip.length) {
      console.log(`  Would skip — already exist (${wouldSkip.length}):`)
      wouldSkip.forEach(r => console.log(`    ⏭   ${r.path}`))
    }
    if (current.length) {
      console.log(`  Up to date — no changes since deployed (${current.length}):`)
      current.forEach(r => console.log(`    ─   ${r.path}`))
    }
    console.log('\n  Run without --dry-run to apply these changes.\n')
    return
  }

  // ── Normal run output ───────────────────────────────────────────────────────
  if (backedUp.length) {
    const rel = path.relative(targetDir, backupDir)
    console.log(`  Backed up (${backedUp.length}) → ${rel}/`)
    backedUp.forEach(r => console.log(`    📦  ${r.path}`))
    console.log()
  }
  if (updated.length) {
    console.log(`  Updated (${updated.length}):`)
    updated.forEach(r => console.log(`    ♻️   ${r.path}  (${r.fromVersion} → ${r.toVersion})`))
    console.log()
  }
  if (created.length) {
    console.log(`  Created (${created.length}):`)
    created.forEach(r => console.log(`    ✅  ${r.path}`))
    console.log()
  }
  if (overwritten.length) {
    console.log(`  Overwritten (${overwritten.length}):`)
    overwritten.forEach(r => console.log(`    🔄  ${r.path}`))
    console.log()
  }
  if (current.length) {
    console.log(`  Up to date (${current.length}):`)
    current.forEach(r => console.log(`    ─   ${r.path}`))
    console.log()
  }
  if (skipped.length) {
    console.log(`  Skipped — already exist (${skipped.length}):`)
    skipped.forEach(r => console.log(`    ⏭   ${r.path}`))
    console.log()
  }

  console.log('  Manifest written to .ai-prime-manifest.json')

  const hasBackup   = backupDir !== null
  const isOverwrite = overwritten.length > 0
  const isUpdate    = updated.length > 0 || mode === 'update'
  const primeExists = fs.existsSync(path.join(targetDir, 'PRIME.md'))
  const primeRef    = primeExists ? 'PRIME.md' : 'https://github.com/fredplex/vibe-coding-template'
  const guideNote   = primeExists
    ? `       Or complete setup manually:\n         Read PRIME.md — it guides you through every fill-in section in priority order.\n`
    : `       For setup guidance: ${primeRef}\n`

  console.log('\n  Next steps:\n')
  let step = 1

  if (hasBackup && isUpdate) {
    // Smart update with backup
    const rel = path.relative(targetDir, backupDir)
    console.log(`    ${step++}. Merge your project-specific content from the backup into the updated files:`)
    console.log(`         ${rel}/`)
    console.log()
    if (primeExists) {
      console.log(`       With an AI agent (recommended):`)
      console.log(`         Claude Code — open a new session; CLAUDE.md auto-loads and orients you to AGENTS.md.`)
      console.log(`         Other tools — paste .ai/prompts/onboarding-prompt.md as your opening message.`)
      console.log(`         Then say: "Read PRIME.md and help me merge the backup and apply the template updates"`)
      console.log()
      console.log(`       Or merge manually:`)
      console.log(`         Read PRIME.md — "Merging backup content into new templates" guides every updated file.`)
    } else {
      console.log(`       For merge guidance: ${primeRef}`)
    }
    console.log()
    console.log(`    ${step++}. Add .ai-prime-backup/ to your .gitignore`)
    console.log()
    console.log(`    ${step++}. Commit when the merge is complete:`)
    console.log(`         git add -A && git commit -m "chore: update AI agent docs templates"`)
    if (created.length > 0) {
      console.log()
      console.log(`    ${step++}. Fill in placeholder sections in the newly created files:`)
      if (primeExists) {
        console.log(`         With an AI agent: "Read PRIME.md and help me fill in the newly added sections"`)
        console.log(`         Manually: read PRIME.md — the fill-in priority order covers every file.`)
      } else {
        console.log(`         See ${primeRef}`)
      }
    }
  } else if (mode === 'update' && !isUpdate && created.length === 0) {
    // Smart update — nothing to do
    console.log(`    Everything is already up to date. No action needed.\n`)
    return
  } else if (mode === 'update' && created.length > 0 && !isUpdate) {
    // Smart update — only new files were created
    console.log(`    ${step++}. Commit the new files to your branch:`)
    console.log(`         git add -A && git commit -m "chore: add missing AI agent docs"`)
    console.log()
    console.log(`    ${step++}. Fill in placeholder sections in the new files:`)
    if (primeExists) {
      console.log(`         With an AI agent: "Read PRIME.md and help me fill in the newly added sections"`)
      console.log(`         Manually: read PRIME.md — the fill-in priority order covers every file.`)
    } else {
      console.log(`         See ${primeRef}`)
    }
  } else if (hasBackup && isOverwrite) {
    // --overwrite with backup
    const rel = path.relative(targetDir, backupDir)
    console.log(`    ${step++}. Merge your project-specific content from the backup:`)
    console.log(`         ${rel}/`)
    if (primeExists) console.log(`       Follow the merge protocol in PRIME.md — "Merging backup content into new templates"`)
    console.log()
    console.log(`    ${step++}. Add .ai-prime-backup/ to your .gitignore`)
    console.log()
    console.log(`    ${step++}. Commit when the merge is complete:`)
    console.log(`         git add -A && git commit -m "chore: update AI agent docs templates"`)
    console.log()
    console.log(`    ${step++}. If this template version added new sections, fill them in:`)
    if (primeExists) {
      console.log(`         With an AI agent: "Read PRIME.md and help me merge the backup and fill in new sections"`)
      console.log(`         Manually: read PRIME.md — fill-in priority order and merge protocol are both there.`)
    } else {
      console.log(`         See ${primeRef}`)
    }
  } else if (isOverwrite) {
    // --overwrite --no-backup
    console.log(`    ${step++}. Re-fill any project-specific sections replaced by fresh template content:`)
    if (primeExists) {
      console.log(`         With an AI agent: "Read PRIME.md and help me re-fill the project-specific sections"`)
      console.log(`         Manually: read PRIME.md — the fill-in priority order covers every section.`)
    } else {
      console.log(`         See ${primeRef}`)
    }
    console.log()
    console.log(`    ${step++}. Commit when done:`)
    console.log(`         git add -A && git commit -m "chore: update AI agent docs templates"`)
  } else {
    // Init (fresh prime, all files created)
    console.log(`    ${step++}. Commit the generated files to your branch:`)
    console.log(`         git add -A && git commit -m "chore: prime AI agent docs"`)
    console.log()
    console.log(`    ${step++}. Complete setup — with an AI agent (recommended):`)
    console.log(`         Claude Code — CLAUDE.md auto-loads at every session start.`)
    console.log(`           Open a new session; it will point you to AGENTS.md automatically.`)
    console.log(`         Other tools (Cursor, Windsurf, etc.) —`)
    console.log(`           Paste the contents of .ai/prompts/onboarding-prompt.md as your opening message.`)
    if (primeExists) console.log(`         Then say: "Read PRIME.md and help me complete the project setup"`)
    console.log()
    console.log(guideNote)
    if (primeExists) {
      console.log(`    ${step++}. Once setup is complete, archive PRIME.md:`)
      console.log(`         mv PRIME.md .ai/knowledge/prime-reference.md`)
    }
  }

  console.log()
}

// ── Git awareness ─────────────────────────────────────────────────────────────

function checkGit(targetDir) {
  const gitDir = path.join(targetDir, '.git')
  if (!fs.existsSync(gitDir)) return

  try {
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim()
    if (head.startsWith('ref: refs/heads/')) {
      const branch = head.slice('ref: refs/heads/'.length)
      if (branch === 'main' || branch === 'master') {
        console.log(`  ⚠️   On branch '${branch}' — consider running from a feature branch`)
      }
    }
  } catch {}

  try {
    const status = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    if (status.trim()) {
      console.log('  ⚠️   Working tree has uncommitted changes — generated files will appear as untracked')
    }
  } catch {}
}

// ── Overwrite confirmation ────────────────────────────────────────────────────

async function confirmOverwrite(targetDir) {
  const aiDir = path.join(targetDir, '.ai')
  let hasContent = false
  try { hasContent = fs.readdirSync(aiDir).length > 0 } catch {}
  if (!hasContent) return

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(res =>
    rl.question("\n  ⚠️   --overwrite will replace existing files in this repo.\n  Type 'overwrite' to confirm: ", res)
  )
  rl.close()

  if (answer.trim() !== 'overwrite') {
    console.log('\n  Aborted. Run without --overwrite to add only missing files.\n')
    process.exit(0)
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

function buildTemplates(ctx) {
  const { name, description, stack, install, dev, validate, test, date } = ctx
  const stackLine = stack ? `**Tech stack**: ${stack}` : '**Tech stack**: <to fill in>'
  const cmd = (val, label) => val.includes('#') ? val : `${val}    # ${label}`

  return {

// ─────────────────────────────────────────────────────────────────────────────
'CLAUDE.md': () => `# CLAUDE.md

This file is read automatically by Claude Code at the start of every session.

**Read [\`AGENTS.md\`](AGENTS.md) first.** It is the primary entry point for ${name} and contains architecture, key boundaries, validation gates, and working rules.

## Quick Commands

${F}bash
${cmd(install, 'Install dependencies')}
${cmd(dev, 'Dev server')}
${cmd(validate, 'Full static gate')}
${cmd(test, 'Runtime gate')}
${F}

## Session Start Protocol

1. Read \`AGENTS.md\` → \`.ai/current.md\` → \`.ai/tasks/active.md\` → \`.ai/SESSION_NOTES.md\` (last entry only)
2. Report back: Current State / Next Task / Ambiguity / Fragile Areas
3. **Wait for human confirmation before writing anything**
4. First write action: \`git checkout -b <type>/<name>\`

Full onboarding workflow: \`.ai/workflows/onboarding.md\`
`,

// ─────────────────────────────────────────────────────────────────────────────
'AGENTS.md': () => `# AGENTS.md

Main entry point for coding agents working in this repository.

**Current source code is runtime truth.** If docs and code disagree, report the mismatch and treat source as authoritative.

---

## Quick Start

### First Time Here?

1. Read this file (5 minutes)
2. Read \`docs/README.md\` — product documentation overview
3. **Read the core product docs (required, not optional):**
   - \`docs/project-rules.md\` — product vision, boundaries, and governance
   - \`docs/architecture.md\` — full architecture philosophy and design decisions
   - \`docs/tech-stack.md\` — technology choices, rationale, and dependency versions
   - \`docs/testing.md\` — testing strategy, framework config, and coverage expectations
4. Read \`.ai/README.md\` — agent workspace overview
5. Follow \`.ai/workflows/onboarding.md\` — complete onboarding
6. Read \`.ai/current.md\` — handoff state: what's done, what's next, fragile areas
7. Read \`.ai/SESSION_NOTES.md\` (last entry only) — stopping point and key decisions from the previous session

### Commands

${F}bash
${cmd(install, 'Install dependencies')}
${cmd(dev, 'Start dev server')}
${cmd(validate, 'Full static validation gate')}
${cmd(test, 'Runtime / E2E gate')}
${F}

---

## Project Context

**${name}** — ${description || '<one-line description of what this app does>'}

${stackLine}

**Current posture**: <read-mostly observability | controlled mutations | full CRUD | etc.>

---

## Architecture

<Replace this section with your actual data flow. Choose the pattern that fits your project:>

**Web app / BFF**:
${F}
Browser → API Routes → Domain Layer → External Services / Database
${F}

**API / backend service**:
${F}
Client → Route handlers → Service layer → Adapters → Database / External APIs
${F}

**CLI / scripting tool**:
${F}
CLI entry → Command layer → Core logic → File system / APIs
${F}

**Library / SDK**:
${F}
Public API surface → Implementation modules → Platform adapters
${F}

**Key rules** (replace with your own):
- <Constraint 1 — e.g. "no external calls from the UI layer">
- <Constraint 2>

See \`docs/architecture.md\` for the full architecture reference.

---

## Required Reading

Before significant work, read relevant files:

### Core Product Docs (read these first — required)
- \`docs/project-rules.md\` — product vision, boundaries, and governance
- \`docs/architecture.md\` — full architecture philosophy and design decisions
- \`docs/tech-stack.md\` — technology choices, rationale, and dependency versions
- \`docs/testing.md\` — testing strategy, framework config, and coverage expectations

### Core Rules
- \`.ai/rules/engineering-rules.md\` — implementation rules
- \`.ai/rules/security-rules.md\` — trust boundaries
- \`.ai/rules/mutation-rules.md\` — mutable feature approval

### Memory
- \`.ai/memory/project-state.md\` — current product posture
- \`.ai/memory/architecture-decisions.md\` — key architectural choices

### Workflows
- \`.ai/workflows/onboarding.md\` — getting started
- \`.ai/workflows/implementation.md\` — plan → code → test → validate
- \`.ai/workflows/validation.md\` — testing gates
- \`.ai/workflows/review.md\` — code review checklist

### Tasks
- \`.ai/current.md\` — live handoff state
- \`.ai/tasks/active.md\` — what is in flight or queued next

### Version
- \`.ai-prime-version\` — template version used to generate this project
- \`.ai-prime-versions.json\` — per-file version record; used by the script's smart update to detect which files have improved templates available

---

## Key Boundaries

### Product Posture

✅ **Approved**:
- <list approved operations, e.g. "read-only observability", "user CRUD", "order placement">

🚫 **Not approved** (unless separately approved with full governance):
- <list forbidden operations, e.g. "database admin", "infrastructure control", "AI-driven actions">

### Architecture Boundaries

✅ **Must**:
- <constraint 1 — e.g. "all writes use atomic tmp-then-rename" or "secrets stay server-side">
- <constraint 2 — e.g. "domain layer has no framework imports" or "no external calls from the UI layer">
- <constraint 3>

🚫 **Must not**:
- <forbidden pattern 1 — e.g. "client calls external APIs directly" or "write files outside targetDir">
- <forbidden pattern 2>
- Add mutations without approval gate

---

## Validation

### For Every Change
${F}bash
${cmd(validate, 'Full static gate')}
${F}

For narrower per-change-type validation chains (e.g. type-check only, unit tests only), see \`.ai/workflows/validation.md\`.

### Before Declaring Done
${F}bash
${cmd(validate, 'Full static gate')}
${cmd(test, 'Runtime gate')}
${F}

---

## Working Rules

### Before Starting Any Work

These two steps are mandatory before any write action, without exception:

1. **Create a task branch** — \`git checkout -b <type>/<name>\` (\`feature/\`, \`fix/\`, \`chore/\`, \`docs/\`). This is always the first write action. Never work on \`main\` directly.
2. **For multi-step work: write a plan first** — create \`.ai/plans/<name>.md\` covering background, scope, phases, and execution order. Present it for human approval before implementing anything.

Do not skip either step, even for small tasks. The branch protects \`main\`; the plan ensures alignment before effort is spent.

### Use a Branch-Based Workflow
- **Never work on the \`main\` branch directly.**
- Always create and switch to a task-specific branch (\`feature/<name>\`, \`fix/<name>\`, \`chore/<name>\`) as the very first write action.
- **Obtain explicit human approval** before committing and pushing any changes.
- At session end, **obtain explicit human approval** to merge your task branch into \`main\`.

### Keep Changes Focused
- One logical change per commit
- Don't refactor unrelated code
- Don't skip validation

### Keep the Onboarding Path Current
- When work lands or priorities change, update \`.ai/current.md\` and \`.ai/tasks/active.md\`
- A new agent must learn current state from the standard path without hunting

---

## Quick Reference

### Commands
| Command | Purpose |
|---------|---------|
| \`${install}\` | Install dependencies |
| \`${dev}\` | Dev server |
| \`${validate}\` | Full static gate |
| \`${test}\` | Runtime gate |

### File Structure
${F}
<source>/             # Application source (e.g. src/, lib/, cmd/, <package_name>/)
docs/                 # Product documentation (comprehensive reference)
.ai/                  # Agent workspace (distilled working context)
${F}
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/README.md': () => `# Agent Workspace

Welcome to the \`.ai/\` directory — the operational context for working on **${name}**.

---

## Quick Orientation

**What is this app?**
${description ? `- ${description}` : '- <one-line description>'}
${stack ? `- **Stack**: ${stack}` : ''}

**Current phase**: <describe current development phase>

---

## Directory Structure

**You own this workspace.** Read what's here, add to it when you learn something, and create new files when a category doesn't exist yet.

### \`/memory/\` — Stable Facts
Foundational knowledge about this codebase. Read before making significant changes; write when you learn something new.

### \`/rules/\` — Implementation Rules
Rules you must follow when writing code. Use \`paths:\` frontmatter to scope rules to specific file globs.

- **\`engineering-rules.md\`** — layer boundaries, naming conventions, mutation discipline, commit hygiene. Has per-archetype sections (Web, API, CLI); delete the ones that don't apply to this project.
- **\`security-rules.md\`** — trust boundaries and security enforcement. Has per-archetype sections; keep only the one that matches this project's execution model.
- **\`mutation-rules.md\`** — mutation taxonomy, approval model, and required protections. The \`Currently Approved\` section is the live list — update it whenever a mutation is approved or revoked.

_When to update_: when a new rule is established; when the Currently Approved list changes.

### \`/workflows/\` — How To Work
Repeatable procedures for common tasks. One workflow per file — do not let them become catch-all documents.

- **\`onboarding.md\`** — prescribed reading order, scope filter, and report-back format for starting a session.
- **\`implementation.md\`** — the Plan → Code → Test → Validate cycle; intermediate phase commit protocol; session close protocol.
- **\`validation.md\`** — the two validation gates (static and runtime) and per-change-type test chains.
- **\`review.md\`** — pre-commit checklist covering layer boundaries, security, tests, commit hygiene, and mutation requirements.

_When to update_: when validation commands change; when checklist items are added or revised.

### \`/tasks/\` — Task Tracking
Track work here. Update \`active.md\` as you work; move completed items to \`completed.md\`.

### \`/plans/\` — Implementation Plans
Detailed work plans for approved initiatives. Create a plan before starting multi-step work.

### \`/prompts/\` — Reusable Agent Prompts
Copy-paste prompts for starting a session, executing plan phases, and closing a session.

- **\`onboarding-prompt.md\`** — paste as opening message to start a new agent session
- **\`intermediate-phase-prompt.md\`** — Supervised mode: execute one phase with human approval before commit
- **\`execute-plan-prompt.md\`** — Autonomous mode: execute all phases with commits per phase; human approves push
- **\`session-close-prompt.md\`** — trigger the handoff and session-close protocol

### \`/integrations/\` — Integration Notes
Quick-ref notes on external systems. Full specs in \`docs/integrations/\`.

### \`/assessments/\` — Pre-Implementation Analysis
Analysis of UX gaps and feature problems before implementation begins.

### \`/debug/\` — Debugging Investigations
Investigation reports and diagnostic findings. Archive when resolved.

### \`/knowledge/\` — Quick Reference Cards
Condensed one-page references. If it grows long, it belongs in \`docs/\` instead.

---

## Conventions

### Plan format

Every plan in \`/plans/\` uses the same structure:

\`\`\`
# [Feature / Task Name]
Created: YYYY-MM-DD | Status: Pending review / In progress / Complete

## Background — why this is needed
## Scope — what's in / what's explicitly out
## Changes — phase by phase with file paths and descriptions
## Execution Order — step table with commit prefixes
## Validation — what must pass before complete
## Open Questions
\`\`\`

### Archive pattern

When work is done, move the plan to \`/plans/archive/\` — never delete. The same applies to debug investigations (\`/debug/archive/\`) and assessments. Archived files are the project's decision record.

### When to create each on-demand folder

| Folder | Create when |
|--------|-------------|
| \`/plans/\` | First multi-step task — before coding starts |
| \`/assessments/\` | A change is needed but the approach isn't clear yet |
| \`/debug/\` | A bug requires meaningful investigation, not a quick fix |
| \`/integrations/\` | First external API or service is integrated |
| \`/knowledge/\` | A topic comes up repeatedly and needs a condensed reference |

---

## Keep \`AGENTS.md\` in Sync

The **Required Reading** section in \`AGENTS.md\` indexes every important \`.ai/\` file. When you add a new file, add it to that list — otherwise agents won't discover it.

---

## Product Documentation

Full product specs, architecture reference, and design decisions live in \`docs/\`:
- \`docs/project-rules.md\` — product vision and boundaries
- \`docs/architecture.md\` — architecture philosophy
- \`docs/feature-state.md\` — authoritative feature inventory
- \`docs/testing.md\` — testing strategy
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/current.md': () => `# Current Project State

## Active Initiative — None

**Status**: No active implementation initiative. Repository was initialized on ${date}.

### Proposed / awaiting approval

- None.

### Recently shipped

- Repository initialized (${date}) — AI agent collaboration system scaffolded.

### Next step

Pick a task from \`.ai/tasks/active.md\`. To start: open \`AGENTS.md\` and complete the Architecture section, then fill in \`.ai/memory/project-state.md\` with your product posture.

---

## Session Handoff — ${date} (Initial setup)

### What was just completed

| Commit | Change |
|--------|--------|
| — | AI agent docs scaffolded via \`prime-ai-docs.mjs\` |

### Stopping point

- Branch: \`main\`
- Working tree: newly initialized
- No validation run — scaffold only

### Decisions / reasoning

- Used \`prime-ai-docs.mjs\` to scaffold the standard \`.ai/\` + \`docs/\` structure.
- All placeholder sections need to be filled in before the first agent session.

### Fragile areas

- \`AGENTS.md\` Architecture section is a placeholder — fill in before first agent session.
- \`.ai/memory/project-state.md\` approved-mutation scope is a placeholder.
- \`docs/architecture.md\` is an empty stub — fill in before architecture-sensitive work.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/SESSION_NOTES.md': () => `# Session Notes

Append-only log of session closes. Newest entry at the top.
Each entry: \`## Session Close — YYYY-MM-DD (task name)\`

---

## Session Close — ${date} (Initial scaffold)

### Completed this session

| # | Item |
|---|------|
| 1 | Scaffolded AI agent docs via \`prime-ai-docs.mjs\` |

### Key decisions

- Standard \`.ai/\` + \`docs/\` structure adopted from AI-AGENT-SYSTEM-BLUEPRINT.md.

### Known follow-ups

- Fill in all placeholder sections in \`AGENTS.md\`, \`docs/\`, and \`.ai/memory/\` before first agent session.

### Validation

- Not run — scaffold only, no source code changed.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/memory/project-state.md': () => `# Project State

Current product posture and approved scope for **${name}**.

**Last Updated**: ${date}

---

## Product Identity

**${name}** — ${description || '<describe what this product does>'}

${stack ? `**Tech stack**: ${stack}` : '**Tech stack**: <list key technologies>'}

**Product feel**:
- <describe the desired user experience, interface personality, or output quality standards>

**This is not**:
- <anti-definition — what the product should never become>

---

## Current Operational Phase

**Phase**: <e.g. "MVP", "observability maturity", "controlled mutations", "v2 migration">

---

## Implemented Features

See \`docs/feature-state.md\` for the authoritative feature inventory.

Key areas:
- <feature area 1>
- <feature area 2>
- <feature area 3>

---

## Approved Mutable Scope

### Currently Approved Mutations

<List each approved mutation with its execution path. Example:>

- \`<action>\` — via <API / CLI flag / service>

### All Mutable Actions Must Be

<Adapt these constraints to your archetype. Delete what does not apply.>

**For Web/API Mutations**:
- Server-side only
- Authenticated
- Explicitly user-confirmed
- Audited
- Followed by non-optimistic refresh

**For CLI/File System Mutations**:
- Bounded strictly inside the target directory path
- Gated by readline confirmation prompts for overwriting existing files
- Performed atomically (write to temp file, then rename)

---

## Forbidden Unless Separately Approved

<List forbidden operations that require governance before implementation:>

- <operation 1>
- <operation 2>

See \`.ai/rules/mutation-rules.md\` for the governance process.

---

## Architecture Posture

- <key architectural principle 1>
- <key architectural principle 2>
- <key architectural principle 3>

See \`.ai/memory/architecture-decisions.md\` for the detailed model.

---

## Testing

- **Unit tests**: <framework, location, current count>
- **Integration/E2E tests**: <framework, location>
- **CI/CD**: <pipeline location and trigger>

---

## Reference Documents

- Feature state: \`docs/feature-state.md\`
- Architecture: \`docs/architecture.md\`
- Product vision: \`docs/project-rules.md\`
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/memory/architecture-decisions.md': () => `# Architecture Decisions

Key architectural choices that define how this codebase works.

**Sources**: \`docs/architecture.md\`, \`AGENTS.md\`

---

## Data Flow

<Describe your data flow. (See docs/architecture.md for archetype examples and diagrams.)>

---

## Layer Discipline

<Describe which layers/modules can import which. Example:>

- **CLI/Feature controllers**: parse arguments, validate inputs, call domain layer.
- **Domain logic**: orchestrate actions, execute core logic, side-effect free helpers.
- **Infrastructure adapters**: perform filesystem operations, network requests.

---

## State Management

*Delete or adapt if N/A (e.g. for libraries/CLI tools without persistent state).*

<Describe client-side or application-wide state management (Zustand, Redux, local database caches, etc.).>

---

## Auth Model

*Delete or adapt if N/A.*

<Describe authentication and authorization approach (sessions, cookies, JWTs, API keys, local token scopes).>

---

## Caching Strategy

*Delete or adapt if N/A.*

<Describe caching strategies, database query caching, or asset compilation caches.>

---

## Key Decisions

### Decision: <Title>

**Choice**: <what was decided>
**Rationale**: <why this was chosen over alternatives>
**Gotcha**: <what breaks if someone violates this>

---

## Gotchas

<List non-obvious things that will surprise a new developer:>

- <gotcha 1>
- <gotcha 2>
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/rules/engineering-rules.md': () => `# Engineering Rules

Implementation rules for coding in **${name}**.

Choose the sections below that match your project archetype and delete the others:

---

## 1. Web UI / BFF Archetype Rules

*Rules for client-server web apps (Next.js, Vite, React, etc.). Delete if N/A.*

### Data Access & Security
- UI components call feature hooks / state layer only.
- Feature hooks call same-origin API routes only.
- External API calls and database connections must stay server-side.
- Secrets must never be exposed via client-accessible environment variables.
- Mock data must be encapsulated in the data layer.

### UX & Browser Verification
- Every dynamic badge, counter, and status indicator must carry a \`data-testid="{entity}-{id}-{element}"\` attribute in the same commit.
- For any UI change, browser verification is mandatory before closing: start dev server, navigate to affected surfaces, check empty/null states.

---

## 2. API / Backend Service Archetype Rules

*Rules for backend servers (Express, Fastify, Go, Python, etc.). Delete if N/A.*

### Layer boundaries
- Routes/Controllers → Service/Domain Layer → Adapters/DB.
- Never leak raw database queries or third-party service responses to the client. Normalize all output.
- Bounded timeouts on all external calls. Handle failures gracefully without crashing.

---

## 3. CLI / Library / SDK Archetype Rules

*Rules for local tools, modules, or libraries. Delete if N/A.*

### Design Constraints
- Maintain zero runtime dependencies unless explicitly approved in the project spec.
- File system mutations must be atomic (tmp-then-rename) to prevent corruption.
- Scopes all write operations strictly inside the resolved target directory.
- Avoid side-effects inside templates or pure logic helper functions.

---

## Shared Development Standards (All Projects)

### Error Handling
- Use normalized error categories, not raw error messages.
- Never expose internal paths, credentials, or stack traces in error responses.

### Commit Discipline
- One logical change per commit.
- Never commit directly to \`main\` — always use task-specific branches (\`feature/<name>\`, \`fix/<name>\`, \`chore/<name>\`).
- Use semantic commit prefixes (\`feat\`, \`fix\`, \`chore\`, \`test\`, \`refactor\`, \`docs\`).
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/rules/security-rules.md': () => `# Security Rules

Trust boundaries and security controls for **${name}**.

Choose the sections below that match your project archetype and delete the others:

---

## 1. Client-Server / Web API Security Boundaries

*Security controls for web, mobile, or backend API projects. Delete if N/A.*

### Trust Model
${F}
Untrusted: Browser / client / user inputs
Trusted:   Server-side controllers, domain layer, database, secrets store
${F}
All enforcement must occur at the server boundary. Client validation is only for UX.

### Secrets & Credentials
- Keep database credentials, API keys, and connection strings server-side only.
- Never expose credentials via client-accessible environment variables or include them in client-side builds.
- Strip internal database fields and raw server paths before responding to the client.

---

## 2. Local Script / CLI Security Boundaries

*Security controls for CLI utilities, local tools, and libraries. Delete if N/A.*

### Directory Containment
- Restrict all write operations strictly inside the resolved target directory path to prevent directory traversal attacks (e.g. path injection containing \`../\`).
- Resolve all path inputs using \`path.resolve()\` and validate them before writing.

### Command Execution Safety
- Keep command execution bounded. If calling \`execSync\`, ensure inputs are validated, sanitized, or escaped to avoid shell command injections.

---

## Shared Security Principles (All Projects)

### Input Validation
- Validate and sanitize all inputs at the entrypoint boundary.
- Handle malformed inputs gracefully without crashing or leaking details.

### Redaction in Logs
- Never log passwords, tokens, API keys, or raw request payloads containing sensitive personal details.
- Avoid printing full stack traces to the user output.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/rules/mutation-rules.md': () => `---
paths:
  - "src/**"
---

# Mutation Rules

---

## Core Principle

**Read-only is the default. Mutations are exceptions.**
State-changing operations must be explicitly scoped, approved, and guarded.

---

## Mutation Taxonomy

Choose the taxonomy that fits your project archetype and customize it:

### Web / Database Service Archetype
- **Observational**: Read-only queries, GET requests. No approval needed.
- **Safe Control**: POST/PUT/PATCH mutations on user-owned assets. Requires approval.
- **Dangerous/Destructive**: Database deletions, purges, administrative commands. **Forbidden unless explicitly approved.**

### Local / CLI Tool Archetype
- **Observational**: CLI dry-runs, directory status reading. No approval needed.
- **Safe mutations**: Writing output files to empty paths, creating manifest files.
- **Dangerous/Destructive**: Overwriting existing files (requires user confirmation).
- **Forbidden**: Writing or deleting files outside the target directory.

---

## Currently Approved

<!-- Fill this in before any mutation-adjacent work begins.          -->
<!-- Anything not listed here is forbidden without governance approval. -->

- None yet — list each approved mutation explicitly before the first development session

---

## Required Protections

### For Web / API Mutations
1. **Server-side only** — no client direct database modifications.
2. **Authenticated** — verify user session/token before executing state changes.
3. **CSRF protection** — validate CSRF token on mutable HTTP routes.
4. **Redacted audit logs** — append timestamped attempt records to logs (redact credentials/keys).

### For CLI / File Mutations
1. **Atomic writes** — write to temporary file first, then perform atomic rename.
2. **Containment verification** — validate target paths strictly remain inside bounds.
3. **Overwrite guard** — gate overwrites behind explicit confirmation readline prompts.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/workflows/onboarding.md': () => `# Onboarding Workflow

How to start working effectively in this codebase.

---

## Reading Order

Read in this order before making any changes:

1. \`AGENTS.md\` — entry point, product boundaries, required reading map
2. \`docs/README.md\` — product documentation overview
3. Core product docs:
   - \`docs/project-rules.md\`
   - \`docs/architecture.md\`
   - \`docs/tech-stack.md\`
   - \`docs/testing.md\`
4. \`.ai/README.md\` — agent workspace overview
5. \`.ai/current.md\` — live handoff state
6. \`.ai/SESSION_NOTES.md\` (last entry only)
7. \`.ai/tasks/active.md\` — what is in flight or queued next
8. \`.ai/memory/project-state.md\` — current product posture
9. \`.ai/rules/mutation-rules.md\` — what mutations are allowed
10. \`.ai/memory/architecture-decisions.md\` — architectural model
11. \`.ai/rules/engineering-rules.md\` — implementation rules

## Reading Scope Filter

**Always read**: the entry path above + the active plan named by \`.ai/current.md\`

**Read by task type**:
- UI/frontend work: \`docs/ui-patterns.md\` (if it exists) and related assessments
- CLI/library work: relevant usage docs and integration specs
- Mutable-action work: \`.ai/rules/mutation-rules.md\` and affected route plans
- Integration work: the matching \`.ai/integrations/\` quick-ref
- Tests: \`docs/testing.md\` and any test audit

**Treat as historical unless directly relevant**:
- \`.ai/plans/archive/\`, \`.ai/debug/archive/\`, \`docs/archive/\`
- Older migration notes, old investigations, completed plans

If source, git, \`.ai/current.md\`, \`.ai/tasks/active.md\`, and \`.ai/SESSION_NOTES.md\` disagree, report the mismatch. Current source/git + \`.ai/current.md\` are usually the best signal.

---

## Reporting Back (Before Writing Code)

After reading, report back with:

- **Current State** (3–5 bullets): what is done, branch/commit, in-progress work
- **Next Task**: quote exactly from \`.ai/current.md\` or \`.ai/tasks/active.md\`
- **Ambiguity**: if multiple options are listed, call them out
- **Fragile Areas**: from session notes / current status

Do not write code, edit files, run formatters, or execute write actions until the report is confirmed.

---

## Creating a Task Branch

Once the onboarding report is approved and the next task is assigned, the very first write action must be:

${F}bash
git checkout -b feature/<short-name>   # new feature or enhancement
git checkout -b fix/<short-name>       # bug fix
git checkout -b chore/<short-name>     # refactor, tooling, docs
${F}

All development commits must occur on this branch. Direct commits to \`main\` are forbidden.

---

## Common Pitfalls

### ❌ Don't
- Import infrastructure adapters or external services from inside domain/business logic
- Commit directly to \`main\`
- Skip validation commands
- Add mutations without approval
- Create new components without checking shared primitives first

### ✅ Do
- Read relevant docs before changing unfamiliar areas
- Follow existing patterns
- Run validation commands
- Keep changes focused
- Use calm operational wording
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/workflows/implementation.md': () => `# Implementation Workflow

Plan → Code → Test → Validate cycle for effective development.

---

## Implementation Cycle

${F}
1. Plan → 2. Code → 3. Test → 4. Validate → 5. Review → 6. Done
     ↑                                                        │
     └────────────────────────────────────────────────────────┘
                    (iterate if needed)
${F}

---

## 1. Plan Phase

### Before Writing Code
- Read \`.ai/current.md\` — current project phase and guardrails
- Read \`.ai/memory/\` — current product state and boundaries
- Read \`.ai/rules/\` — implementation rules for the area you're touching
- Read relevant \`docs/\` files — full product spec if needed

### Check Boundaries
- **If adding mutation**: Must pass \`.ai/rules/mutation-rules.md\` approval gate
- **If changing architecture**: Review \`.ai/memory/architecture-decisions.md\`
- **If changing UI (for web apps)**: Review \`docs/ui-patterns.md\` (if it exists)

### Create Plan
**Single-step changes**: Add a brief summary to \`.ai/tasks/active.md\`.

**Multi-step work**: Create \`.ai/plans/<name>.md\` using this format:

${F}markdown
# [Feature/Task Name]

**Created**: YYYY-MM-DD
**Status**: Pending review | In progress | Complete

## Background
<Why this is needed>

## Scope

**In scope**:
- <what this plan will change>

**Out of scope**:
- <what this plan will NOT change — be explicit>

## Changes

### Phase 1: [Name]
- **File**: \`path/to/file\`
- **Change**: <what and why>

## Execution Order

| Step | Description | Commit prefix |
|------|-------------|---------------|
| 1 | Phase 1 — [brief] | \`feat(domain):\` |

## Validation
<What must pass before complete>

## Open Questions
<Things to resolve before or during implementation>
${F}

---

## 2. Code Phase

- Follow existing patterns — check similar files first
- One logical change at a time
- No opportunistic refactoring outside plan scope
- Add relevant testing hooks or test IDs for new dynamic elements if required

---

## 3. Test Phase

- Write tests as you code, not after
- Check \`.ai/workflows/validation.md\` for change-type validation chains

---

## 4. Validate Phase

${F}bash
${cmd(validate, 'Static gate — always run')}
${cmd(test, 'Runtime/test gate')}
${F}

See \`.ai/workflows/validation.md\` for the full gate specification.

---

## Execution Modes

When executing a multi-phase plan, choose one of two modes:

| Mode | Use when | Human gates |
|------|----------|-------------|
| **Supervised** — Single Phase, Human-Gated | You want to review and approve each phase before it commits | After each phase (commit + push) |
| **Autonomous** — Auto-Execute Full Plan | The plan is approved; you want the agent to run all phases and only stop before pushing | Before the final push only |

Trigger **Supervised** mode with \`intermediate-phase-prompt.md\`.
Trigger **Autonomous** mode with \`execute-plan-prompt.md\`.

---

## Phase Commit Protocol

### Supervised — Single Phase, Human-Gated

Use this mode when executing one phase at a time with human approval before each commit.

1. **Preflight** — run \`git status\`; identify only phase-relevant changes; note any unrelated pre-existing changes but do not touch them.
2. **Confirm scope** — name the active plan file and the requested phase; confirm the phase's scoped changes before editing anything; if scope is ambiguous, stop and report — do not guess.
3. **Implement this phase only** — no opportunistic cleanup, no work from later phases.
4. **Run focused validation** — use the narrowest chain from \`validation.md\` for this change type; if validation fails due to this phase, fix within scope; if unrelated, stop and report.
5. **Clean build artifacts** — revert compile-time edits by build tools if present; do not revert unrelated files.
6. **Update tracking** — mark phase complete in the plan + \`.ai/tasks/active.md\`; update \`docs/\` and \`.ai/memory/\` if behavior, APIs, or architecture changed.
7. **Stage and formulate** — stage only phase files + docs/tracking updates; write a proposed commit message with a semantic prefix.
8. **Stop — request explicit human approval** before commit and push.
9. **Execute** — once approved, commit and push to the task branch.
10. **Report** — commit hash, committed files, validation summary, remaining local changes — **wait for instructions**.

---

### Autonomous — Auto-Execute Full Plan

Use this mode when the plan is approved and you want the agent to execute all phases in sequence, committing after each, only stopping before the final push.

**Before starting:**
- Confirm the plan is already approved by the human.
- Read all phases to understand the full scope.
- Record the pre-run commit hash: \`git rev-parse HEAD\` — this is the rollback point if needed.

**For each phase, in order:**

1. **Preflight** — run \`git status\`; identify phase-relevant changes; note unrelated changes but do not touch them.
2. **Implement this phase only** — no work from other phases, no opportunistic cleanup.
3. **Run focused validation** for this phase's change type (see \`validation.md\`).
   - **If validation fails**: stop immediately; print a phase-failure summary; print the suggested rollback command — \`git reset --hard <pre-run-hash>\` — but **do not execute it**; wait for human instructions.
4. **Clean build artifacts** if present — do not revert unrelated files.
5. **Update tracking** — mark phase complete in plan + \`active.md\`; update \`docs/\` and \`.ai/memory/\` as needed.
6. **Stage and commit** — stage phase files + tracking updates; commit with semantic prefix — **do not push**.
7. **Print phase-complete line** — phase name, commit hash, validation result.

**After all phases complete:**

1. Print a full run summary: all phases, commit hashes, any warnings.
2. Formulate the push command.
3. **Stop — request explicit human approval before push.**
4. Once approved: push task branch; report final pushed state.

---

## Handoff & Session Close Protocol

At end of session:

1. Run \`${validate}\` — fix any failures before closing
2. Run \`${test}\` if runtime behavior changed
3. Clean/revert dev-environment cache/artifacts if applicable
4. Update \`.ai/current.md\` — completed work, stopping point, fragile areas
5. Prepend session close entry to \`.ai/SESSION_NOTES.md\`
6. Update \`.ai/tasks/active.md\` — check off completed items
7. Memory check — did this session produce durable codebase facts? If yes, update \`.ai/memory/\`
8. Sync \`docs/\` if behavior changed
9. Stage remaining handoff files — **request human approval to merge to \`main\` and push**
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/workflows/validation.md': () => `# Validation Workflow

Testing gates, coverage requirements, and validation chains for **${name}**.

---

## Validation Gates

Before marking any task complete, you must execute the appropriate validation gates:

### Static Checks (always run)
${F}bash
${validate}
${F}
Runs the static validation gate (syntax, linting, and any type checks applicable to this stack).

### Tests (always run if logic or templates changed)
${F}bash
${test}
${F}
Runs unit, integration, and E2E suites.

---

## What "Done" Means

A task is complete when:
- [ ] Static validation (\`${validate}\`) passes with exit code 0.
- [ ] Test validation (\`${test}\`) passes all tests.
- [ ] Manual verification completed (e.g. browser verification for web-apps, test runs for local CLI tools).
- [ ] Workspace state logged in \`.ai/current.md\` and \`.ai/tasks/active.md\`.
- [ ] Human approval obtained before commit, push, or merge.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/workflows/review.md': () => `# Review Checklist

Code review checklist for changes in this repository.

Choose the sections below that match your project archetype and delete the others:

---

## 1. Web UI / BFF Archetype Checklist

*Delete if N/A.*

- [ ] Client components import only feature hooks and shared UI primitives (no backend service SDKs).
- [ ] Feature hooks call same-origin API routes only.
- [ ] No secrets or internal credentials are leaked to the browser bundle.
- [ ] Every dynamic badge, counter, and status indicator has a \`data-testid="{entity}-{id}-{element}"\` in the same commit.
- [ ] Browser verification completed (checking null, empty, and happy paths).

---

## 2. API / Backend Service Archetype Checklist

*Delete if N/A.*

- [ ] API routes validate and sanitize inputs at the entry boundary.
- [ ] API responses normalize data and redact internal database or server fields.
- [ ] Secrets stay server-side (retrieved from secure env variables).
- [ ] Boundary timeouts are bounded on external calls.

---

## 3. CLI / Library / SDK Archetype Checklist

*Delete if N/A.*

- [ ] All package dependencies are Node.js built-in modules or explicitly approved packages.
- [ ] File writes are atomic, using safe temp-and-rename writes.
- [ ] Scoped file operations remain strictly inside targetDir boundaries.
- [ ] Template generators are side-effect free and output generic code.

---

## Shared Quality Standards (All Projects)

### Testing
- [ ] Logic changes have corresponding unit and integration tests.
- [ ] Test coverage goals are met (e.g. happy/unhappy paths).
- [ ] Temporary files or environment variables used in tests are cleaned up.

### Commit Hygiene
- [ ] One logical change per commit.
- [ ] Semantic prefixes are used (\`feat\`, \`fix\`, \`chore\`, \`test\`, \`refactor\`, \`docs\`).
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/tasks/active.md': () => `# Active Tasks

Current work in progress.

---

## Current Status

**Active**: None. Repository was initialized on ${date}.

Start here: fill in the placeholder sections in \`AGENTS.md\`, \`docs/\`, and \`.ai/memory/\` before starting the first agent session.

---

## Blocked Candidates

*None yet.*

---

## Ready Follow-Ups

### Complete Initial Setup

**Status**: Ready
**Goal**: Fill in all placeholder sections so the first agent session has complete context.

**Checklist**:
- [ ] \`AGENTS.md\` — Architecture section
- [ ] \`docs/architecture.md\` — full architecture description
- [ ] \`docs/project-rules.md\` — product vision and boundaries
- [ ] \`docs/tech-stack.md\` — technology choices
- [ ] \`docs/testing.md\` — testing strategy
- [ ] \`.ai/memory/project-state.md\` — approved mutation scope
- [ ] \`.ai/rules/mutation-rules.md\` — currently approved mutations

---

## Recently Completed

- AI agent docs scaffolded via \`prime-ai-docs.mjs\` (${date})
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/tasks/completed.md': () => `# Completed Tasks

Archive of completed tasks with commit hashes.

---

## ${date}

- AI agent docs scaffolded via \`prime-ai-docs.mjs\`
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/prompts/onboarding-prompt.md': () => `# Onboarding Prompt

Welcome to the **${name}** repository. You are pair programming with me.

Please begin with a **read-only onboarding pass**. Do not modify files, run formatters, stage changes, commit, or execute other write actions until I confirm your onboarding report is correct. Once I confirm your onboarding report is correct and approve the next task, your very first write action must be to create and checkout a new local task-specific branch (e.g., \`feature/<name>\`, \`fix/<name>\`, or \`chore/<name>\`) from \`main\` or the latest appropriate commit.

Start from \`AGENTS.md\` and follow the onboarding workflow:

1. Read \`AGENTS.md\` for the entry point, product boundaries, and required reading map.
2. Read \`docs/README.md\` and the four core product docs:
   - \`docs/project-rules.md\`
   - \`docs/architecture.md\`
   - \`docs/tech-stack.md\`
   - \`docs/testing.md\`
3. Read \`.ai/README.md\` for the agent workspace overview.
4. Follow \`.ai/workflows/onboarding.md\`.
5. Read \`.ai/current.md\`, \`.ai/tasks/active.md\`, and the most recent entry only in \`.ai/SESSION_NOTES.md\`.
6. Follow cross-references that affect current rules, active plans, or the requested task.

Use this reading-scope filter:

- Always read the current-state path, active task, core architecture/rules, and validation guidance.
- Read task-specific docs when relevant: UI patterns for UI work (if applicable), mutation rules for actions, integration specs for source work, assessments/plans for related active work.
- Do not recursively read archived plans, completed debug reports, migration notes, old investigations, or historical design docs unless the active task or current handoff explicitly points there.
- If \`git\`, source code, \`.ai/current.md\`, \`.ai/tasks/active.md\`, and \`.ai/SESSION_NOTES.md\` disagree, report the mismatch. Treat current source/git plus \`.ai/current.md\` as likely current until I confirm.

Report back with:

- **Current State**: 3–5 bullets summarizing recently completed work, in-progress tasks, current branch/commit, and working-tree state.
- **Next Task**: quote exactly from \`.ai/current.md\` or \`.ai/tasks/active.md\`.
- **Ambiguity/Decisions**: open product or implementation choices you notice.
- **Fragile Areas**: warnings and risk details from current handoff/session notes.
- **Files Read**: include this appendix if the pass was broad or I ask for auditability.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/prompts/intermediate-phase-prompt.md': () => `# Phase Prompt — Supervised (Single Phase, Human-Gated)

I approve the plan. Please execute **Phase [N]: [Phase Name]** using the
**Supervised** mode as defined in \`.ai/workflows/implementation.md\`.

Active plan: \`.ai/plans/<name>.md\`

Stop before the commit and push, and request my explicit approval.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/prompts/session-close-prompt.md': () => `# Session Close Prompt

Please execute the **Handoff & Session Close Protocol** defined in
\`\.ai/workflows/implementation.md\`.

Stop before the merge-to-main and push sequence, and request my explicit
approval before executing it.
`,

// ─────────────────────────────────────────────────────────────────────────────
'.ai/prompts/execute-plan-prompt.md': () => `# Execute Plan Prompt — Autonomous (Auto-Execute Full Plan)

I approve this plan. Please execute **all phases** using the
**Autonomous** mode as defined in \`.ai/workflows/implementation.md\`.

Active plan: \`.ai/plans/<name>.md\`

Commit after each phase automatically. If validation fails mid-plan, stop
and print the suggested rollback command before waiting for my instructions.
Stop before the final push and request my explicit approval.
`,

// ─────────────────────────────────────────────────────────────────────────────
'docs/README.md': () => `# Product Documentation

This folder contains the comprehensive product, architecture, and operational documentation for **${name}**.

---

## Quick Navigation

**Start here**:
- **\`AGENTS.md\`** (repo root) — agent onboarding entry point
- **\`docs/project-rules.md\`** — product vision and boundaries
- **\`docs/architecture.md\`** — architecture philosophy and design decisions

---

## Documentation Structure

### Core Product Specs

- **\`project-rules.md\`** — product vision, boundaries, and governance. What we build, what we don't, why.
- **\`feature-state.md\`** — authoritative feature inventory. Current state of all features, implementation status, known issues.
- **\`feature-roadmap.md\`** — phase plan and future direction. *(create when needed)*

### Architecture & Design

- **\`architecture.md\`** — core architecture philosophy, layer discipline, architectural decisions.
- **\`tech-stack.md\`** — technology choices, rationale, and dependency versions.
- **\`domain-models.md\`** — entity definitions and domain layer contracts. *(create when needed)*
- **\`ui-patterns.md\`** — reusable UI patterns, component library guidance. *(Web/UI projects only — create when needed)*

### Deployment & Operations

- **\`deployment.md\`** — deployment guide. *(create when needed)*
- **\`build-pipeline.md\`** — CI/CD pipeline and release process. *(create when needed)*

### Integrations

- **\`integrations/\`** folder — all external integrations and data sources. *(create when needed)*

### Testing & Quality

- **\`testing.md\`** — testing strategy, framework configuration, and coverage expectations.

### Reference & Historical

- **\`archive/\`** folder — completed projects, deprecated docs. *(create when needed)*

---

## Key Principles

- **Current source is runtime truth.** If docs and code disagree, source wins. Report the mismatch.
- **\`docs/\` is comprehensive; \`.ai/\` is the working subset.** Major decisions have full context here.
- **Keep docs and code in sync.** When behavior changes, update both the \`docs/\` file and the corresponding \`.ai/\` working copy.

---

## Cross-References

| Topic | \`docs/\` | \`.ai/\` working copy |
|-------|---------|-------------------|
| Architecture | \`architecture.md\` | \`.ai/memory/architecture-decisions.md\` |
| Features | \`feature-state.md\` | \`.ai/memory/project-state.md\` |
| Rules | \`project-rules.md\` | \`.ai/rules/\` |
| Testing | \`testing.md\` | \`.ai/workflows/validation.md\` |
`,

// ─────────────────────────────────────────────────────────────────────────────
'docs/architecture.md': () => `# Architecture

Core architecture philosophy, layer discipline, and design decisions for **${name}**.

**Working copy**: \`.ai/memory/architecture-decisions.md\`

---

## Overview

${description ? description : '<describe what this system does>'}

${stack ? `**Stack**: ${stack}` : ''}

---

## Data Flow

<Select the pattern below that matches your project archetype and customize it. Delete the others.>

### Web App / BFF
${F}
Browser UI
  ↓ (feature hooks / client state)
Feature Layer
  ↓ (fetch /api/*)
API Routes (BFF)
  ↓ (domain / service layer)
Domain Layer
  ↓ (adapters / sources)
External Services / Database
${F}

### API / Backend Service
${F}
Client → Route handlers → Service layer → Adapters → Database / External APIs
${F}

### CLI / Scripting Tool
${F}
CLI entry → Command layer → Core logic → File system / APIs
${F}

### Library / SDK
${F}
Public API surface → Implementation modules → Platform adapters
${F}

---

## Layer Responsibilities

<Customize the layer boundaries and definitions based on your project's chosen architecture above. Delete sections that do not apply to your project.>

### Client / Browser Layer (Web App Only)
- UI components, client state, and user interactions.

### Feature / Controller Layer
- Application entry points: user commands (CLI), HTTP route handlers (API), or client hooks (Web).

### Domain / Service Layer
- Pure business logic, orchestration, and core algorithms. Avoid importing framework-specific details here.

### Infrastructure / Adapter Layer
- Databases, filesystems, HTTP clients, and third-party integrations.

---

## Layer Discipline

<Describe which layers can import which. What ESLint rules or conventions enforce this?>

---

## Key Architectural Decisions

### Decision: <Title>

**Context**: <what problem this solves>
**Decision**: <what was chosen>
**Rationale**: <why this over alternatives>
**Consequences**: <tradeoffs, gotchas>

---

## Caching Strategy

<Describe caching approach: TTLs, invalidation triggers, and cache key structures.>

---

## Auth Model

<Describe authentication and authorization mechanisms (e.g., sessions, JWTs, API keys, IAM roles).>

---

## Real-Time / Events

<Describe any real-time data delivery: WebSockets, SSE, polling, webhooks, or message queues.>

---

## Operational Logging

<Describe logging approach: structured JSON, log levels, redaction rules, and destination sinks.>

---

## Known Constraints and Gotchas

- <gotcha 1 — something that would surprise a new developer>
- <gotcha 2>
`,

// ─────────────────────────────────────────────────────────────────────────────
'docs/project-rules.md': () => `# Project Rules

Product vision, boundaries, and governance for **${name}**.

**Working copy**: \`.ai/memory/project-state.md\`, \`.ai/rules/\`

---

## Product Vision

<One paragraph: what this product is, who it's for, what problem it solves.>

---

## What We Build

✅ **In scope**:
- <feature area 1>
- <feature area 2>
- <feature area 3>

🚫 **Out of scope** (requires explicit governance to add):
- <forbidden area 1>
- <forbidden area 2>

---

## Approved Mutations

<List every state-changing operation that is currently approved. Anything not listed here requires the mutation approval gate.>

See \`.ai/rules/mutation-rules.md\` for the full approval process.

---

## Product Boundaries — Invariants

These are hard constraints enforced by the codebase (tests, linting, or build checks):

- <invariant 1, e.g. "no client-side external API calls" (for Web) or "zero runtime dependencies" (for CLI)>
- <invariant 2>
- <invariant 3>

---

## UX Principles

*Delete or adapt this section if the project is headless (e.g. libraries/backend APIs).*

- <UX principle 1: density, calm copy, etc.>
- <UX principle 2>
- <UX principle 3>

**Forbidden UX patterns**:
- <forbidden pattern 1, e.g. "panic language", "auto-delete suggestions">
- <forbidden pattern 2>

---

## Governance Process for New Features

1. Describe the feature in a proposal — scope, user need, implementation approach
2. Pass the mutation approval gate if the feature involves state changes (see \`.ai/rules/mutation-rules.md\`)
3. Write an implementation plan in \`.ai/plans/<name>.md\`
4. Get explicit human approval before coding
5. Implement, test, validate
6. Update \`docs/feature-state.md\`

---

## Technology Constraints

<Any hard technology constraints, e.g. "must run without a container orchestrator", "must work offline", "no paid external services">
`,

// ─────────────────────────────────────────────────────────────────────────────
'docs/feature-state.md': () => `# Feature State

Authoritative inventory of all features in **${name}**.

**Last Updated**: ${date}

**Working copy**: \`.ai/memory/project-state.md\`

---

## How to Read This Document

- ✅ **Implemented** — shipped and working
- 🚧 **In Progress** — currently being built
- 📋 **Planned** — approved for future implementation
- ❌ **Deferred** — considered but not approved

---

## Core Features

| Feature | Status | Notes |
|---------|--------|-------|
| <Feature 1> | ✅ Implemented | <any notes> |
| <Feature 2> | 🚧 In Progress | <branch or plan link> |
| <Feature 3> | 📋 Planned | <plan link> |
| <Feature 4> | ❌ Deferred | <reason> |

---

## Mutable Actions

| Action | Status | Surface | Notes |
|--------|--------|---------|-------|
| <action 1> | ✅ Implemented | <where in UI> | |

---

## Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| <issue> | <High/Medium/Low> | <open/in-progress/fixed> |

---

## Recently Shipped

- <feature> — <date>, commit \`<hash>\`

---

## Deferred Features

These have been explicitly considered and deferred. Do not implement without re-approval.

- <deferred feature> — <reason for deferral>
`,

// ─────────────────────────────────────────────────────────────────────────────
'docs/tech-stack.md': () => `# Tech Stack

Technology choices, rationale, and dependency versions for **${name}**.

**Last Updated**: ${date}

---

## Overview

${stack ? `**Core stack**: ${stack}` : '**Core stack**: <list your key technologies>'}

---

## Application Layer

| Technology | Version | Role | Rationale |
|------------|---------|------|-----------|
| <technology> | <version> | <role> | <why chosen> |

---

## Infrastructure & Deployment

| Technology | Version | Role | Notes |
|------------|---------|------|-------|
| <technology> | <version> | <role> | |

---

## Testing

| Technology | Version | Role |
|------------|---------|------|
| <test framework> | <version> | Unit tests |
| <e2e framework> | <version> | E2E tests |

---

## Development Tooling

| Tool | Version | Role |
|------|---------|------|
| <tool> | <version> | <role> |

---

## Key Version Constraints

<List any hard version constraints and why they exist.>

---

## Upgrade History

See \`.ai/knowledge/upgrade-history.md\` for the log of package upgrades (create when needed).

---

## Deprecated / Removed

| Technology | Replaced by | Reason |
|------------|-------------|--------|
| <old tech> | <new tech> | <reason> |
`,

// ─────────────────────────────────────────────────────────────────────────────
'docs/testing.md': () => `# Testing

Testing strategy, framework configuration, and coverage expectations for **${name}**.

**Working copy**: \`.ai/workflows/validation.md\`

---

## Testing Philosophy

- Tests verify behavior, not implementation details.
- Write tests as you code, not after.
- UI elements require explicit identifiers (e.g., \`data-testid\` attributes) for automated integration testing (where applicable).
- Keep tests isolated: clean up temporary directories, databases, and environment overrides after each test.
- Static validation (\`${validate}\`) verifies code correctness; runtime tests (\`${test}\`) verify feature correctness.

---

## Test Types

### Unit Tests

- **Framework**: <e.g. Vitest, Jest, node:test, Mocha>
- **Location**: <e.g. \`src/**/*.test.ts\` or \`test/**/*.test.js\`>
- **Run**: \`<unit test command>\`
- **Coverage**: <coverage target, e.g. "≥80% on shared utilities">

### Integration / API Tests

- **Framework**: <e.g. Supertest, mock-fs, Vitest with real DB>
- **Location**: <location>
- **Run**: \`<integration test command>\`

### E2E / Functional Tests

- **Framework**: <e.g. Playwright, Cypress, CLI subprocess execution tests>
- **Location**: <location>
- **Run**: \`${test}\`
- **Scope**: <what the E2E suite covers>

---

## CI/CD

- **Pipeline**: <GitHub Actions, CircleCI, etc.>
- **Triggers**: <on push to main, on PR, etc.>
- **Gates**: \`${validate}\` + \`${test}\`

---

## Coverage Requirements

| Area | Requirement | Notes |
|------|-------------|-------|
| Shared utilities | ≥80% | |
| UI components | ≥80% | Delete if N/A |
| Mutable actions | 100% | Under happy and failure edge cases |
| New surfaces / CLI commands | smoke test | Verification of basic output/happy path |

---

## Test Conventions

### What to Test

- ✅ Behavior (what the feature does)
- ✅ Edge cases (null/empty inputs, overflows, concurrent runs)
- ✅ Error states (timeouts, dependency failures, invalid arguments)
- ❌ Implementation details (private function states, local variables)

### Test ID Convention (Web/UI Only)

*Delete if N/A.*

All badge, counter, and status indicator elements must carry \`data-testid\` attributes:

${F}
data-testid="{entity}-{id}-{element}"
${F}

Add \`data-testid\` in the same commit as the element.

### Mock Data

- Mock constants must carry explicit type annotations matching the domain schema.
- New domain schema fields must be added to all mock fixtures in the same commit.

---

## Validation Gate

See \`.ai/workflows/validation.md\` for the full two-gate validation spec.
`,

  } // end templates
} // end buildTemplates

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv)

  if (args.version) {
    console.log(`vibe-coding-template v${TEMPLATE_VERSION}`)
    process.exit(0)
  }

  if (args.help) {
    console.log(`
AI Docs Primer v${TEMPLATE_VERSION} — Scaffolds an AI-agent-ready workspace (.ai/ and docs/) into any repo.

Usage:
  node prime-ai-docs.mjs [targetDir] [options]

Options:
  --yes             Run in headless mode, using defaults or values from flags without interactive prompts
  --overwrite       Force overwrite existing files in the workspace (backs up existing files first)
  --dry-run         Preview what files would be created, updated, or skipped without writing to disk
  --no-backup       Skip creating a backup directory when updating or overwriting files
  --version         Print the script version and exit
  --help, -h        Show this help message and exit

Headless Flags (only used when --yes is provided):
  --name=val        Project name (defaults to package.json name or folder name; required with --yes)
  --description=val One-line description of the project
  --stack=val       Tech stack (comma-separated)
  --install=val     Dependency installation command (e.g., "npm ci")
  --dev=val         Dev server start command (e.g., "npm run dev")
  --validate=val    Static validation command (e.g., "npm run validate")
  --test=val        Runtime / E2E test command (e.g., "npm run test")

Examples:
  # Run interactively in the current directory:
  node prime-ai-docs.mjs

  # Run in dry-run mode to preview updates for an existing project:
  node prime-ai-docs.mjs --dry-run

  # Run headless in a specific directory:
  node prime-ai-docs.mjs ./my-new-app --yes --name "My App" --stack "Next.js, TypeScript"
`.trim())
    process.exit(0)
  }

  const targetDir = resolveTargetDir(args.targetDir)

  if (!fs.existsSync(targetDir)) {
    console.error(`❌  Target directory does not exist: ${targetDir}`)
    process.exit(1)
  }

  const aiDirExists = fs.existsSync(path.join(targetDir, '.ai'))
  const mode = args.overwrite ? 'overwrite' : aiDirExists ? 'update' : 'init'

  const modeLabel = args.dryRun
    ? 'Dry run'
    : mode === 'init'      ? 'Initializing new repo'
    : mode === 'update'    ? 'Smart Update'
    :                        'Overwriting all files'

  const modeIcon = mode === 'update' ? '🔄' : '🚀'
  console.log(`\n${modeIcon}  AI Docs Primer v${TEMPLATE_VERSION} — ${modeLabel}`)
  console.log(`    Target: ${targetDir}`)

  checkGit(targetDir)

  if (args.overwrite && !args.dryRun && !args.yes) await confirmOverwrite(targetDir)

  // Smart update: read deployed versions before collecting context so we can print
  // a clear picture of what will change before any prompts.
  let deployedVersions = {}
  if (mode === 'update') {
    deployedVersions = readDeployedVersions(targetDir)

    const unknownFiles = Object.keys(deployedVersions).filter(k => !FILE_VERSIONS[k])
    if (unknownFiles.length > 0) {
      console.log(`\n  ⚠️   Files in .ai-prime-versions.json not present in current template:`)
      unknownFiles.forEach(f => console.log(`        ${f}`))
      console.log(`      These may be from an older version. Review and remove if no longer needed.`)
    }

    const toUpdate = Object.keys(FILE_VERSIONS).filter(relPath => {
      const deployed = deployedVersions[relPath] ?? '0.0.0'
      return compareVersions(FILE_VERSIONS[relPath], deployed) > 0
    })
    const toCreate = Object.keys(FILE_VERSIONS).filter(relPath =>
      !fs.existsSync(path.join(targetDir, relPath))
    )

    if (!args.dryRun) {
      console.log(`\n    Comparing ${Object.keys(FILE_VERSIONS).length} templates against deployed versions...`)
      if (toUpdate.length === 0 && toCreate.length === 0) {
        console.log(`    ✓   All files are up to date.`)
      } else {
        if (toUpdate.length > 0) console.log(`    ♻️   ${toUpdate.length} file(s) have template improvements`)
        if (toCreate.length > 0) console.log(`    ✅  ${toCreate.length} file(s) are new in this version`)
      }
    }
  }

  const ctx = await collectContext(args, targetDir)
  const templates = buildTemplates(ctx)

  // Backup: full set for --overwrite; only outdated files for smart update
  const timestamp = makeTimestamp()
  let backupFilter = null
  if (mode === 'update') {
    backupFilter = Object.keys(FILE_VERSIONS).filter(relPath => {
      const deployed = deployedVersions[relPath] ?? '0.0.0'
      return compareVersions(FILE_VERSIONS[relPath], deployed) > 0 &&
             fs.existsSync(path.join(targetDir, relPath))
    })
  }

  const shouldBackup = (mode === 'overwrite' || mode === 'update') && !args.noBackup
  const backupResults = shouldBackup
    ? backupFiles(templates, targetDir, timestamp, args.dryRun, backupFilter)
    : []
  const backupDir = backupResults.some(r => r.status === 'backed-up')
    ? path.join(targetDir, '.ai-prime-backup', timestamp)
    : null

  if (mode === 'overwrite' && !args.dryRun) {
    const backupNote = args.noBackup ? ' (--no-backup: skipping backup)' : ''
    console.log(`    ⚠️   --overwrite: existing files will be replaced${backupNote}`)
    if (backupDir) console.log(`    📦   Backup: .ai-prime-backup/${timestamp}/`)
  }

  const results = generateFiles(
    templates, targetDir, args.overwrite, args.dryRun,
    mode === 'update' ? deployedVersions : null,
    mode === 'update' ? FILE_VERSIONS    : null
  )

  if (!args.dryRun) {
    writeVersionFile(targetDir)
    writeVersionsFile(targetDir, deployedVersions, results)
    writeManifest(targetDir, ctx, mode, results)
  }
  printSummary(targetDir, results, args.dryRun, backupResults, backupDir, mode)
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))

if (isMain) {
  main().catch(err => {
    console.error('❌', err.message)
    process.exit(1)
  })
}

export {
  TEMPLATE_VERSION,
  FILE_VERSIONS,
  parseArgs,
  resolveTargetDir,
  readPackageJson,
  detectPackageManager,
  collectContext,
  writeFile,
  makeTimestamp,
  compareVersions,
  readDeployedVersions,
  backupFiles,
  generateFiles,
  writeVersionFile,
  writeVersionsFile,
  writeManifest,
  printSummary,
  checkGit,
  confirmOverwrite,
  buildTemplates,
  main
}
