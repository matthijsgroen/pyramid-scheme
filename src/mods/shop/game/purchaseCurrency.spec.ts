import { describe, expect, it } from "vitest"
import type { SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"
import { placeFragments, type CurrencyDistribution } from "@/worldGen/placeFragments"
import { placeShopStock } from "@/worldGen/shopStock"
import { defaultResolveEncounter } from "@/game/siteAssembler"
import type { Slot } from "@/worldGen/slots"
import { PYRAMID_JOURNEYS } from "@/worldGen/data"
import { purchaseFact, purchaseShopStock, type Purchase, type PurchaseTable } from "./purchases"
import { purchaseCurrency } from "./purchaseCurrency"
import { shopReachability } from "./reachabilitySupport"

// placeFragments reads each journey's tier from the world's journey list, so the made-up worlds borrow one journey id
// per tier; their floors, shops and the purchase tables are all made up here.
const journeyOfTier = (tier: string): string => {
  const journey = PYRAMID_JOURNEYS.find(j => j.tier === tier)
  if (!journey) throw new Error(`no ${tier} journey to borrow`)
  return journey.id
}
const STARTER = journeyOfTier("starter")
const JUNIOR = journeyOfTier("junior")
const EXPERT = journeyOfTier("expert")

const shopSection = (slots: number, rest: Partial<SubSection> = {}): SubSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  encounter: "fez-shop",
  rewards: Array.from({ length: slots }, () => undefined),
  ...rest,
})
const site = (sections: SubSection[] = [], rest: Partial<SiteConfig[number]> = {}): SiteConfig => [
  { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: sections, ...rest },
]
const shopOf = (world: Record<string, SiteConfig[]>, journeyId: string): SubSection =>
  world[journeyId][0][0].sideSections[0]

const purchase = (id: string, journeyId: string, opens?: Purchase["opens"]): Purchase => ({
  id,
  fact: purchaseFact(id),
  price: 100,
  soldAt: { journeyId },
  ...(opens ? { opens } : {}),
})
const bought = (id: string): TreasureReward => ({ type: "purchase", id })

// Stocks the table's placeholders as the build does, then runs the worklist with the purchases and any other currency.
const place = (world: Record<string, SiteConfig[]>, table: PurchaseTable, others: CurrencyDistribution[] = []) => {
  placeShopStock(world, purchaseShopStock(table), defaultResolveEncounter)
  return placeFragments(
    world,
    [...others, purchaseCurrency(table)],
    undefined,
    [],
    [],
    undefined,
    0,
    shopReachability(table)
  )
}

describe("purchases on the worklist", () => {
  it("a purchase lands in its own shop's placeholder", () => {
    // The flag's placeholder comes first in the shop, the mule's second; the mule is placed first, at the expert gate.
    const table = [purchase("flag", JUNIOR), purchase("mule", JUNIOR, { tier: "expert" })]
    const world = { [STARTER]: [site()], [JUNIOR]: [site([shopSection(2)])], [EXPERT]: [site()] }
    const { walk } = place(world, table)
    expect(shopOf(world, JUNIOR).rewards).toEqual([bought("flag"), bought("mule")])
    expect(walk().enteredJourneys).toContain(EXPERT)
  })

  it.each<[string, Purchase, Record<string, SiteConfig[]>, RegExp]>([
    [
      "tier",
      purchase("mule", EXPERT, { tier: "expert" }),
      { [STARTER]: [site()], [JUNIOR]: [site()], [EXPERT]: [site([shopSection(1)])] },
      /mule \(purchase:mule\) unplaceable.*before its gate \(tier expert\)/,
    ],
    [
      "journey",
      purchase("yak", JUNIOR, { journeyId: JUNIOR }),
      { [STARTER]: [site()], [JUNIOR]: [site([shopSection(1)])] },
      new RegExp(`yak \\(purchase:yak\\) unplaceable.*before its gate \\(${JUNIOR} entrance\\)`),
    ],
  ])("a purchase whose shop lies behind the %s it opens fails the build, naming both", (_, p, world, refusal) => {
    expect(() => place(world, [p])).toThrow(refusal)
  })

  it("a purchase that opens nothing is still placed by the completion pass", () => {
    const world = { [STARTER]: [site([shopSection(1)])], [JUNIOR]: [site()] }
    place(world, [purchase("flag", STARTER)])
    expect(shopOf(world, STARTER).rewards).toEqual([bought("flag")])
  })

  it("a purchase whose shop opens only once another key is placed waits for that key", () => {
    // The junior journey is listed first and opens on the yak, so the yak is tried before the glyph that opens its shop.
    const glyph: TreasureReward = { type: "made-up-glyph" }
    const glyphs: CurrencyDistribution = {
      ownsBucket: bucket => bucket === "made-up-glyph",
      toReward: () => glyph,
      bucketForReward: reward => (reward.type === glyph.type ? "made-up-glyph" : undefined),
      demandFor: bucket => ({
        bucket,
        instanceId: "made-up-glyph",
        tier: "starter",
        preferredWardKeys: [],
        required: 1,
        totalRequired: 1,
      }),
      rank: candidates => [...candidates],
    }
    const world = {
      [JUNIOR]: [site()],
      [STARTER]: [
        site([shopSection(1, { gate: { type: "tomb-key", wardKeyId: "made-up-glyph" } })], {
          mainEndReward: { type: "fragmentSlot" },
        }),
      ],
    }
    const { walk } = place(world, [purchase("yak", STARTER, { journeyId: JUNIOR })], [glyphs])
    expect(world[STARTER][0][0].mainEndReward).toEqual(glyph)
    expect(shopOf(world, STARTER).rewards).toEqual([bought("yak")])
    expect(walk().enteredJourneys).toContain(JUNIOR)
  })

  it("no other currency takes a purchase placeholder", () => {
    // A made-up currency that would rather sit in a shop than anywhere else, run before the purchases.
    const glyph: TreasureReward = { type: "made-up-glyph" }
    const shopFirst: CurrencyDistribution = {
      ownsBucket: bucket => bucket === "made-up-glyph",
      toReward: () => glyph,
      allBuckets: () => ["made-up-glyph"],
      demandFor: bucket => ({
        bucket,
        instanceId: "made-up-glyph",
        tier: "starter",
        preferredWardKeys: [],
        required: 1,
        totalRequired: 1,
      }),
      rank: candidates =>
        [...candidates].sort((a, b) => Number(b.encounter === "fez-shop") - Number(a.encounter === "fez-shop")),
    }
    const world = {
      [STARTER]: [site([shopSection(1)], { mainEndReward: { type: "fragmentSlot" } })],
      [JUNIOR]: [site()],
    }
    place(world, [purchase("flag", STARTER)], [shopFirst])
    expect(shopOf(world, STARTER).rewards).toEqual([bought("flag")])
    expect(world[STARTER][0][0].mainEndReward).toEqual(glyph)
  })
})

describe("purchaseCurrency rank", () => {
  const table = [purchase("mule", STARTER), purchase("yak", STARTER)]
  const currency = purchaseCurrency(table)
  const slot = (preference?: string): Slot => ({
    ref: { journeyId: STARTER, levelIndex: 0, floorIndex: 0 },
    journeyId: STARTER,
    tier: "starter",
    wardKeys: [],
    isPlaceholder: true,
    preference,
    kind: "end",
    rewardPriority: 0,
    encounter: "fez-shop",
    assign: () => {},
  })

  it("a purchase is never ranked into a slot that is not its placeholder", () => {
    const own = slot(purchaseFact("mule"))
    const candidates = [slot(), slot(purchaseFact("yak")), slot("made-up-glyph"), own]
    expect(currency.rank(candidates, currency.demandFor(purchaseFact("mule"), {}))).toEqual([own])
  })

  it("owns every purchase fact and nothing else, and lists each for the completion pass", () => {
    expect(currency.ownsBucket(purchaseFact("yak"))).toBe(true)
    expect(currency.ownsBucket(purchaseFact("made-up-ox"))).toBe(false)
    expect(currency.allBuckets?.()).toEqual([purchaseFact("mule"), purchaseFact("yak")])
    expect(currency.toReward("yak")).toEqual(bought("yak"))
    expect(currency.demandFor(purchaseFact("yak"), {})).toMatchObject({ instanceId: "yak", required: 1 })
  })

  it("a purchase sold at a journey the world does not have is refused by name", () => {
    const lost = purchaseCurrency([purchase("ox", "made-up-nowhere")])
    expect(() => lost.demandFor(purchaseFact("ox"), {})).toThrow(
      "purchases: ox is sold at made-up-nowhere, which is no journey"
    )
  })
})
