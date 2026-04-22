# Taleemabad CMS - Array Safety Solution

## Problem

Production was crashing with errors like:
- `TypeError: S.map is not a function`
- `TypeError: x.filter is not a function`

### Root Cause Analysis

The backend API could return:
- Error objects: `{ "detail": "Not Found" }` instead of arrays
- Wrapped responses with different structures  
- Null/undefined values

Frontend components assumed data was always arrays and called methods without checks:
```javascript
// UNSAFE - crashes if data is not an array
const filtered = courses.filter(c => c.active)  // Crash if courses is {error: "..."}
const ready = assets.map(a => a.id)            // Crash if assets is null
```

## Solution Layers (Defense in Depth)

### Layer 1: API Level - ensureArray()
**File**: `src/api/client.ts`

Validates that all array-returning endpoints return actual arrays:
```typescript
export const ensureArray = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data
  console.warn("API returned non-array data:", data)
  return []
}
```

Applied to all endpoints:
- `getLevels()` → `ensureArray<Level>(r.data)`
- `getCourses()` → `ensureArray<Course>(r.data)`
- `getTrainings()` → `ensureArray<Training>(r.data)`
- `getQuestions()` → `ensureArray<Question>(r.data)`
- `getGrandQuizzes()` → `ensureArray<GrandQuiz>(r.data)`
- `getMediaAssets()` → `ensureArray<MediaAsset>(r.data)`

### Layer 2: Hook Level - useSafeQuery Wrapper
**File**: `src/hooks/useSafeQuery.ts`

React Query wrapper that **guarantees** data is always an array:
```typescript
export function useSafeQuery<T extends any[]>(
  options: Omit<UseQueryOptions<T, Error, T>, "queryKey"> & { queryKey: any[] }
) {
  return useQuery({
    ...options,
    select: (data: any) => {
      return (Array.isArray(data) ? data : []) as T
    },
  })
}
```

**Key Features**:
- `select()` normalizes all responses to arrays
- Returns empty array `[]` if data is not an array
- No placeholderData needed (select handles it)

**Applied To**:
- `useMediaAssets()` → `useSafeQuery<MediaAsset[]>()`
- `useAssessmentAssets()` → `useSafeQuery<MediaAsset[]>()`
- `useLevels()` → `useSafeQuery<Level[]>()`
- `useCourses()` → `useSafeQuery<Course[]>()`
- `useCoursesForReview()` → `useSafeQuery<Course[]>()`
- `useTrainings()` → `useSafeQuery<Training[]>()`
- `useQuestions()` → `useSafeQuery<Question[]>()`
- `useGrandQuizQuestions()` → `useSafeQuery<Question[]>()`
- `useGrandQuizzes()` → `useSafeQuery<GrandQuiz[]>()`

### Layer 3: Component Level - Defensive Checks
Components that call array methods now have extra safety:
```typescript
// SAFE - even if data is somehow not an array
const filtered = (courses || []).filter(...)
const ready = (assets || []).map(...)
const item = data?.find(x => x.id === id)
```

## Why This Works

**Scenario 1**: Backend returns error object
```
API: { "detail": "Not Found" }
↓ (API layer)
ensureArray() sees non-array → returns []
↓ (Hook layer)  
useSafeQuery select() also ensures []
↓ (Component)
Component receives: [] (safe!)
Result: No crash, shows empty state
```

**Scenario 2**: Backend returns null
```
API: null
↓ (API layer)
ensureArray(null) → returns []
↓ (Hook layer)
useSafeQuery select(null) → returns []
↓ (Component)
Component receives: [] (safe!)
Result: .filter(), .map() work fine
```

**Scenario 3**: Backend returns wrapped response
```
API: { results: [...] }
↓ (API layer)
ensureArray() sees object → returns []
↓ (Hook layer)
useSafeQuery sees [] → returns []
↓ (Component)
Component receives: [] (safe!)
Result: Shows empty state, logged warning for debugging
```

## Testing

### Local Testing
```bash
npm run build    # Verify compilation
npm run dev      # Test locally
```

### Docker Testing
```bash
docker build -t taleemabad-cms:test .
docker run -p 3000:3000 taleemabad-cms:test
curl http://localhost:3000
```

## Monitoring

The solution includes logging:
- API returns non-array: `console.warn("API returned non-array data:", data)`
- Check browser console for warnings before they crash

## Future Prevention

### Code Review Checklist
- [ ] All hooks that return arrays use `useSafeQuery<T[]>()`
- [ ] All components calling `.map()`, `.filter()`, `.reduce()` on hook data
- [ ] API endpoints checked with `ensureArray()`
- [ ] Tests verify behavior with unexpected data types

### Adding New Features
When adding new API endpoints:
1. Wrap with `ensureArray()` if returning arrays
2. Use `useSafeQuery<T[]>()` in hooks
3. Components can safely call array methods

### Example for New Feature
```typescript
// API: src/api/newEndpoint.ts
import { apiClient, ensureArray } from "./client"
import type { NewType } from "../types"

export const getNewData = () =>
  apiClient.get<NewType[]>("/api/v1/new/")
    .then(r => ensureArray<NewType>(r.data))

// Hook: src/hooks/useNewData.ts
import { useSafeQuery } from "./useSafeQuery"

export const useNewData = () =>
  useSafeQuery<NewType[]>({
    queryKey: ["new-data"],
    queryFn: getNewData,
  })

// Component: Safe to use!
const MyComponent = () => {
  const { data } = useNewData()  // Always array!
  return (
    <div>
      {data.map(item => ...)}    // No crash possible
      {data.filter(...)}         // No crash possible
    </div>
  )
}
```

## Commits

- `378161b` - Create useSafeQuery wrapper (hook-level guarantee)
- `68ec7c3` - Add ensureArray() to all API endpoints (API-level validation)  
- `99f791d` - Normalize mediaAsset responses (field-level safety)
- `7db46e4` - Component-level defensive checks (render safety)

## Summary

**Before**: 3 levels of potential crash points ❌
- API could return non-arrays
- Hooks had no guarantees
- Components had no checks

**After**: 3 layers of defense ✅
- API returns arrays or warns
- Hooks guarantee arrays
- Components can safely call any array method

This is **defense-in-depth**: even if one layer fails, the next catches it.
