import { useQuery } from "@tanstack/react-query"
import { getLevels } from "../api/levels"

export const useLevels = () =>
  useQuery({ queryKey: ["levels"], queryFn: getLevels, staleTime: Infinity })
