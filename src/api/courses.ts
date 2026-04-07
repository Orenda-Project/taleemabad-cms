import { apiClient } from "./client"
import type { Course } from "../types"

export const getCourses = (type?: string) =>
  apiClient.get<Course[]>(`/api/v1/courses/?is_active=true${type ? `&type=${type}` : ""}`).then(r => r.data)

export const getCoursesForReview = () =>
  apiClient.get<Course[]>("/api/v1/courses/?is_active=null").then(r => r.data)

export const createCourse = (data: Record<string, unknown>) =>
  apiClient.post<Course>("/api/v1/internal/courses/", data).then(r => r.data)

export const updateCourse = (id: number, data: Record<string, unknown>) =>
  apiClient.patch<Course>(`/api/v1/internal/courses/${id}/?is_active=null`, data).then(r => r.data)
