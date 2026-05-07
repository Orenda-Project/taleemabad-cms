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

---

## Upload Flow — Detailed Testing Guide

### Expected Behavior: Happy Path

**Step 1: File Selection**
- Select a file (e.g., `training-video.mp4`)
- Expected: File name and size (MB) displayed below input
- Example: `File: training-video.mp4 (45.67MB)`
- Button labeled "Upload to S3" becomes enabled

**Step 2: Click "Upload to S3"**
- Expected: 
  - Button changes to "Cancel" (red)
  - Progress bar appears and starts animating
  - Status shows: `Uploading... 0%`
  - Upload spinner visible

**Step 3: Presigned URL Request (Network Tab)**
- Check DevTools → Network → look for request to:
  ```
  POST /api/v1/internal/media_assets/presigned_upload_url/
  ```
- Expected Request Headers:
  ```
  API-KEY: 7aeec18d-1529-4483-8475-607d5a16afa7
  Content-Type: application/json
  ```
- Expected Request Body:
  ```json
  {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "training-video.mp4",
    "content_type": "video/mp4"
  }
  ```
- Expected Response (200 OK):
  ```json
  {
    "presigned_url": "https://s3.us-east-1.amazonaws.com/asset-manager-in-review?X-Amz-Algorithm=...",
    "s3_url": "https://asset-manager-in-review.s3.us-east-1.amazonaws.com/550e8400...mp4"
  }
  ```

**Step 4: S3 Direct Upload (Network Tab)**
- Look for PUT request to S3 URL (will not show full URL in Network tab due to presigned signature)
- Expected: Request shows `PUT` method
- Expected: Status code `200` or `201`
- File size in "Size" column should match uploaded file size
- Time taken depends on file size and connection speed

**Step 5: Progress Updates**
- Progress bar should smoothly advance from 0% to 100%
- Status updates every ~500ms: `Uploading... 25%`, `Uploading... 50%`, etc.
- Once S3 responds, should immediately jump to 100%

**Step 6: Upload Complete**
- Expected:
  - Progress bar disappears
  - Button returns to "Upload to S3" (enabled)
  - Toast appears: `✓ Upload complete — File uploaded to S3`
  - File input clears (filename disappears)
  - **URL field auto-populates** with S3 URL (format: `https://asset-manager-in-review.s3.us-east-1.amazonaws.com/{uuid}.mp4`)

**Step 7: UUID Validation Before Asset Creation**
- URL field shows S3 URL in read-only field
- When you fill form and click "Create Asset":
  - Form extracts filename from URL (everything after last `/`, before `.`)
  - Validates it matches the generated UUID
  - If match: proceeds to backend
  - If no match: shows error `UUID mismatch — URL filename ({filename}) does not match UUID ({uuid})`

**Step 8: Backend Asset Creation Request**
- Network tab → look for:
  ```
  POST /api/v1/internal/media_assets/batch/
  ```
  OR
  ```
  POST /api/v1/internal/media_assets/
  ```
- Expected Request Body:
  ```json
  {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Training Video",
    "type": "video",
    "category": ["teacher_training"],
    "description": "Test asset",
    "url": "https://asset-manager-in-review.s3.us-east-1.amazonaws.com/550e8400...mp4",
    "status": "ReadyForReview"  // Only if updating existing asset
  }
  ```
- Expected Response (201 Created):
  ```json
  {
    "id": 42,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Training Video",
    "type": "video",
    "category": ["teacher_training"],
    "url": "https://asset-manager-in-review.s3.us-east-1.amazonaws.com/550e8400...mp4",
    "status": "ReadyForReview",
    ...
  }
  ```

**Step 9: Success**
- Toast: `✓ Asset created`
- Form clears
- Asset appears in the assets list with status `ReadyForReview`

---

### Common Issues & Troubleshooting

#### Issue #1: "Upload failed — Failed to get presigned URL"

**Possible Causes:**
1. **API Key Invalid or Missing**
   - Check: `.env` file has `VITE_API_KEY=...` set
   - Check: Network tab → presigned URL request → Response shows `401 Unauthorized`
   - Fix: Update `.env` with correct API key from backend

2. **Backend Endpoint Not Running**
   - Check: Backend is running at `VITE_API_BASE_URL`
   - Try: `curl -X POST http://localhost:8000/api/v1/internal/media_assets/presigned_upload_url/ -H "API-KEY: ..." -H "Content-Type: application/json" -d '{"uuid":"test", "filename":"test.mp4", "content_type":"video/mp4"}'`
   - Fix: Start backend server

3. **Invalid Request Parameters**
   - Network tab → presigned URL request → Response shows `400 Bad Request`
   - Check response details in Network tab
   - Fix: Ensure filename is not empty, UUID is valid format

#### Issue #2: Progress Bar Stuck at 50%, Then Error

**Possible Causes:**
1. **File Too Large for Timeout**
   - Presigned URLs expire in 15 minutes
   - Large files (>1GB) may not finish in time
   - Fix: Retry with smaller file, or increase timeout in backend

2. **S3 Bucket CORS Not Configured**
   - Browser will block PUT request if CORS headers missing
   - Check Network tab → S3 PUT request → Response shows CORS error
   - Fix: Configure S3 bucket CORS:
     ```json
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["http://localhost:5173", "https://fde-staging.taleemabad.com"],
       "ExposeHeaders": ["ETag", "x-amz-version-id"]
     }
     ```

3. **Network Interruption**
   - Upload started but connection dropped mid-stream
   - Check: Browser console for network errors
   - Fix: Retry from beginning (no resume capability currently)

#### Issue #3: "Upload Complete" But URL Field Stays Empty

**Possible Causes:**
1. **S3 Response Malformed**
   - Check Network tab → S3 PUT → Response body should be empty (200 OK with no body is normal)
   - If response contains error XML, upload actually failed
   - Fix: Check S3 permissions for PUT requests

2. **Code Bug in Completion Handler**
   - Check Browser Console (F12) for errors
   - Look for: `Cannot read property 's3_url' of undefined`
   - Fix: Ensure presigned URL response includes both fields

#### Issue #4: "UUID Mismatch" Error When Trying to Create Asset

**Possible Causes:**
1. **URL Format Changed After Upload**
   - Frontend extracts UUID from URL: takes last path segment before extension
   - If URL format is different than expected, extraction fails
   - Check: URL field value, manually extract UUID
   - Example:
     ```
     URL: https://asset-manager-in-review.s3.us-east-1.amazonaws.com/550e8400-e29b-41d4-a716-446655440000.mp4?X-Amz-...
     Extracted: 550e8400-e29b-41d4-a716-446655440000 (removes query string)
     UUID: 550e8400-e29b-41d4-a716-446655440000
     ✓ Match!
     ```

2. **Different UUID Generated**
   - Form component uses `useMemo` to keep UUID stable
   - If you refresh page, new UUID generated
   - If you edit existing asset, UUID comes from `asset.uuid`
   - Fix: Don't refresh page during upload/form flow

#### Issue #5: Backend Shows 409 Conflict — "Asset already exists with this UUID"

**Possible Causes:**
1. **UUID Already Used**
   - UUID is globally unique in database
   - If same UUID sent twice, second request fails
   - Check: Query database: `SELECT * FROM asset_manager_mediaasset WHERE uuid = '550e8400...'`
   - Fix: Generate new UUID (refresh page, or create new asset)

2. **S3 File Exists But Asset Not in DB**
   - File uploaded to S3 but asset creation failed
   - Next upload with same file sees S3 conflict but tries to create new asset
   - Fix: Delete file from S3 or use different UUID

#### Issue #6: "CORS Error" in Browser Console But Upload Shows as Complete

**Why This Happens:**
- Browser blocks response due to CORS, but file is actually on S3
- Code detects this: `if (lastProgress > 0) treat as success`
- This is a **known limitation** — can't reliably detect S3 response due to CORS

**Verify Upload Actually Worked:**
1. Check S3 bucket directly
2. Search for file with UUID name: `{uuid}.{extension}`
3. If file exists in S3, upload succeeded
4. Proceed with asset creation

**To Fully Fix:**
- Configure S3 CORS headers (see Issue #2)
- Or implement server-side upload confirmation endpoint

#### Issue #7: "Access Denied" Error on Asset Creation

**Possible Causes:**
1. **API Key Invalid**
   - Check: Network tab → POST request → Headers include `API-KEY: ...`
   - Response shows `401 Unauthorized` or `403 Forbidden`
   - Fix: Verify API key is correct and has `HasAPIKey` permission

2. **Backend Permission Issue**
   - Check: Backend logs for permission errors
   - Fix: Ensure user/token has media_assets.add_mediaasset permission

---

### Verification Checklist

Use this checklist when testing uploads:

- [ ] **File Selection**
  - [ ] File input accepts files
  - [ ] File name and size display correctly
  - [ ] "Upload to S3" button enables
  
- [ ] **Presigned URL**
  - [ ] Network tab shows POST to `/presigned_upload_url/`
  - [ ] Request includes uuid, filename, content_type
  - [ ] Response includes presigned_url and s3_url
  - [ ] Response status is 200
  
- [ ] **S3 Upload**
  - [ ] Network tab shows PUT request (presigned S3 URL)
  - [ ] Progress bar animates smoothly 0→100%
  - [ ] S3 PUT returns 200 or 201
  - [ ] Upload time reasonable for file size
  
- [ ] **Completion**
  - [ ] URL field auto-populates with S3 URL
  - [ ] Toast shows "Upload complete"
  - [ ] File input clears
  - [ ] Button returns to normal state
  
- [ ] **Asset Creation**
  - [ ] URL field shows full S3 URL
  - [ ] Form validates UUID matches extracted filename
  - [ ] POST to media_assets/batch/ or media_assets/
  - [ ] Asset appears in list with status "ReadyForReview"
  - [ ] Toast shows "✓ Asset created"
  
- [ ] **Error Handling**
  - [ ] Invalid API key shows clear error message
  - [ ] Network error auto-retries up to 2 times
  - [ ] Timeout shows file size suggestion
  - [ ] Cancel button stops upload
  - [ ] Duplicate UUID shows specific error

---

### Network Tab Requests Checklist

When testing, verify these requests in DevTools → Network tab:

1. **Presigned URL Request**
   ```
   POST /api/v1/internal/media_assets/presigned_upload_url/ 200
   Size: ~500 B
   Time: <500ms
   ```

2. **S3 PUT Request**
   ```
   PUT https://asset-manager-in-review.s3.us-east-1.amazonaws.com/... 200
   Size: {file_size}
   Time: {depends on file size and connection}
   ```

3. **Asset Creation Request**
   ```
   POST /api/v1/internal/media_assets/batch/ 201
   Size: ~1-2 KB
   Time: <1s
   ```

4. **Optional: Assets List Refresh**
   ```
   GET /api/v1/media_assets/ 200
   Size: variable (all assets)
   Time: <2s
   ```

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
