import { describe, expect, it } from "vitest"
import { generateTableaus } from "./tableaus"
import { allItems, egyptianOfferings, egyptianSigns } from "./symbolCatalogue"
import { GIVEN_SIGNS, HIEROGLYPH_REQUIRED } from "./hieroglyphData"
import { TIER_BY_HIEROGLYPH } from "./hieroglyphCurrency"
import { getItemFirstLevel } from "./itemLevelLookup"

describe("inventory", () => {
  const tableaus = generateTableaus()
  const inTableaus = new Set(tableaus.flatMap(tableau => tableau.inventoryIds))
  const signIds = new Set(egyptianSigns.map(sign => sign.id))
  const giftIds = new Set(egyptianOfferings.map(gift => gift.id))

  it("uses every noun in tableaus", () => {
    const missingItems = allItems.filter(
      item => !signIds.has(item.id) && !giftIds.has(item.id) && !inTableaus.has(item.id)
    )

    expect(missingItems).toEqual([])
  })

  it("keeps the signs out of tableaus — they spell, they do not count", () => {
    expect([...signIds].filter(id => inTableaus.has(id))).toEqual([])
  })

  it("grants a sign whole, so one find completes it", () => {
    for (const sign of egyptianSigns) expect(HIEROGLYPH_REQUIRED[sign.id]).toBe(1)
  })

  // A tableau names its signs by name, last name wins: a second item with a name already taken would
  // quietly point every story using that name at it.
  it("names every sign once", () => {
    const names = allItems.map(item => item.name)

    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([])
  })
})

describe("a sign a ghost gives", () => {
  const giftIds = egyptianOfferings.map(gift => gift.id)

  it("is one of the offerings, and every offering is given by somebody", () => {
    expect(Object.keys(GIVEN_SIGNS).sort()).toEqual([...giftIds].sort())
  })

  it("is never placed in the world: the bake and its placement filter do not know it", () => {
    expect(giftIds.filter(id => id in HIEROGLYPH_REQUIRED || id in TIER_BY_HIEROGLYPH)).toEqual([])
  })

  it("shows in the Collection at the tier of the wall it fills", () => {
    for (const id of giftIds) expect(getItemFirstLevel(id)).toBe(GIVEN_SIGNS[id])
  })
})
