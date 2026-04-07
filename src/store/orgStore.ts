import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Org } from "../types"

interface OrgState {
  selectedOrg: Org | null
  setOrg: (org: Org) => void
  clearOrg: () => void
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      selectedOrg: null,
      setOrg: (org) => set({ selectedOrg: org }),
      clearOrg: () => set({ selectedOrg: null }),
    }),
    { name: "taleemabad-org" }
  )
)
