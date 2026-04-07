import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getQuestions, getGrandQuizQuestions, createQuestions, updateQuestion } from "../api/questions"

export const useQuestions = (trainingUuid: string | undefined) =>
  useQuery({
    queryKey: ["questions", trainingUuid],
    queryFn: () => getQuestions(trainingUuid!),
    enabled: !!trainingUuid,
  })

export const useGrandQuizQuestions = (grandQuizId: number | undefined) =>
  useQuery({
    queryKey: ["gq-questions", grandQuizId],
    queryFn: () => getGrandQuizQuestions(grandQuizId!),
    enabled: !!grandQuizId,
  })

export const useCreateQuestions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createQuestions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] })
      qc.invalidateQueries({ queryKey: ["gq-questions"] })
    },
  })
}

export const useUpdateQuestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateQuestion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] })
      qc.invalidateQueries({ queryKey: ["gq-questions"] })
    },
  })
}
