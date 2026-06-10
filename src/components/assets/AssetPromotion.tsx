import { useState, useRef } from "react"
import { useMediaAssets } from "../../hooks/useMediaAssets"
import { useOrgStore } from "../../store/orgStore"
import { prodClient } from "../../api/client"
import { bulkUpdateMediaAssets, changeAssetBucket } from "../../api/mediaAssets"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { statusColor, cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"
import type { MediaAsset } from "../../types"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "../../hooks/use-toast"

const PROMO_STEPS = [
  "Fetching prod URLs",
  "Moving files to approved bucket",
  "Updating stage records",
  "Writing to prod DB",
]

const S3_BUCKET_IN_REVIEW = "asset-manager-in-review"
const S3_BUCKET_APPROVED = "asset-manager-approved"

interface AssetWithOriginalUrl extends MediaAsset {
  __originalUrl?: string
}

function getErrorMessage(error: any, stepIndex: number): string {
  const stepNames = [
    "prod URL fetch",
    "file bucket move",
    "stage record update",
    "prod DB write",
  ]
  const stepName = stepNames[stepIndex] || "operation"

  if (error.response?.status === 401 || error.response?.status === 403) {
    return `Access denied during ${stepName}. Check API key permissions.`
  }
  if (error.response?.status === 404) {
    return `Endpoint not found during ${stepName}. Backend may have changed.`
  }
  if (error.response?.status === 500) {
    return `Server error during ${stepName}. Contact support.`
  }
  if (error.message === "Network Error") {
    return `Network error during ${stepName}. Check connection.`
  }
  if (error.code === "ECONNABORTED") {
    return `Timeout during ${stepName}. Server may be slow.`
  }

  const backendMsg = error.response?.data?.message || error.response?.data?.detail
  return backendMsg || error.message || `Failed at ${stepName}`
}

function rewriteUrl(url: string, fromBucket: string, toBucket: string): string {
  if (!url || !url.includes(fromBucket)) {
    console.warn(`URL doesn't contain expected bucket "${fromBucket}":`, url)
    return url
  }
  return url.replace(new RegExp(fromBucket, "g"), toBucket)
}

export default function AssetPromotion() {
  const { data: assets = [], isLoading } = useMediaAssets()
  const { selectedOrg } = useOrgStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const currentStepRef = useRef<number>(-1)
  const rollbackFailedRef = useRef<boolean>(false)

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
    const selectedAssets: AssetWithOriginalUrl[] = readyAssets.filter(a => selected.has(a.id))
    const pc = prodClient(selectedOrg.prod_url)
    setUploading(true)
    setSteps({})
    currentStepRef.current = -1
    rollbackFailedRef.current = false

    try {
      // Step 1: fetch prod URLs to see what exists
      setStep(0, "pending")
      const ids = selectedAssets.map(a => a.id).join(",")
      const prodAssets: MediaAsset[] = await pc.get(`/api/v1/media_assets/?id=${ids}`).then(r => r.data)
      const prodUrlMap: Record<number, string> = {}
      prodAssets.forEach(a => { prodUrlMap[a.id] = a.url })
      setStep(0, "done")

      // Store original URLs for safe rollback
      selectedAssets.forEach(a => {
        a.__originalUrl = a.url
      })

      // Step 2: move files to approved bucket (skip assets already in approved bucket or unchanged from prod)
      setStep(1, "pending")
      const toMove = selectedAssets
        .filter(a => !a.url.includes(S3_BUCKET_APPROVED) && (!prodUrlMap[a.id] || prodUrlMap[a.id] !== a.url))
        .map(a => a.id)
      if (toMove.length > 0) {
        await changeAssetBucket(toMove, "approved")
      }
      setStep(1, "done")

      // Step 3: bulk update stage records with rewritten URL
      setStep(2, "pending")
      const stageUpdatePayload = selectedAssets.map(a => ({
        ...a,
        status: "OnProd",
        is_active: true,
        url: rewriteUrl(a.url, S3_BUCKET_IN_REVIEW, S3_BUCKET_APPROVED),
      }))
      await bulkUpdateMediaAssets(stageUpdatePayload)
      setStep(2, "done")

      // Step 4: write to prod DB
      setStep(3, "pending")
      const prodPayload = selectedAssets.map(a => ({
        ...a,
        status: "OnProd",
        is_active: true,
        url: rewriteUrl(a.url, S3_BUCKET_IN_REVIEW, S3_BUCKET_APPROVED),
      }))
      await pc.post("/api/v1/internal/media_assets/batch/", prodPayload)
      setStep(3, "done")

      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ["media-assets"] })
      toast({ title: "✓ Assets promoted to production!" })
    } catch (err: any) {
      const failedStep = currentStepRef.current
      if (failedStep >= 0) setStep(failedStep, "error")

      const errorMsg = getErrorMessage(err, failedStep)

      // Rollback: revert stage records + move files back
      try {
        const rollbackPayload = selectedAssets.map(a => ({
          ...a,
          status: "ReadyForReview",
          is_active: false,
          url: a.__originalUrl || rewriteUrl(a.url, S3_BUCKET_APPROVED, S3_BUCKET_IN_REVIEW),
        }))
        await bulkUpdateMediaAssets(rollbackPayload)
        const toMoveBack = selectedAssets
          .filter(a => (a.__originalUrl || a.url).includes(S3_BUCKET_IN_REVIEW))
          .map(a => a.id)
        if (toMoveBack.length > 0) await changeAssetBucket(toMoveBack, "in_review")
      } catch (rollbackErr: any) {
        rollbackFailedRef.current = true
        console.error("Rollback failed:", rollbackErr)
      }

      const rollbackMsg = rollbackFailedRef.current
        ? "\n⚠️ Rollback FAILED. Contact support with asset IDs."
        : ""

      toast({
        title: `✗ Promotion failed at ${PROMO_STEPS[failedStep]}`,
        description: errorMsg + rollbackMsg,
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

      {isLoading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
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
                      {(asset.category || []).map(c => (
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
