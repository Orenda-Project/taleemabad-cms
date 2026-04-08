import { apiClient } from "./client"
import type { Level } from "../types"

export const getLevels = (vendor?: string) => {
  const params = new URLSearchParams({ is_active: "true" })
  if (vendor) params.set("vendor", vendor)
  return apiClient.get<Level[]>(`/api/v1/levels/?${params}`).then(r => r.data)
}
