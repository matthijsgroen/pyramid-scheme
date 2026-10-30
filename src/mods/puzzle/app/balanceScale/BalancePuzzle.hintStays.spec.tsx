// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { BALANCE_CONFIG } from "@/mods/puzzle/game/balanceScale/balanceConfig"
import { generateBalance } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { buildBalanceHint } from "./balanceHint"
import { BalancePuzzle } from "./BalancePuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("./balanceHint", () => ({ buildBalanceHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const puzzle = generateBalance(3, BALANCE_CONFIG.starter)

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
