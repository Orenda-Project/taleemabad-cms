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

// Handle both array and paginated responses from API
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

  // Auto-select first level when vendor changes
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

  async function uploadToProd(course: (typeof courses)[0]) {
    if (!selectedOrg) return
    const pc = prodClient(selectedOrg.prod_url)
    setUploading(course.id)
    setSteps(Array(STEPS.length).fill("idle") as StepState[])
    currentStepRef.current = -1

    try {
      // ── Step 0: Resolve assets ────────────────────────────────────────
      // Assets have different IDs on staging vs prod — resolve by UUID
      setStep(0, "pending")
      const stagingTrainingsForAssets = await getTrainings(course.uuid)
      const stagingQuestionsForAssets = await getBulkQuestions(
        stagingTrainingsForAssets.map(t => t.id), []
      )
      const stagingGqsForAssets = await getGrandQuizzes(course.level)
      const stagingGqQuestionsForAssets = await getBulkGrandQuizQuestions(
        stagingGqsForAssets.map(gq => gq.id)
      )

      // Collect all unique staging asset IDs referenced
      const assetIds = new Set<number>()
      stagingTrainingsForAssets.forEach(t => { if (t.media_asset?.id) assetIds.add(t.media_asset.id) })
      stagingQuestionsForAssets.forEach(q => { if (q.statement_media_asset_id) assetIds.add(q.statement_media_asset_id) })
      stagingGqQuestionsForAssets.forEach(q => { if (q.statement_media_asset_id) assetIds.add(q.statement_media_asset_id) })

      // Build staging asset id → prod asset id map via UUID
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

      // ── Step 1: Create or update course on prod ──────────────────
      setStep(1, "pending")
      console.log(`[Step 1] Syncing course: ${course.title}`)

      // Fetch ALL prod courses upfront for batch comparison (not one-by-one)
      const allProdCourses = await pc.get(
        `/api/v1/courses/?limit=1000`
      )
      const allProdCoursesList = ensureArray(allProdCourses.data)
      const prodCourseByUuid = Object.fromEntries(
        allProdCoursesList.map(c => [c.uuid, c])
      )
      console.log(`[Step 1] Prod has ${allProdCoursesList.length} courses`)

      const coursePayload = {
        uuid: course.uuid, title: course.title, description: course.description,
        keywords: course.keywords, time_duration: course.time_duration, index: course.index,
        thumbnail_url: course.thumbnail_url, is_active: course.is_active ?? true, status: "OnProd",
        type: course.type, level: course.level,
      }

      // Check if course with this UUID already exists on prod
      let prodCourseId: number | null = null
      const existingProdCourse = prodCourseByUuid[course.uuid]

      if (existingProdCourse) {
        // Course exists — check if staging is newer before updating
        const stagingTime = new Date((course as any).updated_at || 0).getTime()
        const prodTime = new Date((existingProdCourse as any).updated_at || 0).getTime()

        if (stagingTime > prodTime) {
          // Staging is newer → UPDATE
          prodCourseId = existingProdCourse.id
          console.log(`[Step 1] Course UUID ${course.uuid} changed on staging - updating on prod (ID: ${prodCourseId})`)
          await pc.patch(`/api/v1/internal/courses/${prodCourseId}/`, coursePayload)
          console.log(`[Step 1] Course updated: ${course.uuid}`)
        } else {
          // Prod is newer or equal → SKIP
          prodCourseId = existingProdCourse.id
          console.log(`[Step 1] Course UUID ${course.uuid} already synced, skipping update`)
        }
      } else {
        // Course doesn't exist on prod → CREATE
        console.log(`[Step 1] Course UUID ${course.uuid} not found on prod - creating new`)
        const createRes = await pc.post("/api/v1/internal/courses/", coursePayload)
        prodCourseId = createRes.data?.id
        console.log(`[Step 1] Course created: ${course.uuid} (ID: ${prodCourseId})`)
      }

      setStep(1, "done")

      // ── Step 2: Upload trainings ──────────────────────────────────────
      setStep(2, "pending")
      const trainings = stagingTrainingsForAssets
      console.log(`[Step 2] Found ${trainings.length} trainings to upload`)

      // Check which trainings already exist (scoped to this course by UUID)
      const existingProdTrainings = await pc.get(
        `/api/v1/trainings/?course__uuid=${course.uuid}&limit=1000`
      )
      const existingTrainingsList = ensureArray(existingProdTrainings.data)
      const existingUuids = new Set(existingTrainingsList.map(t => t.uuid))
      console.log(`[Step 2] Found ${existingUuids.size} existing trainings on prod`)

      // Build map of prod trainings by UUID (with numeric IDs)
      const prodTrainingByUuid = Object.fromEntries(
        existingTrainingsList.map(t => [t.uuid, t])
      )

      // Build UUID map: staging training id → uuid (for use in questions step)
      const stagingTrainingUuidById: Record<number, string> = Object.fromEntries(
        trainings.map(t => [t.id, t.uuid])
      )

      // Build ID map: UUID → numeric ID (for PATCH operations)
      const trainingUuidToIdMap: Record<string, number> = Object.fromEntries(
        existingTrainingsList.map(t => [t.uuid, t.id])
      )

      // Separate into create vs update payloads
      const createTrainingPayload: any[] = []
      const updateTrainingPayload: Array<{ uuid: string; id?: number; payload: any }> = []

      for (const t of trainings) {
        const trainingPayload = {
          uuid: t.uuid, title: t.title, description: t.description,
          content: t.content, index: t.index, is_grand_assessment: t.is_grand_assessment,
          course: course.uuid,
          is_active: t.is_active ?? true, status: "OnProd",
          media_asset: t.media_asset?.id ? (assetIdMap[t.media_asset.id] ?? null) : null,
          tags: t.tags ?? [],
        }

        const existingProdT = prodTrainingByUuid[t.uuid]
        if (existingProdT) {
          // Check if staging is newer
          const stagingTime = new Date((t as any).updated_at || 0).getTime()
          const prodTime = new Date((existingProdT as any).updated_at || 0).getTime()
          if (stagingTime > prodTime) {
            console.log(`[Step 2] Training UUID ${t.uuid} changed on staging - will update on prod (ID: ${existingProdT.id})`)
            updateTrainingPayload.push({ uuid: t.uuid, id: existingProdT.id, payload: trainingPayload })
          } else {
            console.log(`[Step 2] Training UUID ${t.uuid} already synced`)
          }
        } else {
          createTrainingPayload.push(trainingPayload)
        }
      }

      if (createTrainingPayload.length > 0) {
        console.log(`[Step 2] Creating ${createTrainingPayload.length} new trainings on prod...`)
        const createRes = await pc.post("/api/v1/internal/trainings/", createTrainingPayload)
        const createdTrainings = ensureArray(createRes.data)
        for (const t of createdTrainings) {
          if (t.uuid) trainingUuidToIdMap[t.uuid] = t.id
        }
        console.log(`[Step 2] Created trainings mapped: ${JSON.stringify(createdTrainings)}`)
      } else {
        console.log(`[Step 2] No new trainings to create`)
      }

      if (updateTrainingPayload.length > 0) {
        console.log(`[Step 2] Updating ${updateTrainingPayload.length} trainings on prod...`)
        for (const { uuid, id, payload } of updateTrainingPayload) {
          try {
            await pc.patch(`/api/v1/internal/trainings/${id}/`, payload)
            console.log(`[Step 2] Updated training UUID ${uuid} (ID: ${id})`)
          } catch (err: any) {
            console.warn(`[Step 2] Failed to update training ${uuid}:`, err.message)
          }
        }
        console.log(`[Step 2] Successfully updated ${updateTrainingPayload.length} trainings`)
      } else {
        console.log(`[Step 2] No trainings to update`)
      }

      setStep(2, "done")

      // ── Step 3: Upload training questions ────────────────────────────
      setStep(3, "pending")
      const trainingQuestions = stagingQuestionsForAssets
      console.log(`[Step 3] Found ${trainingQuestions.length} training questions to upload`)

      if (trainingQuestions.length > 0) {
        // Build training ID list for filtered query (numeric IDs only)
        const trainingIdsForQs = Object.values(trainingUuidToIdMap)

        // Fetch existing prod questions (scoped by numeric training IDs)
        let existingProdQuestions: any[] = []
        if (trainingIdsForQs.length > 0) {
          const trainingIdsStr = trainingIdsForQs.join(",")
          const response = await pc.get(
            `/api/v1/training_questions/?training_ids=${trainingIdsStr}&limit=10000`
          )
          existingProdQuestions = ensureArray(response.data)
        }
        console.log(`[Step 3] Found ${existingProdQuestions.length} existing questions on prod`)

        // Build map of prod questions by UUID for comparison
        const prodQByUuid = Object.fromEntries(
          existingProdQuestions.map(q => [q.uuid, q])
        )

        // Separate into create vs update payloads
        const createQPayload: any[] = []
        const updateQPayload: Array<{ uuid: string; id?: number; payload: any }> = []

        for (const q of trainingQuestions) {
          // Only sync questions that have a training relationship
          if (!q.training) {
            console.warn(`[Step 3] Skipping question UUID ${q.uuid}: No training relationship on staging (orphaned question).`)
            continue
          }

          const trainingUuid = stagingTrainingUuidById[q.training]
          if (!trainingUuid) {
            console.warn(`[Step 3] Skipping question UUID ${q.uuid}: Training UUID not found for ID ${q.training}.`)
            continue
          }

          const prodTrainingId = trainingUuidToIdMap[trainingUuid]
          if (!prodTrainingId) {
            console.warn(`[Step 3] Skipping question UUID ${q.uuid}: Training ID not found in map for UUID ${trainingUuid}.`)
            continue
          }

          const questionPayload = {
            uuid: q.uuid, index: q.index,
            type: q.type, question_statement: q.question_statement,
            options: q.options, answers: q.answers, hints: q.hints,
            bloom_level: q.bloom_level,
            statement_media_asset: q.statement_media_asset_id
              ? (assetIdMap[q.statement_media_asset_id] ?? null)
              : null,
            is_active: q.is_active ?? true, status: "OnProd",
            training: prodTrainingId,
            grand_quiz: null,
          }

          const existingProdQ = prodQByUuid[q.uuid]
          if (existingProdQ) {
            // Check if staging is newer (updated_at comparison)
            const stagingTime = new Date((q as any).updated_at || 0).getTime()
            const prodTime = new Date((existingProdQ as any).updated_at || 0).getTime()
            if (stagingTime > prodTime) {
              console.log(`[Step 3] Question UUID ${q.uuid} changed on staging - will update on prod (ID: ${existingProdQ.id})`)
              updateQPayload.push({ uuid: q.uuid, id: existingProdQ.id, payload: questionPayload })
            } else {
              console.log(`[Step 3] Question UUID ${q.uuid} already synced`)
            }
          } else {
            createQPayload.push(questionPayload)
          }
        }

        // POST new questions
        if (createQPayload.length > 0) {
          console.log(`[Step 3] Creating ${createQPayload.length} new questions on prod...`)
          await pc.post("/api/v1/internal/training_question/", createQPayload)
          console.log(`[Step 3] Successfully created ${createQPayload.length} training questions`)
        } else {
          console.log(`[Step 3] No new questions to create`)
        }

        // PATCH updated questions
        if (updateQPayload.length > 0) {
          console.log(`[Step 3] Updating ${updateQPayload.length} questions on prod...`)
          for (const { uuid, id, payload } of updateQPayload) {
            try {
              await pc.patch(`/api/v1/internal/training_question/${id}/`, payload)
              console.log(`[Step 3] Updated question UUID ${uuid} (ID: ${id})`)
            } catch (err: any) {
              console.warn(`[Step 3] Failed to update question ${uuid}:`, err.message)
            }
          }
          console.log(`[Step 3] Successfully updated ${updateQPayload.length} training questions`)
        } else {
          console.log(`[Step 3] No questions to update`)
        }
      } else {
        console.log(`[Step 3] No training questions to upload - skipping`)
      }
      setStep(3, "done")

      // ── Step 4: Upload grand quizzes ─────────────────────────────────
      setStep(4, "pending")
      const grandQuizzes = stagingGqsForAssets

      // Build UUID map: staging gq id → uuid (for use in questions step)
      const stagingGqUuidById: Record<number, string> = Object.fromEntries(
        grandQuizzes.map(gq => [gq.id, gq.uuid])
      )

      if (grandQuizzes.length > 0) {
        // Check which grand quizzes already exist (scoped to this level)
        const existingProdGqs = await pc.get(
          `/api/v1/grand_quizzes/?level=${selectedLevel?.id}&limit=1000`
        )
        const existingGqsList = ensureArray(existingProdGqs.data)
        const existingGqUuids = new Set(existingGqsList.map(gq => gq.uuid))
        console.log(`[Step 4] Found ${existingGqUuids.size} existing grand quizzes on prod`)

        // Build map of prod grand quizzes by UUID (with numeric IDs)
        const prodGqByUuid = Object.fromEntries(
          existingGqsList.map(gq => [gq.uuid, gq])
        )

        // Build ID map: UUID → numeric ID (for PATCH operations)
        const gqUuidToIdMap: Record<string, number> = Object.fromEntries(
          existingGqsList.map(gq => [gq.uuid, gq.id])
        )

        // Separate into create vs update payloads
        const createGqPayload: any[] = []
        const updateGqPayload: Array<{ uuid: string; id?: number; payload: any }> = []

        for (const gq of grandQuizzes) {
          const gqPayload = {
            uuid: gq.uuid, title: gq.title, description: gq.description,
            instructions: gq.instructions, type: gq.type, level: gq.level,
            is_active: gq.is_active ?? true, status: "OnProd",
          }

          const existingProdGq = prodGqByUuid[gq.uuid]
          if (existingProdGq) {
            // Check if staging is newer
            const stagingTime = new Date((gq as any).updated_at || 0).getTime()
            const prodTime = new Date((existingProdGq as any).updated_at || 0).getTime()
            if (stagingTime > prodTime) {
              console.log(`[Step 4] Grand Quiz UUID ${gq.uuid} changed on staging - will update on prod (ID: ${existingProdGq.id})`)
              updateGqPayload.push({ uuid: gq.uuid, id: existingProdGq.id, payload: gqPayload })
            } else {
              console.log(`[Step 4] Grand Quiz UUID ${gq.uuid} already synced`)
            }
          } else {
            createGqPayload.push(gqPayload)
          }
        }

        if (createGqPayload.length > 0) {
          console.log(`[Step 4] Creating ${createGqPayload.length} new grand quizzes on prod...`)
          const createRes = await pc.post("/api/v1/internal/grand_quizzes/", createGqPayload)
          const createdGqs = ensureArray(createRes.data)
          for (const gq of createdGqs) {
            if (gq.uuid) gqUuidToIdMap[gq.uuid] = gq.id
          }
          console.log(`[Step 4] Created grand quizzes mapped: ${JSON.stringify(createdGqs)}`)
        } else {
          console.log(`[Step 4] No new grand quizzes to create`)
        }

        if (updateGqPayload.length > 0) {
          console.log(`[Step 4] Updating ${updateGqPayload.length} grand quizzes on prod...`)
          for (const { uuid, id, payload } of updateGqPayload) {
            try {
              await pc.patch(`/api/v1/internal/grand_quizzes/${id}/`, payload)
              console.log(`[Step 4] Updated grand quiz UUID ${uuid} (ID: ${id})`)
            } catch (err: any) {
              console.warn(`[Step 4] Failed to update grand quiz ${uuid}:`, err.message)
            }
          }
          console.log(`[Step 4] Successfully updated ${updateGqPayload.length} grand quizzes`)
        } else {
          console.log(`[Step 4] No grand quizzes to update`)
        }
      }
      setStep(4, "done")

      // ── Step 5: Upload grand quiz questions ──────────────────────────
      setStep(5, "pending")
      const gqQuestions = stagingGqQuestionsForAssets
      console.log(`[Step 5] Found ${gqQuestions.length} grand quiz questions to upload`)

      if (gqQuestions.length > 0) {
        // Build grand quiz ID list for filtered query (numeric IDs only)
        const gqIdsForQs = Object.values(gqUuidToIdMap)

        // Fetch existing prod grand quiz questions (scoped by numeric grand quiz IDs)
        let existingProdGqQuestions: any[] = []
        if (gqIdsForQs.length > 0) {
          const gqIdsStr = gqIdsForQs.join(",")
          const response = await pc.get(
            `/api/v1/training_questions/?grand_quiz_ids=${gqIdsStr}&limit=10000`
          )
          existingProdGqQuestions = ensureArray(response.data)
        }
        console.log(`[Step 5] Found ${existingProdGqQuestions.length} existing grand quiz questions on prod`)

        // Build map of prod questions by UUID for comparison
        const prodGqQByUuid = Object.fromEntries(
          existingProdGqQuestions.map(q => [q.uuid, q])
        )

        // Separate into create vs update payloads
        const createGqQPayload: any[] = []
        const updateGqQPayload: Array<{ uuid: string; id?: number; payload: any }> = []

        for (const q of gqQuestions) {
          // Only sync questions that have a grand_quiz relationship
          if (!q.grand_quiz) {
            console.warn(`[Step 5] Skipping question UUID ${q.uuid}: No grand_quiz relationship on staging (orphaned question).`)
            continue
          }

          const grandQuizUuid = stagingGqUuidById[q.grand_quiz]
          if (!grandQuizUuid) {
            console.warn(`[Step 5] Skipping question UUID ${q.uuid}: Grand Quiz UUID not found for ID ${q.grand_quiz}.`)
            continue
          }

          const prodGrandQuizId = gqUuidToIdMap[grandQuizUuid]
          if (!prodGrandQuizId) {
            console.warn(`[Step 5] Skipping question UUID ${q.uuid}: Grand Quiz ID not found in map for UUID ${grandQuizUuid}.`)
            continue
          }

          const questionPayload = {
            uuid: q.uuid, index: q.index,
            type: q.type, question_statement: q.question_statement,
            options: q.options, answers: q.answers, hints: q.hints,
            bloom_level: q.bloom_level,
            statement_media_asset: q.statement_media_asset_id
              ? (assetIdMap[q.statement_media_asset_id] ?? null)
              : null,
            is_active: q.is_active ?? true, status: "OnProd",
            training: null,
            grand_quiz: prodGrandQuizId,
          }

          const existingProdGqQ = prodGqQByUuid[q.uuid]
          if (existingProdGqQ) {
            // Check if staging is newer (updated_at comparison)
            const stagingTime = new Date((q as any).updated_at || 0).getTime()
            const prodTime = new Date((existingProdGqQ as any).updated_at || 0).getTime()
            if (stagingTime > prodTime) {
              console.log(`[Step 5] Question UUID ${q.uuid} changed on staging - will update on prod (ID: ${existingProdGqQ.id})`)
              updateGqQPayload.push({ uuid: q.uuid, id: existingProdGqQ.id, payload: questionPayload })
            } else {
              console.log(`[Step 5] Question UUID ${q.uuid} already synced`)
            }
          } else {
            createGqQPayload.push(questionPayload)
          }
        }

        // POST new grand quiz questions
        if (createGqQPayload.length > 0) {
          console.log(`[Step 5] Creating ${createGqQPayload.length} new grand quiz questions on prod...`)
          await pc.post("/api/v1/internal/training_question/", createGqQPayload)
          console.log(`[Step 5] Successfully created ${createGqQPayload.length} grand quiz questions`)
        } else {
          console.log(`[Step 5] No new grand quiz questions to create`)
        }

        // PATCH updated grand quiz questions
        if (updateGqQPayload.length > 0) {
          console.log(`[Step 5] Updating ${updateGqQPayload.length} grand quiz questions on prod...`)
          for (const { uuid, id, payload } of updateGqQPayload) {
            try {
              await pc.patch(`/api/v1/internal/training_question/${id}/`, payload)
              console.log(`[Step 5] Updated question UUID ${uuid} (ID: ${id})`)
            } catch (err: any) {
              console.warn(`[Step 5] Failed to update question ${uuid}:`, err.message)
            }
          }
          console.log(`[Step 5] Successfully updated ${updateGqQPayload.length} grand quiz questions`)
        } else {
          console.log(`[Step 5] No grand quiz questions to update`)
        }
      } else {
        console.log(`[Step 5] No grand quiz questions to upload - skipping`)
      }
      setStep(5, "done")

      // ── Step 6: Mark stage course as OnProd ──────────────────────────
      setStep(6, "pending")
      await updateCourse(course.id, { status: "OnProd" })
      setStep(6, "done")

      qc.invalidateQueries({ queryKey: ["courses"] })
      toast({ title: "Uploaded to prod successfully!" })
    } catch (err: any) {
      const failedStep = currentStepRef.current
      if (failedStep >= 0) setStep(failedStep, "error")
      toast({
        title: "Upload failed",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  return (
    <div>
      {/* ── Filters ── */}
      <div className="bg-slate-50 border rounded-lg p-4 mb-4 space-y-3">
        {/* Vendor */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 w-14 shrink-0">Vendor</span>
          <Select value={selectedVendor} onValueChange={v => { setSelectedVendor(v); setSelectedLevel(undefined) }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VENDORS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Level tabs */}
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

        {/* Status filter */}
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
                        onClick={() => uploadToProd(course)}
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
