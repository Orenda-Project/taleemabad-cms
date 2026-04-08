import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCourses, getCoursesForReview, createCourse, updateCourse } from "../api/courses"

export const useCourses = (params?: { type?: string; level?: number }) =>
  useQuery({
    queryKey: ["courses", params?.type, params?.level],
    queryFn: () => getCourses(params),
    enabled: true,
  })

export const useCoursesForReview = () =>
  useQuery({ queryKey: ["courses", "review"], queryFn: getCoursesForReview })

export const useCreateCourse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  })
}

export const useUpdateCourse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateCourse(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
  })
}
