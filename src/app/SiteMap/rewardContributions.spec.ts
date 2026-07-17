import { describe, expect, it } from "vitest"
import { mergeContributions } from "./rewardContributions"
import type { TreasureReward } from "@/game/siteTypes"

const money: TreasureReward = { type: "money", amount: 5 }
const frag: TreasureReward = { type: "hieroglyphFragment", hieroglyphId: "ra", pieceIndex: 0 }
const consumable: TreasureReward = { type: "consumable", consumable: "bandage" }

describe("mergeContributions — skip vs canAccept are independent", () => {
  it("canAccept = AND across contributions (any one refuses)", () => {
    const merged = mergeContributions([{ canAccept: r => r.type !== "consumable" }, { canAccept: () => true }])
    expect(merged.canAccept(money)).toBe(true)
    expect(merged.canAccept(consumable)).toBe(false) // trap-style refuse-for-now
  })

  it("skip = OR across contributions (any one silently ignores)", () => {
    const merged = mergeContributions([{ skip: r => r.type === "hieroglyphFragment" }, {}])
    expect(merged.skip(frag)).toBe(true)
    expect(merged.skip(money)).toBe(false)
  })

  it("an owned fragment SKIPS, it does not read as a refusal (the regression guard)", () => {
    // Hieroglyph contributes skip (owned → nothing to do), NOT canAccept=false (which core would
    // treat as a 'pack full, come back' popup + markConsumableSkipped). The two must stay distinct.
    const hieroglyph = { skip: (r: TreasureReward) => r.type === "hieroglyphFragment" }
    const merged = mergeContributions([hieroglyph])
    expect(merged.skip(frag)).toBe(true)
    expect(merged.canAccept(frag)).toBe(true) // NOT refused — core silently ignores it instead
  })

  it("no contributions → accepts everything, skips nothing", () => {
    const merged = mergeContributions([])
    expect(merged.canAccept(money)).toBe(true)
    expect(merged.skip(money)).toBe(false)
  })
})
