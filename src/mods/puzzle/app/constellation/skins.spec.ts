import { describe, expect, it } from "vitest"
import { skinFor } from "./skins"

/**
 * Two questions reach this family, and they are not the same question.
 *
 * **The role is the identity**: bridges drawn for `trade` is a haul-road network, drawn for `sky` a star map,
 * drawn for `water` a waterworks. **The ambience is the hour**: `night` over a causeway is a causeway after
 * dark, not a star map. So one layers on the other rather than replacing it — which is why core hands the
 * family both and lets it decide, instead of picking a winner on every family's behalf.
 */
describe("which place a room is", () => {
  const boardOf = (role?: string | string[], theme?: string) => skinFor(role, theme).board

  it("draws a painted ceiling for the tomb", () => {
    expect(skinFor("funerary", undefined).name).toBe("ceiling")
  })

  it("draws the ceiling as a surface and the sky as depth, or the two are one room", () => {
    // The nearest pair of faces this family has, so what separates them is material rather than colour: the
    // sky falls away (a gradient), the ceiling is plaster an arm's length overhead (flat).
    expect(skinFor(undefined, undefined).board).toContain("gradient")
    expect(skinFor("funerary", undefined).board).not.toContain("gradient")
  })

  it("leaves the ceiling alone after dark, because a burial chamber has no hour", () => {
    // The same reasoning the default sky carries: this ceiling is only ever seen by the lamp somebody
    // brought in, so the ambience has nothing to change.
    expect(skinFor("funerary", "night")).toEqual(skinFor("funerary", undefined))
  })

  it("dresses by the role it was allocated for", () => {
    expect(boardOf("sky")).toBe(skinFor(undefined, "default").board)
    expect(boardOf("trade")).toBe(skinFor(undefined, "causeway").board)
    expect(boardOf("water")).toBe(skinFor(undefined, "irrigation").board)
  })

  it("takes the first role it has an identity for, since a list is a union the allocator drew from", () => {
    expect(boardOf(["water", "puzzle"])).toBe(boardOf("water"))
    expect(boardOf(["puzzle", "trade"])).toBe(boardOf("trade"))
  })

  it("falls back to its own night sky for a role it has no identity for", () => {
    expect(boardOf("arithmetic-reflex")).toBe(boardOf("sky"))
    expect(boardOf(undefined)).toBe(boardOf("sky"))
  })

  /**
   * "default" is a skin name AND what a picker shows when nothing is chosen, so it has to read as silence.
   * Read as a demand it cancelled the role — picking trade next to it still drew a star map.
   */
  it("treats a default theme as nothing said, so the role still decides", () => {
    expect(boardOf("trade", "default")).toBe(boardOf("trade"))
    expect(boardOf("water", "default")).toBe(boardOf("water"))
  })

  /** The lab picks a theme rather than a role, so a theme naming a skin outright has to win. */
  it("lets a theme name a skin outright, over the role", () => {
    expect(boardOf("trade", "irrigation")).toBe(boardOf("water"))
  })

  describe("ambience", () => {
    it("layers night onto the place, rather than replacing it", () => {
      const causewayAtNight = skinFor("trade", "night")
      // Still a causeway: the pyramids are still what stands on it.
      expect(causewayAtNight.Glyph).toBe(skinFor("trade", undefined).Glyph)
      // But not the same ground, and not the star map either.
      expect(causewayAtNight.board).not.toBe(boardOf("trade"))
      expect(causewayAtNight.board).not.toBe(boardOf("sky"))
    })

    it("changes nothing where the place is already dark", () => {
      // The default sky IS night, so it has nothing to swap.
      expect(boardOf("sky", "night")).toBe(boardOf("sky"))
    })

    it("keeps the delta's plants green after dark", () => {
      expect(skinFor("water", "night").glyphLit).toBe(skinFor("water", undefined).glyphLit)
    })
  })
})
