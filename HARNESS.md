# Harness Usage Guide — Taleemabad CMS

This guide explains how to use Harness for task management, project planning, and structured development workflows in taleemabad-cms.

---

## What is Harness?

Harness is a project orchestration tool that integrates with Claude Code to provide:
- **Task Management** — structured planning and progress tracking via Plans.md
- **Project Configuration** — safety rules, permissions, and project metadata via harness.toml
- **Claude Code Integration** — native hooks, settings, and agent coordination
- **Health Monitoring** — diagnostics and validation via `harness doctor`

---

## Quick Start

### 1. View Current Plans
Open `Plans.md` to see:
- Project epics (S3 Upload, Training CRUD, Questions, Dashboard, etc.)
- Organized task phases (API Robustness → Performance → Testing → Deployment)
- Completed checklist
- Dependencies and blockers

### 2. Start Working on a Task

Use Claude Code's task tools to track work:

```bash
# Create a new task
task create "Fix S3 upload error handling"

# Mark task as in-progress
task update <task-id> --status in_progress

# Mark task as complete
task update <task-id> --status completed
```

### 3. Check Project Health

```bash
# Run all health checks
harness doctor

# Expected output: All checks passed ✅
```

### 4. Update Project Configuration

Edit `harness.toml` to:
- Change project metadata (name, version, description)
- Add/modify safety rules (permission denials, sandbox rules)
- Configure environment variables
- Define agent defaults

Then sync changes:
```bash
harness sync
```

---

## How to Use Each File

### Plans.md — Task & Epic Tracking

**Structure:**
```markdown
## Epics
1. **S3 Upload & Media Management** ✅ (status)
2. **Training CRUD** ✅
...

## To-Do
- [ ] Task item 1
- [ ] Task item 2

## Completed
- [x] Done item 1
- [x] Done item 2
```

**How to use:**
1. Review epics at the top — these are major features
2. Check "To-Do" section for current work items
3. Move completed items to "Completed" section
4. Update this file as you ship features

**Example workflow:**
```markdown
### Phase 1: API Robustness & Data Validation
- [x] Verify all API endpoints respond correctly
- [ ] Add retry logic for presigned URL requests ← working on this
- [ ] Implement error boundaries for component crashes
```

### harness.toml — Project Configuration

**Key sections:**

```toml
[project]
name = "taleemabad-cms"           # Project name
version = "0.1.0"                  # Version
description = "..."                # What the project does

[safety.permissions]
deny = [...]                       # Commands to deny
ask = [...]                        # Commands that require approval

[safety.sandbox]
failIfUnavailable = false          # Sandbox behavior
```

**How to use:**
1. Modify project metadata when versions change
2. Add deny rules for risky operations (e.g., `Bash(rm -r:*)`)
3. Add ask rules for operations that need approval (e.g., `Bash(git push --force:*)`)
4. Run `harness sync` after changes

### hooks/hooks.json — Custom Hooks

Currently empty `[]` — ready for future hooks like:
- Pre-commit validation
- Post-tool logging
- API call instrumentation
- Build step triggers

**How to use:**
```json
{
  "hooks": [
    {
      "type": "pre-commit",
      "command": "npm run lint"
    },
    {
      "type": "post-tool",
      "tool": "Bash",
      "command": "echo 'Tool completed'"
    }
  ]
}
```

Then run `harness sync` to apply.

### .claude-plugin/ — Claude Code Integration

**Files generated automatically:**
- `plugin.json` — Claude Code plugin metadata
- `settings.json` — Claude Code workspace settings
- `hooks.json` — Copied from hooks/hooks.json

**How to use:**
- Don't edit these directly — edit source files instead:
  - For plugin config: edit harness.toml
  - For hooks: edit hooks/hooks.json
  - Then run `harness sync` to regenerate

---

## Common Workflows

### Workflow 1: Plan a New Feature

1. **Open Plans.md**
2. **Add to "To-Do" section** under appropriate epic:
   ```markdown
   ### Phase 2: Performance & UX Polish
   - [ ] Optimize asset list loading (pagination, filtering, search)
   - [ ] Add loading states and skeleton screens
   ```
3. **Create a task** in Claude Code:
   ```bash
   task create "Implement asset list pagination"
   ```
4. **Work on the task** and update status:
   ```bash
   task update <id> --status in_progress
   task update <id> --status completed
   ```
5. **Check it off in Plans.md** when done

### Workflow 2: Update Safety Rules

1. **Edit harness.toml** to add/remove rules:
   ```toml
   [safety.permissions]
   deny = [
     "Bash(sudo:*)",
     "Bash(git reset --hard:*)"
   ]
   ask = [
     "Bash(rm -r:*)",
     "Bash(git push --force:*)"
   ]
   ```
2. **Sync changes**:
   ```bash
   harness sync
   ```
3. **Verify health**:
   ```bash
   harness doctor
   ```

### Workflow 3: Set Up Project Hooks

1. **Edit hooks/hooks.json**:
   ```json
   {
     "hooks": [
       {
         "type": "pre-tool",
         "tool": "Bash",
         "command": "npm run lint"
       }
     ]
   }
   ```
2. **Sync**:
   ```bash
   harness sync
   ```
3. **Test the hook** by running a Bash tool
4. **Verify in .claude-plugin/hooks.json** that it was copied correctly

### Workflow 4: Check Project Health

```bash
harness doctor
```

Expected output:
```
[OK  ] harness version — 4.10.0
[OK  ] harness.toml exists
[OK  ] hooks/hooks.json valid JSON
[OK  ] .claude-plugin/settings.json valid JSON
[OK  ] .claude-plugin/plugin.json valid JSON
All checks passed.
```

If any checks fail:
1. Read the error message
2. Fix the issue (e.g., create missing file)
3. Run `harness doctor` again

---

## Commands Reference

### Task Management

```bash
# View all plans
cat Plans.md

# Edit plans
edit Plans.md

# Create a task
task create "Task description"

# Update task status
task update <task-id> --status in_progress
task update <task-id> --status completed

# List all tasks
task list
```

### Harness Commands

```bash
# Check project health
harness doctor

# Sync configuration changes
harness sync

# View version
harness version

# Dry-run sync (preview changes)
harness sync --dry-run
```

### Git Integration

```bash
# Commit task completion
git add Plans.md
git commit -m "docs(plans): mark S3 upload optimization complete"

# Push changes
git push origin master
```

---

## Best Practices

### 1. Keep Plans.md Up-to-Date
- Check it off when tasks complete
- Move items between sections
- Add new epics as they emerge
- Document dependencies

### 2. Use Meaningful Task Descriptions
```bash
# Good
task create "Add retry logic to presigned URL requests — 3 retry attempts with exponential backoff"

# Bad
task create "fix upload"
```

### 3. Commit Plans Changes Regularly
```bash
git add Plans.md
git commit -m "docs(plans): update Phase 1 progress"
```

### 4. Review Health Weekly
```bash
harness doctor
```

### 5. Document Important Decisions
- Add to `.claude/memory/decisions.md`
- Reference in Plans.md comments
- Example: "Why we chose presigned URLs over signed requests"

---

## Troubleshooting

### Issue: `harness doctor` shows failures

**Solution:**
1. Check the error message
2. Most common issues:
   - Missing `hooks/hooks.json` — create it with `{}`
   - Invalid JSON in config files — use `jq` to validate
   - Missing `.claude-plugin/` — run `harness sync`

### Issue: Changes to harness.toml not taking effect

**Solution:**
```bash
harness sync
# Then reload Claude Code or restart your shell
```

### Issue: Hooks not running

**Solution:**
1. Verify hooks are in `hooks/hooks.json`:
   ```bash
   cat hooks/hooks.json
   ```
2. Run sync to copy to `.claude-plugin/`:
   ```bash
   harness sync
   ```
3. Check `.claude-plugin/hooks.json` was updated:
   ```bash
   cat .claude-plugin/hooks.json
   ```

---

## Next Steps

1. **Review Plans.md** — Understand current epics and phases
2. **Pick a task** — Choose from "To-Do" section
3. **Create a task** in Claude Code — `task create "..."`
4. **Work iteratively** — Update status as you progress
5. **Commit progress** — Keep Plans.md in sync with git

---

## Related Documentation

- **CLAUDE.md** — Project rules and conventions
- **Plans.md** — Detailed task and epic tracking
- **harness.toml** — Full configuration reference
- **Session Log** — `.claude/memory/session-log.md`

For more Harness information, see the [official Harness documentation](https://harness.claude.tools).
