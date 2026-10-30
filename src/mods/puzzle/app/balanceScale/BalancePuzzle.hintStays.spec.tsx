// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import type { BalancePuzzle as BalancePuzzleData } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { buildBalanceHint } from "./balanceHint"
import { BalancePuzzle } from "./BalancePuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("./balanceHint", () => ({ buildBalanceHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const feather = { kind: "glyph", glyph: "🪶" } as const
const beetle = { kind: "glyph", glyph: "🪲" } as const
/** Two glyphs on two scales: three feathers weigh a beetle and 8, two feathers weigh 12. */
const puzzle: BalancePuzzleData = {
  glyphs: ["🪶", "🪲"],
  scales: [
    { left: [feather, feather, feather], right: [beetle, { kind: "weight", value: 8 }] },
    { left: [feather, feather], right: [{ kind: "weight", value: 12 }] },
  ],
  maxValue: 10,
  cancelling: false,
  solution: { "🪶": 6, "🪲": 10 },
  techniqueCap: "equalShares",
}

const open = () => {
  vi.mocked(buildBalanceHint).mockReset()
  vi.mocked(buildBalanceHint)
    .mockReturnValueOnce({ key: "alpha", params: {}, refs: [] })
    .mockReturnValue({ key: "beta", params: {}, refs: [] })
  const { container } = render(<BalancePuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />)
  const buttons = (marker: string) =>
    within(container)
      .getAllByRole("button")
      .filter(button => button.className.includes(marker))
  act(() => within(container).getByRole("button", { name: /hint/i }).click())
  return {
    selectGlyph: (index: number) => act(() => buttons("min-w-16")[index].click()),
    pickWeight: (value: number) => act(() => buttons("size-11")[value - 1].click()),
    shown: () => container.textContent ?? "",
  }
}

describe("BalancePuzzle hint that stays", () => {
  it("keeps the hint, and the words it was asked with, while another glyph is selected", () => {
    const { selectGlyph, shown } = open()
    expect(shown()).toContain("balance.hint.alpha")
    selectGlyph(1)
    expect(shown()).toContain("balance.hint.alpha")
    expect(shown()).not.toContain("balance.hint.beta")
  })

  it("ends the hint when a weight is set", () => {
    const { pickWeight, shown } = open()
    pickWeight(1)
    expect(shown()).not.toContain("balance.hint.alpha")
  })
})
