import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getTrainings, createTrainings, updateTraining } from "../api/trainings"
import { useSafeQuery } from "./useSafeQuery"
import type { Training } from "../types"

export const useTrainings = (courseUuid: string | undefined) =>
  useSafeQuery<Training[]>({
    queryKey: ["trainings", courseUuid],
    queryFn: () => getTrainings(courseUuid!),
    enabled: !!courseUuid,
  })

export const useCreateTrainings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTrainings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainings"] }),
  })
}

export const useUpdateTraining = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateTraining(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainings"] }),
  })
}
