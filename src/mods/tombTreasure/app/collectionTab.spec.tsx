// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { difficultyTreasures, keyIdByTreasureId } from "../game/treasures"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { useTombTreasureTab } = await import("./collectionTab")

const [first, second] = [difficultyTreasures.starter[0], difficultyTreasures.junior[0]]
const withKeys = async (...keyIds: string[]) =>
  writeGameData({
    "pyramid-scheme-mod-tomb-treasure": {
      tombKeys: Object.fromEntries(keyIds.map(id => [id, true])),
      discoveredTombs: [],
      collectedMapPieces: {},
      mapPieceJourneys: [],
    },
  })

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("useTombTreasureTab", () => {
  it("is not shown and holds nothing with no key held", async () => {
    const { result } = renderHook(() => useTombTreasureTab())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.shown).toBe(false)
    expect(result.current.ids).toEqual([])
    expect(result.current.label).toBe("collection.tabs.treasures")
  })

  it("lists the treasures whose key is held", async () => {
    await withKeys(keyIdByTreasureId[first.id], keyIdByTreasureId[second.id])
    const { result } = renderHook(() => useTombTreasureTab())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.shown).toBe(true)
    expect([...result.current.ids].sort()).toEqual([first.id, second.id].sort())
  })

  it("is not loaded before the mod's own save has been read", async () => {
    await withKeys(keyIdByTreasureId[first.id])
    const { result } = renderHook(() => useTombTreasureTab())
    expect(result.current.loaded).toBe(false)
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })
})
