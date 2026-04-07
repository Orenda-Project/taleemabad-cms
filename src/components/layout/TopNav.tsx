import { Link, useLocation } from "react-router-dom"
import { useOrgStore } from "../../store/orgStore"
import { ORGANIZATIONS } from "../../config/orgs"
import { Button } from "../ui/button"

export default function TopNav() {
  const { selectedOrg, setOrg, clearOrg } = useOrgStore()
  const location = useLocation()
  const isTraining = location.pathname.startsWith("/training")
  const isAssets = location.pathname.startsWith("/assets")

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-6">
        <span className="font-bold text-slate-800">🎓 Taleemabad CMS</span>
        <nav className="flex gap-1">
          <Link to="/training">
            <Button variant={isTraining ? "default" : "ghost"} size="sm">
              Teacher Training
            </Button>
          </Link>
          <Link to="/assets">
            <Button variant={isAssets ? "default" : "ghost"} size="sm">
              Asset Manager
            </Button>
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="text-sm border rounded px-2 py-1"
            value={selectedOrg?.id ?? ""}
            onChange={e => {
              const org = ORGANIZATIONS.find(o => o.id === e.target.value)
              if (org) setOrg(org)
            }}
          >
            {ORGANIZATIONS.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={clearOrg}>Switch Org</Button>
        </div>
      </div>
    </header>
  )
}
