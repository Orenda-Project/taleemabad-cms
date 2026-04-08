import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTrainings, useCreateTrainings } from "../../hooks/useTrainings"
import { useTrainingStore } from "../../store/trainingStore"
import { useUpdateCourse } from "../../hooks/useCourses"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"
import TrainingForm from "./TrainingForm"
import type { Training } from "../../types"
import { useToast } from "../../hooks/use-toast"

export default function TrainingTable() {
  const { courseCtx, stagedTrainings, clearStagedTrainings, setTrainingCtx } = useTrainingStore()
  const { data: existingTrainings = [], isLoading, refetch } = useTrainings(courseCtx?.uuid)
  const createTrainings = useCreateTrainings()
  const updateCourse = useUpdateCourse()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const allRows: Training[] = [
    ...existingTrainings.map(t => ({ ...t, _local_status: "existing" as const })),
    ...stagedTrainings,
  ]

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function pushToBackend() {
    const toPush = stagedTrainings
      .filter(t => selected.has(t.id))
      .map(t => ({
        title: t.title,
        description: t.description,
        content: t.content,
        index: t.index,
        is_grand_assessment: t.is_grand_assessment,
        course: t.course,
        is_active: true,
        status: "ReadyForReview",
        media_asset: t.media_asset?.id ?? null,
        tags: t.tags,
      }))

    if (!toPush.length) {
      toast({ title: "No new rows selected", variant: "destructive" })
      return
    }

    try {
      await createTrainings.mutateAsync(toPush)
      clearStagedTrainings()
      setSelected(new Set())
      toast({ title: `${toPush.length} training(s) pushed` })

      // OnProd auto-reset
      if (courseCtx?.status === "OnProd") {
        await updateCourse.mutateAsync({ id: courseCtx.id, data: { is_active: true, status: "ReadyForReview" } })
      }

      // Poll for backend consistency
      let attempts = 0
      pollRef.current = setInterval(async () => {
        await refetch()
        attempts++
        if (attempts >= 12) {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      }, 5000)
    } catch (err: any) {
      toast({ title: "Push failed", description: err.response?.data?.message, variant: "destructive" })
    }
  }

  function goToQuestions(t: Training) {
    setTrainingCtx({ id: t.id, uuid: t.uuid, title: t.title })
    navigate("/training/questions")
  }

  if (!courseCtx) return <div className="text-slate-400">Select a course first.</div>

  return (
    <div>
      <TrainingForm />

      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-slate-500">
          {stagedTrainings.length > 0 && `${stagedTrainings.length} unsaved row(s)`}
        </span>
        <Button
          size="sm"
          disabled={selected.size === 0 || createTrainings.isPending}
          onClick={pushToBackend}
        >
          Push Selected to Backend ({selected.size})
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map(t => (
                <tr key={`${t._local_status}-${t.id}`} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {t._local_status === "New" && (
                      <input type="checkbox" checked={selected.has(t.id)}
                        onChange={() => toggleSelect(t.id)} />
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-400">{t.index}</td>
                  <td className="px-4 py-2 font-medium">
                    {t.title}
                    {t._local_status === "New" && (
                      <Badge className="ml-2 text-xs bg-blue-100 text-blue-700">New</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(t.status))}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {t._local_status === "existing" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => goToQuestions(t)}>
                            Questions →
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
