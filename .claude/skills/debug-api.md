---
name: debug-api
description: Debug API integration issues - missing endpoints, auth, CORS, or response errors
argument-hint: "[endpoint-path]"
user-invocable: true
disable-model-invocation: false
---

# Debug API Issues

Systematic diagnosis of API integration problems.

## Common Issues & Solutions

### 1. CORS Error in Browser Console

**Symptom**: `Access to XMLHttpRequest blocked by CORS policy`

**Diagnosis**
```bash
# Check if backend is running
curl -i http://localhost:8000/api/v1/

# Check CORS headers
curl -i -X OPTIONS http://localhost:8000/api/v1/trainings/ \
  -H "Origin: http://localhost:5173"
```

**Fix**
- Backend must have CORS middleware enabled
- Check `CORS_ALLOWED_ORIGINS` in Django settings
- Include `http://localhost:5173` for local dev
- Include staging/prod domains for those environments

### 2. 404 Not Found on Endpoint

**Symptom**: `POST /api/v1/nonexistent/ → 404`

**Diagnosis**
```bash
# List all available endpoints
curl http://localhost:8000/api/v1/ -H "Authorization: Bearer <token>" | jq .

# Check if endpoint exists in backend routes
grep -r "media_assets" ../taleemabad-core/taleemabad/apps/*/urls.py
```

**Fix**
- Verify endpoint path matches backend routes
- Check if you're using correct HTTP method (GET vs POST)
- Ensure backend migrations are applied

### 3. 401 Unauthorized

**Symptom**: `401 Unauthorized — Please login`

**Diagnosis**
```bash
# Check auth token
curl -i http://localhost:8000/api/v1/trainings/ \
  -H "Authorization: Bearer $(cat .env | grep VITE)"

# Test with curl
curl -b "sessionid=<session_id>" http://localhost:8000/api/v1/trainings/
```

**Fix**
- Login first to get auth token
- Include `Authorization: Bearer <token>` header
- Check token expiry (tokens expire after ~1 hour)
- Clear browser storage, re-login

### 4. Request Body Not Accepted

**Symptom**: `400 Bad Request — Invalid JSON`

**Diagnosis**
```bash
# Test endpoint with proper body
curl -X POST http://localhost:8000/api/v1/trainings/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "description": "Desc"}' | jq .
```

**Fix**
- Verify `Content-Type: application/json` header
- Check request body matches schema
- Use `jq` or Postman to validate JSON

### 5. Timeout or Slow Requests

**Symptom**: Request hangs for 30+ seconds

**Diagnosis**
```bash
# Time the request
time curl http://localhost:8000/api/v1/trainings/

# Check backend logs
tail -50 /path/to/django/logs/debug.log
```

**Fix**
- Check backend is running and responsive
- Look for long-running queries in logs
- Consider pagination for large result sets
- Verify network connectivity

## Step-by-Step Debugging

### 1. Verify Backend is Running
```bash
curl -i http://localhost:8000/health/
# Expected: 200 OK
```

### 2. Check Network Request in DevTools
- Open Chrome DevTools → Network tab
- Trigger the failing request
- Click on request → check:
  - **Status**: 200, 400, 401, 404, 500?
  - **Headers**: Content-Type, Authorization present?
  - **Response**: Error message or expected data?

### 3. Test with Curl
```bash
curl -v -X GET http://localhost:8000/api/v1/trainings/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### 4. Check Frontend Code
- Verify endpoint URL in code: `VITE_API_BASE_URL + '/api/v1/trainings/'`
- Check request headers are correct
- Verify response parsing (JSON.stringify for logging)

### 5. Check Backend Logs
```bash
# Django logs location
tail -100 ../taleemabad-core/logs/debug.log

# Or run with verbose logging
python manage.py runserver --verbosity 3
```

## Useful Curl Commands

```bash
# GET with auth
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/trainings/

# POST with JSON body
curl -X POST http://localhost:8000/api/v1/trainings/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Training", "description": "Description"}'

# With response headers
curl -i http://localhost:8000/api/v1/trainings/

# Verbose (shows all details)
curl -v http://localhost:8000/api/v1/trainings/

# Pretty-print JSON response
curl http://localhost:8000/api/v1/trainings/ | jq .
```

## Frontend Debugging

```typescript
// Log full request/response
const response = await fetch(`${apiBase}/trainings/`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('Response:', {
  status: response.status,
  headers: Object.fromEntries(response.headers),
  body: await response.clone().json()
});
```
