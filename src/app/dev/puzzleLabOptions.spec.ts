import { describe, expect, it } from "vitest"
import type { FamilyMeta } from "@/game/families/familyMeta"
import { allowedDifficulties, playableInLab, themesFor } from "./puzzleLabOptions"

const meta = (overrides: Partial<FamilyMeta> = {}): FamilyMeta => ({
  id: "test",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  icon: "🔢",
  color: "blue",
  rewardPriority: 60,
  ...overrides,
})

describe(allowedDifficulties, () => {
  it("offers every tier for a family without a debut tier", () => {
    expect(allowedDifficulties(meta())).toEqual(["starter", "junior", "expert", "master", "wizard"])
  })

  it("offers a family's debut tier and up", () => {
    expect(allowedDifficulties(meta({ minTier: "expert" }))).toEqual(["expert", "master", "wizard"])
  })
})

describe(themesFor, () => {
  it("falls back to the default skin when a family lists no themes", () => {
    expect(themesFor(meta())).toEqual(["default"])
  })

  it("lists the family's own themes", () => {
    expect(themesFor(meta({ themes: ["stone", "nile"] }))).toEqual(["stone", "nile"])
  })
})

describe(playableInLab, () => {
  it("plays the puzzle rooms and the two boards a tomb serves", () => {
    expect(playableInLab(meta())).toBe(true)
    expect(playableInLab(meta({ tags: ["tomb-puzzle"] }))).toBe(true)
    expect(playableInLab(meta({ tags: ["capstone"] }))).toBe(true)
  })

  it("leaves out what is not a board at all", () => {
    // A trap, a shop, a chest and a gate are rooms rather than puzzles: nothing on the bench's pickers
    // (tier, theme, role, seed) means anything to them.
    for (const tags of [["trap"], ["shop"], ["treasure"], ["gate"]]) expect(playableInLab(meta({ tags }))).toBe(false)
  })
})
