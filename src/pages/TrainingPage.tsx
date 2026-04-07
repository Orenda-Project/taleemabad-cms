import { Route, Routes, Navigate } from "react-router-dom"
import CourseTable from "../components/training/CourseTable"
import TrainingTable from "../components/training/TrainingTable"

export default function TrainingPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="courses" replace />} />
      <Route path="courses" element={<CourseTable />} />
      <Route path="trainings" element={<TrainingTable />} />
      <Route path="questions" element={<div className="text-slate-400">Questions — coming in Task 8</div>} />
      <Route path="grand-quiz" element={<div className="text-slate-400">Grand Quiz — coming in Task 9</div>} />
      <Route path="review" element={<div className="text-slate-400">Review/Upload — coming in Task 10</div>} />
    </Routes>
  )
}
