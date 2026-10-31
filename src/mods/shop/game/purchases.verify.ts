import { describe, expect, it } from "vitest"
import { PURCHASES, purchaseProblems, worldPurchaseJourneys } from "./purchases"

describe("the purchase table", () => {
  it("is sound against the world's journeys: every purchase in a tomb shop, none gating starter or junior", () => {
    expect(purchaseProblems(PURCHASES, worldPurchaseJourneys())).toEqual([])
  })
})
