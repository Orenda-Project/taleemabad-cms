# CMS uuid-native Stage→Prod Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ReviewUpload.tsx` consume the new `{resolved, conflicts}` bulk-endpoint response so stage→prod pushes use uuid-matched prod IDs and surface ambiguous matches to the user instead of silently duplicating.

**Architecture:** New pure helper `src/api/retool.ts` owns the response-parsing contract. `ReviewUpload.tsx` calls it after every bulk POST to get a `uuid→prodId` map and a `conflicts` list; if conflicts is non-empty the push stops and a blocking panel renders. Per-UUID GET loops and the CMS-side natural-key fallback for grand quizzes are removed — the backend now handles all of this.

**Tech Stack:** React 18, TypeScript, Axios, Vite. No new dependencies.

## Global Constraints

- Never send the stage `id` field in create payloads — prod assigns its own id.
- Always send `uuid` on every item — it is the primary match key on the backend.
- Push order: Course → Trainings → Training Questions → Grand Quizzes → Grand Quiz Questions.
- Prerequisite: BE PR #5220 merged to develop before shipping this. The legacy-array fallback in `parseBulkResponse` ensures backward-compat during the gap.
- No test framework installed — test `parseBulkResponse`/`buildUuidIdMap` via a self-contained `__tests__/retool.test.ts` using Vitest (add it; it's already a Vite project).
- File: `src/api/retool.ts` (new). File: `src/components/training/ReviewUpload.tsx` (modify, currently 726 lines).

---

### Task 1: `src/api/retool.ts` — response-parsing helper

**Files:**
- Create: `src/api/retool.ts`
- Create: `src/__tests__/retool.test.ts`

**Interfaces:**
- Produces:
  - `ResolvedItem: { uuid: string; id: number }`
  - `ConflictItem: { uuid: string; natural_key: Record<string, unknown>; candidate_ids: number[]; reason: string }`
  - `BulkSyncResponse: { resolved: ResolvedItem[]; conflicts: ConflictItem[] }`
  - `parseBulkResponse(data: unknown): BulkSyncResponse`
  - `buildUuidIdMap(resolved: ResolvedItem[]): Record<string, number>`

- [ ] **Step 1: Install Vitest (needed for tests only)**

```bash
cd /home/oye/Documents/free_work/repos/taleemabad-cms
npm install --save-dev vitest
```

Add to `package.json` scripts (open `package.json`, add inside `"scripts"`):
```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/retool.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { parseBulkResponse, buildUuidIdMap } from "../api/retool"

describe("parseBulkResponse", () => {
  it("reads new {resolved, conflicts} shape", () => {
    const data = {
      resolved: [{ uuid: "abc", id: 10 }],
      conflicts: [{ uuid: "def", natural_key: { title: "X" }, candidate_ids: [1, 2], reason: "ambiguous" }],
    }
    const result = parseBulkResponse(data)
    expect(result.resolved).toEqual([{ uuid: "abc", id: 10 }])
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].uuid).toBe("def")
  })

  it("falls back gracefully for legacy bare-array response", () => {
    const data = [{ uuid: "abc", id: 10 }, { uuid: "xyz", id: 20 }]
    const result = parseBulkResponse(data)
    expect(result.resolved).toEqual([{ uuid: "abc", id: 10 }, { uuid: "xyz", id: 20 }])
    expect(result.conflicts).toHaveLength(0)
  })

  it("returns empty resolved+conflicts for unexpected shape", () => {
    const result = parseBulkResponse(null)
    expect(result.resolved).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
  })
})

describe("buildUuidIdMap", () => {
  it("builds a uuid→id map from resolved list", () => {
    const resolved = [{ uuid: "aaa", id: 1 }, { uuid: "bbb", id: 2 }]
    expect(buildUuidIdMap(resolved)).toEqual({ aaa: 1, bbb: 2 })
  })

  it("returns empty object for empty input", () => {
    expect(buildUuidIdMap([])).toEqual({})
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd /home/oye/Documents/free_work/repos/taleemabad-cms
npm test
```

Expected: `Cannot find module '../api/retool'`

- [ ] **Step 4: Create `src/api/retool.ts`**

```typescript
export interface ResolvedItem {
  uuid: string
  id: number
}

export interface ConflictItem {
  uuid: string
  natural_key: Record<string, unknown>
  candidate_ids: number[]
  reason: string
}

export interface BulkSyncResponse {
  resolved: ResolvedItem[]
  conflicts: ConflictItem[]
}

/**
 * Parse a bulk endpoint response into {resolved, conflicts}.
 * Handles both the new shape ({resolved, conflicts}) and the legacy bare-array
 * shape so this works during the BE-first rollout window.
 */
export function parseBulkResponse(data: unknown): BulkSyncResponse {
  if (data && typeof data === "object" && !Array.isArray(data) && "resolved" in data) {
    const d = data as { resolved: ResolvedItem[]; conflicts?: ConflictItem[] }
    return { resolved: d.resolved ?? [], conflicts: d.conflicts ?? [] }
  }
  if (Array.isArray(data)) {
    return {
      resolved: (data as Array<{ uuid: string; id: number }>).map(r => ({ uuid: r.uuid, id: r.id })),
      conflicts: [],
    }
  }
  return { resolved: [], conflicts: [] }
}

/** Turn a resolved list into a uuid→prodId lookup map. */
export function buildUuidIdMap(resolved: ResolvedItem[]): Record<string, number> {
  return Object.fromEntries(resolved.map(r => [r.uuid, r.id]))
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test
```

Expected: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add src/api/retool.ts src/__tests__/retool.test.ts package.json
git commit -m "feat(cms): parseBulkResponse + buildUuidIdMap helpers for uuid-native sync"
```

---

### Task 2: Update `ReviewUpload.tsx` — consume resolved, remove GET loops, add conflict UI

**Files:**
- Modify: `src/components/training/ReviewUpload.tsx`

**Interfaces:**
- Consumes: `parseBulkResponse`, `buildUuidIdMap`, `BulkSyncResponse`, `ConflictItem` from `src/api/retool.ts` (Task 1)

- [ ] **Step 1: Add imports + `syncConflicts` state + reset + conflict gate**

At the top of `ReviewUpload.tsx`, add the import on line 9 (after the existing api imports):

```typescript
import { parseBulkResponse, buildUuidIdMap } from "../../api/retool"
import type { ConflictItem } from "../../api/retool"
```

After the existing `const [steps, ...]` state declaration (~line 63), add:

```typescript
const [syncConflicts, setSyncConflicts] = useState<ConflictItem[]>([])
```

Inside the component, add the conflict gate helper (after `setStep`, before `uploadToProd`):

```typescript
function throwOnConflicts(data: unknown, label: string): Record<string, number> {
  const { resolved, conflicts } = parseBulkResponse(data)
  if (conflicts.length > 0) {
    setSyncConflicts(conflicts)
    throw new Error(`${label}: ${conflicts.length} item(s) blocked — see conflicts above`)
  }
  return buildUuidIdMap(resolved)
}
```

At the top of `uploadToProd` (line ~93, after `setSteps(...)` and before `try {`), add:

```typescript
setSyncConflicts([])
```

At the top of `syncToProd` (same position ~line 272), add:

```typescript
setSyncConflicts([])
```

- [ ] **Step 2: `uploadToProd` Step 2 — replace GET loop with `throwOnConflicts`**

Find and replace lines 171–203 (the training POST + GET loop block):

```typescript
// REMOVE everything from:
      if (stagingTrainings.length > 0) {
        const trainingPayloads = stagingTrainings.map(t => ({
          ...
        }))
        console.log(`[Step 2] POSTing ${trainingPayloads.length} trainings`)
        await pc.post("/api/v1/internal/trainings/", trainingPayloads)
        // Fetch each training by UUID...
        console.log(`[Step 2B] Resolving prod IDs for created trainings`)
        for (const t of stagingTrainings) {
          const res = await pc.get(`/api/v1/trainings/?uuid=${t.uuid}&limit=1&is_active=True`)
          const prodT = ensureArray(res.data)[0]
          if (prodT?.id) {
            trainingUuidToIdMap[t.uuid] = prodT.id
            console.log(`  ✓ UUID=${t.uuid} → prod ID=${prodT.id}`)
          } else {
            console.warn(`  ✗ Could not resolve prod ID for UUID=${t.uuid}`)
          }
        }
      }
// REPLACE WITH:
      if (stagingTrainings.length > 0) {
        const trainingPayloads = stagingTrainings.map(t => ({
          uuid: t.uuid,
          title: t.title,
          description: t.description,
          content: t.content,
          index: t.index,
          is_grand_assessment: t.is_grand_assessment,
          course: prodCourseId,
          is_active: t.is_active ?? true,
          status: "OnProd",
          media_asset: t.media_asset?.id ? (assetIdMap[t.media_asset.id] ?? null) : null,
          tags: t.tags ?? [],
        }))

        console.log(`[Step 2] POSTing ${trainingPayloads.length} trainings`)
        const trainRes = await pc.post("/api/v1/internal/trainings/", trainingPayloads)
        const resolvedMap = throwOnConflicts(trainRes.data, "Trainings")
        Object.assign(trainingUuidToIdMap, resolvedMap)
        console.log(`[Step 2] ✓ Resolved ${Object.keys(resolvedMap).length} training IDs from response`)
      }
```

- [ ] **Step 3: `uploadToProd` Step 3 — add conflict check after question POST**

Find lines 234–238 (the question bulk POST block):

```typescript
        if (questionPayloads.length > 0) {
          console.log(`[Step 3] POSTing ${questionPayloads.length} training questions`)
          await pc.post("/api/v1/internal/training_question/", questionPayloads)
          console.log(`[Step 3] ✓ Done`)
        }
```

Replace with:

```typescript
        if (questionPayloads.length > 0) {
          console.log(`[Step 3] POSTing ${questionPayloads.length} training questions`)
          const qRes = await pc.post("/api/v1/internal/training_question/", questionPayloads)
          throwOnConflicts(qRes.data, "Training questions")
          console.log(`[Step 3] ✓ Done`)
        }
```

- [ ] **Step 4: `syncToProd` Step 2 — replace per-UUID GET + PATCH/POST split**

Find and replace lines 346–401 (the parallel GET lookups + split PATCH/POST block):

```typescript
// REMOVE everything from:
      console.log(`[Step 2] Fetching ${stagingTrainings.length} prod trainings by UUID (parallel)`)
      const prodTrainingLookups = await Promise.all(
        stagingTrainings.map(t =>
          pc.get(`/api/v1/trainings/?uuid=${t.uuid}&limit=1`)
            .then(r => ensureArray(r.data)[0] ?? null)
            .catch(() => null)
        )
      )

      const createTrainingPayload: any[] = []
      const updateTrainingPayload: Array<{ id: number; payload: any }> = []

      for (let i = 0; i < stagingTrainings.length; i++) {
        ...
        if (prodT) {
          ...updateTrainingPayload.push(...)
        } else {
          createTrainingPayload.push(payload)
        }
      }

      // PATCH existing trainings
      for (const { id, payload } of updateTrainingPayload) {
        await pc.patch(`/api/v1/internal/trainings/${id}/`, payload)
      }

      // POST new trainings, then fetch IDs...
      if (createTrainingPayload.length > 0) {
        await pc.post("/api/v1/internal/trainings/", createTrainingPayload)
        for (const payload of createTrainingPayload) {
          const res = await pc.get(`/api/v1/trainings/?uuid=${payload.uuid}&limit=1&is_active=True`)
          const prodT = ensureArray(res.data)[0]
          if (prodT?.id) {
            trainingUuidToIdMap[payload.uuid] = prodT.id
            ...
          }
        }
      }
// REPLACE WITH:
      if (stagingTrainings.length > 0) {
        const trainingPayloads = stagingTrainings.map(st => ({
          uuid: st.uuid,
          title: st.title,
          description: st.description,
          content: st.content,
          index: st.index,
          is_grand_assessment: st.is_grand_assessment,
          course: prodCourseId,
          is_active: st.is_active ?? true,
          status: "OnProd",
          media_asset: st.media_asset?.id ? (assetIdMap[st.media_asset.id] ?? null) : null,
          tags: st.tags ?? [],
        }))

        console.log(`[Step 2] POSTing ${trainingPayloads.length} trainings (upsert by uuid)`)
        const trainRes = await pc.post("/api/v1/internal/trainings/", trainingPayloads)
        const resolvedMap = throwOnConflicts(trainRes.data, "Trainings")
        Object.assign(trainingUuidToIdMap, resolvedMap)
        console.log(`[Step 2] ✓ Resolved ${Object.keys(resolvedMap).length} training IDs`)
      }
```

- [ ] **Step 5: `syncToProd` Step 3 — replace pre-fetch + PATCH/POST split**

Find and replace lines 404–461 (the question pre-fetch + split):

```typescript
// REMOVE everything from:
      const trainingIdsForQs = Object.values(trainingUuidToIdMap)
      let existingProdQuestions: any[] = []
      if (trainingIdsForQs.length > 0) {
        const res = await pc.get(`/api/v1/training_questions/?training_ids=...`)
        existingProdQuestions = ensureArray(res.data)
        ...
      }

      const prodQByUuid = ...
      const createQPayload: any[] = []
      const updateQPayload: ...

      for (const q of stagingQuestions) {
        ...
        if (existingQ) {
          updateQPayload.push(...)
        } else {
          createQPayload.push(qPayload)
        }
      }

      if (createQPayload.length > 0) {
        await pc.post("/api/v1/internal/training_question/", createQPayload)
      }
      for (const { id, payload } of updateQPayload) {
        await pc.patch(`/api/v1/internal/training_question/${id}/`, payload)...
      }
// REPLACE WITH:
      const qPayloads: any[] = []
      for (const q of stagingQuestions) {
        if (!q.training) { console.warn(`[Step 3] SKIP ${q.uuid}: no training`); continue }
        const tUuid = stagingTrainingUuidById[q.training]
        if (!tUuid) { console.warn(`[Step 3] SKIP ${q.uuid}: training ID ${q.training} not in map`); continue }
        const prodTrainingId = trainingUuidToIdMap[tUuid]
        if (!prodTrainingId) { console.warn(`[Step 3] SKIP ${q.uuid}: training UUID ${tUuid} not resolved`); continue }
        qPayloads.push({
          uuid: q.uuid,
          index: q.index,
          type: q.type,
          question_statement: q.question_statement,
          options: q.options,
          answers: q.answers,
          hints: q.hints,
          bloom_level: q.bloom_level,
          statement_media_asset: q.statement_media_asset_id ? (assetIdMap[q.statement_media_asset_id] ?? null) : null,
          is_active: q.is_active ?? true,
          status: "OnProd",
          training: prodTrainingId,
          grand_quiz: null,
        })
      }

      if (qPayloads.length > 0) {
        console.log(`[Step 3] POSTing ${qPayloads.length} training questions (upsert by uuid)`)
        const qRes = await pc.post("/api/v1/internal/training_question/", qPayloads)
        throwOnConflicts(qRes.data, "Training questions")
        console.log(`[Step 3] ✓ Done`)
      }
```

- [ ] **Step 6: `syncGrandQuizzes` Step 4 — replace CMS natural-key fallback + PATCH/POST split**

Find and replace lines 501–546 (the GQ pre-fetch + CMS fallback + split):

```typescript
// REMOVE everything from:
    if (stagingGqs.length > 0) {
      const existingProdGqs = ensureArray(
        (await pc.get(`/api/v1/grand_quizzes/?level=${selectedLevel?.id}&limit=1000`)).data
      )
      const prodGqByUuid = Object.fromEntries(existingProdGqs.map(gq => [gq.uuid, gq]))

      const createGqPayload: any[] = []
      const updateGqPayload: ...

      for (const gq of stagingGqs) {
        const byUuid = prodGqByUuid[gq.uuid]
        if (byUuid) {
          ...updateGqPayload.push(...)
        } else {
          const byLevelType = existingProdGqs.find(pg => pg.level === gq.level && pg.type === gq.type)
          if (byLevelType) {
            ...updateGqPayload.push(...)
          } else {
            createGqPayload.push(gqPayload)
          }
        }
      }

      if (createGqPayload.length > 0) {
        const res = await pc.post("/api/v1/internal/grand_quizzes/", createGqPayload)
        for (const gq of ensureArray(res.data)) {
          if (gq.uuid) gqUuidToIdMap[gq.uuid] = gq.id
        }
      }
      for (const { id, payload } of updateGqPayload) {
        await pc.patch(`/api/v1/internal/grand_quizzes/${id}/`, payload)...
      }
    }
// REPLACE WITH:
    if (stagingGqs.length > 0) {
      const gqPayloads = stagingGqs.map(gq => ({
        uuid: gq.uuid,
        title: gq.title,
        description: gq.description,
        instructions: gq.instructions,
        type: gq.type,
        level: gq.level,
        is_active: gq.is_active ?? true,
        status: "OnProd",
      }))

      console.log(`[Step 4] POSTing ${gqPayloads.length} grand quizzes (upsert by uuid)`)
      const gqRes = await pc.post("/api/v1/internal/grand_quizzes/", gqPayloads)
      const resolvedMap = throwOnConflicts(gqRes.data, "Grand quizzes")
      Object.assign(gqUuidToIdMap, resolvedMap)
      console.log(`[Step 4] ✓ Resolved ${Object.keys(resolvedMap).length} grand quiz IDs`)
    }
```

- [ ] **Step 7: `syncGrandQuizzes` Step 5 — replace GQQ pre-fetch + PATCH/POST split**

Find and replace lines 550–597 (the GQQ pre-fetch + split):

```typescript
// REMOVE everything from:
    if (stagingGqQuestions.length > 0) {
      const gqIds = Object.values(gqUuidToIdMap)
      let existingProdGqQs: any[] = []
      if (gqIds.length > 0) {
        existingProdGqQs = ensureArray(
          (await pc.get(`/api/v1/training_questions/?grand_quiz_ids=${gqIds.join(",")}&limit=10000`)).data
        )
      }
      const prodGqQByUuid = ...
      const createGqQPayload: any[] = []
      const updateGqQPayload: ...

      for (const q of stagingGqQuestions) {
        ...
        if (existing) {
          updateGqQPayload.push(...)
        } else {
          createGqQPayload.push(qPayload)
        }
      }

      if (createGqQPayload.length > 0) {
        await pc.post("/api/v1/internal/training_question/", createGqQPayload)
      }
      for (const { id, payload } of updateGqQPayload) {
        await pc.patch(`/api/v1/internal/training_question/${id}/`, payload)...
      }
    }
// REPLACE WITH:
    if (stagingGqQuestions.length > 0) {
      const gqqPayloads: any[] = []
      for (const q of stagingGqQuestions) {
        if (!q.grand_quiz) continue
        const gqUuid = stagingGqUuidById[q.grand_quiz]
        if (!gqUuid) continue
        const prodGqId = gqUuidToIdMap[gqUuid]
        if (!prodGqId) { console.warn(`[Step 5] SKIP ${q.uuid}: GQ not resolved`); continue }
        gqqPayloads.push({
          uuid: q.uuid,
          index: q.index,
          type: q.type,
          question_statement: q.question_statement,
          options: q.options,
          answers: q.answers,
          hints: q.hints,
          bloom_level: q.bloom_level,
          statement_media_asset: q.statement_media_asset_id ? (assetIdMap[q.statement_media_asset_id] ?? null) : null,
          is_active: q.is_active ?? true,
          status: "OnProd",
          training: null,
          grand_quiz: prodGqId,
        })
      }

      if (gqqPayloads.length > 0) {
        console.log(`[Step 5] POSTing ${gqqPayloads.length} grand quiz questions (upsert by uuid)`)
        const gqqRes = await pc.post("/api/v1/internal/training_question/", gqqPayloads)
        throwOnConflicts(gqqRes.data, "Grand quiz questions")
        console.log(`[Step 5] ✓ Done`)
      }
    }
```

- [ ] **Step 8: Add conflict UI panel to JSX return**

Find the opening `<div>` of the return block (line ~601):

```typescript
  return (
    <div>
      {/* ── Filters ── */}
```

Replace with:

```typescript
  return (
    <div>
      {/* ── Conflict panel ── */}
      {syncConflicts.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-800 mb-1">
            Push blocked — {syncConflicts.length} conflict{syncConflicts.length > 1 ? "s" : ""} must be resolved
          </h3>
          <p className="text-sm text-red-700 mb-3">
            Each item below matched multiple prod rows. Deactivate the unwanted prod row in Django admin, then retry.
          </p>
          <ul className="space-y-2">
            {syncConflicts.map(c => (
              <li key={c.uuid} className="text-sm bg-white rounded border border-red-100 p-3">
                <p className="font-mono text-xs text-slate-500 mb-1">{c.uuid}</p>
                <p className="text-red-700 font-medium">{c.reason}</p>
                <p className="text-xs text-slate-600 mt-1">
                  Natural key: <code>{JSON.stringify(c.natural_key)}</code>
                </p>
                <p className="text-xs text-slate-600">
                  Conflicting prod IDs: {c.candidate_ids.join(", ")}
                </p>
              </li>
            ))}
          </ul>
          <button
            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
            onClick={() => setSyncConflicts([])}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filters ── */}
```

- [ ] **Step 9: TypeScript check**

```bash
cd /home/oye/Documents/free_work/repos/taleemabad-cms
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 10: Commit**

```bash
git add src/components/training/ReviewUpload.tsx
git commit -m "feat(cms): uuid-native sync — read resolved from bulk endpoints, conflict gate + UI"
```

---

### Task 3: Smoke test (manual — no automated integration tests exist)

**Files:** No changes.

- [ ] **Step 1: Run the dev server**

```bash
cd /home/oye/Documents/free_work/repos/taleemabad-cms
npm run dev
```

- [ ] **Step 2: Test upload flow (first push)**

1. Open `/training/review`, select a vendor + level.
2. Pick a course with status `ReadyForReview`.
3. Click **Upload to Prod**.
4. In the browser devtools Network tab, observe the training POST response — confirm it has `{resolved:[...], conflicts:[]}` shape (or legacy array if BE not yet merged).
5. Confirm the progress steps show ✓ for each step with no GET requests to `/api/v1/trainings/?uuid=...&is_active=True` (the old ID-resolution GETs are gone).
6. Confirm the course ends up on prod with correct content.

- [ ] **Step 3: Test sync flow (second push of same course)**

1. Change a training title on stage.
2. Click **Sync Changes to Prod** on the same course.
3. Confirm the old parallel GET requests for each training UUID are gone from the Network tab.
4. Confirm the updated title appears on prod.
5. Confirm no duplicate training is created.

- [ ] **Step 4: Test conflict UI**

To test without a real conflict: temporarily add `setSyncConflicts([{ uuid: "test-uuid", natural_key: { title: "Test" }, candidate_ids: [1, 2], reason: "matched 2 rows" }])` at the top of `uploadToProd`, trigger a push, confirm the red panel renders, then revert.

- [ ] **Step 5: Final commit and push**

```bash
cd /home/oye/Documents/free_work/repos/taleemabad-cms
git add docs/
git commit -m "docs: add uuid-sync implementation plan"
git push origin master
```
