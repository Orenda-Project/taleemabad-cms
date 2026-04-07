import { Route, Routes, Navigate, useSearchParams } from "react-router-dom"
import CourseTable from "../components/training/CourseTable"
import TrainingTable from "../components/training/TrainingTable"
import QuestionTable from "../components/training/QuestionTable"

function QuestionsRoute() {
  const [params] = useSearchParams()
  return <QuestionTable grandQuizMode={params.get("mode") === "grand-quiz"} />
}

export default function TrainingPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="courses" replace />} />
      <Route path="courses" element={<CourseTable />} />
      <Route path="trainings" element={<TrainingTable />} />
      <Route path="questions" element={<QuestionsRoute />} />
      <Route path="grand-quiz" element={<div className="text-slate-400">Grand Quiz — coming in Task 9</div>} />
      <Route path="review" element={<div className="text-slate-400">Review/Upload — coming in Task 10</div>} />
    </Routes>
  )
}
