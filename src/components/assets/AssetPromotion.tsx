import { useState, useRef } from "react"
import { useMediaAssets } from "../../hooks/useMediaAssets"
import { useOrgStore } from "../../store/orgStore"
import { prodClient } from "../../api/client"
import { bulkUpdateMediaAssets, changeAssetBucket } from "../../api/mediaAssets"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import type { MediaAsset } from "../../types"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "../../hooks/use-toast"

const PROMO_STEPS = [
  "Fetching prod URLs",
  "Moving files to approved bucket",
  "Updating stage records",
  "Writing to prod DB",
]

export default function AssetPromotion() {
  const { data: assets = [], isLoading } = useMediaAssets()
  const { selectedOrg } = useOrgStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const currentStepRef = useRef<number>(-1)

  const readyAssets = assets.filter(a => a.status === "ReadyForReview")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [steps, setSteps] = useState<Record<number, "pending" | "done" | "error">>({})

  function toggleSelect(id: number) {
    if (selected.size >= 3 && !selected.has(id)) {
      toast({ title: "Max 3 assets at a time", variant: "destructive" })
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setStep(i: number, state: "pending" | "done" | "error") {
    currentStepRef.current = i
    setSteps(prev => ({ ...prev, [i]: state }))
  }

  async function promote() {
    if (!selectedOrg || selected.size === 0) return
    const selectedAssets = readyAssets.filter(a => selected.has(a.id))
    const pc = prodClient(selectedOrg.prod_url)
    setUploading(true)
    setSteps({})
    currentStepRef.current = -1

    try {
      // Step 1: fetch prod URLs
      setStep(0, "pending")
      const ids = selectedAssets.map(a => a.id).join(",")
      const prodAssets: MediaAsset[] = await pc.get(`/api/v1/media_assets/?id=${ids}`).then(r => r.data)
      const prodUrlMap: Record<number, string> = {}
      prodAssets.forEach(a => { prodUrlMap[a.id] = a.url })
      setStep(0, "done")

      // Step 2: move files (only for assets with changed/new URLs)
      setStep(1, "pending")
      const toMove = selectedAssets
        .filter(a => !prodUrlMap[a.id] || prodUrlMap[a.id] !== a.url)
        .map(a => a.id)
      if (toMove.length > 0) {
        await changeAssetBucket(toMove, "approved")
      }
      setStep(1, "done")

      // Step 3: bulk update stage records
      setStep(2, "pending")
      const stageUpdatePayload = selectedAssets.map(a => ({
        id: a.id,
        status: "OnProd",
        is_active: true,
        url: a.url.replace("asset-manager-in-review", "asset-manager-approved"),
      }))
      await bulkUpdateMediaAssets(stageUpdatePayload)
      setStep(2, "done")

      // Step 4: write to prod DB
      setStep(3, "pending")
      const prodPayload = selectedAssets.map(a => ({
        ...a,
        status: "OnProd",
        is_active: true,
        url: a.url.replace("asset-manager-in-review", "asset-manager-approved"),
      }))
      await pc.post("/api/v1/internal/media_assets/batch/", prodPayload)
      setStep(3, "done")

      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ["media-assets"] })
      toast({ title: "Assets promoted to production!" })
    } catch (err: any) {
      const failedStep = currentStepRef.current
      if (failedStep >= 0) setStep(failedStep, "error")

      // Rollback: revert stage records + move files back
      try {
        const rollbackPayload = selectedAssets.map(a => ({
          id: a.id,
          status: "ReadyForReview",
          is_active: false,
          url: a.url.replace("asset-manager-approved", "asset-manager-in-review"),
        }))
        await bulkUpdateMediaAssets(rollbackPayload)
        const toMoveBack = selectedAssets.map(a => a.id)
        await changeAssetBucket(toMoveBack, "in-review")
      } catch (_) {
        // rollback best-effort
      }

      toast({
        title: "Promotion failed — rolled back",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Ready for Review</h2>
        <Button disabled={selected.size === 0 || uploading} onClick={promote}>
          Upload to Prod ({selected.size}/3)
        </Button>
      </div>

      {uploading && (
        <div className="bg-white border rounded-lg p-4 mb-4 space-y-2">
          {PROMO_STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>{steps[i] === "done" ? "✓" : steps[i] === "error" ? "✗" : steps[i] === "pending" ? "⟳" : "○"}</span>
              <span className={steps[i] === "done" ? "text-green-600" : steps[i] === "error" ? "text-red-500" : "text-slate-500"}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? <div className="text-slate-400 text-sm">Loading...</div> : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Categories</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {readyAssets.map(asset => (
                <tr key={asset.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(asset.id)}
                      onChange={() => toggleSelect(asset.id)}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium">{asset.name}</td>
                  <td className="px-4 py-2">{asset.type}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {asset.category.map(c => (
                        <Badge key={c} className="text-xs bg-slate-100 text-slate-600">{c}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge className={cn("text-xs", statusColor(asset.status))}>{asset.status}</Badge>
                  </td>
                </tr>
              ))}
              {readyAssets.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No assets ready for review</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
