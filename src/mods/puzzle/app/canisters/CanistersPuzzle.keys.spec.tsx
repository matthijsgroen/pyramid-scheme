// @vitest-environment jsdom
import { act, cleanup, render, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import type { CanistersPuzzle as CanistersPuzzleData } from "@/mods/puzzle/game/canisters/canisters"
import { CanistersPuzzle } from "./CanistersPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => {
  controlsInARow()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** A 5 and a 3: one pour leaves the 2 that is asked for in the 5. */
const puzzle: CanistersPuzzleData = { capacities: [5, 3], start: [5, 0], targets: [2], budget: 4 }

const open = () => {
  const { container } = render(<CanistersPuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />)
  const labelled = (prefix: string) =>
    within(container)
      .getAllByRole("button")
      .filter(button => (button.getAttribute("aria-label") ?? "").startsWith(prefix))
  return {
    vessels: () => labelled("canister of"),
    claims: () => labelled("canisters.claimAria"),
    read: () => labelled("canister of").map(vessel => vessel.getAttribute("aria-label")),
    left: () => within(container).getByText("canisters.movesLeft").textContent,
  }
}

describe("CanistersPuzzle by keys", () => {
  it("pours by keys as taps pour: confirm picks a canister up, confirm on another pours into it", () => {
    const keys = open()
    expect(document.activeElement).toBe(keys.vessels()[0])
    press("Enter")
    press("ArrowRight")
    press("ArrowRight")
    expect(document.activeElement).toBe(keys.vessels()[1])
    press("Enter")
    const keyed = keys.read()
    cleanup()

    const taps = open()
    act(() => taps.vessels()[0].click())
    act(() => taps.vessels()[1].click())
    expect(keyed).toEqual(taps.read())
    expect(keyed).toEqual(["canister of 5, holding 2", "canister of 3, holding 3"])
  })

  it("claims by keys as a tap claims, and undo takes the pour back as the pill does", () => {
    const keys = open()
    press("Enter")
    press("ArrowRight")
    press("ArrowRight")
    press("Enter")
    press("KeyZ")
    expect(keys.read()).toEqual(["canister of 5, holding 5", "canister of 3, holding 0"])
    press("ArrowLeft")
    expect(document.activeElement).toBe(keys.claims()[0])
    press("Enter")
    const keyed = keys.left()
    cleanup()

    const taps = open()
    act(() => taps.vessels()[0].click())
    act(() => taps.vessels()[1].click())
    act(() =>
      within(document.body)
        .getByText(/ui.undo/)
        .click()
    )
    act(() => taps.claims()[0].click())
    expect(keyed).toEqual(taps.left())
  })
})
