// @vitest-environment jsdom
import { act, cleanup, render, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { CanistersPuzzle as CanistersPuzzleData } from "@/mods/puzzle/game/canisters/canisters"
import { buildCanistersHint } from "./canistersHint"
import { CanistersPuzzle } from "./CanistersPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("./canistersHint", () => ({ buildCanistersHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const puzzle: CanistersPuzzleData = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 5 }

const open = () => {
  vi.mocked(buildCanistersHint).mockReset()
  vi.mocked(buildCanistersHint)
    .mockReturnValueOnce({ key: "stuck", params: { target: 4 } })
    .mockReturnValue({ key: "line", goal: { key: "beta", params: {} } } as never)
  const { container } = render(<CanistersPuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />)
  const vessels = () =>
    within(container)
      .getAllByRole("button")
      .filter(button => (button.getAttribute("aria-label") ?? "").startsWith("canister of"))
  act(() => within(container).getByRole("button", { name: /hint/i }).click())
  return {
    hold: (index: number) => act(() => vessels()[index].click()),
    shown: () => container.textContent ?? "",
  }
}

describe("CanistersPuzzle hint that stays", () => {
  it("keeps the hint, and the words it was asked with, while a canister is picked up", () => {
    const { hold, shown } = open()
    expect(shown()).toContain("canisters.hint.stuck")
    hold(0)
    expect(shown()).toContain("canisters.hint.stuck")
    expect(shown()).not.toContain("canisters.hint.goal.beta")
  })

  it("ends the hint on a pour", () => {
    const { hold, shown } = open()
    hold(0)
    hold(1)
    expect(shown()).not.toContain("canisters.hint.stuck")
  })
})
