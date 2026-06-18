export interface ResolvedItem {
  uuid: string
  id: number
}

export interface ConflictItem {
  uuid: string
  natural_key: Record<string, unknown>
  candidate_ids: number[]
  reason: string
}

export interface BulkSyncResponse {
  resolved: ResolvedItem[]
  conflicts: ConflictItem[]
}

/**
 * Parse a bulk endpoint response into {resolved, conflicts}.
 * Handles both the new shape ({resolved, conflicts}) and the legacy bare-array
 * shape so this works during the BE-first rollout window.
 */
export function parseBulkResponse(data: unknown): BulkSyncResponse {
  if (data && typeof data === "object" && !Array.isArray(data) && "resolved" in data) {
    const d = data as { resolved: ResolvedItem[]; conflicts?: ConflictItem[] }
    return { resolved: d.resolved ?? [], conflicts: d.conflicts ?? [] }
  }
  if (Array.isArray(data)) {
    return {
      resolved: (data as Array<{ uuid: string; id: number }>).map(r => ({ uuid: r.uuid, id: r.id })),
      conflicts: [],
    }
  }
  return { resolved: [], conflicts: [] }
}

/** Turn a resolved list into a uuid→prodId lookup map. */
export function buildUuidIdMap(resolved: ResolvedItem[]): Record<string, number> {
  return Object.fromEntries(resolved.map(r => [r.uuid, r.id]))
}
