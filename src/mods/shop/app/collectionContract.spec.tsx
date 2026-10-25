// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { markedItemCounts } from "@/app/pages/collectionTabContract"
import { ALL_SELLABLES } from "@/data/sellables"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { ShopCollectionSection } = await import("./ShopCollectionSection")
const { useShopTab } = await import("./collectionTab")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("shop tab and section", () => {
  it("marks exactly the sellables the tab lists", async () => {
    const held = [ALL_SELLABLES[0].id, ALL_SELLABLES[1].id, ALL_SELLABLES[2].id]
    await writeGameData({ "inventory-v2": Object.fromEntries(held.map((id, index) => [id, index + 1])) })

    const counts = await markedItemCounts(useShopTab, ShopCollectionSection)

    expect([...counts.ids].sort()).toEqual([...held].sort())
    expect(counts.allNew).toBe(held.length)
    expect(Object.values(counts.eachNew)).toEqual(held.map(() => 1))
  })
})
