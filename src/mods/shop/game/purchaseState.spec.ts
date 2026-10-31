import { describe, expect, it } from "vitest"
import type { PurchaseTable } from "./purchases"
import {
  emptyPurchaseSave,
  heldFacts,
  readPurchaseSave,
  recordPurchase,
  updatePurchaseSave,
  type PurchaseSave,
} from "./purchaseState"

const table: PurchaseTable = [
  { id: "mule", fact: "purchase:mule", price: 10, soldAt: { journeyId: "tomb_a" }, opens: { tier: "expert" } },
  { id: "flag", fact: "purchase:flag", price: 20, soldAt: { journeyId: "tomb_b" } },
]

describe("recordPurchase", () => {
  it("records a purchase bought twice once", () => {
    const once = recordPurchase(emptyPurchaseSave(), "mule")
    expect(recordPurchase(once, "mule")).toEqual({ version: 1, purchases: ["mule"] })
  })
})

describe("heldFacts", () => {
  it("holds the fact of every recorded purchase the table knows", () => {
    const save = recordPurchase(recordPurchase(emptyPurchaseSave(), "mule"), "flag")
    expect([...heldFacts(save, table)]).toEqual(["purchase:mule", "purchase:flag"])
  })

  it("keeps an unknown id in the save and holds nothing for it", () => {
    const save = recordPurchase(emptyPurchaseSave(), "griffin")
    expect(save.purchases).toEqual(["griffin"])
    expect(heldFacts(save, table).size).toBe(0)
  })
})

describe("readPurchaseSave", () => {
  it.each([undefined, null, 7, "mule", { version: 2, purchases: ["mule"] }, { version: 1, purchases: [3] }])(
    "reads %j as nothing bought",
    stored => expect(readPurchaseSave(stored)).toEqual(emptyPurchaseSave())
  )

  it("reads a version 1 save back as it is", () => {
    const save: PurchaseSave = { version: 1, purchases: ["mule", "griffin"] }
    expect(readPurchaseSave(save)).toEqual(save)
  })
})

describe("updatePurchaseSave", () => {
  const record = (save: PurchaseSave) => recordPurchase(save, "mule")

  it("starts from the empty save when nothing is stored", () => {
    expect(updatePurchaseSave(undefined, record)).toEqual({ version: 1, purchases: ["mule"] })
  })

  it("hands a version 2 save back untouched", () => {
    const newer = { version: 2, purchases: ["flag"], extra: true }
    expect(updatePurchaseSave(newer, record)).toBe(newer)
  })

  it("hands a damaged save back untouched", () => {
    const damaged = { version: 1, purchases: "mule" }
    expect(updatePurchaseSave(damaged, record)).toBe(damaged)
  })
})
