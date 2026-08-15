import { describe, expect, it } from "vitest"
import type { FamilyMeta } from "@/game/families/familyMeta"
import { allowedDifficulties, themesFor } from "./puzzleLabOptions"

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
