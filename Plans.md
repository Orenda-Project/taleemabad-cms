# Taleemabad CMS — Project Plans

## Current Sprint: React SPA Stabilization & Feature Completion

### Epics
1. **S3 Upload & Media Management** ✅ (Mostly complete — presigned URLs, browser uploads working)
2. **Training CRUD** ✅ (Complete — create, read, update, delete trainings)
3. **Question & Quiz Management** ✅ (Complete — dynamic hints, quiz builder)
4. **Dashboard & Admin UI** ✅ (Complete — overview, quick actions, filters)
5. **API Integration & Sync** — Next focus
6. **Deployment & Production Readiness** — Follow-up

---

## To-Do

### Phase 1: API Robustness & Data Validation
- [ ] Verify all API endpoints respond correctly to edge cases (empty lists, null fields, 404s)
- [ ] Add retry logic for presigned URL requests (network resilience)
- [ ] Implement error boundaries for component crashes
- [ ] Add comprehensive error messages for all API failures

### Phase 2: Performance & UX Polish
- [ ] Optimize asset list loading (pagination, filtering, search)
- [ ] Add loading states and skeleton screens
- [ ] Implement optimistic UI updates for CRUD operations
- [ ] Test with large datasets (1000+ trainings, 500+ assets)

### Phase 3: Testing & Validation
- [ ] Write integration tests for S3 upload flow
- [ ] Write component tests for forms (Training, Question, Asset)
- [ ] End-to-end test: create training → add asset → upload to S3 → verify in DB
- [ ] Test staging → prod sync workflow

### Phase 4: Deployment Preparation
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure staging environment (AWS S3, CloudFront)
- [ ] Configure production environment
- [ ] Document deployment runbook
- [ ] Smoke tests post-deployment

---

## Completed

- [x] React SPA scaffold (Vite + React 19 + TypeScript + TailwindCSS)
- [x] Courses page with filters (Vendor, Level, Type)
- [x] Trainings page with CRUD
- [x] Questions page with dynamic hints
- [x] Grand Quizzes page with CRUD
- [x] Review page with Vendor/Level/Type filters
- [x] Media assets page with searchable dropdown
- [x] S3 presigned URL integration
- [x] Asset upload form with progress tracking
- [x] Training form with asset linking
- [x] Navigation & routing
- [x] Layout & styling (TailwindCSS)
- [x] API integration for all endpoints
- [x] UUID-based asset ID mapping for sync

---

## Dependencies & Blockers

- Backend: Django API at `http://localhost:8000` (local dev)
- S3: Presigned URL endpoint `/api/v1/internal/media_assets/presigned_upload_url/`
- Database: PostgreSQL with correct schema (courses, trainings, questions, assets)

---

## Notes

- CMS replaces Retool with modern, modular React interface
- S3 bucket: `asset-manager-in-review` (or staging/prod equivalents)
- API Key: Required for presigned URL requests (set in `.env`)
- CORS: S3 bucket must allow localhost for dev, staging/prod domains for production
