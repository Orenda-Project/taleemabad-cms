import { apiClient, ensureArray } from "./client"
import type { GrandQuiz } from "../types"

export const getGrandQuizzes = (level: number) =>
  apiClient.get<GrandQuiz[]>(`/api/v1/grand_quizzes/?level=${level}`).then(r => ensureArray<GrandQuiz>(r.data))

export const createGrandQuiz = (data: Record<string, unknown>) =>
  apiClient.post<GrandQuiz>("/api/v1/grand_quizzes/", data).then(r => r.data)

export const updateGrandQuiz = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<GrandQuiz>(`/api/v1/grand_quizzes/${id}/`, data).then(r => r.data)
