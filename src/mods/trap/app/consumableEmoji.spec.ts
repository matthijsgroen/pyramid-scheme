import { describe, it, expect } from "vitest"
import { CONSUMABLE_EMOJI } from "./consumableEmoji"

describe("CONSUMABLE_EMOJI", () => {
  it("covers all three consumable subtypes", () => {
    expect(CONSUMABLE_EMOJI).toEqual({ bandage: "🩹", oil: "🫙", trapTool: "🔧" })
  })
})
