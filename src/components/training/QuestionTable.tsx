import { useState, useRef, useEffect } from "react"
import { useQuestions, useGrandQuizQuestions, useCreateQuestions } from "../../hooks/useQuestions"
import { useTrainingStore } from "../../store/trainingStore"
import { useUpdateCourse } from "../../hooks/useCourses"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import QuestionForm from "./QuestionForm"
import { useToast } from "../../hooks/use-toast"

interface Props {
  grandQuizMode?: boolean
}

export default function QuestionTable({ grandQuizMode }: Props) {
  const { trainingCtx, grandQuizCtx, courseCtx, stagedQuestions, stagedGrandQuizQuestions, clearStagedQuestions, clearStagedGrandQuizQuestions } = useTrainingStore()
  const questionsResult = useQuestions(grandQuizMode ? undefined : trainingCtx?.uuid)
  const grandQuizQuestionsResult = useGrandQuizQuestions(grandQuizMode ? grandQuizCtx?.id : undefined)
  const { data: existingQuestions = [], isLoading, refetch } = grandQuizMode ? grandQuizQuestionsResult : questionsResult
  const createQuestions = useCreateQuestions()
  const updateCourse = useUpdateCourse()
  const { toast } = useToast()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const staged = grandQuizMode ? stagedGrandQuizQuestions : stagedQuestions
  const clearStaged = grandQuizMode ? clearStagedGrandQuizQuestions : clearStagedQuestions
  const allRows = [
    ...existingQuestions.map(q => ({ ...q, _local_status: "existing" as const })),
    ...staged,
  ]

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function pushToBackend() {
    const toPush = staged
      .filter(q => selected.has(q.id))
      .map(q => ({
        training: q.training,
        grand_quiz: q.grand_quiz,
        index: q.index,
        type: q.type,
        question_statement: q.question_statement,
        options: q.options,
        answers: q.answers,
        hints: q.hints,
        bloom_level: q.bloom_level,
        statement_media_asset: q.statement_media_asset_id,
        is_active: true,
        status: "ReadyForReview",
      }))

    if (!toPush.length) {
      toast({ title: "No new rows selected", variant: "destructive" })
      return
    }

    try {
      await createQuestions.mutateAsync(toPush)
      clearStaged()
      setSelected(new Set())
      toast({ title: `${toPush.length} question(s) pushed` })

      if (!grandQuizMode && courseCtx?.status === "OnProd") {
        await updateCourse.mutateAsync({ id: courseCtx.id, data: { is_active: true, status: "ReadyForReview" } })
      }

      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
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

  if (!grandQuizMode && !trainingCtx) return <div className="text-slate-400">Select a training first.</div>

  return (
    <div>
      <QuestionForm grandQuizMode={grandQuizMode} />
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-slate-500">
          {staged.length > 0 && `${staged.length} unsaved row(s)`}
        </span>
        <Button size="sm" disabled={selected.size === 0 || createQuestions.isPending} onClick={pushToBackend}>
          Push Selected ({selected.size})
        </Button>
      </div>
      {isLoading ? <div className="text-slate-400 text-sm">Loading...</div> : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Statement</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map(q => (
                <tr key={`${q._local_status}-${q.id}`} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {q._local_status === "New" && (
                      <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} />
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-400">{q.index}</td>
                  <td className="px-4 py-2 max-w-xs truncate">
                    {q.question_statement}
                    {q._local_status === "New" && <Badge className="ml-2 text-xs bg-blue-100 text-blue-700">New</Badge>}
                  </td>
                  <td className="px-4 py-2">{q.type}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(q.status))}>{q.status}</Badge>
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
