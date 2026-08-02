import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { MapPieceIcon } from "./MapPieceIcon"

const icon = (progress?: { found: number; required: number }) => {
  const { container } = render(<MapPieceIcon progress={progress} />)
  return { text: container.textContent, mask: container.querySelector("[data-reveal-mask]") }
}

describe("MapPieceIcon", () => {
  it("shows the scroll with no mask when given no progress", () => {
    const { text, mask } = icon()
    expect(text).toContain("📜")
    expect(mask).toBeNull()
  })

  it("masks the part of the map still missing", () => {
    expect(icon({ found: 1, required: 4 }).mask).not.toBeNull()
  })

  it("drops the mask once the map is whole", () => {
    expect(icon({ found: 4, required: 4 }).mask).toBeNull()
  })
})
