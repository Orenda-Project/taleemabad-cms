import { useState } from "react"
import { useMediaAssets } from "../../hooks/useMediaAssets"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { statusColor, cn, formatDate } from "../../lib/utils"
import { ASSET_TYPES } from "../../types"
import type { MediaAsset } from "../../types"
import AssetForm from "./AssetForm"

export default function AssetTable() {
  const { data: assets = [], isLoading } = useMediaAssets()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [editAsset, setEditAsset] = useState<MediaAsset | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = assets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || a.type === typeFilter
    const matchStatus = !statusFilter || a.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">All Assets</h2>
        <Button onClick={() => setShowAdd(true)}>+ Add Asset</Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select onValueChange={v => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ReadyForReview">ReadyForReview</SelectItem>
            <SelectItem value="OnProd">OnProd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="text-slate-400 text-sm">Loading...</div> : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Categories</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(asset => (
                <tr key={asset.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium max-w-xs truncate">{asset.name}</td>
                  <td className="px-4 py-2">{asset.type}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {asset.category.map(c => (
                        <Badge key={c} className="text-xs bg-slate-100 text-slate-600">{c}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(asset.status))}>{asset.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{formatDate(asset.created)}</td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditAsset(asset)}>Edit</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No assets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
          <AssetForm onSuccess={() => setShowAdd(false)} onCancel={() => setShowAdd(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAsset} onOpenChange={() => setEditAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Asset</DialogTitle></DialogHeader>
          {editAsset && (
            <AssetForm asset={editAsset} onSuccess={() => setEditAsset(null)} onCancel={() => setEditAsset(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
