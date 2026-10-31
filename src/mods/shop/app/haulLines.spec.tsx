import { describe, expect, it } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import { summariseCoins, summariseSellables } from "./haulLines"

const t = (key: string, opts?: { count?: number }) => (opts?.count === undefined ? key : `${key}:${opts.count}`)
const coins = (amount: number): TreasureReward => ({ type: "money", amount })
const item = (itemId: string): TreasureReward => ({ type: "sellable", itemId })

describe("shop haul lines", () => {
  it("sums coin rewards into one line", () => {
    const lines = summariseCoins([coins(5), coins(10), coins(70)], t)
    expect(lines).toHaveLength(1)
    expect(lines[0].title).toBe("shop.haul.coins:85")
  })

  it("merges equal sellables into one line with a count", () => {
    const lines = summariseSellables([item("made-up-trinket"), item("made-up-trinket")], t)
    expect(lines.map(l => l.title)).toEqual(["made-up-trinket home.haul.times:2"])
  })

  it("keeps different sellables on their own lines", () => {
    const lines = summariseSellables([item("made-up-a"), item("made-up-b")], t)
    expect(lines.map(l => l.title)).toEqual(["made-up-a", "made-up-b"])
  })
})
