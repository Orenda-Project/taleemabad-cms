---
name: s3-upload-test
description: Test and verify the S3 presigned URL upload flow end-to-end
argument-hint: "[asset-name]"
user-invocable: true
disable-model-invocation: false
---

# S3 Upload Flow Test

Complete verification of the S3 presigned URL upload feature.

## What This Tests

1. **Backend Presigned URL Generation**
   - Endpoint: `POST /api/v1/internal/media_assets/presigned_upload_url/`
   - Verifies: URL expiry, S3 bucket config, CORS headers

2. **Frontend Upload Hook** (`useS3Upload`)
   - File validation (type, size)
   - Progress tracking (0-100%)
   - Error handling
   - S3 URL callback

3. **End-to-End Flow**
   - Upload file to S3 via presigned URL
   - Create asset in database
   - Link asset to training

## Test Checklist

### Prerequisites
- [ ] Dev server running (`npm run dev`)
- [ ] Backend running on VITE_API_BASE_URL
- [ ] Authentication token valid
- [ ] S3 bucket accessible with correct credentials

### Steps

1. **Test Presigned URL Endpoint**
   ```bash
   curl -X POST http://localhost:8000/api/v1/internal/media_assets/presigned_upload_url/ \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"filename": "test.pdf", "content_type": "application/pdf"}'
   ```
   Expected: 200 with presigned_url and s3_key

2. **Test Frontend Upload**
   - Open CMS → Assets or Training → Create
   - Pick a file (PDF, image, etc.)
   - Watch upload progress
   - Verify S3 URL appears in response

3. **Verify Asset in DB**
   - Check if asset appears in assets list
   - Verify S3 URL is accessible
   - Check file size/type metadata

4. **Test Asset Linking**
   - Create/edit training
   - Link uploaded asset
   - Save and verify

## Success Criteria

✅ All steps complete without errors
✅ Progress bar shows 0-100% during upload
✅ S3 URL returned after successful upload
✅ Asset appears in list with correct metadata
✅ Asset linkable to trainings

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 403 Forbidden on presigned URL | Invalid auth token | Refresh login |
| CORS error in browser | S3 CORS not configured | Check AWS config |
| Upload hangs | Network issue or large file | Check file size, try smaller file |
| URL not returned | Backend error | Check server logs |
| Asset not in list | Database transaction failed | Verify backend connection |

## Debug Commands

```bash
# Check presigned URL response structure
curl -X POST http://localhost:8000/api/v1/internal/media_assets/presigned_upload_url/ \
  -H "Authorization: Bearer $(cat .env | grep AUTH_TOKEN)" \
  -H "Content-Type: application/json" \
  -d '{"filename": "debug.txt", "content_type": "text/plain"}' | jq .

# List uploaded assets
curl http://localhost:8000/api/v1/media_assets/ \
  -H "Authorization: Bearer <token>" | jq .
```
