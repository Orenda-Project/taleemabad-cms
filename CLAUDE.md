# Taleemabad CMS — Development Guide

React SPA for content management. Replaces Retool with a modern, modular CMS interface supporting S3 uploads, media assets, training management, and API integration.

## Quick Start

```bash
npm install
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint checks
npm run type-check   # TypeScript validation
```

## Architecture

### Frontend Stack
- **Vite + React 19** — fast development, modern bundling
- **TypeScript** — type safety across components
- **TailwindCSS** — utility-first styling
- **React Router** — client-side routing
- **Axios** — HTTP client for API calls

### Key Features
- **S3 Upload Flow** — presigned URLs, browser-to-S3, progress tracking
- **Media Asset Management** — searchable asset library, file picker
- **Training Management** — training CRUD, asset linking, quiz builder
- **Admin Dashboard** — overview, quick actions, status cards

### Environment Configuration
```env
VITE_API_BASE_URL=http://localhost:8000   # Django backend (local dev)
VITE_S3_REGION=us-east-1                   # AWS region for presigned URLs
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AssetForm.tsx
│   ├── TrainingForm.tsx
│   ├── MediaUpload.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useS3Upload.ts   # S3 presigned URL upload
│   ├── useAPI.ts        # API client wrapper
│   └── ...
├── pages/               # Route pages
│   ├── Dashboard.tsx
│   ├── Trainings.tsx
│   ├── Assets.tsx
│   └── ...
├── services/            # Business logic
│   ├── api.ts           # API client factory
│   ├── s3-upload.ts     # S3 upload logic
│   └── ...
├── types/               # TypeScript definitions
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

## Key Workflows

### Development Workflow
Use `/cms-dev` command:
```bash
/cms-dev — Start development: build → type-check → run dev server
```

### Testing S3 Upload Flow
1. Start dev server: `npm run dev`
2. Backend must have presigned URL endpoint running
3. Test asset upload form: create training → add asset → verify S3 URL
4. Check browser DevTools → Network tab for upload requests

### Building for Production
```bash
npm run build      # Creates dist/ folder
npm run preview    # Test production build locally
```

## API Integration

### Backend URL
- **Local**: `http://localhost:8000`
- **Staging**: `https://staging-api.taleemabad.com`
- **Production**: `https://api.taleemabad.com`

### Presigned URL Endpoint
```
POST /api/v1/internal/media_assets/presigned_upload_url/
Headers: Authorization: Bearer <token>
Body: {
  "filename": "file.pdf",
  "content_type": "application/pdf"
}
Response: {
  "presigned_url": "https://s3.amazonaws.com/...",
  "s3_key": "uploads/uuid/file.pdf"
}
```

### Key Endpoints
- `GET /api/v1/trainings/` — List trainings
- `POST /api/v1/trainings/` — Create training
- `GET /api/v1/media_assets/` — List assets
- `DELETE /api/v1/media_assets/{id}/` — Delete asset

## Common Tasks

### Fix Linting Errors
```bash
npm run lint -- --fix    # Auto-fix ESLint errors
```

### Type Check
```bash
npm run type-check       # Validate TypeScript
```

### Debug S3 Upload
1. Check `.env` — VITE_API_BASE_URL must be correct
2. Browser DevTools → Application → Cookies → verify auth token
3. Network tab → check presigned URL request + S3 PUT request
4. Verify S3 bucket CORS configuration allows localhost

### Add New Component
1. Create `src/components/MyComponent.tsx`
2. Export from `src/components/index.ts`
3. Use in pages or other components
4. Run linting: `npm run lint -- --fix`

### Add New Page
1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link
4. Test route works: navigate in dev server

## Deployment

### Staging
```bash
npm run build
# Push to staging branch, CI/CD handles deployment
```

### Production
```bash
npm run build
# Tag release, push to main, CI/CD handles deployment
```

---

## Claude Code Commands & Skills

Use custom commands for development workflows:
- `/cms-dev` — Development setup & server
- `/cms-test` — Run tests & type-check
- `/cms-build` — Production build & verification
- `/cms-deploy` — Staging or production deployment

---

## Useful Resources

- [Taleemabad Backend Docs](../taleemabad-core/README.md)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
