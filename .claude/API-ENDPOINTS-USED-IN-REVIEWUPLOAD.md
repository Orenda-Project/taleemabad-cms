# API Endpoints Used in ReviewUpload.tsx

This document outlines all API endpoints called by the "Move to Prod" feature in `ReviewUpload.tsx` and their exact capabilities. Generated from backend introspection (2026-04-29).

---

## Summary

**Backend Routing Model**: Django REST Framework uses `{pk}` (numeric primary key) for all detail routes. UUID-based lookups are NOT supported in URL routing.

**Key Finding**: The backend does NOT support:
- ❌ `PATCH /courses/{uuid}/` — must use numeric pk
- ❌ `PATCH /trainings/{uuid}/` — must use numeric pk
- ❌ `PATCH /training_question/{uuid}/` — must use numeric pk
- ❌ `PATCH /grand_quizzes/{uuid}/` — must use numeric pk
- ❌ `training__uuid__in=` filter parameter
- ❌ `grand_quiz__uuid__in=` filter parameter

The frontend must use **numeric ID-based PATCH operations** and **numeric ID `__in` filters**.

---

## Public APIs (Read-Only, GET requests)

### 1. GET /api/v1/courses/

**Purpose**: List courses (with pagination)

**Supported Filters**:
```
?uuid={uuid}           ✅ Filter by course UUID
?type={type}           ✅ Filter by course type
?level={level_id}      ✅ Filter by level ID (numeric)
```

**Response Format**:
```json
{
  "count": 10,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "uuid": "8775a2dc-a69a-4871-bb5a-0d9a615d87a4",
      "title": "Course Name",
      "description": "...",
      "type": "training",
      "level": 1,
      "...": "... more fields ..."
    }
  ]
}
```

**Notes**:
- ✅ Returns `{count, results}` structure (paginated)
- ✅ Supports filtering by `uuid`
- ✅ Use `ensureArray()` helper to handle pagination

**Example Usage (in ReviewUpload.tsx Step 1)**:
```typescript
const existingCourses = await pc.get(`/api/v1/courses/?uuid=${course.uuid}`)
const coursesList = ensureArray(existingCourses.data)
if (coursesList.length > 0) {
  prodCourseId = coursesList[0].id
}
```

---

### 2. GET /api/v1/trainings/

**Purpose**: List trainings (with pagination)

**Supported Filters**:
```
?uuid={uuid}              ✅ Filter by training UUID
?course__uuid={uuid}      ✅ Filter by course UUID (Django ORM style)
?course={course_id}       ✅ Filter by course numeric ID
?limit={n}                ✅ Set page size
```

**Response Format**: Same paginated structure as courses
```json
{
  "count": 5,
  "results": [
    {
      "id": 10,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Training Name",
      "course": 1,
      "status": "active",
      "...": "... more fields ..."
    }
  ]
}
```

**Notes**:
- ✅ Returns paginated `{count, results}` structure
- ✅ Use `course__uuid=` to filter by course UUID (NOT numeric ID)
- ✅ Supports `limit` parameter for pagination
- ✅ Use `ensureArray()` helper

**Example Usage (in ReviewUpload.tsx Step 2)**:
```typescript
const existingTrainings = await pc.get(
  `/api/v1/trainings/?course__uuid=${course.uuid}&limit=10000`
)
const trainingsList = ensureArray(existingTrainings.data)
```

---

### 3. GET /api/v1/training_questions/

**Purpose**: List training questions (with pagination)

**Supported Filters** (from filters.py, line 36-43):
```
?training_ids={id1,id2}           ✅ Filter by numeric training IDs (BaseInFilter)
?grand_quiz_ids={id1,id2}         ✅ Filter by numeric grand quiz IDs (BaseInFilter)
?training__uuid={uuid}            ✅ Filter by training UUID
?grand_quiz={id}                  ✅ Filter by grand quiz ID
?type={type}                       ✅ Filter by question type
?limit={n}                         ✅ Set page size
```

**Response Format**:
```json
{
  "count": 15,
  "results": [
    {
      "id": 100,
      "uuid": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "question_statement": "Question text...",
      "type": "mcq",
      "training": 10,
      "grand_quiz": null,
      "...": "... more fields ..."
    }
  ]
}
```

**CRITICAL LIMITATION** ⚠️:
- ❌ `training__uuid__in=` is NOT supported
- ❌ `grand_quiz__uuid__in=` is NOT supported
- ✅ Only numeric ID filters work: `training_ids=` and `grand_quiz_ids=`

**Example Usage (in ReviewUpload.tsx Step 3)**:
```typescript
// ✅ CORRECT: Use numeric training IDs
const trainingIdsStr = Object.values(trainingIdMap).join(",")
const existingQs = await pc.get(
  `/api/v1/training_questions/?training_ids=${trainingIdsStr}&limit=10000`
)

// ❌ WRONG: UUID-based filters don't work
const existingQs = await pc.get(
  `/api/v1/training_questions/?training__uuid__in=${trainingUuids}`  // Returns 0 results
)
```

---

### 4. GET /api/v1/grand_quizzes/

**Purpose**: List grand quizzes (with pagination)

**Supported Filters**:
```
?level={level_id}      ✅ Filter by level ID (numeric) — REQUIRED
?limit={n}             ✅ Set page size
```

**Response Format**:
```json
{
  "count": 3,
  "results": [
    {
      "id": 20,
      "uuid": "7ca2c810-9dad-11d1-80b4-00c04fd430c9",
      "title": "Grand Quiz Name",
      "level": 5,
      "type": "grand_quiz",
      "...": "... more fields ..."
    }
  ]
}
```

**Notes**:
- ✅ Returns paginated `{count, results}` structure
- ✅ Scoped to level (Grand quizzes belong to levels, not courses)
- ✅ Use `ensureArray()` helper

**Example Usage (in ReviewUpload.tsx Step 4)**:
```typescript
const existingGqs = await pc.get(
  `/api/v1/grand_quizzes/?level=${selectedLevel?.id}&limit=10000`
)
const gqsList = ensureArray(existingGqs.data)
```

---

## Internal APIs (Create/Update, POST and PATCH)

### 5. POST /api/v1/internal/courses/

**Purpose**: Create or bulk upsert courses

**HTTP Method**: POST  
**Auth**: RetoolIPPermission or HasAPIKey

**Payload Format** (accepts single dict or array):
```json
{
  "id": null,
  "uuid": "8775a2dc-a69a-4871-bb5a-0d9a615d87a4",
  "title": "Course Title",
  "description": "...",
  "type": "training",
  "level": 1,
  "subject": null,
  "grade_group": null,
  "is_active": true,
  "status": "active"
}
```

**Accepted Fields** (from RetoolCourseSerializer, line 541-553):
```python
fields = "__all__"  # Accepts all Course model fields
```

**Response**: Newly created/updated course object

**Notes**:
- ✅ Uses `bulk_create` with `update_conflicts=True` under the hood
- ✅ Upserts on `unique_fields=["id"]`
- ✅ If `id` is null, backend assigns one
- ✅ Returns the created course object

**Example Usage (in ReviewUpload.tsx Step 1)**:
```typescript
const coursePayload = {
  uuid: course.uuid,
  title: course.title,
  level: prodLevelId,
  // ... other fields
}
await pc.post(`/api/v1/internal/courses/`, coursePayload)
```

---

### 6. PATCH /api/v1/internal/courses/{pk}/

**Purpose**: Update a specific course by numeric ID

**HTTP Method**: PATCH  
**URL Parameter**: `{pk}` = numeric course ID (NOT UUID)  
**Auth**: RetoolIPPermission or HasAPIKey

**Payload Format** (partial update):
```json
{
  "title": "Updated Title",
  "status": "on_prod",
  "modified": "2026-04-29T10:00:00Z"
}
```

**Accepted Fields**: Any Course model field (partial update)

**Response**: Updated course object

**CRITICAL** ⚠️:
- ❌ UUID-based PATCH does NOT work: `PATCH /api/v1/internal/courses/{uuid}/` returns 404
- ✅ Must use numeric primary key: `PATCH /api/v1/internal/courses/{numeric_id}/`
- ✅ To update, you must have the numeric `id` from a previous GET request

**Example Usage**:
```typescript
// ✅ CORRECT
await pc.patch(`/api/v1/internal/courses/${prodCourseId}/`, {
  status: "on_prod"
})

// ❌ WRONG
await pc.patch(`/api/v1/internal/courses/${course.uuid}/`, {
  status: "on_prod"
})  // Returns 404
```

---

### 7. POST /api/v1/internal/trainings/

**Purpose**: Bulk create trainings (from ReviewUpload.tsx Step 2)

**HTTP Method**: POST  
**Auth**: RetoolIPPermission

**Payload Format** (array of training objects):
```json
[
  {
    "id": null,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Training Title",
    "description": "...",
    "course": "8775a2dc-a69a-4871-bb5a-0d9a615d87a4",  // UUID value
    "status": "active",
    "is_active": true,
    "index": 1,
    "media_asset": null,
    "...": "... other fields ..."
  }
]
```

**Field Details** (from BulkCreateTrainingSerializer):
- `course`: Accepts UUID as value (will be matched in database by UUID)
- `media_asset`: FK to asset, can be null
- `status`, `title`, `description`: Standard fields

**Response Format**:
```json
[
  {
    "id": 10,
    "uuid": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

**Notes**:
- ✅ Returns array of `{id, uuid}` pairs (newly created IDs + UUIDs)
- ✅ Use this response to build `trainingIdMap` for Step 3
- ✅ Backend re-fetches by UUID to return actual database IDs
- ✅ `course` field accepts UUID value (Django ORM FK resolution)

**Example Usage**:
```typescript
const trainingPayload = trainings.map(t => ({
  uuid: t.uuid,
  title: t.title,
  course: course.uuid,  // ✅ Pass UUID here
  status: "active",
  // ... other fields
}))

const response = await pc.post(`/api/v1/internal/trainings/`, trainingPayload)
// response = [{id: 10, uuid: "..."}, {id: 11, uuid: "..."}, ...]

// Build map for Step 3
const trainingIdMap = Object.fromEntries(
  response.map(t => [stagingTrainingById[t.uuid]?.id, t.id])
)
```

---

### 8. PATCH /api/v1/internal/trainings/{pk}/

**Purpose**: Update a specific training by numeric ID

**HTTP Method**: PATCH  
**URL Parameter**: `{pk}` = numeric training ID  
**Auth**: RetoolIPPermission

**Payload Format** (partial update):
```json
{
  "title": "Updated Title",
  "status": "on_prod",
  "modified": "2026-04-29T10:00:00Z"
}
```

**CRITICAL** ⚠️:
- ❌ UUID-based PATCH: `PATCH /api/v1/internal/trainings/{uuid}/` returns 404
- ✅ Must use numeric ID: `PATCH /api/v1/internal/trainings/{numeric_id}/`

**Example Usage**:
```typescript
await pc.patch(`/api/v1/internal/trainings/${prodTrainingId}/`, {
  status: "updated"
})
```

---

### 9. POST /api/v1/internal/training_question/

**Purpose**: Bulk create training questions (Step 3)

**HTTP Method**: POST  
**Auth**: RetoolIPPermission

**Payload Format** (array of question objects):
```json
[
  {
    "id": null,
    "uuid": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "question_statement": "What is 2+2?",
    "type": "mcq",
    "training": 10,
    "grand_quiz": null,
    "options": [{"text": "4", "is_correct": true}, ...],
    "answers": ["4"],
    "hints": [],
    "status": "active",
    "is_active": true,
    "...": "... other fields ..."
  }
]
```

**Field Details** (from BulkCreateTrainingQuestionsSerializer):
- `training`: Numeric training ID (NOT UUID) — required if question belongs to training
- `grand_quiz`: Numeric grand quiz ID — required if question belongs to grand quiz
- `options`: Array of option objects with `text` and `is_correct`
- `answers`: Array of correct answer strings

**Response Format**:
```json
[
  {
    "id": 100,
    "uuid": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }
]
```

**CRITICAL** ⚠️:
- ✅ `training` field MUST be numeric ID (not UUID)
- ✅ Build `trainingIdMap` from Step 2 response to resolve numeric IDs
- ✅ Skip questions where `training` is null or not found in `trainingIdMap`

**Example Usage**:
```typescript
// Step 2 returned: {id: 10, uuid: "550e8400-..."}
// Build trainingIdMap: {uuid: "550e8400-..." -> numeric_id: 10}

const questionPayload = questions.map(q => {
  const trainingUuid = stagingTrainingUuidById[q.training]
  const prodTrainingId = trainingIdMap[trainingUuid]  // ✅ Get numeric ID

  return {
    uuid: q.uuid,
    question_statement: q.question_statement,
    training: prodTrainingId,  // ✅ Numeric ID
    type: q.type,
    options: q.options,
    answers: q.answers,
  }
})

const response = await pc.post(`/api/v1/internal/training_question/`, questionPayload)
```

---

### 10. PATCH /api/v1/internal/training_question/{pk}/

**Purpose**: Update a specific training question by numeric ID

**HTTP Method**: PATCH  
**URL Parameter**: `{pk}` = numeric question ID  
**Auth**: RetoolIPPermission

**Payload Format** (partial update):
```json
{
  "question_statement": "Updated question...",
  "status": "on_prod",
  "modified": "2026-04-29T10:00:00Z"
}
```

**CRITICAL** ⚠️:
- ❌ UUID-based PATCH: `PATCH /api/v1/internal/training_question/{uuid}/` returns 404
- ✅ Must use numeric ID

---

### 11. POST /api/v1/internal/grand_quizzes/

**Purpose**: Bulk create grand quizzes (Step 4)

**HTTP Method**: POST  
**Auth**: RetoolIPPermission

**Payload Format** (array of grand quiz objects):
```json
[
  {
    "id": null,
    "uuid": "7ca2c810-9dad-11d1-80b4-00c04fd430c9",
    "title": "Grand Quiz Title",
    "level": 5,
    "type": "grand_quiz",
    "status": "active",
    "is_active": true,
    "...": "... other fields ..."
  }
]
```

**Field Details**:
- `level`: Numeric level ID (required) — Grand quizzes belong to levels, not courses
- `type`: Usually "grand_quiz"
- `id`: Can be null; backend assigns if not provided

**Response Format**:
```json
[
  {
    "id": 20,
    "uuid": "7ca2c810-9dad-11d1-80b4-00c04fd430c9"
  }
]
```

**Notes**:
- ✅ Returns `{id, uuid}` pairs for building `gqIdMap`
- ✅ Grand quizzes are scoped to levels (not courses like trainings)

---

### 12. PATCH /api/v1/internal/grand_quizzes/{pk}/

**Purpose**: Update a specific grand quiz by numeric ID

**HTTP Method**: PATCH  
**URL Parameter**: `{pk}` = numeric grand quiz ID

**CRITICAL** ⚠️:
- ❌ UUID-based PATCH: `PATCH /api/v1/internal/grand_quizzes/{uuid}/` returns 404
- ✅ Must use numeric ID

---

### 13. POST /api/v1/internal/media_assets/presigned_upload_url/

**Purpose**: Generate a presigned S3 URL for file upload (Step 0 - Asset Resolution)

**HTTP Method**: POST  
**Auth**: RetoolIPPermission or HasAPIKey

**Payload Format**:
```json
{
  "uuid": "unique-uuid-for-file",
  "filename": "video.mp4",
  "content_type": "video/mp4"
}
```

**Response Format**:
```json
{
  "presigned_url": "https://s3.ap-south-1.amazonaws.com/bucket/...",
  "s3_url": "https://bucket.s3.ap-south-1.amazonaws.com/uuid.mp4"
}
```

**Notes**:
- ✅ Used for Step 0 (Asset resolution / file upload)
- ✅ CMS-specific bucket: `AWS_S3_CMS_BUCKET_NAME`
- ✅ CMS-specific credentials: `AWS_S3_CMS_ACCESS_KEY_ID`
- ✅ Returns both presigned URL (for upload) and final S3 URL (for storage)

---

## Summary of Constraints for ReviewUpload.tsx

| Requirement | Supported? | Example |
|-------------|-----------|---------|
| GET course by UUID | ✅ | `/api/v1/courses/?uuid={uuid}` |
| GET training by course UUID | ✅ | `/api/v1/trainings/?course__uuid={uuid}` |
| GET training questions by training IDs | ✅ | `/api/v1/training_questions/?training_ids=10,11,12` |
| GET training questions by training UUIDs | ❌ | `/api/v1/training_questions/?training__uuid__in=...` does NOT work |
| GET grand quizzes by level | ✅ | `/api/v1/grand_quizzes/?level={id}` |
| POST courses | ✅ | `/api/v1/internal/courses/` |
| **PATCH courses by UUID** | ❌ | `/api/v1/internal/courses/{uuid}/` returns 404 |
| **PATCH courses by numeric ID** | ✅ | `/api/v1/internal/courses/{id}/` |
| POST trainings (accepts UUID for course FK) | ✅ | `{course: "uuid-value"}` |
| **PATCH trainings by UUID** | ❌ | `/api/v1/internal/trainings/{uuid}/` returns 404 |
| **PATCH trainings by numeric ID** | ✅ | `/api/v1/internal/trainings/{id}/` |
| POST training questions (requires numeric training ID) | ✅ | `{training: 10}` |
| **PATCH training questions by UUID** | ❌ | `/api/v1/internal/training_question/{uuid}/` returns 404 |
| **PATCH training questions by numeric ID** | ✅ | `/api/v1/internal/training_question/{id}/` |

---

## Architecture Decision: Hybrid UUID + ID Approach

**Current Sync Flow Recommendations**:

1. **Use UUID for FK relationships in payloads** ✅
   - When creating trainings: `{course: course.uuid}` — backend resolves UUID to numeric ID
   - Django ORM automatically converts UUID FK values to numeric IDs in database

2. **Use numeric ID for URL routing (PATCH operations)** ✅
   - Step 1: Store `prodCourseId` (numeric) from Course GET
   - Step 2: Use response `{id, uuid}` pairs to build `trainingIdMap`
   - Step 3: Use numeric IDs from `trainingIdMap` in question payloads
   - Step 4: Build `gqIdMap` from grand quiz POST response
   - Step 5: Use numeric IDs from `gqIdMap` in question payloads

3. **Use numeric ID `__in` filters** ✅
   - `training_ids=` (NOT `training__in=` and NOT `training__uuid__in=`)
   - `grand_quiz_ids=` (NOT `grand_quiz__in=` and NOT `grand_quiz__uuid__in=`)

---

## Files Examined

- `/taleemabad_core/apps/teacher_training/views.py` — Public API viewsets
- `/taleemabad_core/apps/teacher_training/filters.py` — Available query filters
- `/taleemabad_core/apps/internal_apps/retool_app/views.py` — Internal API viewsets
- `/taleemabad_core/apps/internal_apps/retool_app/urls.py` — URL routing
- `/taleemabad_core/apps/internal_apps/retool_app/serializers.py` — Field definitions

---

## Testing Checklist

After updating ReviewUpload.tsx to match this API specification:

- [ ] Step 1: `PATCH /api/v1/internal/courses/{prodCourseId}/` succeeds (numeric ID)
- [ ] Step 2: `POST /api/v1/internal/trainings/` returns `{id, uuid}` pairs
- [ ] Step 3: Questions created with `training: <numeric_id>` from trainingIdMap
- [ ] Step 3: `GET /api/v1/training_questions/?training_ids=...` works (NOT UUID-based)
- [ ] Step 4: Grand quizzes created successfully
- [ ] Step 5: Questions created with `grand_quiz: <numeric_id>` from gqIdMap
- [ ] Re-run sync: no duplicate data, only updated records are synced
- [ ] Production database: no orphaned questions (all have valid `training_id` or `grand_quiz_id`)
