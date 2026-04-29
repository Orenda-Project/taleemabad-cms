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
      console.log(`[Step 1] Checking if course exists: ${course.title}`)

      const coursePayload = {
        uuid: course.uuid, title: course.title, description: course.description,
        keywords: course.keywords, time_duration: course.time_duration, index: course.index,
        thumbnail_url: course.thumbnail_url, is_active: true, status: "OnProd",
        type: course.type, level: course.level,
      }

      // Check if course with this UUID already exists
      let prodCourseId: number
      try {
        const existingCourses = await pc.get(
          `/api/v1/courses/?uuid=${course.uuid}`
        )
        const coursesList = ensureArray(existingCourses.data)
        if (coursesList.length > 0) {
          // Update existing course
          prodCourseId = coursesList[0].id
          console.log(`[Step 1] Course already exists with ID: ${prodCourseId}, updating...`)
          await pc.patch(`/api/v1/internal/courses/${prodCourseId}/`, coursePayload)
          console.log(`[Step 1] Course updated with ID: ${prodCourseId}`)
        } else {
          // Create new course
          console.log(`[Step 1] Creating new course: ${course.title}`)
          const prodCourseRes = await pc.post<{ id: number }>("/api/v1/internal/courses/", coursePayload)
          prodCourseId = prodCourseRes.data.id
          console.log(`[Step 1] Course created with ID: ${prodCourseId}`)
        }
      } catch (err) {
        console.error(`[Step 1] Error checking/creating course:`, err)
        throw err
      }

      setStep(1, "done")

      // ── Step 2: Upload trainings ──────────────────────────────────────
      setStep(2, "pending")
      const trainings = stagingTrainingsForAssets
      console.log(`[Step 2] Found ${trainings.length} trainings to upload`)
      console.log(`[Step 2] Using course ID: ${prodCourseId}`)

      // Check which trainings already exist (scoped to this course)
      const existingProdTrainings = await pc.get(
        `/api/v1/trainings/?course=${prodCourseId}&limit=1000`
      )
      const existingTrainingsList = ensureArray(existingProdTrainings.data)
      const existingUuids = new Set(existingTrainingsList.map(t => t.uuid))
      console.log(`[Step 2] Found ${existingUuids.size} existing trainings on prod`)

      // Only create new trainings that don't exist
      const newTrainingPayload = trainings
        .filter(t => !existingUuids.has(t.uuid))
        .map(t => ({
          uuid: t.uuid, title: t.title, description: t.description,
          content: t.content, index: t.index, is_grand_assessment: t.is_grand_assessment,
          course: prodCourseId,
          is_active: true, status: "OnProd",
          media_asset: t.media_asset?.id ? (assetIdMap[t.media_asset.id] ?? null) : null,
          tags: t.tags ?? [],
        }))

      if (newTrainingPayload.length > 0) {
        console.log(`[Step 2] Posting ${newTrainingPayload.length} new trainings to prod...`)
        await pc.post("/api/v1/internal/trainings/", newTrainingPayload)
      } else {
        console.log(`[Step 2] All trainings already exist on prod - skipping POST`)
      }

      // Fetch all trainings from prod to get IDs (scoped to this course)
      const prodTrainingsRes = await pc.get(
        `/api/v1/trainings/?course=${prodCourseId}&limit=1000`
      )
      const prodTrainingsList = ensureArray(prodTrainingsRes.data)

      console.log(`[Step 2] Response received:`, prodTrainingsList)
      const stagingTrainingByUuid = Object.fromEntries(trainings.map(t => [t.uuid, t.id]))
      const prodTrainingByUuid = Object.fromEntries(prodTrainingsList.map(pt => [pt.uuid, pt.id]))

      console.log(`[Step 2] Staging trainings:`, stagingTrainingByUuid)
      console.log(`[Step 2] Prod trainings:`, prodTrainingByUuid)

      const trainingIdMap: Record<number, number> = {}
      for (const [uuid, stagingId] of Object.entries(stagingTrainingByUuid)) {
        if (prodTrainingByUuid[uuid]) {
          trainingIdMap[stagingId] = prodTrainingByUuid[uuid]
        } else {
          console.warn(`[Step 2] WARNING: Training UUID ${uuid} not found in prod response`)
        }
      }

      console.log(`[Step 2] Training ID Map:`, trainingIdMap)
      setStep(2, "done")

      // ── Step 3: Upload training questions ────────────────────────────
      setStep(3, "pending")
      const trainingQuestions = stagingQuestionsForAssets
      console.log(`[Step 3] Found ${trainingQuestions.length} training questions to upload`)

      if (trainingQuestions.length > 0) {
        // Get training IDs for scoped query (for this course's trainings)
        const trainingIdsForQs = Object.values(trainingIdMap)

        // Check which questions already exist (scoped to course trainings)
        let existingQUuids = new Set<string>()
        if (trainingIdsForQs.length > 0) {
          const trainingIdsStr = trainingIdsForQs.join(",")
          const existingProdQuestions = await pc.get(
            `/api/v1/training_questions/?training__in=${trainingIdsStr}&limit=10000`
          )
          const existingQList = ensureArray(existingProdQuestions.data)
          existingQUuids = new Set(existingQList.map(q => q.uuid))
        }
        console.log(`[Step 3] Found ${existingQUuids.size} existing questions on prod`)

        // Only create new questions that don't exist
        const newQPayload = trainingQuestions
          .filter(q => !existingQUuids.has(q.uuid))
          .map(q => {
            const prodTrainingId = q.training ? trainingIdMap[q.training] : null
            if (q.training && !prodTrainingId) {
              console.warn(`[Step 3] Skipping question UUID ${q.uuid}: Training ID ${q.training} not found in production mapping.`)
              return null
            }
            return {
              uuid: q.uuid, index: q.index,
              type: q.type, question_statement: q.question_statement,
              options: q.options, answers: q.answers, hints: q.hints,
              bloom_level: q.bloom_level,
              statement_media_asset: q.statement_media_asset_id
                ? (assetIdMap[q.statement_media_asset_id] ?? null)
                : null,
              is_active: true, status: "OnProd",
              training: prodTrainingId,
              grand_quiz: null,
            }
          })
          .filter((q): q is Exclude<typeof q, null> => q !== null)

        if (newQPayload.length > 0) {
          console.log(`[Step 3] Posting ${newQPayload.length} new questions to prod...`)
          await pc.post("/api/v1/internal/training_question/", newQPayload)
          console.log(`[Step 3] Successfully uploaded ${newQPayload.length} training questions`)
        } else {
          console.log(`[Step 3] All questions already exist on prod or were skipped - skipping POST`)
        }
      } else {
        console.log(`[Step 3] No training questions to upload - skipping`)
      }
      setStep(3, "done")

      // ── Step 4: Upload grand quizzes ─────────────────────────────────
      setStep(4, "pending")
      const grandQuizzes = stagingGqsForAssets
      let gqIdMap: Record<number, number> = {}
      if (grandQuizzes.length > 0) {
        // Check which grand quizzes already exist (scoped to this level)
        const existingProdGqs = await pc.get(
          `/api/v1/grand_quizzes/?level=${selectedLevel?.id}&limit=1000`
        )
        const existingGqsList = ensureArray(existingProdGqs.data)
        const existingGqUuids = new Set(existingGqsList.map(gq => gq.uuid))
        console.log(`[Step 4] Found ${existingGqUuids.size} existing grand quizzes on prod`)

        // Only create new grand quizzes that don't exist
        const newGqPayload = grandQuizzes
          .filter(gq => !existingGqUuids.has(gq.uuid))
          .map(gq => ({
            uuid: gq.uuid, title: gq.title, description: gq.description,
            instructions: gq.instructions, type: gq.type, level: gq.level,
            is_active: true, status: "OnProd",
          }))

        if (newGqPayload.length > 0) {
          console.log(`[Step 4] Posting ${newGqPayload.length} new grand quizzes to prod...`)
          await pc.post("/api/v1/internal/grand_quizzes/", newGqPayload)
        } else {
          console.log(`[Step 4] All grand quizzes already exist on prod - skipping POST`)
        }

        // Fetch all grand quizzes from prod to build ID map (scoped to this level)
        const prodGqRes = await pc.get(
          `/api/v1/grand_quizzes/?level=${selectedLevel?.id}&limit=1000`
        )
        const prodGqList = ensureArray(prodGqRes.data)
        const stagingGqByUuid = Object.fromEntries(grandQuizzes.map(gq => [gq.uuid, gq.id]))
        const prodGqByUuid = Object.fromEntries(prodGqList.map(gq => [gq.uuid, gq.id]))
        for (const [uuid, stagingId] of Object.entries(stagingGqByUuid)) {
          if (prodGqByUuid[uuid]) gqIdMap[stagingId] = prodGqByUuid[uuid]
        }
      }
      setStep(4, "done")

      // ── Step 5: Upload grand quiz questions ──────────────────────────
      setStep(5, "pending")
      const gqQuestions = stagingGqQuestionsForAssets
      console.log(`[Step 5] Found ${gqQuestions.length} grand quiz questions to upload`)

      if (gqQuestions.length > 0) {
        // Get grand quiz IDs for scoped query (for this level's grand quizzes)
        const gqIdsForQs = Object.values(gqIdMap)

        // Check which grand quiz questions already exist (scoped to level grand quizzes)
        let existingGqQUuids = new Set<string>()
        if (gqIdsForQs.length > 0) {
          const gqIdsStr = gqIdsForQs.join(",")
          const existingProdGqQuestions = await pc.get(
            `/api/v1/training_questions/?grand_quiz__in=${gqIdsStr}&limit=10000`
          )
          const existingGqQList = ensureArray(existingProdGqQuestions.data)
          existingGqQUuids = new Set(existingGqQList.map(q => q.uuid))
        }
        console.log(`[Step 5] Found ${existingGqQUuids.size} existing grand quiz questions on prod`)

        // Only create new grand quiz questions that don't exist
        const newGqQPayload = gqQuestions
          .filter(q => !existingGqQUuids.has(q.uuid))
          .map(q => {
            const prodGrandQuizId = q.grand_quiz ? gqIdMap[q.grand_quiz] : null
            if (q.grand_quiz && !prodGrandQuizId) {
              console.warn(`[Step 5] Skipping question UUID ${q.uuid}: Grand Quiz ID ${q.grand_quiz} not found in production mapping.`)
              return null
            }
            return {
              uuid: q.uuid, index: q.index,
              type: q.type, question_statement: q.question_statement,
              options: q.options, answers: q.answers, hints: q.hints,
              bloom_level: q.bloom_level,
              statement_media_asset: q.statement_media_asset_id
                ? (assetIdMap[q.statement_media_asset_id] ?? null)
                : null,
              is_active: true, status: "OnProd",
              training: null,
              grand_quiz: prodGrandQuizId,
            }
          })
          .filter((q): q is Exclude<typeof q, null> => q !== null)

        if (newGqQPayload.length > 0) {
          console.log(`[Step 5] Posting ${newGqQPayload.length} new grand quiz questions to prod...`)
          await pc.post("/api/v1/internal/training_question/", newGqQPayload)
          console.log(`[Step 5] Successfully uploaded ${newGqQPayload.length} grand quiz questions`)
        } else {
          console.log(`[Step 5] All grand quiz questions already exist on prod or were skipped - skipping POST`)
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
                        disabled={!!uploading || course.status === "OnProd"}
                        variant={course.status === "ReadyForReview" ? "default" : "outline"}
                      >
                        {course.status === "OnProd" ? "Already on Prod" : "Upload to Prod"}
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
