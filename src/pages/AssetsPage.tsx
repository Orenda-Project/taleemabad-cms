import { Route, Routes, Navigate } from "react-router-dom"
import AssetTable from "../components/assets/AssetTable"
import AssetPromotion from "../components/assets/AssetPromotion"

export default function AssetsPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="all" replace />} />
      <Route path="all" element={<AssetTable />} />
      <Route path="review" element={<AssetPromotion />} />
    </Routes>
  )
}
