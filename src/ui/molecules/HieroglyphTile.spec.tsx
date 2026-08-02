import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { HieroglyphTile } from "./HieroglyphTile"

const tile = (fragmentProgress?: { found: number; required: number }) => {
  const { container } = render(<HieroglyphTile symbol="𓅃" difficulty="expert" fragmentProgress={fragmentProgress} />)
  return {
    text: container.textContent,
    // The clipped stone element — the one the reveal mask is spread onto
    stone: container.querySelector("[style*='clip-path']") as HTMLElement | null,
    placeholder: container.querySelector("[data-reveal-placeholder]"),
  }
}

// A part-collected tile shows only the fraction of the stone that has been found, with a faint ghost
// of the whole behind it. The case that matters most is the complete one: masking a finished tile
// would blank part of a hieroglyph the player owns.
describe("HieroglyphTile fragment progress", () => {
  it("renders the whole stone, with no ghost, when no progress is given", () => {
    const { text, stone, placeholder } = tile()
    expect(text).toContain("𓅃")
    expect(stone?.style.maskImage).toBe("")
    expect(placeholder).toBeNull()
  })

  it("ghosts the whole tile behind a part-collected one", () => {
    expect(tile({ found: 1, required: 3 }).placeholder).not.toBeNull()
  })

  it("drops the ghost once every fragment is found", () => {
    expect(tile({ found: 3, required: 3 }).placeholder).toBeNull()
  })

  it("gives the ghost the tile's own chipped silhouette rather than a ring", () => {
    const { placeholder } = tile({ found: 1, required: 3 })
    expect(placeholder?.getAttribute("style")).toContain("clip-path")
    expect(placeholder?.className).not.toContain("border-dashed")
  })
})
