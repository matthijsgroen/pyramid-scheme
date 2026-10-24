import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { contrastRatio, hexToRgb } from "@/support/colour"
import { METALS } from "./metalPalette"

describe("METALS", () => {
  it.each(difficulties)("%s pill text holds 4.5:1 on its light surface", tier => {
    expect(contrastRatio(hexToRgb(METALS[tier].shade), hexToRgb(METALS[tier].light))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(difficulties)("%s engraved glyph holds 3:1 on its metal", tier => {
    expect(contrastRatio(hexToRgb(METALS[tier].shade), hexToRgb(METALS[tier].material))).toBeGreaterThanOrEqual(3)
  })

  it("keeps master's gold as the map has it today", () => {
    expect(METALS.master.material).toBe("#d9a93f")
    expect(METALS.master.accent).toBe("#d9a93f")
  })
})
