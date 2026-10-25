// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import type { FC } from "react"
import { markedItemCounts } from "@/app/pages/collectionTabContract"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { CampCollectionSection } = await import("./CampCollectionSection")
const { useCampTab } = await import("./collectionTab")

const table: CampStepTable = [
  { id: "hut", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "cloth"] },
  { id: "well", spot: "water", tier: "junior", source: "structure", parts: ["stones", "rope", "bucket"] },
]
const Section: FC<CollectionSectionProps> = props => <CampCollectionSection {...props} table={table} />

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("camp tab and section", () => {
  it("marks, on each closed row, the structures the tab lists parts of", async () => {
    await writeGameData({
      "pyramid-scheme-mod-camp": {
        version: 1,
        finds: [],
        parts: { hut: ["poles"], well: ["rope", "bucket"] },
        grown: [],
      },
    })

    const counts = await markedItemCounts(() => useCampTab(table), Section)

    expect(counts.ids).toEqual(["hut/poles", "well/rope", "well/bucket"])
    // A closed row carries one badge for the news inside it, so two structures show two badges.
    expect(counts.allNew).toBe(2)
    expect(Object.values(counts.eachNew)).toEqual([1, 1, 1])
  })
})
