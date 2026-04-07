import { apiClient } from "./client"
import type { Level } from "../types"

export const getLevels = () =>
  apiClient.get<Level[]>("/api/v1/levels/?is_active=true").then(r => r.data)
