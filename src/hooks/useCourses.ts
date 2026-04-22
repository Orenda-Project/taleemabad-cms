import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getCourses, getCoursesForReview, createCourse, updateCourse } from "../api/courses"
import { useSafeQuery } from "./useSafeQuery"
import type { Course } from "../types"

export const useCourses = (params?: { type?: string; level?: number }) =>
  useSafeQuery<Course[]>({
    queryKey: ["courses", params?.type, params?.level],
    queryFn: () => getCourses(params),
    enabled: true,
  })

export const useCoursesForReview = (params?: { level?: number; vendor?: string }) =>
  useSafeQuery<Course[]>({
    queryKey: ["courses", "review", params?.level, params?.vendor],
    queryFn: () => getCoursesForReview(params),
  })

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
