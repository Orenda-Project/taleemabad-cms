import { useState, useEffect, useRef } from "react"
import { useCoursesForReview } from "../../hooks/useCourses"
import { useLevels } from "../../hooks/useLevels"
import { useOrgStore } from "../../store/orgStore"
import { prodClient } from "../../api/client"
import { getTrainings } from "../../api/trainings"
import { getBulkQuestions, getBulkGrandQuizQuestions } from "../../api/questions"
import { getGrandQuizzes } from "../../api/grandQuizzes"
import { getMediaAssets } from "../../api/mediaAssets"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Skeleton } from "../ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { statusColor, cn } from "../../lib/utils"
import { updateCourse } from "../../api/courses"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "../../hooks/use-toast"
import type { Level } from "../../types"
import { parseBulkResponse, buildUuidIdMap } from "../../api/retool"
import type { ConflictItem } from "../../api/retool"

const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data?.results && Array.isArray(data.results)) return data.results
  return []
}

const VENDORS = [
  { value: "TALEEMABAD", label: "Taleemabad" },
  { value: "BEACONHOUSE", label: "Beaconhouse" },
  { value: "OXBRIDGE", label: "Oxbridge" },
  { value: "NIETE", label: "NIETE" },
]

const STATUS_FILTERS = ["All", "ReadyForReview", "Draft", "EditsRequired", "OnProd"] as const

const STEPS = [
  "Resolving assets on prod",
  "Creating course on prod",
  "Uploading trainings",
  "Uploading training questions",
  "Uploading grand quizzes",
  "Uploading grand quiz questions",
  "Marking stage as OnProd",
]

type StepState = "idle" | "pending" | "done" | "error" | "skipped"

export default function ReviewUpload() {
  const [selectedVendor, setSelectedVendor] = useState("TALEEMABAD")
  const [selectedLevel, setSelectedLevel] = useState<Level | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>("ReadyForReview")

  const { data: levels = [], isLoading: levelsLoading } = useLevels(selectedVendor)
  const { data: courses = [], isLoading } = useCoursesForReview(
    selectedLevel ? { level: selectedLevel.id } : undefined
  )

  const { selectedOrg } = useOrgStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const currentStepRef = useRef<number>(-1)

  const [uploading, setUploading] = useState<number | null>(null)
  const [steps, setSteps] = useState<StepState[]>(Array(STEPS.length).fill("idle") as StepState[])
  const [syncConflicts, setSyncConflicts] = useState<ConflictItem[]>([])

  useEffect(() => {
    setSelectedLevel(levels.length > 0 ? levels[0] : undefined)
  }, [levels])

  const filtered = courses.filter(c =>
    statusFilter === "All" ? true : c.status === statusFilter
  )

  function setStep(i: number, state: StepState) {
    currentStepRef.current = i
    setSteps(prev => {
      const next = [...prev]
      next[i] = state
      return next
    })
  }

  function throwOnConflicts(data: unknown, label: string): Record<string, number> {
    const { resolved, conflicts } = parseBulkResponse(data)
    if (conflicts.length > 0) {
      setSyncConflicts(conflicts)
      throw new Error(`${label}: ${conflicts.length} item(s) blocked — see conflicts above`)
    }
    return buildUuidIdMap(resolved)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FLOW 1: Upload to Prod
  // For courses being pushed to prod for the first time (status != "OnProd").
  // ─────────────────────────────────────────────────────────────────────────
  async function uploadToProd(course: (typeof courses)[0]) {
    if (!selectedOrg) return
    const pc = prodClient(selectedOrg.prod_url)
    setUploading(course.id)
    setSteps(Array(STEPS.length).fill("idle") as StepState[])
    setSyncConflicts([])
    currentStepRef.current = -1

    try {
      // ── Step 0: Resolve assets ──────────────────────────────────────────
      setStep(0, "pending")
      const stagingTrainings = await getTrainings(course.uuid)
      const stagingQuestions = await getBulkQuestions(stagingTrainings.map(t => t.id), [])
      const stagingGqs = await getGrandQuizzes(course.level)
      const stagingGqQuestions = await getBulkGrandQuizQuestions(stagingGqs.map(gq => gq.id))

      const assetIds = new Set<number>()
      stagingTrainings.forEach(t => { if (t.media_asset?.id) assetIds.add(t.media_asset.id) })
      stagingQuestions.forEach(q => { if (q.statement_media_asset_id) assetIds.add(q.statement_media_asset_id) })
      stagingGqQuestions.forEach(q => { if (q.statement_media_asset_id) assetIds.add(q.statement_media_asset_id) })

      const assetIdMap: Record<number, number> = {}
      if (assetIds.size > 0) {
        const stagingAssets = await getMediaAssets()
        const stagingAssetList = stagingAssets.filter(a => assetIds.has(a.id))
        const uuids = stagingAssetList.map(a => a.uuid).join(",")
        const prodAssets = await pc.get<{ id: number; uuid: string }[]>(
          `/api/v1/media_assets/?uuid=${uuids}`
        ).then(r => r.data)
        const prodAssetByUuid = Object.fromEntries(prodAssets.map(a => [a.uuid, a.id]))
        for (const sa of stagingAssetList) {
          if (prodAssetByUuid[sa.uuid]) assetIdMap[sa.id] = prodAssetByUuid[sa.uuid]
        }
      }
      setStep(0, "done")

      // ── Step 1: Create course on prod ───────────────────────────────────
      // Check by UUID first so re-uploads are idempotent (PATCH instead of POST).
      setStep(1, "pending")
      const coursePayload = {
        uuid: course.uuid,
        title: course.title,
        description: course.description,
        keywords: course.keywords,
        time_duration: course.time_duration,
        index: course.index,
        thumbnail_url: course.thumbnail_url,
        is_active: course.is_active ?? true,
        status: "OnProd",
        type: course.type,
        level: course.level,
      }

      const [activeRes, inactiveRes] = await Promise.all([
        pc.get(`/api/v1/courses/?uuid=${course.uuid}`),
        pc.get(`/api/v1/courses/?uuid=${course.uuid}&is_active=False`),
      ])
      const existingProdCourse = ensureArray(activeRes.data)[0] ?? ensureArray(inactiveRes.data)[0] ?? null

      let prodCourseId: number
      if (existingProdCourse) {
        prodCourseId = existingProdCourse.id
        console.log(`[Step 1] Course already on prod (ID=${prodCourseId}) — PATCHing`)
        await pc.patch(`/api/v1/internal/courses/${prodCourseId}/`, coursePayload)
      } else {
        console.log(`[Step 1] Course not on prod — POSTing`)
        const res = await pc.post(`/api/v1/internal/courses/`, coursePayload)
        prodCourseId = res.data?.id
        console.log(`[Step 1] ✓ Course created (ID=${prodCourseId})`)
      }
      setStep(1, "done")

      // ── Step 2: Upload trainings ────────────────────────────────────────
      // POST all trainings directly — no per-UUID pre-check.
      // Pre-checking would cache "not found" responses; the post-create ID fetch
      // (Step 2B) uses ?is_active=True to get a different cache key and always
      // hits the DB fresh after creation.
      setStep(2, "pending")
      const trainingUuidToIdMap: Record<string, number> = {}
      const stagingTrainingUuidById: Record<number, string> = Object.fromEntries(
        stagingTrainings.map(t => [t.id, t.uuid])
      )

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
      setStep(2, "done")

      // ── Step 3: Upload training questions ───────────────────────────────
      // POST all questions — nothing exists on prod yet for this course.
      setStep(3, "pending")
      if (stagingQuestions.length > 0) {
        const questionPayloads = stagingQuestions
          .filter(q => {
            if (!q.training) { console.warn(`[Step 3] SKIP question ${q.uuid}: no training`); return false }
            const tUuid = stagingTrainingUuidById[q.training]
            if (!tUuid) { console.warn(`[Step 3] SKIP question ${q.uuid}: training ID ${q.training} not in map`); return false }
            if (!trainingUuidToIdMap[tUuid]) { console.warn(`[Step 3] SKIP question ${q.uuid}: training UUID ${tUuid} not resolved`); return false }
            return true
          })
          .map(q => ({
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
            training: trainingUuidToIdMap[stagingTrainingUuidById[q.training]],
            grand_quiz: null,
          }))

        if (questionPayloads.length > 0) {
          console.log(`[Step 3] POSTing ${questionPayloads.length} training questions`)
          const qRes = await pc.post("/api/v1/internal/training_question/", questionPayloads)
          throwOnConflicts(qRes.data, "Training questions")
          console.log(`[Step 3] ✓ Done`)
        }
      }
      setStep(3, "done")

      // ── Steps 4-5: Grand quizzes + questions ────────────────────────────
      await syncGrandQuizzes(pc, course, stagingGqs, stagingGqQuestions, assetIdMap, setStep)

      // ── Step 6: Mark stage as OnProd ────────────────────────────────────
      setStep(6, "pending")
      await updateCourse(course.id, { status: "OnProd" })
      setStep(6, "done")

      qc.invalidateQueries({ queryKey: ["courses"] })
      toast({ title: "Uploaded to prod successfully!" })
    } catch (err: any) {
      const failedStep = currentStepRef.current
      if (failedStep >= 0) setStep(failedStep, "error")
      toast({ title: "Upload failed", description: err.response?.data?.message ?? err.message, variant: "destructive" })
    } finally {
      setUploading(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FLOW 2: Sync Changes to Prod
  // For courses already on prod (status == "OnProd").
  // ─────────────────────────────────────────────────────────────────────────
  async function syncToProd(course: (typeof courses)[0]) {
    if (!selectedOrg) return
    const pc = prodClient(selectedOrg.prod_url)
    setUploading(course.id)
    setSteps(Array(STEPS.length).fill("idle") as StepState[])
    setSyncConflicts([])
    currentStepRef.current = -1

    try {
      // ── Step 0: Resolve assets ──────────────────────────────────────────
      setStep(0, "pending")
      const stagingTrainings = await getTrainings(course.uuid)
      const stagingQuestions = await getBulkQuestions(stagingTrainings.map(t => t.id), [])
      const stagingGqs = await getGrandQuizzes(course.level)
      const stagingGqQuestions = await getBulkGrandQuizQuestions(stagingGqs.map(gq => gq.id))

      const assetIds = new Set<number>()
      stagingTrainings.forEach(t => { if (t.media_asset?.id) assetIds.add(t.media_asset.id) })
      stagingQuestions.forEach(q => { if (q.statement_media_asset_id) assetIds.add(q.statement_media_asset_id) })
      stagingGqQuestions.forEach(q => { if (q.statement_media_asset_id) assetIds.add(q.statement_media_asset_id) })

      const assetIdMap: Record<number, number> = {}
      if (assetIds.size > 0) {
        const stagingAssets = await getMediaAssets()
        const stagingAssetList = stagingAssets.filter(a => assetIds.has(a.id))
        const uuids = stagingAssetList.map(a => a.uuid).join(",")
        const prodAssets = await pc.get<{ id: number; uuid: string }[]>(
          `/api/v1/media_assets/?uuid=${uuids}`
        ).then(r => r.data)
        const prodAssetByUuid = Object.fromEntries(prodAssets.map(a => [a.uuid, a.id]))
        for (const sa of stagingAssetList) {
          if (prodAssetByUuid[sa.uuid]) assetIdMap[sa.id] = prodAssetByUuid[sa.uuid]
        }
      }
      setStep(0, "done")

      // ── Step 1: Sync course ─────────────────────────────────────────────
      setStep(1, "pending")
      const coursePayload = {
        uuid: course.uuid,
        title: course.title,
        description: course.description,
        keywords: course.keywords,
        time_duration: course.time_duration,
        index: course.index,
        thumbnail_url: course.thumbnail_url,
        is_active: course.is_active ?? true,
        status: "OnProd",
        type: course.type,
        level: course.level,
      }

      const [activeRes, inactiveRes] = await Promise.all([
        pc.get(`/api/v1/courses/?uuid=${course.uuid}`),
        pc.get(`/api/v1/courses/?uuid=${course.uuid}&is_active=False`),
      ])
      const existingProdCourse = ensureArray(activeRes.data)[0] ?? ensureArray(inactiveRes.data)[0] ?? null

      let prodCourseId: number
      if (existingProdCourse) {
        prodCourseId = existingProdCourse.id
        console.log(`[Step 1] ✓ UUID match → PATCH course ID=${prodCourseId}`)
        await pc.patch(`/api/v1/internal/courses/${prodCourseId}/`, coursePayload)
      } else {
        console.log(`[Step 1] No match — POSTing course`)
        const res = await pc.post(`/api/v1/internal/courses/`, coursePayload)
        prodCourseId = res.data?.id
      }
      setStep(1, "done")

      // ── Step 2: Sync trainings ──────────────────────────────────────────
      // Bulk POST all trainings — backend upserts by uuid (update or create).
      setStep(2, "pending")
      const stagingTrainingUuidById: Record<number, string> = Object.fromEntries(
        stagingTrainings.map(t => [t.id, t.uuid])
      )
      const trainingUuidToIdMap: Record<string, number> = {}

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
      setStep(2, "done")

      // ── Step 3: Sync training questions ─────────────────────────────────
      // Bulk POST all questions — backend upserts by uuid.
      setStep(3, "pending")
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
      setStep(3, "done")

      // ── Steps 4-5: Grand quizzes + questions ────────────────────────────
      await syncGrandQuizzes(pc, course, stagingGqs, stagingGqQuestions, assetIdMap, setStep)

      // ── Step 6: Stay OnProd ─────────────────────────────────────────────
      setStep(6, "pending")
      await updateCourse(course.id, { status: "OnProd" })
      setStep(6, "done")

      qc.invalidateQueries({ queryKey: ["courses"] })
      toast({ title: "Synced to prod successfully!" })
    } catch (err: any) {
      const failedStep = currentStepRef.current
      if (failedStep >= 0) setStep(failedStep, "error")
      toast({ title: "Sync failed", description: err.response?.data?.message ?? err.message, variant: "destructive" })
    } finally {
      setUploading(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED: Sync grand quizzes and their questions (Steps 4-5)
  // Grand quizzes are migration-seeded — UUID may differ between envs.
  // Primary match: UUID. Fallback: (level, type) natural key.
  // ─────────────────────────────────────────────────────────────────────────
  async function syncGrandQuizzes(
    pc: ReturnType<typeof prodClient>,
    course: (typeof courses)[0],
    stagingGqs: any[],
    stagingGqQuestions: any[],
    assetIdMap: Record<number, number>,
    setStepFn: (i: number, s: StepState) => void
  ) {
    setStepFn(4, "pending")
    const stagingGqUuidById: Record<number, string> = Object.fromEntries(
      stagingGqs.map(gq => [gq.id, gq.uuid])
    )
    const gqUuidToIdMap: Record<string, number> = {}

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
    setStepFn(4, "done")

    // ── Step 5: Grand quiz questions ──────────────────────────────────────
    // Bulk POST all GQ questions — backend upserts by uuid.
    setStepFn(5, "pending")
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
    setStepFn(5, "done")
  }

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
      <div className="bg-slate-50 border rounded-lg p-4 mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 w-14 shrink-0">Vendor</span>
          <Select value={selectedVendor} onValueChange={v => { setSelectedVendor(v); setSelectedLevel(undefined) }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VENDORS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-slate-600 w-14 shrink-0 pt-1">Level</span>
          <div className="flex gap-2 flex-wrap">
            {levelsLoading
              ? [1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-24" />)
              : levels.length === 0
              ? <p className="text-sm text-slate-400">No levels for this vendor.</p>
              : levels.map(l => (
                <Button
                  key={l.id} size="sm"
                  variant={selectedLevel?.id === l.id ? "default" : "outline"}
                  onClick={() => setSelectedLevel(l)}
                >
                  {l.name}
                </Button>
              ))
            }
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-slate-600 w-14 shrink-0 pt-1">Status</span>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <Button
                key={s} size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {!selectedLevel ? (
        <p className="text-slate-400 text-sm">Select a level to view courses.</p>
      ) : isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(course => (
                <tr key={course.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{course.title}</td>
                  <td className="px-4 py-2 text-slate-500">{course.type}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(course.status))}>{course.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {uploading === course.id ? (
                      <div className="space-y-1 min-w-64">
                        {STEPS.map((label, i) => {
                          const s = steps[i]
                          const icon = s === "done" ? "✓" : s === "error" ? "✗" : s === "pending" ? "⟳" : s === "skipped" ? "–" : "○"
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className={cn(
                                "font-mono w-3",
                                s === "done" && "text-green-600",
                                s === "error" && "text-red-600",
                                s === "pending" && "text-blue-500 animate-spin inline-block",
                                s === "skipped" && "text-slate-400",
                              )}>{icon}</span>
                              <span className={cn(
                                s === "done" && "text-green-700",
                                s === "error" && "text-red-600 font-medium",
                                s === "pending" && "text-blue-600 font-medium",
                                (!s || s === "idle") && "text-slate-400",
                              )}>{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => course.status === "OnProd" ? syncToProd(course) : uploadToProd(course)}
                        disabled={!!uploading}
                        variant={course.status === "ReadyForReview" ? "default" : "outline"}
                      >
                        {course.status === "OnProd" ? "Sync Changes to Prod" : "Upload to Prod"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No courses found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
