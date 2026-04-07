import { apiClient } from "./client"
import type { MediaAsset } from "../types"

export const getMediaAssets = (category?: string) =>
  apiClient.get<MediaAsset[]>(`/api/v1/media_assets/${category ? `?category=${category}` : ""}`).then(r => r.data)

export const getAssessmentAssets = () =>
  apiClient.get<MediaAsset[]>("/api/v1/media_assets?category=assessment")
    .then(r => r.data.filter(a => a.type !== "video"))

export const createMediaAsset = (data: Record<string, unknown>) =>
  apiClient.post<MediaAsset>("/api/v1/internal/media_assets/", data).then(r => r.data)

export const updateMediaAsset = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<MediaAsset>(`/api/v1/internal/media_assets/${id}/`, data).then(r => r.data)

export const bulkUpdateMediaAssets = (data: Record<string, unknown>[]) =>
  apiClient.post("/api/v1/internal/media_assets/batch/", data).then(r => r.data)

export const changeAssetBucket = (assetIds: number[], status: string) =>
  apiClient.post("/api/v1/internal/media_assets/change_asset_files_bucket/", {
    assets_status: status,
    asset_ids: assetIds,
  }, { timeout: 600000 }).then(r => r.data)
