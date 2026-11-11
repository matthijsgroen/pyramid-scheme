// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { RewardDisplay } from "@/app/SiteMap/rewardDisplayRegistry"
import { rewardText } from "@/app/SiteMap/rewardDisplay"

// A made-up hieroglyph whose piece count each test sets.
let progress = { found: 1, required: 3 }
vi.mock("./useHieroglyphProgress", () => ({
  requiredPieces: () => progress.required,
  useHieroglyphProgress: () => ({ hieroglyphProgress: () => progress }),
}))
vi.mock(import("@/mods/hieroglyph/game/symbolCatalogue"), async importOriginal => ({
  ...(await importOriginal()),
  getInventoryItemById: () => ({ id: "made_up_glyph", name: "Made Up", symbol: "𓀀", description: "" }),
}))

const t = (key: string, opts?: Record<string, unknown>) => {
  if (!opts) return key
  const { ns, defaultValue, ...values } = opts
  void ns
  void defaultValue
  return Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}

const { registerHieroglyphRewardDisplay } = await import("./rewardDisplay")
const { useMergedRewardDisplays } = await import("@/app/SiteMap/rewardDisplayRegistry")

registerHieroglyphRewardDisplay()

const reward = { type: "hieroglyphFragment", hieroglyphId: "made_up_glyph", pieceIndex: 0 } as const

const fragmentDisplay = (): RewardDisplay => {
  const { result } = renderHook(() => useMergedRewardDisplays())
  const build = result.current.hieroglyphFragment
  if (!build) throw new Error("no hieroglyphFragment display registered")
  return build(reward, t)
}

describe("hieroglyph reward display", () => {
  it("calls a piece of a multi-piece hieroglyph a fragment and counts the pieces", () => {
    progress = { found: 1, required: 3 }
    const display = fragmentDisplay()
    expect(display.itemName).toBe("animals.made_up_glyph.name — chest.hieroglyphFragment")
    expect(display.itemEffectDescription).toBe('chest.fragmentProgress:{"found":1,"required":3}')
    expect(rewardText(reward, t).itemName).toBe("animals.made_up_glyph.name — chest.hieroglyphFragment")
  })

  it("names a one-piece hieroglyph whole, without a piece count", () => {
    progress = { found: 1, required: 1 }
    const display = fragmentDisplay()
    expect(display.itemName).toBe("animals.made_up_glyph.name — chest.hieroglyph")
    expect(display.itemEffectDescription).toBeUndefined()
    expect(rewardText(reward, t).itemName).toBe("animals.made_up_glyph.name — chest.hieroglyph")
  })
})
