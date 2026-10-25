// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { clearGameData, latestGameValue, writeGameData } from "@/support/useGameStorage"
import { useCollectionSeen } from "./useCollectionSeen"

beforeEach(async () => {
  await clearGameData()
})

describe("useCollectionSeen", () => {
  it("gives what is left unseen after a seed and a mark", async () => {
    const { result } = renderHook(() => useCollectionSeen())
    await act(async () => result.current.seedSection("shells", ["a"]))
    await act(async () => result.current.markSeen("shells", ["b"]))
    expect(result.current.hasRecord("shells")).toBe(true)
    expect(result.current.newIds("shells", ["a", "b", "c", "d"])).toEqual(["c", "d"])
  })

  it("stores version 1 and the id lists only", async () => {
    const { result } = renderHook(() => useCollectionSeen())
    await act(async () => result.current.seedSection("shells", ["a"]))
    await act(async () => result.current.markSeen("stones", ["x"]))
    expect(latestGameValue("collectionSeen")).toEqual({ version: 1, seen: { shells: ["a"], stones: ["x"] } })
  })

  it("keeps the actions' identity across writes", async () => {
    const { result } = renderHook(() => useCollectionSeen())
    const { markSeen, seedSection } = result.current
    await act(async () => result.current.markSeen("shells", ["a"]))
    expect(result.current.markSeen).toBe(markSeen)
    expect(result.current.seedSection).toBe(seedSection)
  })

  it("leaves a save it cannot read untouched", async () => {
    const newer = { version: 2, seen: { shells: ["a"] } }
    await writeGameData({ collectionSeen: newer })
    const { result } = renderHook(() => useCollectionSeen())
    await act(async () => result.current.markSeen("shells", ["b"]))
    await act(async () => result.current.seedSection("stones", ["x"]))
    expect(latestGameValue("collectionSeen")).toEqual(newer)
    expect(result.current.newIds("shells", ["a", "b"])).toEqual([])
  })
})
