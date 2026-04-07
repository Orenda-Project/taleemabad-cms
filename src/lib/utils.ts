import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function splitKeywords(raw: string): string[] {
  return raw.split(",").map(k => k.trim()).filter(Boolean)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  })
}

export function statusColor(status: string): string {
  switch (status) {
    case "OnProd": return "bg-green-100 text-green-800"
    case "ReadyForReview": return "bg-yellow-100 text-yellow-800"
    case "New": return "bg-blue-100 text-blue-800"
    default: return "bg-gray-100 text-gray-700"
  }
}
