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

      // ── Step 1: Create course on prod ────────────────────────────────
      setStep(1, "pending")
      const coursePayload = {
        uuid: course.uuid, title: course.title, description: course.description,
        keywords: course.keywords, time_duration: course.time_duration, index: course.index,
        thumbnail_url: course.thumbnail_url, is_active: true, status: "OnProd",
        type: course.type, level: course.level,
      }
      const prodCourseRes = await pc.post<{ id: number }>("/api/v1/internal/courses/", coursePayload)
      const prodCourseId = prodCourseRes.data.id
      setStep(1, "done")

      // ── Step 2: Upload trainings ──────────────────────────────────────
      setStep(2, "pending")
      const trainings = stagingTrainingsForAssets
      const trainingPayload = trainings.map(t => ({
        uuid: t.uuid, title: t.title, description: t.description,
        content: t.content, index: t.index, is_grand_assessment: t.is_grand_assessment,
        course: prodCourseId,
        is_active: true, status: "OnProd",
        media_asset: t.media_asset?.id ? (assetIdMap[t.media_asset.id] ?? null) : null,
        tags: t.tags ?? [],
      }))
      const prodTrainingsRes = await pc.post<{ id: number; uuid: string }[]>(
        "/api/v1/internal/trainings/", trainingPayload
      )
      const stagingTrainingByUuid = Object.fromEntries(trainings.map(t => [t.uuid, t.id]))
      const prodTrainingByUuid = Object.fromEntries(prodTrainingsRes.data.map(pt => [pt.uuid, pt.id]))
      const trainingIdMap: Record<number, number> = {}
      for (const [uuid, stagingId] of Object.entries(stagingTrainingByUuid)) {
        if (prodTrainingByUuid[uuid]) trainingIdMap[stagingId] = prodTrainingByUuid[uuid]
      }
      setStep(2, "done")

      // ── Step 3: Upload training questions ────────────────────────────
      setStep(3, "pending")
      const trainingQuestions = stagingQuestionsForAssets
      if (trainingQuestions.length > 0) {
        const qPayload = trainingQuestions.map(q => ({
          uuid: q.uuid, index: q.index,
          type: q.type, question_statement: q.question_statement,
          options: q.options, answers: q.answers, hints: q.hints,
          bloom_level: q.bloom_level,
          statement_media_asset: q.statement_media_asset_id
            ? (assetIdMap[q.statement_media_asset_id] ?? null)
            : null,
          is_active: true, status: "OnProd",
          training: q.training ? (trainingIdMap[q.training] ?? null) : null,
          grand_quiz: null,
        }))
        await pc.post("/api/v1/internal/training_question/", qPayload)
      }
      setStep(3, "done")

      // ── Step 4: Upload grand quizzes ─────────────────────────────────
      setStep(4, "pending")
      const grandQuizzes = stagingGqsForAssets
      let gqIdMap: Record<number, number> = {}
      if (grandQuizzes.length > 0) {
        const gqPayload = grandQuizzes.map(gq => ({
          uuid: gq.uuid, title: gq.title, description: gq.description,
          instructions: gq.instructions, type: gq.type, level: gq.level,
          is_active: true, status: "OnProd",
        }))
        const prodGqRes = await pc.post<{ id: number; uuid: string }[]>(
          "/api/v1/internal/grand_quizzes/", gqPayload
        )
        const stagingGqByUuid = Object.fromEntries(grandQuizzes.map(gq => [gq.uuid, gq.id]))
        const prodGqByUuid = Object.fromEntries(prodGqRes.data.map(gq => [gq.uuid, gq.id]))
        for (const [uuid, stagingId] of Object.entries(stagingGqByUuid)) {
          if (prodGqByUuid[uuid]) gqIdMap[stagingId] = prodGqByUuid[uuid]
        }
      }
      setStep(4, "done")

      // ── Step 5: Upload grand quiz questions ──────────────────────────
      setStep(5, "pending")
      const gqQuestions = stagingGqQuestionsForAssets
      if (gqQuestions.length > 0) {
        const gqQPayload = gqQuestions.map(q => ({
          uuid: q.uuid, index: q.index,
          type: q.type, question_statement: q.question_statement,
          options: q.options, answers: q.answers, hints: q.hints,
          bloom_level: q.bloom_level,
          statement_media_asset: q.statement_media_asset_id
            ? (assetIdMap[q.statement_media_asset_id] ?? null)
            : null,
          is_active: true, status: "OnProd",
          training: null,
          grand_quiz: q.grand_quiz ? (gqIdMap[q.grand_quiz] ?? null) : null,
        }))
        await pc.post("/api/v1/internal/training_question/", gqQPayload)
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
