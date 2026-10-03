import { describe, expect, it } from "vitest"
import { generateTableaus } from "./tableaus"
import { allItems, egyptianSigns } from "./symbolCatalogue"
import { HIEROGLYPH_REQUIRED } from "./hieroglyphData"

describe("inventory", () => {
  const tableaus = generateTableaus()
  const inTableaus = new Set(tableaus.flatMap(tableau => tableau.inventoryIds))
  const signIds = new Set(egyptianSigns.map(sign => sign.id))

  it("uses every noun in tableaus", () => {
    const missingItems = allItems.filter(item => !signIds.has(item.id) && !inTableaus.has(item.id))

    expect(missingItems).toEqual([])
  })

  it("keeps the signs out of tableaus — they spell, they do not count", () => {
    expect([...signIds].filter(id => inTableaus.has(id))).toEqual([])
  })

  it("grants a sign whole, so one find completes it", () => {
    for (const sign of egyptianSigns) expect(HIEROGLYPH_REQUIRED[sign.id]).toBe(1)
  })
})
