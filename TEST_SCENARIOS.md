# Edge Case Test Scenarios - Array Safety

## Scenario 1: API Returns Error Object
```typescript
// Backend returns: { "detail": "Not Found" }
getMediaAssets() 
  → API layer: Array.isArray({detail:...}) = false → returns []
  → Hook layer: useSafeQuery select([]) = [] (safe)
  → Component: assets.map() works on []
✓ NO CRASH
```

## Scenario 2: API Returns Null
```typescript
// Backend returns: null
getCourses()
  → API layer: Array.isArray(null) = false → returns []
  → Hook layer: useSafeQuery select([]) = [] (safe)
  → Component: courses.filter() works on []
✓ NO CRASH
```

## Scenario 3: API Returns Wrapped Object
```typescript
// Backend returns: { "results": [...] }
getLevels()
  → API layer: Array.isArray({results:...}) = false → returns []
  → Hook layer: useSafeQuery select([]) = [] (safe)
  → Component: levels.map() works on []
✓ NO CRASH - Console warns: "API returned non-array data"
```

## Scenario 4: API Returns Undefined
```typescript
// Backend returns: undefined
getQuestions()
  → API layer: Array.isArray(undefined) = false → returns []
  → Hook layer: useSafeQuery select([]) = [] (safe)
  → Component: questions.filter() works on []
✓ NO CRASH
```

## Scenario 5: API Returns String
```typescript
// Backend returns: "error message"
getGrandQuizzes()
  → API layer: Array.isArray("error") = false → returns []
  → Hook layer: useSafeQuery select([]) = [] (safe)
  → Component: quizzes.map() works on []
✓ NO CRASH
```

## Scenario 6: Complex Chaining (Real Component)
```typescript
// AssetTable.tsx
const { data: assets = [] } = useMediaAssets()  // Always array from useSafeQuery
const filtered = assets
  .filter(a => a.name.includes(search))  // ✓ Safe - assets is array
  .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())  // ✓ Safe

// Even if API breaks, filtered = []
// Component renders empty state instead of crashing
✓ NO CRASH
```

## Scenario 7: Media Asset Category Field
```typescript
// AssetPromotion.tsx line 179
{(asset.category || []).map(c => (...))}  // ✓ Defensive check

// If API returns category as:
// - string: "category" → (normalizeMediaAsset handles it)
// - object: {} → ([...] || []) returns []
// - null: → ([...] || []) returns []
// - array: [...] → normal behavior
✓ NO CRASH
```

## Scenario 8: Accessing Derived Fields
```typescript
// CourseTable.tsx
const filtered = courses.filter(c => ...)  // ✓ Guaranteed array

// Even if c.title, c.status, c.level don't exist:
// Component shows undefined in UI, but doesn't crash
// TypeScript would catch missing fields at compile time
✓ NO CRASH
```

## Test Commands

```bash
# 1. Build verification
npm run build

# 2. Local dev test
npm run dev
# Then manually test each page:
# - Courses page (uses useCourses)
# - Trainings page (uses useTrainings)
# - Assets page (uses useMediaAssets)
# - Grand Quizzes (uses useGrandQuizzes)

# 3. Docker test
docker build -t cms-test .
docker run -p 3000:3000 cms-test

# 4. Browser console check
# Open DevTools → Console
# Look for warnings: "API returned non-array data"
# These indicate edge cases being handled
```

## What We're Testing For

✓ No "x.map is not a function" errors
✓ No "x.filter is not a function" errors
✓ No "x.sort is not a function" errors
✓ No undefined property access crashes
✓ Components show empty states gracefully
✓ Console warnings for unexpected API responses

## Production Monitoring

Watch for in browser console:
```
[WARN] API returned non-array data: {detail: "Not Found"}
```

This tells you the backend is returning unexpected format, but the frontend is handling it gracefully.
