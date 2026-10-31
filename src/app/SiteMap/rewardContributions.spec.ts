import { describe, expect, it } from "vitest"
import { mergeContributions } from "./rewardContributions"
import type { TreasureReward } from "@/game/siteTypes"

const money: TreasureReward = { type: "money", amount: 5 }
const frag: TreasureReward = { type: "hieroglyphFragment", hieroglyphId: "ra", pieceIndex: 0 }

describe("mergeContributions", () => {
  it("merges effects by reward type", () => {
    const onMoney = () => {}
    const onFrag = () => {}
    const merged = mergeContributions([{ effects: { money: onMoney } }, { effects: { hieroglyphFragment: onFrag } }])
    expect(merged.effects.money).toBe(onMoney)
    expect(merged.effects.hieroglyphFragment).toBe(onFrag)
  })

  it("skip = OR across contributions (any one silently ignores)", () => {
    const merged = mergeContributions([{ skip: r => r.type === "hieroglyphFragment" }, {}])
    expect(merged.skip(frag)).toBe(true)
    expect(merged.skip(money)).toBe(false)
  })

  it("has no refusal path: the merge carries only effects, seen and skip", () => {
    expect(Object.keys(mergeContributions([{ skip: () => false }])).sort()).toEqual(["effects", "seen", "skip"])
  })

  it("no contributions → skips nothing", () => {
    const merged = mergeContributions([])
    expect(merged.skip(money)).toBe(false)
  })
})
