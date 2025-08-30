import { describe, expect, it } from "vitest"
import { generateTableaus } from "./tableaus"
import { allItems } from "./inventory"

describe("inventory", () => {
  const tableaus = generateTableaus()

  it("uses all inventory items in tableaus", () => {
    const items = new Set<string>()
    tableaus.forEach(tableau => {
      tableau.inventoryIds.forEach(id => items.add(id))
    })

    const missingItems = allItems.filter(item => !items.has(item.id))
    expect(missingItems).toEqual([])
  })
})
