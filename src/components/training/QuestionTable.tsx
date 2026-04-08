import { useState } from "react"
import { useQuestions, useGrandQuizQuestions } from "../../hooks/useQuestions"
import { useTrainingStore } from "../../store/trainingStore"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"
import QuestionForm from "./QuestionForm"
import type { Question } from "../../types"

interface Props {
  grandQuizMode?: boolean
}

export default function QuestionTable({ grandQuizMode }: Props) {
  const { trainingCtx, grandQuizCtx } = useTrainingStore()
  const questionsResult = useQuestions(grandQuizMode ? undefined : trainingCtx?.uuid)
  const grandQuizQuestionsResult = useGrandQuizQuestions(grandQuizMode ? grandQuizCtx?.id : undefined)
  const { data: questions = [], isLoading } = grandQuizMode ? grandQuizQuestionsResult : questionsResult
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  if (!grandQuizMode && !trainingCtx) return <div className="text-slate-400">Select a training first.</div>

  return (
    <div>
      {editingQuestion ? (
        <QuestionForm
          grandQuizMode={grandQuizMode}
          question={editingQuestion}
          onSuccess={() => setEditingQuestion(null)}
        />
      ) : (
        <QuestionForm grandQuizMode={grandQuizMode} />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Statement</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{q.index}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{q.question_statement}</td>
                  <td className="px-4 py-2">{q.type}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(q.status))}>{q.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(q)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No questions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
