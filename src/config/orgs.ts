import type { Org } from "../types"

export const ORGANIZATIONS: Org[] = [
  {
    id: "FDE",
    name: "Federal - FDE",
    publisher: "NBF",
    stage_url: import.meta.env.VITE_FDE_STAGE_URL ?? "https://fde-staging.taleemabad.com",
    prod_url: import.meta.env.VITE_FDE_PROD_URL ?? "https://schools.niete.pk",
  },
  {
    id: "RWL",
    name: "Rawalpindi",
    publisher: "NBF",
    stage_url: import.meta.env.VITE_RWL_STAGE_URL ?? "https://fde-staging.taleemabad.com",
    prod_url: import.meta.env.VITE_RWL_PROD_URL ?? "https://rawalpindi.niete.pk",
  },
  {
    id: "OXBRIDGE",
    name: "Oxbridge",
    publisher: "Oxbridge",
    stage_url: "",
    prod_url: "",
  },
]
