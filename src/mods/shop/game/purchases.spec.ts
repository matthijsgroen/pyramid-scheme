import { describe, expect, it } from "vitest"
import {
  purchaseFact,
  purchaseProblems,
  purchaseShopStock,
  requirementsFor,
  type Purchase,
  type PurchaseJourney,
  type PurchaseTable,
} from "./purchases"

const JOURNEYS: PurchaseJourney[] = [
  { id: "made-up-tomb", tier: "expert", tomb: true },
  { id: "made-up-tomb-b", tier: "expert", tomb: true },
  { id: "made-up-pyramid", tier: "expert", tomb: false },
  { id: "made-up-junior-tomb", tier: "junior", tomb: true },
  { id: "made-up-starter-pyramid", tier: "starter", tomb: false },
]

const purchase = (id: string, rest: Partial<Purchase> = {}): Purchase => ({
  id,
  fact: purchaseFact(id),
  price: 100,
  soldAt: { journeyId: "made-up-tomb" },
  ...rest,
})

const sound: PurchaseTable = [
  purchase("mule", { opens: { tier: "expert" } }),
  purchase("yak", { opens: { journeyId: "made-up-tomb-b" } }),
  purchase("flag", { soldAt: { journeyId: "made-up-tomb-b", nth: 1 } }),
]

describe(purchaseProblems, () => {
  it("finds nothing wrong with a sound table", () => {
    expect(purchaseProblems(sound, JOURNEYS)).toEqual([])
  })

  it.each<[string, PurchaseTable, RegExp]>([
    ["a duplicate id", [purchase("mule"), purchase("mule")], /mule: id mule/],
    ["a fact that is not the id's", [purchase("mule", { fact: "made-up:mule" })], /mule: fact made-up:mule/],
    ["a price of 0", [purchase("mule", { price: 0 })], /mule: price 0/],
    ["a price that is not whole", [purchase("mule", { price: 2.5 })], /mule: price 2.5/],
    ["a shop that is not a tomb", [purchase("mule", { soldAt: { journeyId: "made-up-pyramid" } })], /mule: sold at/],
    [
      "two purchases on one tier",
      [purchase("mule", { opens: { tier: "master" } }), purchase("yak", { opens: { tier: "master" } })],
      /yak: gate tier master is also mule's/,
    ],
    [
      "two purchases on one journey",
      [
        purchase("mule", { opens: { journeyId: "made-up-tomb-b" } }),
        purchase("yak", { opens: { journeyId: "made-up-tomb-b" } }),
      ],
      /yak: gate journey made-up-tomb-b is also mule's/,
    ],
    ["a purchase opening starter", [purchase("mule", { opens: { tier: "starter" } })], /mule: opens tier starter/],
    ["a purchase opening junior", [purchase("mule", { opens: { tier: "junior" } })], /mule: opens tier junior/],
    [
      "a purchase opening a junior journey",
      [purchase("mule", { opens: { journeyId: "made-up-junior-tomb" } })],
      /mule: opens journey made-up-junior-tomb in tier junior/,
    ],
    [
      "a purchase opening a starter journey",
      [purchase("mule", { opens: { journeyId: "made-up-starter-pyramid" } })],
      /mule: opens journey made-up-starter-pyramid in tier starter/,
    ],
    [
      "a purchase opening a journey the world does not have",
      [purchase("mule", { opens: { journeyId: "made-up-nowhere" } })],
      /mule: opens journey made-up-nowhere, which is no journey/,
    ],
    [
      "a shop in a journey the world does not have",
      [purchase("mule", { soldAt: { journeyId: "made-up-nowhere" } })],
      /mule: sold at made-up-nowhere, not a tomb/,
    ],
  ])("reports %s once, naming the purchase", (_, table, problem) => {
    const problems = purchaseProblems(table, JOURNEYS)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(problem)
  })
})

describe(requirementsFor, () => {
  const requirements = requirementsFor([...sound, purchase("ox", { opens: { tier: "expert" } })])

  it("asks a tier for one group per purchase that opens it", () => {
    expect(requirements.tierGroups("expert")).toEqual([[purchaseFact("mule")], [purchaseFact("ox")]])
  })

  it("asks a journey for one lock per purchase that opens it", () => {
    expect(requirements.entryLocks("made-up-tomb-b")).toEqual([{ bucket: purchaseFact("yak"), threshold: 1 }])
  })

  it("asks nothing of a gate no purchase names, and a purchase that opens nothing gates nothing", () => {
    expect(requirements.tierGroups("master")).toEqual([])
    expect(requirements.entryLocks("made-up-tomb")).toEqual([])
    expect(requirementsFor([purchase("flag")]).tierGroups("expert")).toEqual([])
  })
})

describe(purchaseShopStock, () => {
  it("stocks one placeholder per purchase in its own shop, tagged with its fact", () => {
    expect(purchaseShopStock(sound)).toEqual([
      { journeyId: "made-up-tomb", prefers: purchaseFact("mule"), required: true },
      { journeyId: "made-up-tomb", prefers: purchaseFact("yak"), required: true },
      { journeyId: "made-up-tomb-b", prefers: purchaseFact("flag"), required: true, nth: 1 },
    ])
  })
})
