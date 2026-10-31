// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { markedItemCounts } from "@/app/pages/collectionTabContract"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { difficultyTreasures, keyIdByTreasureId } from "../game/treasures"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/app/SiteMap/perkContributions", () => ({
  useMergedPerkContributions: () => ({ describe: () => undefined, grant: () => {} }),
}))

const { TombTreasureCollectionSection } = await import("./TombTreasureCollectionSection")
const { useTombTreasureTab } = await import("./collectionTab")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("tomb treasure tab and section", () => {
  it("marks exactly the treasures the tab lists", async () => {
    const held = [difficultyTreasures.starter[0], difficultyTreasures.starter[1], difficultyTreasures.junior[0]]
    await writeGameData({
      "pyramid-scheme-mod-tomb-treasure": {
        tombKeys: Object.fromEntries(held.map(treasure => [keyIdByTreasureId[treasure.id], true])),
        discoveredTombs: [],
        collectedMapPieces: {},
        mapPieceJourneys: [],
      },
    })

    const counts = await markedItemCounts(useTombTreasureTab, TombTreasureCollectionSection)

    expect(counts.ids.length).toBe(held.length)
    expect(counts.allNew).toBe(held.length)
    expect(Object.values(counts.eachNew)).toEqual(held.map(() => 1))
  })
})
