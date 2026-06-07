import { describe, it, expect } from "vitest"
import { getUnlockArtifactId } from "./hieroglyphUnlockLogic"

// t24 = Meteorite Fragment (hieroglyphUnlock), t26 = Time Crystal (hieroglyphUnlock)
// These are the two real artifacts in the game data with hieroglyphUnlock: true

describe("getUnlockArtifactId", () => {
  it("returns empty string when no unlock artifacts are owned", () => {
    expect(getUnlockArtifactId({}, 0)).toBe("")
    expect(getUnlockArtifactId({ t1: 1, t2: 1 }, 0)).toBe("")
  })

  it("returns the owned artifact when only one is owned and 0 have been used", () => {
    expect(getUnlockArtifactId({ t24: 1 }, 0)).toBe("t24")
    expect(getUnlockArtifactId({ t26: 1 }, 0)).toBe("t26")
  })

  it("returns t24 (first in list) for the first unlock when both are owned", () => {
    expect(getUnlockArtifactId({ t24: 1, t26: 1 }, 0)).toBe("t24")
  })

  it("returns t26 (second in list) for the second unlock when both are owned", () => {
    expect(getUnlockArtifactId({ t24: 1, t26: 1 }, 1)).toBe("t26")
  })

  it("falls back to first owned artifact when unlockedCount exceeds owned count", () => {
    // Only t24 owned, but 1 already used — still shows t24
    expect(getUnlockArtifactId({ t24: 1 }, 1)).toBe("t24")
    // Both owned, 2 already used — falls back to t24
    expect(getUnlockArtifactId({ t24: 1, t26: 1 }, 2)).toBe("t24")
  })
})
