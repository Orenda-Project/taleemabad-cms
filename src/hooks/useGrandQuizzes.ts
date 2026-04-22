import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getGrandQuizzes, createGrandQuiz, updateGrandQuiz } from "../api/grandQuizzes"
import { useSafeQuery } from "./useSafeQuery"
import type { GrandQuiz } from "../types"

export const useGrandQuizzes = (level: number | undefined) =>
  useSafeQuery<GrandQuiz[]>({
    queryKey: ["grand-quizzes", level],
    queryFn: () => getGrandQuizzes(level!),
    enabled: !!level,
  })

export const useCreateGrandQuiz = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createGrandQuiz,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grand-quizzes"] }),
  })
}

export const useUpdateGrandQuiz = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateGrandQuiz(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grand-quizzes"] }),
  })
}
