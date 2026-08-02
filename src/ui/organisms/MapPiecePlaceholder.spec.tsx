import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { MapPiecePlaceholder } from "./MapPiecePlaceholder"

const LABELS = {
  treasureTomb: "Treasure Location",
  requiresMapPieces: "Requires map pieces",
  mapPieces: "Map Pieces",
  completeExpeditionsToUnlock: "Complete expeditions to unlock",
}

const HINT = "Corridors run past the temple vaults to a sealed door."

const tile = (props: { piecesFound: number; piecesNeeded: number; mapHint?: string }) => {
  const { container } = render(<MapPiecePlaceholder {...props} labels={LABELS} />)
  return {
    text: container.textContent ?? "",
    placeholder: container.querySelector("[data-reveal-placeholder]"),
  }
}

describe("MapPiecePlaceholder", () => {
  // The whole point of this tile: the tomb's name is the reward for finishing the map, so it must not
  // leak here. Travel swaps in the named JourneyCard once the map is whole.
  it("names no tomb — only the generic location label", () => {
    const { text } = tile({ piecesFound: 2, piecesNeeded: 3, mapHint: HINT })
    expect(text).toContain("Treasure Location")
    expect(text).toContain(HINT)
  })

  it("falls back to the plain requirement line for a tomb with no hint", () => {
    const { text } = tile({ piecesFound: 1, piecesNeeded: 3 })
    expect(text).toContain("Requires map pieces")
  })

  it("shows how much of the map is gathered", () => {
    const { text } = tile({ piecesFound: 2, piecesNeeded: 3, mapHint: HINT })
    expect(text).toContain("2/3")
    expect(text).toContain("Complete expeditions to unlock")
  })

  it("carries the same partial-collection visual as the reward popup", () => {
    // The map is incomplete by definition here, so the icon always outlines what is still missing
    expect(tile({ piecesFound: 1, piecesNeeded: 4, mapHint: HINT }).placeholder).not.toBeNull()
  })

  it("drops the how-to-unlock line if a complete map is ever passed in", () => {
    const { text } = tile({ piecesFound: 3, piecesNeeded: 3, mapHint: HINT })
    expect(text).not.toContain("Complete expeditions to unlock")
  })
})
