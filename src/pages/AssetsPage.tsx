import { Route, Routes, Navigate } from "react-router-dom"
import AssetTable from "../components/assets/AssetTable"

const AssetPromotion = () => <div className="text-slate-400 p-4">Asset Promotion — Task 12</div>

export default function AssetsPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="all" replace />} />
      <Route path="all" element={<AssetTable />} />
      <Route path="review" element={<AssetPromotion />} />
    </Routes>
  )
}
