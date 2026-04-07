import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useOrgStore } from "./store/orgStore"
import OrgSelectPage from "./pages/OrgSelectPage"
import TrainingPage from "./pages/TrainingPage"
import AssetsPage from "./pages/AssetsPage"
import TopNav from "./components/layout/TopNav"
import SubNav from "./components/layout/SubNav"
import Breadcrumb from "./components/layout/Breadcrumb"
import { Toaster } from "./components/ui/toaster"

export default function App() {
  const { selectedOrg } = useOrgStore()
  const location = useLocation()

  if (!selectedOrg) return <OrgSelectPage />

  const section = location.pathname.startsWith("/assets") ? "assets" : "training"

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <SubNav section={section} />
      <Breadcrumb />
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/training/courses" replace />} />
          <Route path="/training/*" element={<TrainingPage />} />
          <Route path="/assets/*" element={<AssetsPage />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
