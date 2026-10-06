import { describe, expect, it } from "vitest"
import { authoredKindsFor } from "./authoredKinds"

describe("a rank is dressed with what it is authored to hold", () => {
  // Reported from play: a crystal — a wizard thing, the gods' vault — stood beside Anubis in the Valley
  // of the Kings, which is expert. It was a COMPANION, the second prop placed beside one of the same
  // purpose, and its guard asked only whether a FILE existed. Every kind has a placeholder, so every rank
  // could reach the whole vocabulary. The world-wide sweep is in `worldFloorAssembly.verify`; this is the
  // case that names the bug.
  it("offers no companion the rank never authors, however well it agrees", () => {
    const expert = authoredKindsFor("expert").props
    expect(expert).not.toContain("crystal")
    expect(authoredKindsFor("wizard").props).toContain("crystal")
  })
})
