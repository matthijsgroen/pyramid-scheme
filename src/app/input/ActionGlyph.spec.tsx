// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ActionGlyph } from "./ActionGlyph"

const root = document.documentElement
afterEach(() => {
  delete root.dataset.input
  delete root.dataset.pad
})

describe(ActionGlyph, () => {
  it("shows nothing on touch", () => {
    root.dataset.input = "touch"
    const { container } = render(<ActionGlyph action="confirm" />)
    expect(container.innerHTML).toBe("")
  })

  it("shows the key on keys", () => {
    root.dataset.input = "keys"
    render(<ActionGlyph action="confirm" />)
    expect(screen.getByText("Enter")).toBeTruthy()
  })

  it("shows the pad button in the pad's brand on pad", () => {
    root.dataset.input = "pad"
    root.dataset.pad = "playstation"
    render(<ActionGlyph action="confirm" />)
    expect(screen.getByRole("img", { name: "Cross" })).toBeTruthy()
  })
})
