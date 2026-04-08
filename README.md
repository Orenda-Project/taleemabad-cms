# Taleemabad CMS

Internal content management system for uploading and managing teacher training content on the Taleemabad LMS platform. Replaces two legacy Retool apps.

## What it does

Content authors use this app on **staging** to build out the full training tree:

```
Level → Course → Training → Questions
                └── Grand Quiz → Questions
```

Once content is ready, the **Review / Upload to Production** section syncs it to the live production environment in the correct dependency order.

## Tech stack

- **React 18** + **TypeScript** + **Vite 5**
- **TailwindCSS** + **shadcn/ui** components
- **TanStack Query v5** (data fetching + cache)
- **Zustand** (navigation context — selected course/training/grand quiz)
- **Axios** (API client, API-KEY header auth)
- **React Router v6**
- **react-hook-form**

## Project structure

```
src/
  api/           # Axios calls — one file per resource
  components/
    training/    # CourseTable, TrainingTable, QuestionTable, GrandQuizTable,
                 # ReviewUpload, all *Form components
    assets/      # AssetTable, AssetForm, AssetPromotion
    ui/          # shadcn components
    layout/      # TopNav, SubNav, Breadcrumb
  hooks/         # useQuery/useMutation wrappers
  pages/         # TrainingPage, AssetsPage, OrgSelectPage
  store/         # orgStore (selected org), trainingStore (nav context)
  types/         # TypeScript interfaces
  config/        # orgs.ts — org URLs from env
  lib/           # utils (statusColor, cn)
```

## Getting started

```bash
npm install
npm run dev
```

Configure `.env` before running:

```env
# API base — switch between local and staging
# Local:   http://omar.localhost:8001
# Staging: https://fde-staging.taleemabad.com
VITE_API_BASE_URL=https://fde-staging.taleemabad.com
VITE_API_KEY=<api-key>

# Org URLs
VITE_FDE_STAGE_URL=https://fde-staging.taleemabad.com
VITE_FDE_PROD_URL=https://schools.niete.pk
VITE_RWL_STAGE_URL=https://fde-staging.taleemabad.com
VITE_RWL_PROD_URL=https://rawalpindi.niete.pk
```

## Navigation

| Route | Section |
|---|---|
| `/training/courses` | Courses (filtered by vendor + level + type) |
| `/training/trainings` | Trainings for selected course |
| `/training/questions` | Questions for selected training |
| `/training/grand-quiz` | Grand Quizzes (filtered by vendor + level) |
| `/training/questions?mode=grand-quiz` | Questions for selected grand quiz |
| `/training/review` | Review & Upload to Production |
| `/assets` | Media asset library |
| `/assets/promote` | Promote assets staging → prod |

## Upload to Production — sequence

The Review page pushes a course and all its content to prod in this order to avoid FK violations:

```
0. Resolve assets      — map staging asset IDs → prod IDs via UUID
1. Create course       — capture prod course ID
2. Upload trainings    — use prod course ID + mapped asset IDs
3. Upload training Qs  — use prod training IDs + mapped asset IDs
4. Upload grand quizzes — capture prod GQ IDs
5. Upload GQ questions  — use prod GQ IDs + mapped asset IDs
6. Mark stage → OnProd
```

Assets must be promoted via the **Assets → Promote** tab first. The upload will proceed even if an asset is missing on prod (FK becomes null), but the content will be incomplete.

## Vendor / Level filtering

All content sections (Courses, Grand Quizzes, Review) filter by:
- **Vendor** — TALEEMABAD / BEACONHOUSE / NIETE
- **Level** — pulled from API filtered by vendor (seeded via Django migrations)
- **Type** — vendor-aware (TALEEMABAD: all types; BH/NIETE: PEDAGOGICAL_PRACTICE only)

Creating content inside a filter context locks those values into the form automatically.

## Status lifecycle

```
Draft → ReadyForReview → OnProd
                      ↘ EditsRequired
```

When a course is pushed to prod, staging is marked `OnProd`. Any edit to a course question/training automatically resets it to `ReadyForReview`.

## TODO / next up

- [ ] AWS deployment (S3 + CloudFront for the SPA)
- [ ] S3 direct browser upload for assets (presigned URLs)
- [ ] Test full staging → prod push end-to-end
- [ ] Login screen (currently relies on API key in env)
