---
title: Taleemabad CMS Architecture
tags:
  - architecture
  - taleemabad-cms
---

# Taleemabad CMS Architecture

## Stack
- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **API Client**: Axios
- **State**: React Context / Local State
- **S3 Integration**: Presigned URLs for direct uploads

## Key Components
- **AssetForm** — File picker + S3 upload
- **TrainingForm** — Training CRUD with asset linking
- **AdminDashboard** — Overview and quick actions
- **useS3Upload** — Custom hook for S3 uploads with progress tracking

## Data Flow
1. User selects file in AssetForm
2. Frontend requests presigned URL from backend
3. User uploads directly to S3
4. S3 URL returned to frontend
5. Form saves asset metadata to backend

## Environment
- Backend API: `VITE_API_BASE_URL` (configured in `.env`)
- S3 Bucket: Separate CMS bucket with isolated credentials
- CORS: Configured for localhost + staging/prod domains

See [[project]] for more details.
