import { describe, expect, it } from "vitest"
import { capabilitiesFor, PYRAMID_CAPABILITIES, TOMB_CAPABILITIES } from "./capabilities"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"

describe("capabilitiesFor", () => {
  it("resolves pyramid journeys to PYRAMID_CAPABILITIES", () => {
    expect(capabilitiesFor(PYRAMID_JOURNEYS[0].id)).toBe(PYRAMID_CAPABILITIES)
  })

  it("resolves tomb journeys to TOMB_CAPABILITIES", () => {
    expect(capabilitiesFor(TOMB_JOURNEYS[0].id)).toBe(TOMB_CAPABILITIES)
  })

  it("returns undefined for an unknown site id", () => {
    expect(capabilitiesFor("not_a_real_site")).toBeUndefined()
  })
})

describe("capability presets", () => {
  it("only tombs run the perk stream; only pyramids run everything else", () => {
    expect(TOMB_CAPABILITIES.emitPerkStream).toBe(true)
    expect(PYRAMID_CAPABILITIES.emitPerkStream).toBe(false)
    expect(PYRAMID_CAPABILITIES.placeChests).toBe(true)
    expect(PYRAMID_CAPABILITIES.emitFragmentSlots).toBe(true)
    expect(PYRAMID_CAPABILITIES.emitMosaics).toBe(true)
    expect(PYRAMID_CAPABILITIES.emitMapPiece).toBe(true)
  })
})
