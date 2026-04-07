import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useGrandQuizzes } from "../../hooks/useGrandQuizzes"
import { useLevels } from "../../hooks/useLevels"
import { useTrainingStore } from "../../store/trainingStore"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import GrandQuizForm from "./GrandQuizForm"
import type { GrandQuiz } from "../../types"

export default function GrandQuizTable() {
  const { data: levels = [] } = useLevels()
  const [selectedLevel, setSelectedLevel] = useState<number | undefined>(undefined)
  const { data: quizzes = [], isLoading } = useGrandQuizzes(selectedLevel ?? levels[0]?.id)
  const { setGrandQuizCtx } = useTrainingStore()
  const navigate = useNavigate()
  const [editingQuiz, setEditingQuiz] = useState<GrandQuiz | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      {showAdd && <GrandQuizForm onSuccess={() => setShowAdd(false)} />}
      {editingQuiz && <GrandQuizForm quiz={editingQuiz} onSuccess={() => setEditingQuiz(null)} />}
      {!showAdd && !editingQuiz && (
        <Button variant="outline" className="mb-4" onClick={() => setShowAdd(true)}>
          + Add Grand Quiz
        </Button>
      )}

      <div className="flex gap-2 mb-4">
        {levels.map(l => (
          <Button key={l.id} size="sm"
            variant={(selectedLevel ?? levels[0]?.id) === l.id ? "default" : "outline"}
            onClick={() => setSelectedLevel(l.id)}>
            {l.name}
          </Button>
        ))}
      </div>

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
              {quizzes.map(quiz => (
                <tr key={quiz.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{quiz.title}</td>
                  <td className="px-4 py-2">{quiz.type}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(quiz.status))}>{quiz.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setGrandQuizCtx({ id: quiz.id, title: quiz.title })
                        navigate("/training/questions?mode=grand-quiz")
                      }}>
                        Questions →
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingQuiz(quiz)}>
                        Edit
                      </Button>
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
