---
description: Start development server with build verification and environment check
model: haiku
---

# CMS Development Server

Start the Taleemabad CMS development environment with verification.

## Steps

1. **Environment Check**
   - Verify Node.js version (v18+)
   - Check npm packages installed
   - Validate `.env` file exists and has VITE_API_BASE_URL set

2. **Install Dependencies** (if needed)
   - `npm install` if node_modules missing or outdated

3. **Type Check**
   - Run `npm run type-check` — catch TypeScript errors early

4. **Start Dev Server**
   - `npm run dev` — starts Vite dev server on http://localhost:5173
   - Display the local URL for access

## Output

Show user:
- Dev server URL
- API backend URL from .env
- S3 configuration status
- Next steps (e.g., "Frontend running, now start backend")
