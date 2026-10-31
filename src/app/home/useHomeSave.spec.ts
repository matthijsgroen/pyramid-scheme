// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import { clearGameData, latestGameValue, writeGameData } from "@/support/useGameStorage"
import { useHomeSave } from "./useHomeSave"

const coins: TreasureReward = { type: "coins", amount: 3 }
const trinket: TreasureReward = { type: "trinket", name: "bead" }

beforeEach(async () => {
  await clearGameData()
})

describe("useHomeSave", () => {
  it("empties the haul on clearHaul after two rewards were added", async () => {
    const { result } = renderHook(() => useHomeSave())
    await act(async () => result.current.addToHaul(coins))
    await act(async () => result.current.addToHaul(trinket))
    expect(result.current.haul).toEqual([coins, trinket])
    await act(async () => result.current.clearHaul())
    expect(result.current.haul).toEqual([])
  })

  it("stores version 1 and the reward objects only", async () => {
    const { result } = renderHook(() => useHomeSave())
    await act(async () => result.current.addToHaul(coins))
    await act(async () => result.current.addToHaul(trinket))
    expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [coins, trinket] })
  })

  it("records the chapter", async () => {
    const { result } = renderHook(() => useHomeSave())
    await act(async () => result.current.markChapter("junior"))
    expect(result.current.chapter).toBe("junior")
  })

  it("leaves a save it cannot read untouched", async () => {
    const newer = { version: 2, haul: [coins], extra: true }
    await writeGameData({ homecoming: newer })
    const { result } = renderHook(() => useHomeSave())
    await act(async () => result.current.addToHaul(trinket))
    expect(result.current.haul).toEqual([])
    expect(latestGameValue("homecoming")).toEqual(newer)
  })
})
