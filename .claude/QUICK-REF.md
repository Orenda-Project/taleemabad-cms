# Taleemabad CMS — Claude Code Quick Reference

## Commands (Type `/` to invoke)

| Command | Purpose | Output |
|---------|---------|--------|
| `/cms-dev` | Start dev server | Dev server on :5173, type-checked, deps verified |
| `/cms-test` | Validate code quality | Type check, ESLint, build verification |

## Agents (For complex work)

| Agent | Use For | Invoke |
|-------|---------|--------|
| `senior-engineer` | Building features, planning, code quality | When implementing new features |
| `code-reviewer` | Reviewing code, security, performance | Before committing significant changes |

## Skills (Invoke with `/skill-name`)

| Skill | Purpose |
|-------|---------|
| `/s3-upload-test` | End-to-end S3 presigned URL testing |
| `/generate-component [Name]` | Scaffold new React component with types |
| `/debug-api [endpoint]` | Debug CORS, 404, 401, timeout issues |

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project architecture, dev setup, API guide |
| `.claude/SETUP.md` | This workflow explained in detail |
| `.claude/settings.json` | Project configuration |

## Development Flow

### Start Day
```bash
/cms-dev          # Verify env, start dev server
# Develop...
```

### Before Commit
```bash
/cms-test         # Type check, lint, build
# Fix any issues
git commit -m "feat/fix: ..."
```

### Debug Issues
```bash
/s3-upload-test        # Check S3 flow
/debug-api /endpoint   # Check API endpoint
/generate-component    # Create new component
```

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000     # Backend URL
VITE_S3_REGION=us-east-1                     # AWS region
```

## Important Paths

```
src/components/     # UI components
src/hooks/          # Custom hooks (useS3Upload, useAPI, etc.)
src/pages/          # Page components
src/services/       # API, S3, business logic
src/types/          # TypeScript definitions
```

## Common Commands

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run lint        # Check code style
npm run type-check  # TypeScript validation
npm run preview     # Preview production build
```

## S3 Upload Testing Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Backend running (`localhost:8000`)
- [ ] Auth token valid
- [ ] Run `/s3-upload-test`
- [ ] Upload test file
- [ ] Verify S3 URL returned
- [ ] Asset appears in list

## Debugging

| Problem | Command |
|---------|---------|
| CORS error | `/debug-api` → check CORS_ALLOWED_ORIGINS |
| 404 endpoint | `/debug-api` → verify backend routes |
| 401 unauthorized | Re-login, check auth token |
| Slow upload | Check file size, network |
| Types error | `npm run type-check` |
| Lint error | `npm run lint -- --fix` |

## Quick Links

- [Full Setup Guide](.claude/SETUP.md)
- [Project Architecture](CLAUDE.md)
- [React Components](src/components/)
- [GitHub Repo](https://github.com/Orenda-Project/taleemabad-cms)

---

**Tip:** Use `/help` in Claude Code to see all available commands
**Tip:** Use `/skills` to list all available skills
**Tip:** Use `/agents` to view/manage subagents

_Last Updated: 2026-04-09_
