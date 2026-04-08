import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTrainings } from "../../hooks/useTrainings"
import { useTrainingStore } from "../../store/trainingStore"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"
import TrainingForm from "./TrainingForm"
import type { Training } from "../../types"

export default function TrainingTable() {
  const { courseCtx, setTrainingCtx } = useTrainingStore()
  const { data: trainings = [], isLoading } = useTrainings(courseCtx?.uuid)
  const navigate = useNavigate()
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)

  function goToQuestions(t: Training) {
    setTrainingCtx({ id: t.id, uuid: t.uuid, title: t.title })
    navigate("/training/questions")
  }

  if (!courseCtx) return <div className="text-slate-400">Select a course first.</div>

  return (
    <div>
      {editingTraining ? (
        <TrainingForm training={editingTraining} onSuccess={() => setEditingTraining(null)} />
      ) : (
        <TrainingForm />
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
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{t.index}</td>
                  <td className="px-4 py-2 font-medium">{t.title}</td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(t.status))}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => goToQuestions(t)}>
                        Questions →
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTraining(t)}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {trainings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No trainings yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
