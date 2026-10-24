import { describe, it, expect } from "vitest"
import { wardKeyDifficulty, releasedDifficulty } from "./difficultyLevels"

// Ward gates are tinted + described by their key's difficulty, derived from the key id prefix
// (`<difficulty>_<wing>_<n>`, e.g. "junior_a_2"). Guards the parse used by the map + gate encounter.
describe("wardKeyDifficulty", () => {
  it("reads the tier prefix of every ward-key shape", () => {
    expect(wardKeyDifficulty("starter_a_1")).toBe("starter")
    expect(wardKeyDifficulty("junior_a_6")).toBe("junior")
    expect(wardKeyDifficulty("expert_b_3")).toBe("expert")
    expect(wardKeyDifficulty("master_a_5")).toBe("master")
    expect(wardKeyDifficulty("wizard_c_2")).toBe("wizard")
  })

  it("returns undefined for non-tier keys and missing ids", () => {
    expect(wardKeyDifficulty(undefined)).toBeUndefined()
    expect(wardKeyDifficulty("blue")).toBeUndefined() // a floor-key color, not a ward key
    expect(wardKeyDifficulty("")).toBeUndefined()
  })
})

describe("the tier a build ships up to", () => {
  it("is the one the release names", () => {
    expect(releasedDifficulty("starter")).toBe("starter")
  })

  it("is every authored tier when the build names none", () => {
    expect(releasedDifficulty(undefined)).toBe("expert")
    expect(releasedDifficulty("")).toBe("expert")
  })

  it("fails the build on a name that is not a tier", () => {
    expect(() => releasedDifficulty("starterr")).toThrow(/not a tier/)
  })
})
