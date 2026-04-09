---
description: Run tests, linting, and type-checking for code quality assurance
model: haiku
---

# CMS Testing & Validation

Run comprehensive code quality checks before committing.

## Steps

1. **Type Checking**
   - Run `npm run type-check`
   - Report any TypeScript errors or type mismatches
   - Stop if critical errors found

2. **Linting**
   - Run `npm run lint`
   - Show any ESLint violations
   - Auto-fix non-critical issues: `npm run lint -- --fix`

3. **Build Verification**
   - Run `npm run build` to catch compilation errors
   - Report success or build failures

4. **Summary**
   - Show all test results
   - List any remaining issues
   - Suggest fixes if any

## Output

- ✅ All checks passed — ready to commit
- ⚠️ Warnings found — review but can commit
- ❌ Errors found — must fix before committing
