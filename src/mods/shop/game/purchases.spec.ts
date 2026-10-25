import { describe, expect, it } from "vitest"
import {
  purchaseFact,
  purchaseProblems,
  purchaseShopStock,
  requirementsFor,
  soundPurchases,
  type Purchase,
  type PurchaseTable,
} from "./purchases"

const TOMBS = ["made-up-tomb", "made-up-tomb-b"]

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
    expect(purchaseProblems(sound, TOMBS)).toEqual([])
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
  ])("reports %s once, naming the purchase", (_, table, problem) => {
    const problems = purchaseProblems(table, TOMBS)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(problem)
  })

  it("an unsound table is refused whole, every problem named", () => {
    expect(() => soundPurchases([purchase("mule", { price: 0, opens: { tier: "junior" } })], TOMBS)).toThrow(
      /mule: price 0.*mule: opens tier junior/
    )
    expect(soundPurchases(sound, TOMBS)).toBe(sound)
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
      { journeyId: "made-up-tomb", prefers: purchaseFact("mule") },
      { journeyId: "made-up-tomb", prefers: purchaseFact("yak") },
      { journeyId: "made-up-tomb-b", prefers: purchaseFact("flag"), nth: 1 },
    ])
  })
})
