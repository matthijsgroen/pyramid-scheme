import { describe, it, expect } from "vitest"
import { getUnlockArtifactId, getUnlockArtifactIds } from "./hieroglyphUnlockLogic"

// hieroglyphUnlock removed with TreasureEffects; scribesEyeLevel perk handles this now
describe("getUnlockArtifactId", () => {
  it("always returns empty string (feature removed)", () => {
    expect(getUnlockArtifactId({}, 0)).toBe("")
    expect(getUnlockArtifactId({ t24: 1 }, 0)).toBe("")
    expect(getUnlockArtifactId({ t24: 1, t26: 1 }, 1)).toBe("")
  })
})

describe("getUnlockArtifactIds", () => {
  it("always returns [] (feature removed)", () => {
    expect(getUnlockArtifactIds({})).toEqual([])
    expect(getUnlockArtifactIds({ t24: 1 })).toEqual([])
  })
})
