import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMediaAssets, getAssessmentAssets, createMediaAsset,
  updateMediaAsset, bulkUpdateMediaAssets, changeAssetBucket
} from "../api/mediaAssets"
import { useSafeQuery } from "./useSafeQuery"
import type { MediaAsset } from "../types"

export const useMediaAssets = (category?: string) =>
  useSafeQuery<MediaAsset[]>({
    queryKey: ["media-assets", category],
    queryFn: () => getMediaAssets(category),
  })

export const useAssessmentAssets = () =>
  useSafeQuery<MediaAsset[]>({
    queryKey: ["assessment-assets"],
    queryFn: getAssessmentAssets,
  })

export const useCreateMediaAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMediaAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-assets"] }),
  })
}

export const useUpdateMediaAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateMediaAsset(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-assets"] }),
  })
}

export const useBulkUpdateMediaAssets = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: bulkUpdateMediaAssets,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-assets"] }),
  })
}

export const useChangeAssetBucket = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetIds, status }: { assetIds: number[]; status: string }) =>
      changeAssetBucket(assetIds, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-assets"] }),
  })
}
