import { useState, useRef } from "react"
import { useCoursesForReview } from "../../hooks/useCourses"
import { useOrgStore } from "../../store/orgStore"
import { prodClient } from "../../api/client"
import { getTrainings } from "../../api/trainings"
import { getBulkQuestions } from "../../api/questions"
import { getGrandQuizzes } from "../../api/grandQuizzes"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import { updateCourse } from "../../api/courses"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "../../hooks/use-toast"

const STEPS = [
  "Creating course on prod",
  "Uploading trainings",
  "Uploading questions",
  "Uploading grand quizzes",
  "Marking stage as OnProd",
]

export default function ReviewUpload() {
  const { data: courses = [], isLoading } = useCoursesForReview()
  const { selectedOrg } = useOrgStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const currentStepRef = useRef<number>(-1)

  const [uploading, setUploading] = useState<number | null>(null)
  const [steps, setSteps] = useState<Record<number, "pending" | "done" | "error">>({})

  const readyForReview = courses.filter(c => c.status === "ReadyForReview")

  function setStep(i: number, state: "pending" | "done" | "error") {
    currentStepRef.current = i
    setSteps(prev => ({ ...prev, [i]: state }))
  }

  async function uploadToProd(course: (typeof courses)[0]) {
    if (!selectedOrg) return
    const pc = prodClient(selectedOrg.prod_url)
    setUploading(course.id)
    setSteps({})
    currentStepRef.current = -1

    try {
      // Step 1: create course on prod
      setStep(0, "pending")
      const coursePayload = {
        uuid: course.uuid, title: course.title, description: course.description,
        keywords: course.keywords, time_duration: course.time_duration, index: course.index,
        thumbnail_url: course.thumbnail_url, is_active: true, status: "OnProd",
        type: course.type, level: course.level,
      }
      await pc.post("/api/v1/internal/courses/", coursePayload)
      setStep(0, "done")

      // Step 2: upload trainings
      setStep(1, "pending")
      const trainings = await getTrainings(course.uuid)
      const trainingPayload = trainings.map(t => ({
        uuid: t.uuid, title: t.title, description: t.description,
        content: t.content, index: t.index, is_grand_assessment: t.is_grand_assessment,
        course: course.id, is_active: true, status: "OnProd",
        media_asset: t.media_asset?.id ?? null, tags: t.tags,
      }))
      await pc.post("/api/v1/internal/trainings/", trainingPayload)
      const trainingIds = trainings.map(t => t.id)
      setStep(1, "done")

      // Step 3: upload questions
      setStep(2, "pending")
      const questions = await getBulkQuestions(trainingIds, [])
      if (questions.length > 0) {
        const questionPayload = questions.map(q => ({
          uuid: q.uuid, training: q.training, grand_quiz: null, index: q.index,
          type: q.type, question_statement: q.question_statement,
          options: q.options, answers: q.answers, hints: q.hints,
          bloom_level: q.bloom_level, statement_media_asset: q.statement_media_asset_id,
          is_active: true, status: "OnProd",
        }))
        await pc.post("/api/v1/internal/training_question/", questionPayload)
      }
      setStep(2, "done")

      // Step 4: upload grand quizzes (by level)
      setStep(3, "pending")
      const grandQuizzes = await getGrandQuizzes(course.level)
      if (grandQuizzes.length > 0) {
        const gqPayload = grandQuizzes.map(gq => ({
          uuid: gq.uuid, title: gq.title, description: gq.description,
          instructions: gq.instructions, type: gq.type, level: gq.level,
          is_active: true, status: "OnProd",
        }))
        await pc.post("/api/v1/internal/grand_quizzes/", gqPayload)
      }
      setStep(3, "done")

      // Step 5: mark stage course as OnProd
      setStep(4, "pending")
      await updateCourse(course.id, { status: "OnProd" })
      setStep(4, "done")

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
      <h2 className="text-lg font-semibold mb-4">Review / Upload to Production</h2>
      {isLoading ? <div className="text-slate-400 text-sm">Loading...</div> : (
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
              {readyForReview.map(course => (
                <tr key={course.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{course.title}</td>
                  <td className="px-4 py-2">{course.type}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(course.status))}>{course.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {uploading === course.id ? (
                      <div className="space-y-1 min-w-56">
                        {STEPS.map((label, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span>{steps[i] === "done" ? "✓" : steps[i] === "error" ? "✗" : steps[i] === "pending" ? "⟳" : "○"}</span>
                            <span className={steps[i] === "done" ? "text-green-600" : steps[i] === "error" ? "text-red-600" : "text-slate-500"}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => uploadToProd(course)} disabled={!!uploading}>
                        Upload to Prod
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {readyForReview.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No courses ready for review</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
