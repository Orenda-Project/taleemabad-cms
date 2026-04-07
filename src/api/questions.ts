import { apiClient } from "./client"
import type { Question } from "../types"

export const getQuestions = (trainingUuid: string) =>
  apiClient.get<Question[]>(`/api/v1/training_questions/?is_active=null&training__uuid=${trainingUuid}`).then(r => r.data)

export const getGrandQuizQuestions = (grandQuizId: number) =>
  apiClient.get<Question[]>(`/api/v1/training_questions/?grand_quiz=${grandQuizId}`).then(r => r.data)

export const getBulkQuestions = (trainingIds: number[], grandQuizIds: number[]) =>
  apiClient.get<Question[]>(
    `/api/v1/training_questions/?is_active=null&training_ids=${trainingIds.join(",")}&grand_quiz_ids=${grandQuizIds.join(",")}`
  ).then(r => r.data)

export const createQuestions = (data: Record<string, unknown>[]) =>
  apiClient.post<Question[]>("/api/v1/internal/training_question/", data).then(r => r.data)

export const updateQuestion = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<Question>(`/api/v1/internal/training_question/${id}/?is_active=null`, data).then(r => r.data)
