import { describe, expect, it } from "vitest"
import { purchaseFact, type PurchaseTable } from "./purchases"
import { shopReachability } from "./reachabilitySupport"

const table: PurchaseTable = [
  {
    id: "mule",
    fact: purchaseFact("mule"),
    price: 100,
    soldAt: { journeyId: "made-up-tomb" },
    opens: { tier: "expert" },
  },
  {
    id: "yak",
    fact: purchaseFact("yak"),
    price: 100,
    soldAt: { journeyId: "made-up-tomb" },
    opens: { journeyId: "made-up-tomb-b" },
  },
]
const support = shopReachability(table)

describe(shopReachability, () => {
  it("a purchase in reach is held as its fact; any other reward feeds nothing", () => {
    expect(support.bucketForReward?.({ type: "purchase", id: "mule" })).toBe(purchaseFact("mule"))
    expect(support.bucketForReward?.({ type: "purchase", id: "made-up-ox" })).toBeUndefined()
    expect(support.bucketForReward?.({ type: "mosaicPiece" })).toBeUndefined()
  })

  it("the gate a purchase opens asks for its fact", () => {
    expect(support.tierUnlockGroups?.("expert")).toEqual([[purchaseFact("mule")]])
    expect(support.journeyEntryLocks?.("made-up-tomb-b")).toEqual([{ bucket: purchaseFact("yak"), threshold: 1 }])
  })

  it("starter and junior ask for no purchase", () => {
    expect(support.tierUnlockGroups?.("starter")).toEqual([])
    expect(support.tierUnlockGroups?.("junior")).toEqual([])
  })
})
