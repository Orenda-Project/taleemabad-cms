import { Route, Routes, Navigate } from "react-router-dom"

export default function TrainingPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="courses" replace />} />
      <Route path="courses" element={<div className="text-slate-400">Courses — coming in Task 6</div>} />
      <Route path="trainings" element={<div className="text-slate-400">Trainings — coming in Task 7</div>} />
      <Route path="questions" element={<div className="text-slate-400">Questions — coming in Task 8</div>} />
      <Route path="grand-quiz" element={<div className="text-slate-400">Grand Quiz — coming in Task 9</div>} />
      <Route path="review" element={<div className="text-slate-400">Review/Upload — coming in Task 10</div>} />
    </Routes>
  )
}
