// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { LockedJourneyCard } from "./LockedJourneyCard"

const LABELS = {
  title: "Treasure Location",
  requires: "Requires map pieces",
  unit: "Map Pieces",
  howToUnlock: "Complete expeditions to unlock",
}

const HINT = "Corridors run past the temple vaults to a sealed door."

const tile = (props: { found: number; required: number; hint?: string }) => {
  const { container } = render(<LockedJourneyCard {...props} labels={LABELS} />)
  return {
    text: container.textContent ?? "",
    placeholder: container.querySelector("[data-reveal-placeholder]"),
  }
}

describe("LockedJourneyCard", () => {
  // The whole point of this tile: the tomb's name is the reward for finishing the map, so it must not
  // leak here. Travel swaps in the named JourneyCard once the map is whole.
  it("names no tomb — only the generic location label", () => {
    const { text } = tile({ found: 2, required: 3, hint: HINT })
    expect(text).toContain("Treasure Location")
    expect(text).toContain(HINT)
  })

  it("falls back to the plain requirement line for a tomb with no hint", () => {
    const { text } = tile({ found: 1, required: 3 })
    expect(text).toContain("Requires map pieces")
  })

  it("shows how much of the map is gathered", () => {
    const { text } = tile({ found: 2, required: 3, hint: HINT })
    expect(text).toContain("2/3")
    expect(text).toContain("Complete expeditions to unlock")
  })

  it("carries the same partial-collection visual as the reward popup", () => {
    // The map is incomplete by definition here, so the icon always outlines what is still missing
    expect(tile({ found: 1, required: 4, hint: HINT }).placeholder).not.toBeNull()
  })

  it("drops the how-to-unlock line if a complete map is ever passed in", () => {
    const { text } = tile({ found: 3, required: 3, hint: HINT })
    expect(text).not.toContain("Complete expeditions to unlock")
  })
})
