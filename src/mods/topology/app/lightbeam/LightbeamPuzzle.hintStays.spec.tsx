// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { act } from "react"
import { lightbeamHintSteps, pickLightbeamHint } from "./lightbeamHint"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { generateLightbeamFor } from "./plugin"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("./lightbeamHint", () => ({ lightbeamHintSteps: vi.fn(() => []), pickLightbeamHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const puzzle = generateLightbeamFor("starter", 1)

const open = () => {
  vi.mocked(lightbeamHintSteps).mockClear()
  vi.mocked(pickLightbeamHint).mockReset()
  vi.mocked(pickLightbeamHint)
    .mockReturnValueOnce({ key: "alpha", cells: new Set(), beam: [] })
    .mockReturnValue({ key: "beta", cells: new Set(), beam: [] })
  const { container } = render(
    <LightbeamPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
  )
  act(() => within(container).getByRole("button", { name: /hint/i }).click())
  return {
    cycle: () =>
      act(() =>
        screen
          .getAllByRole("button")
          .find(b => b.className.includes("aspect-square"))!
          .click()
      ),
    shown: () => container.textContent ?? "",
  }
}

describe("LightbeamPuzzle hint that stays", () => {
  it("shows the pick it was asked for, picked once, with the solve done once", () => {
    const { shown } = open()
    expect(shown()).toContain("lightbeam.hint.alpha")
    expect(pickLightbeamHint).toHaveBeenCalledTimes(1)
    expect(lightbeamHintSteps).toHaveBeenCalledTimes(1)
  })

  it("ends the hint when a piece is cycled", () => {
    const { cycle, shown } = open()
    cycle()
    expect(shown()).not.toContain("lightbeam.hint.alpha")
  })
})
