import { Route, Routes, Navigate } from "react-router-dom"

export default function AssetsPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="all" replace />} />
      <Route path="all" element={<div className="text-slate-400">All Assets — coming in Task 11</div>} />
      <Route path="review" element={<div className="text-slate-400">Ready for Review — coming in Task 12</div>} />
    </Routes>
  )
}
