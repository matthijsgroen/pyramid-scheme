import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { FormulaPart } from "./FormulaPart"

const formula = { left: { symbol: 0 }, right: 2, operation: "+" as const, result: 5 }

const slot = (fragmentProgress?: { found: number; required: number }, filled = false) => {
  const { container } = render(
    <FormulaPart
      formula={formula}
      showResult={false}
      obfuscateResult={false}
      symbolMapping={{ 0: "d1" }}
      filledState={{ symbolCounts: {}, filledPositions: filled ? { "f-left": 1 } : {} }}
      resolveTile={() => ({ symbol: "𓇳", difficulty: "starter", fragmentProgress })}
      positionPrefix="f"
    />
  )
  return { text: container.textContent, ghost: container.querySelector("[data-reveal-placeholder]") }
}

// An empty slot has to say WHY it is empty: a hieroglyph you own but have not placed is an open
// socket ("?"), one you are still collecting reads as a part-carved stone with its fragment count.
describe("FormulaPart empty slots", () => {
  it("shows a plain socket for a hieroglyph the player owns", () => {
    const { text, ghost } = slot({ found: 3, required: 3 })
    expect(text).toContain("?")
    expect(ghost).toBeNull()
  })

  it("shows the part-carved stone and its count while fragments are missing", () => {
    const { text, ghost } = slot({ found: 1, required: 3 })
    expect(text).toContain("1/3")
    expect(text).not.toContain("?")
    expect(ghost).not.toBeNull()
  })

  it("leaves a placed tile alone", () => {
    const { text, ghost } = slot({ found: 3, required: 3 }, true)
    expect(text).toContain("𓇳")
    expect(ghost).toBeNull()
  })

  it("falls back to the socket when no progress is known", () => {
    expect(slot().text).toContain("?")
  })

  it("still names the glyph when zero fragments are found", () => {
    const { text, ghost } = slot({ found: 0, required: 3 })
    expect(text).toContain("𓇳")
    expect(text).toContain("0/3")
    expect(ghost).not.toBeNull()
  })
})
