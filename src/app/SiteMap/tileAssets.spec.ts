import { describe, expect, it } from "vitest"
import { tileVariants } from "./tileAssets"

// The resolver reads a glob of real files, so these assert the CONTRACT rather than a fixture: whatever is
// on disk, a name resolves to at least its own drawing, and every url it returns is distinct.
describe("tileVariants", () => {
  it("returns the base drawing for a kind that has one", () => {
    expect(tileVariants("starter", "offeringTable").length).toBeGreaterThan(0)
  })

  it("returns no duplicates, so a hash cannot land on the same drawing twice", () => {
    const urls = tileVariants("starter", "offeringTable")
    expect(new Set(urls).size).toBe(urls.length)
  })

  it("is empty for a name nothing draws, so the caller can fall back to a glyph", () => {
    expect(tileVariants("starter", "no-such-tile")).toEqual([])
  })

  it("falls back to `default` WHOLESALE, never mixing one tier's base with another's variants", () => {
    // `sand` lives in default/ only. A tier drawing none of its own must take default's whole list, or a
    // half-imported rank would show its own table beside another rank's baskets.
    expect(tileVariants("wizard", "sand")).toEqual(tileVariants("default" as never, "sand"))
  })
})
