import { describe, expect, it } from "vitest"
import { GLYPH_POOL } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { skinFor } from "./skins"

describe("which place a balance room is", () => {
  it.each(["funerary", "judgement"])("draws the weighing of the heart for %s", role => {
    // The narrow place and the wide one are the same room for this family: the weighing IS what a scale
    // does in a tomb (docs/game-design/journeys.md §9).
    expect(skinFor(role, undefined).name).toBe("weighing")
  })

  it("keeps the merchant's scale where nothing was said about the place", () => {
    // `puzzle` is the tag every family carries, so it says nothing about which place a room is.
    expect(skinFor("puzzle", undefined).name).toBe("default")
    expect(skinFor(undefined, undefined).name).toBe("default")
  })

  it("takes the first role it has a face for out of a list", () => {
    // A list of roles is the union the allocator drew from, not a set of demands — and `["judgement",
    // "funerary"]` is exactly what a Book of the Dead pyramid authors.
    expect(skinFor(["judgement", "funerary"], undefined).name).toBe("weighing")
    expect(skinFor(["puzzle", "funerary"], undefined).name).toBe("weighing")
  })

  it("lets a theme name a face outright, which is what the lab does", () => {
    expect(skinFor(undefined, "weighing").name).toBe("weighing")
  })

  it("reads default and night as nothing said, so the hour never cancels the place", () => {
    // A judgement hall after dark is still a judgement hall: the ambience layers onto the identity rather
    // than replacing it (puzzle-screens.md §2).
    expect(skinFor("judgement", "night").name).toBe("weighing")
    expect(skinFor("judgement", "default").name).toBe("weighing")
  })

  it("falls back to the merchant's scale for a name it has never heard, without complaining", () => {
    expect(skinFor("sandstorm", "carnival").name).toBe("default")
  })

  /**
   * **The symbols ARE the face**, so these are the tests that matter.
   *
   * A glyph is an identity the solver never reads — `generateBalance.ts` says any distinguishable set
   * works, only that the same one weighs the same everywhere. So a face may choose the set, and the two
   * things it must never do are lose a piece or merge two.
   */
  it("draws the generator's own pieces where nothing was said", () => {
    const plain = skinFor(undefined, undefined)
    for (const glyph of GLYPH_POOL) expect(plain.symbol(glyph)).toBe(glyph)
  })

  it("gives the tomb a different set, and the heart and the feather are both in it", () => {
    const weighing = skinFor("judgement", undefined)
    const drawn = GLYPH_POOL.map(weighing.symbol)
    expect(drawn).not.toEqual([...GLYPH_POOL])
    // The scene the family is named for: a heart weighed against the feather of truth.
    expect(drawn).toContain("🫀")
    expect(drawn).toContain("🪶")
  })

  it("maps every piece to a distinct symbol, or a solvable board stops being solvable", () => {
    // Two unknowns sharing a symbol is the one way a face here could break a puzzle: the player would be
    // asked to give one weight to what reads as one piece and is two.
    const drawn = GLYPH_POOL.map(skinFor("judgement", undefined).symbol)
    expect(new Set(drawn).size).toBe(GLYPH_POOL.length)
  })

  it("draws a piece it has never heard of as itself, so a face can never blank one", () => {
    expect(skinFor("judgement", undefined).symbol("🛶")).toBe("🛶")
  })
})
