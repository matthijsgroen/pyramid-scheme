import { describe, expect, it } from "vitest"
import type { Tileset } from "@/game/siteTypes"
import { chestTileIn, tileVariants } from "./tileAssets"

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

describe("chestTileIn", () => {
  // Made-up art: `painted` holds `<tier>/<name>` keys, `standIn` the placeholder names.
  const resolve = (painted: string[], standIn: string[], tile: string, open: boolean, tileset: Tileset = "junior") =>
    chestTileIn(
      (tier, name) => (painted.includes(`${tier}/${name}`) ? `${tier}/${name}` : undefined),
      name => (standIn.includes(name) ? `placeholder/${name}` : undefined),
      tileset,
      "junior",
      tile,
      open
    )

  it("draws a chest's own painting", () => {
    expect(resolve(["junior/wardChest", "junior/chestProp"], [], "wardChest", false)).toBe("junior/wardChest")
  })

  it("falls back from the ward key's chest to the plain one", () => {
    expect(resolve(["junior/chestProp"], [], "wardChest", false)).toBe("junior/chestProp")
  })

  it("falls back from an open chest to the same chest shut, then to the plain one", () => {
    expect(resolve(["junior/wardChest", "junior/chestProp"], [], "wardChest", true)).toBe("junior/wardChest")
    expect(resolve(["junior/chestProp"], [], "wardChest", true)).toBe("junior/chestProp")
    expect(resolve(["junior/chestPropOpen", "junior/chestProp"], [], "chestProp", true)).toBe("junior/chestPropOpen")
  })

  it("prefers any painting over a placeholder", () => {
    expect(resolve(["junior/chestProp"], ["chestPropOpen"], "chestProp", true)).toBe("junior/chestProp")
  })

  it("takes the rank's chest in a tileset that has none", () => {
    expect(resolve(["junior/chestProp"], [], "chestProp", false, "cave")).toBe("junior/chestProp")
  })

  it("stands in the nearest placeholder when nothing is painted", () => {
    expect(resolve([], ["wardChest", "chestProp"], "wardChest", true)).toBe("placeholder/wardChest")
  })
})
