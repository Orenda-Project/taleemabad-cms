import { describe, it, expect } from "vitest"
import { parseBulkResponse, buildUuidIdMap } from "../api/retool"

describe("parseBulkResponse", () => {
  it("reads new {resolved, conflicts} shape", () => {
    const data = {
      resolved: [{ uuid: "abc", id: 10 }],
      conflicts: [{ uuid: "def", natural_key: { title: "X" }, candidate_ids: [1, 2], reason: "ambiguous" }],
    }
    const result = parseBulkResponse(data)
    expect(result.resolved).toEqual([{ uuid: "abc", id: 10 }])
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].uuid).toBe("def")
  })

  it("falls back gracefully for legacy bare-array response", () => {
    const data = [{ uuid: "abc", id: 10 }, { uuid: "xyz", id: 20 }]
    const result = parseBulkResponse(data)
    expect(result.resolved).toEqual([{ uuid: "abc", id: 10 }, { uuid: "xyz", id: 20 }])
    expect(result.conflicts).toHaveLength(0)
  })

  it("returns empty resolved+conflicts for unexpected shape", () => {
    const result = parseBulkResponse(null)
    expect(result.resolved).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
  })
})

describe("buildUuidIdMap", () => {
  it("builds a uuid→id map from resolved list", () => {
    const resolved = [{ uuid: "aaa", id: 1 }, { uuid: "bbb", id: 2 }]
    expect(buildUuidIdMap(resolved)).toEqual({ aaa: 1, bbb: 2 })
  })

  it("returns empty object for empty input", () => {
    expect(buildUuidIdMap([])).toEqual({})
  })
})
