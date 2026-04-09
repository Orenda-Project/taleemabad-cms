# Taleemabad CMS — Claude Code Workflow Setup

This document explains the Claude Code configuration for taleemabad-cms, based on best practices from `claude-code-best-practice`.

## Directory Structure

```
taleemabad-cms/
├── CLAUDE.md                          # Root project guide (development, API, deployment)
├── .claude/
│   ├── settings.json                  # Project-level Claude Code configuration
│   ├── SETUP.md                       # This file
│   ├── commands/                      # Slash commands for workflows
│   │   ├── cms-dev.md                # /cms-dev — Start dev server
│   │   └── cms-test.md               # /cms-test — Validate code quality
│   ├── agents/                        # Subagents for specialized roles
│   │   ├── senior-engineer.md        # React development expert
│   │   └── code-reviewer.md          # Code quality & security reviewer
│   └── skills/                        # Reusable tasks & workflows
│       ├── s3-upload-test.md         # Test S3 presigned URL flow
│       ├── generate-component.md     # Scaffold new React components
│       └── debug-api.md              # Debug API integration issues
├── src/
├── package.json
└── ...
```

## How to Use

### Entry Point: Read CLAUDE.md First
Start here to understand the project architecture, setup, and common tasks.
```bash
# View project guide
cat CLAUDE.md
```

### Command Workflows (Use `/` prefix)

#### `/cms-dev` — Development Server
Starts Vite dev server with environment verification.
```bash
/cms-dev
# Output:
# ✓ Environment verified
# ✓ Dependencies installed
# ✓ Types checked
# ✓ Dev server running on http://localhost:5173
# → Backend must run on http://localhost:8000
```

#### `/cms-test` — Code Quality
Validates TypeScript, ESLint, and build.
```bash
/cms-test
# Output:
# ✓ Type check passed (0 errors)
# ✓ Lint passed (0 errors)
# ✓ Build successful
# → Ready to commit
```

### Agents (Use Agent tool or via commands)

#### `senior-engineer`
Pragmatic React developer for:
- Building new features with proper component hierarchy
- Type-safe implementation
- Planning architecture
- Code reviews for completeness

**When to use:**
- Implementing new feature
- Building new component
- Need code review perspective
- Planning React architecture

**Invoke:**
```
Agent(subagent_type="senior-engineer", prompt="Build a new form component for editing trainings...")
```

#### `code-reviewer`
Thorough reviewer for:
- Type safety and correctness
- Performance and re-renders
- Security (XSS, CSRF, data leaks)
- Maintainability and patterns
- Test coverage

**When to use:**
- Before committing significant changes
- Code quality verification
- Security review
- Architectural review

**Invoke:**
```
Agent(subagent_type="code-reviewer", prompt="Review the new AssetForm component...")
```

### Skills (Use `/skill-name` or Skill tool)

#### `/s3-upload-test` — Test S3 Upload Flow
Complete end-to-end verification of presigned URL uploads.

```bash
/s3-upload-test
# Runs checklist:
# - Presigned URL endpoint accessible
# - Frontend upload hook working
# - File uploaded to S3
# - Asset created in database
# - Asset linkable to trainings
```

#### `/generate-component` — Create New Component
Scaffolds React component with types and exports.

```bash
/generate-component FormInput
# Creates:
# - src/components/FormInput.tsx
# - Proper TypeScript types
# - TailwindCSS styling
# - Updated src/components/index.ts
# - Ready to customize
```

#### `/debug-api` — Debug API Issues
Systematic API troubleshooting.

```bash
/debug-api presigned_upload_url
# Diagnoses:
# - CORS errors
# - 404 endpoints
# - 401 authentication
# - Request body issues
# - Timeouts
# - Shows curl examples for testing
```

## Configuration Files

### `.claude/settings.json`
Project-level configuration:
```json
{
  "model": "haiku",                    // Default model for commands
  "effort": "auto",                    // Auto-detect effort level
  "allowedTools": [                    // Tools allowed without prompting
    "Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent"
  ],
  "defaultPermissionMode": "acceptEdits"  // Auto-accept file edits
}
```

## Command Architecture Pattern

This project uses the **Command → Agent → Skill** pattern:

1. **Command** (entry point)
   - User runs `/cms-dev`
   - Simple orchestration, no complex logic

2. **Agent** (if needed)
   - Command can dispatch to `senior-engineer` agent
   - Agent handles complex decisions, building

3. **Skill** (reusable knowledge)
   - Both commands and agents invoke skills
   - Skills preload as background knowledge
   - Examples: `s3-upload-test`, `debug-api`

## Best Practices

### When to Use What

| Situation | Use | Why |
|-----------|-----|-----|
| Start development | `/cms-dev` command | Ensures clean env, type check |
| Quick quality check | `/cms-test` command | Fast validation before commit |
| Build new feature | `senior-engineer` agent | Pragmatic planning + execution |
| Review code | `code-reviewer` agent | Catch issues early |
| Test S3 flow | `/s3-upload-test` skill | Quick verification |
| Create component | `/generate-component` skill | Consistent scaffolding |
| Fix API bug | `/debug-api` skill | Systematic troubleshooting |

### Project Structure Rules

1. **Keep CLAUDE.md concise** — <200 lines, covers architecture + key workflows
2. **One command per workflow** — `/cms-dev`, `/cms-test`, `/cms-build`
3. **Agents handle complexity** — when decisions > 10 lines, delegate to agent
4. **Skills are reusable** — if > 1 use, create a skill
5. **Use proper types** — all components export TS interfaces

## Examples

### Example 1: Implement New Feature

```bash
/cms-dev                          # Start dev server
# Now develop...

# When ready:
/cms-test                         # Verify quality
Agent(senior-engineer, "Review the new training form...")  # Get feedback
# Commit changes
```

### Example 2: Debug Upload Issue

```bash
/s3-upload-test
# If presigned URL fails:
/debug-api presigned_upload_url
# Follow diagnostic output, fix backend or frontend
```

### Example 3: New Component Workflow

```bash
/generate-component MyNewForm
# Customize generated component
npm run dev
# Test in browser
/cms-test                         # Validate
# Commit
```

## Troubleshooting

### Command Not Found
Make sure you're in the taleemabad-cms directory:
```bash
cd repos/taleemabad-cms
# Now /cms-dev should work
```

### Agent Tool Error
Check that Agent tool is in `allowedTools` in `.claude/settings.json`

### Skill Not Loading
Skills are autodiscovered from `.claude/skills/` — restart Claude Code if newly added

## Next Steps

1. **Read CLAUDE.md** — understand project architecture
2. **Run `/cms-dev`** — start developing
3. **Use `/s3-upload-test`** — verify S3 setup works
4. **Try `/generate-component`** — create your first component
5. **Invite code-reviewer** — get feedback on changes

---

**Last Updated**: 2026-04-09
**Based on**: claude-code-best-practice v2.1
**Status**: Ready for development
