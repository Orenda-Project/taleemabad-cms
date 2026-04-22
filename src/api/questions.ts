import { apiClient, ensureArray } from "./client"
import type { Question } from "../types"

export const getQuestions = (trainingUuid: string) =>
  apiClient.get<Question[]>(`/api/v1/training_questions/?is_active=null&training__uuid=${trainingUuid}`).then(r => ensureArray<Question>(r.data))

export const getGrandQuizQuestions = (grandQuizId: number) =>
  apiClient.get<Question[]>(`/api/v1/training_questions/?grand_quiz=${grandQuizId}`).then(r => ensureArray<Question>(r.data))

export const getBulkQuestions = (trainingIds: number[], grandQuizIds: number[]) =>
  apiClient.get<Question[]>(
    `/api/v1/training_questions/?is_active=null&training_ids=${trainingIds.join(",")}&grand_quiz_ids=${grandQuizIds.join(",")}`
  ).then(r => ensureArray<Question>(r.data))

export const getBulkGrandQuizQuestions = (grandQuizIds: number[]) =>
  grandQuizIds.length === 0
    ? Promise.resolve([] as Question[])
    : apiClient.get<Question[]>(
        `/api/v1/training_questions/?is_active=null&grand_quiz_ids=${grandQuizIds.join(",")}`
      ).then(r => ensureArray<Question>(r.data))

export const createQuestions = (data: Record<string, unknown>[]) =>
  apiClient.post<Question[]>("/api/v1/internal/training_question/", data).then(r => ensureArray<Question>(r.data))

export const updateQuestion = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<Question>(`/api/v1/internal/training_question/${id}/?is_active=null`, data).then(r => r.data)
