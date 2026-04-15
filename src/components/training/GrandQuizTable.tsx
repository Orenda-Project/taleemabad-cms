import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useGrandQuizzes } from "../../hooks/useGrandQuizzes"
import { useLevels } from "../../hooks/useLevels"
import { useTrainingStore } from "../../store/trainingStore"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Skeleton } from "../ui/skeleton"
import { statusColor, cn } from "../../lib/utils"
import GrandQuizForm from "./GrandQuizForm"
import type { GrandQuiz, Level } from "../../types"

const VENDORS = [
  { value: "TALEEMABAD", label: "Taleemabad" },
  { value: "BEACONHOUSE", label: "Beaconhouse" },
  { value: "OXBRIDGE", label: "Oxbridge" },
  { value: "NIETE", label: "NIETE" },
]

export default function GrandQuizTable() {
  const [selectedVendor, setSelectedVendor] = useState("TALEEMABAD")
  const [selectedLevel, setSelectedLevel] = useState<Level | undefined>(undefined)
  const [editingQuiz, setEditingQuiz] = useState<GrandQuiz | null>(null)

  const { data: levels = [], isLoading: levelsLoading } = useLevels(selectedVendor)
  const { data: quizzes = [], isLoading } = useGrandQuizzes(selectedLevel?.id)
  const { setGrandQuizCtx } = useTrainingStore()
  const navigate = useNavigate()

  // Auto-select first level when vendor changes or levels load
  useEffect(() => {
    setSelectedLevel(levels.length > 0 ? levels[0] : undefined)
  }, [levels])

  return (
    <div>
      {/* ── Filters ── */}
      <div className="bg-slate-50 border rounded-lg p-4 mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 w-14 shrink-0">Vendor</span>
          <Select
            value={selectedVendor}
            onValueChange={v => { setSelectedVendor(v); setSelectedLevel(undefined) }}
          >
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
              ? [1,2,3].map(i => <Skeleton key={i} className="h-8 w-24" />)
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
      </div>

      {/* ── Form ── */}
      {editingQuiz ? (
        <GrandQuizForm
          key={editingQuiz.id}
          quiz={editingQuiz}
          lockedLevel={selectedLevel}
          onSuccess={() => setEditingQuiz(null)}
        />
      ) : (
        <GrandQuizForm key="new" lockedLevel={selectedLevel} />
      )}

      {/* ── Table ── */}
      {!selectedLevel ? (
        <p className="text-slate-400 text-sm">Select a level to view grand quizzes.</p>
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
              {quizzes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No grand quizzes for this level.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
