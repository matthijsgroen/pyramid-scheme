import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { MapPieceIcon } from "./MapPieceIcon"

// jsdom drops the conic-gradient mask itself (see revealMask.ts), so the assertions here are about
// which elements the icon renders — the sweep's maths is covered by revealMaskStyle's own spec.
const icon = (progress?: { found: number; required: number }) => {
  const { container } = render(<MapPieceIcon progress={progress} />)
  return {
    text: container.textContent,
    placeholder: container.querySelector("[data-reveal-placeholder]"),
  }
}

describe("MapPieceIcon", () => {
  it("shows the whole scroll, with no placeholder, when given no progress", () => {
    const { text, placeholder } = icon()
    expect(text).toContain("📜")
    expect(placeholder).toBeNull()
  })

  it("outlines the finished map behind a partly-gathered one", () => {
    const { text, placeholder } = icon({ found: 1, required: 4 })
    expect(text).toContain("📜")
    expect(placeholder).not.toBeNull()
  })

  it("drops the placeholder once the map is whole", () => {
    expect(icon({ found: 4, required: 4 }).placeholder).toBeNull()
  })

  it("outlines a map with a spare piece as whole too", () => {
    expect(icon({ found: 5, required: 4 }).placeholder).toBeNull()
  })
})
