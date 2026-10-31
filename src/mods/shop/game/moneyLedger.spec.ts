import { describe, expect, it } from "vitest"
import type { TreasureReward } from "@/worldGen/types"
import { reachableGrounds } from "@/worldGen/grounds"
import { mulberry32 } from "@/game/random"
import { moneyLedger } from "./moneyLedger"
import { incomeOf, runEconomyGuard } from "./economyGuard"
import { groundWorld, lens, purchase, tableOf, type GroundJourney } from "./groundWorlds.testing"

describe(moneyLedger, () => {
  it("refuses the old per-gate counterexample, naming the ground where buying A strands the player", () => {
    // Starting income 100; keys A, B and C cost 50 each. A opens a room selling a 50-coin piece and holding no money;
    // B and C each open 1000. Buying A and then that piece leaves nothing for B or C.
    const [a, b, c, piece] = [purchase("A"), purchase("B"), purchase("C"), purchase("M")]
    const table = tableOf({ A: 50, B: 50, C: 50, M: 50 })
    const { configs, walk } = groundWorld({
      start: { money: [100], stock: [a, b, c] },
      behindA: { needs: ["purchase:A"], stock: [piece] },
      behindB: { needs: ["purchase:B"], money: [1000] },
      behindC: { needs: ["purchase:C"], money: [1000] },
    })
    const priceOf = (reward: TreasureReward) => table.find(p => p.id === reward.id)?.price ?? 0

    for (const fact of ["purchase:A", "purchase:B", "purchase:C"]) {
      const before = walk(fact).rewards
      const income = before.reduce((sum, r) => sum + incomeOf(r), 0)
      const buyable = before.reduce((sum, r) => sum + (r.type === "purchase" ? priceOf(r) : 0), 0)
      expect(income).toBeGreaterThanOrEqual(buyable)
    }

    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).toThrow(
      /with A bought, income 100 is short of buyable 200 by 100/
    )
  })

  it("money behind a hidden corridor does not cover a purchase until the detector is held", () => {
    const key = purchase("K")
    const table = tableOf({ K: 50 })
    const lensBehindTheKey = groundWorld({
      start: { stock: [key], hiddenMoney: 100 },
      behindK: { needs: ["purchase:K"], mainEnd: lens },
    })
    expect(() => runEconomyGuard(lensBehindTheKey.configs, [], lensBehindTheKey.walk, { purchases: table })).toThrow(
      /with nothing bought, income 0 is short of buyable 50 by 50/
    )

    const lensBeforeTheShop = groundWorld({
      start: { stock: [key], hiddenMoney: 100, mainEnd: lens },
      behindK: { needs: ["purchase:K"] },
    })
    expect(() =>
      runEconomyGuard(lensBeforeTheShop.configs, [], lensBeforeTheShop.walk, { purchases: table })
    ).not.toThrow()
  })

  it("Fez's waterskins count as buyable in their ground and never open anything", () => {
    const key = purchase("K")
    const skins: TreasureReward[] = [{ type: "waterskin" }, { type: "waterskin" }]
    const { walk } = groundWorld({
      start: { money: [100], stock: [key, ...skins] },
      behindK: { needs: ["purchase:K"], money: [10] },
    })
    const found = reachableGrounds(walk, { isKey: walk.isKey, cap: 100 })
    if (!("grounds" in found)) throw new Error("over the cap")
    expect(skins.some(walk.isKey)).toBe(false)
    expect(found.grounds.map(g => g.bought)).toEqual([[], [key]])
    const priceOf = (reward: TreasureReward) => (reward.type === "waterskin" ? 30 : 50)
    expect(moneyLedger(found.grounds, priceOf, incomeOf)).toEqual([
      { label: "nothing", income: 100, buyable: 110, margin: -10 },
      { label: "K", income: 110, buyable: 110, margin: 0 },
    ])
  })
})

// A made-up world drawn from a seed, described twice: once as configs the real walk carves, once as the plain facts
// an exhaustive spender plays on.
type Piece = { reward: TreasureReward; id: string; price: number; shop: string; key: boolean }
type Drawn = { journeys: Record<string, GroundJourney>; pieces: Piece[]; lensAt?: string; hiddenAt?: string }

const draw = (seed: number): Drawn => {
  const random = mulberry32(seed)
  const below = (n: number) => Math.floor(random() * n)
  const keys = 1 + below(4)
  const rares = below(4)
  const ids = ["start", ...Array.from({ length: keys }, (_, i) => `behind${i}`)]
  const journeys: Record<string, GroundJourney> = Object.fromEntries(
    ids.map(id => [id, { money: Array.from({ length: below(4) }, () => 50 * below(12)) }])
  )
  for (let i = 0; i < keys; i++) {
    const needs = [`purchase:k${i}`]
    if (keys > 1 && random() < 0.5) needs.push(`purchase:k${(i + 1 + below(keys - 1)) % keys}`)
    journeys[`behind${i}`].needs = needs
  }
  const shops = ["start", ...ids.slice(1).filter(() => random() < 0.4)].slice(0, 3)
  const pieces: Piece[] = [
    ...Array.from({ length: keys }, (_, i) => ({ id: `k${i}`, key: true })),
    ...Array.from({ length: rares }, (_, i) => ({ id: `r${i}`, key: false })),
  ].map(({ id, key }) => ({
    id,
    key,
    reward: purchase(id),
    price: 50 + 50 * below(6),
    shop: shops[below(shops.length)],
  }))
  for (const piece of pieces) (journeys[piece.shop].stock ??= []).push(piece.reward)
  const hiddenAt = random() < 0.5 ? ids[below(ids.length)] : undefined
  if (hiddenAt) journeys[hiddenAt].hiddenMoney = 50 * below(9)
  const lensAt = random() < 0.7 ? ids[below(ids.length)] : undefined
  if (lensAt) journeys[lensAt].mainEnd = lens
  return { journeys, pieces, lensAt, hiddenAt }
}

/** Every state an exhaustive spender reaches, buying anything visible it can afford in every order; the stranded ones. */
const strandedStates = ({ journeys, pieces, lensAt, hiddenAt }: Drawn): string[] => {
  const entered = (bought: ReadonlySet<string>) => {
    const facts = new Set([...bought].map(id => `purchase:${id}`))
    let open = new Set<string>()
    for (;;) {
      const next = new Set(Object.keys(journeys).filter(id => (journeys[id].needs ?? []).every(f => facts.has(f))))
      if (lensAt && next.has(lensAt)) facts.add("sight")
      if (next.size === open.size) return { open: next, sight: facts.has("sight") }
      open = next
    }
  }
  const stranded: string[] = []
  const seen = new Set<string>()
  const spend = (bought: ReadonlySet<string>) => {
    const key = [...bought].sort().join(",")
    if (seen.has(key)) return
    seen.add(key)
    const { open, sight } = entered(bought)
    const income =
      [...open].reduce((sum, id) => sum + (journeys[id].money ?? []).reduce((a, b) => a + b, 0), 0) +
      (hiddenAt && sight && open.has(hiddenAt) ? (journeys[hiddenAt].hiddenMoney ?? 0) : 0)
    const coins = income - pieces.filter(p => bought.has(p.id)).reduce((sum, p) => sum + p.price, 0)
    const forSale = pieces.filter(p => open.has(p.shop) && !bought.has(p.id))
    if (forSale.some(p => p.key && p.price > coins)) stranded.push(`${key || "nothing"} bought, ${coins} coins`)
    for (const p of forSale) if (p.price <= coins) spend(new Set([...bought, p.id]))
  }
  spend(new Set())
  return stranded
}

describe("the economy guard against every spending order", () => {
  it("on 200 made-up worlds the guard passes, an exhaustive spender never ends with an unbought visible key it cannot afford", () => {
    let passed = 0
    let refused = 0
    for (let seed = 1; seed <= 200; seed++) {
      const drawn = draw(seed)
      const { configs, walk } = groundWorld(drawn.journeys)
      const table = drawn.pieces.map(p => ({
        id: p.id,
        fact: `purchase:${p.id}`,
        price: p.price,
        soldAt: { journeyId: p.shop },
      }))
      try {
        runEconomyGuard(configs, [], walk, { purchases: table })
      } catch {
        refused++
        continue
      }
      passed++
      expect({ seed, stranded: strandedStates(drawn) }).toEqual({ seed, stranded: [] })
    }
    // Both kinds of world are drawn, so a pass here says something.
    expect(passed).toBeGreaterThanOrEqual(30)
    expect(refused).toBeGreaterThanOrEqual(30)
  })
})
