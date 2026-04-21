import { useQuery } from "@tanstack/react-query"
import { getLevels } from "../api/levels"

export const useLevels = (vendor?: string) =>
  useQuery({
    queryKey: ["levels", vendor],
    queryFn: () => getLevels(vendor),
    staleTime: Infinity,
    placeholderData: [],
  })
