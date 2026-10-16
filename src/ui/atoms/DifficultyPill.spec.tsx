// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { METALS } from "@/ui/tokens/metalPalette"
import { DifficultyPill } from "./DifficultyPill"

const pillOf = (ui: React.ReactElement) => render(ui).container.querySelector("span") as HTMLSpanElement

describe("DifficultyPill", () => {
  it("wears its difficulty's metal", () => {
    const pill = pillOf(<DifficultyPill difficulty="junior" label="junior" />)
    expect(pill.style.backgroundColor).toBe(hexToCss(METALS.junior.light))
    expect(pill.style.color).toBe(hexToCss(METALS.junior.shade))
  })

  it("stays grey when disabled", () => {
    const pill = pillOf(<DifficultyPill difficulty="junior" label="junior" disabled />)
    expect(pill.style.backgroundColor).toBe("")
    expect(pill.className).toContain("bg-gray-200")
  })
})

const hexToCss = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}
