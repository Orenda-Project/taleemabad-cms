import { apiClient } from "./client"
import type { MediaAsset } from "../types"

const normalizeMediaAsset = (asset: any): MediaAsset => ({
  ...asset,
  category: Array.isArray(asset.category) ? asset.category : typeof asset.category === "string" ? [asset.category] : [],
})

export const getMediaAssets = (category?: string) =>
  apiClient.get<MediaAsset[]>(`/api/v1/media_assets/${category ? `?category=${category}` : ""}`).then(r =>
    Array.isArray(r.data) ? r.data.map(normalizeMediaAsset) : []
  )

export const getAssessmentAssets = () =>
  apiClient.get<MediaAsset[]>("/api/v1/media_assets?category=assessment")
    .then(r => (Array.isArray(r.data) ? r.data.map(normalizeMediaAsset) : []).filter(a => a.type !== "video"))

export const createMediaAsset = (data: Record<string, unknown>) =>
  apiClient.post<MediaAsset>("/api/v1/internal/media_assets/", data).then(r => normalizeMediaAsset(r.data))

export const updateMediaAsset = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<MediaAsset>(`/api/v1/internal/media_assets/${id}/`, data).then(r => normalizeMediaAsset(r.data))

export const bulkUpdateMediaAssets = (data: Record<string, unknown>[]) =>
  apiClient.post<MediaAsset[]>("/api/v1/internal/media_assets/batch/", data).then(r =>
    Array.isArray(r.data) ? r.data.map(normalizeMediaAsset) : []
  )

export const changeAssetBucket = (assetIds: number[], status: string) =>
  apiClient.post("/api/v1/internal/media_assets/change_asset_files_bucket/", {
    assets_status: status,
    asset_ids: assetIds,
  }, { timeout: 600000 }).then(r => r.data)
