import { getLevels } from "../api/levels"
import { useSafeQuery } from "./useSafeQuery"
import type { Level } from "../types"

export const useLevels = (vendor?: string) =>
  useSafeQuery<Level[]>({
    queryKey: ["levels", vendor],
    queryFn: () => getLevels(vendor),
    staleTime: Infinity,
  })
