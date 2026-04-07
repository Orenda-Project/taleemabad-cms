import { ORGANIZATIONS } from "../config/orgs"
import { useOrgStore } from "../store/orgStore"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"

export default function OrgSelectPage() {
  const { setOrg } = useOrgStore()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">🎓 Taleemabad CMS</CardTitle>
          <p className="text-center text-slate-500 text-sm">Select your organization to continue</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ORGANIZATIONS.map(org => (
            <Button
              key={org.id}
              variant="outline"
              className="h-16 text-left flex flex-col items-start px-4"
              onClick={() => setOrg(org)}
            >
              <span className="font-semibold">{org.name}</span>
              <span className="text-xs text-slate-400">{org.stage_url}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
