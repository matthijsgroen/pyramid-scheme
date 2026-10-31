import { describe, expect, it } from "vitest"
import { purchasePlacementProblems, runEconomyGuard } from "./economyGuard"
import { groundWorld, purchase, tableOf } from "./groundWorlds.testing"

describe(runEconomyGuard, () => {
  const table = tableOf({ A: 50 })

  it("passes when the money in every ground covers everything for sale there", () => {
    const { configs, walk } = groundWorld({
      start: { money: [50], stock: [purchase("A")] },
      behindA: { needs: ["purchase:A"], money: [10] },
    })
    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).not.toThrow()
  })

  it("a purchase stocked twice throws, naming it", () => {
    const { configs, walk } = groundWorld({ start: { money: [500], stock: [purchase("A"), purchase("A")] } })
    expect(purchasePlacementProblems(walk, table)).toEqual(["purchase A is stocked 2 times"])
    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).toThrow(/purchase A is stocked 2 times/)
  })

  it("a purchase missing from every shop throws, naming it", () => {
    const { configs, walk } = groundWorld({ start: { money: [500], stock: [purchase("other")] } })
    expect(purchasePlacementProblems(walk, table)).toEqual(["purchase A is in no shop the walk reaches"])
    expect(() => runEconomyGuard(configs, [], walk, { purchases: table })).toThrow(
      /purchase A is in no shop the walk reaches/
    )
  })

  it("throws past the ground cap, naming the count", () => {
    const { configs, walk } = groundWorld({
      start: { money: [50], stock: [purchase("A")] },
      behindA: { needs: ["purchase:A"] },
    })
    expect(() => runEconomyGuard(configs, [], walk, { purchases: table, cap: 1 })).toThrow(
      /more than 1 ways to stand in the world \(2 walk states seen\)/
    )
  })
})
