import { apiClient } from "./client"
import type { Training } from "../types"

export const getTrainings = (courseUuid: string) =>
  apiClient.get<Training[]>(`/api/v1/trainings/?is_active=null&course__uuid=${courseUuid}`).then(r => r.data)

export const createTrainings = (data: Record<string, unknown>[]) =>
  apiClient.post<Training[]>("/api/v1/internal/trainings/", data).then(r => r.data)

export const updateTraining = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<Training>(`/api/v1/internal/trainings/${id}/?is_active=null`, data).then(r => r.data)
