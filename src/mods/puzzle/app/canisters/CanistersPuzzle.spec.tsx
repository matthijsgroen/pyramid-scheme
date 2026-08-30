import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { CanistersPuzzle as CanistersPuzzleData } from "@/mods/puzzle/game/canisters/canisters"
import { CanistersPuzzle } from "./CanistersPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

afterEach(cleanup)

/** Tartaglia's board on a budget of three, so it can be run out inside a test — and starts above the warning. */
const puzzle: CanistersPuzzleData = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 3 }

const open = () => render(<CanistersPuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />).container

const vesselsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => (button.getAttribute("aria-label") ?? "").startsWith("canister of"))

/** One pour, as a player taps it: pick a canister up, then pick the one it goes into. */
const pour = (root: HTMLElement, from: number, to: number) => {
  act(() => vesselsIn(root)[from].click())
  act(() => vesselsIn(root)[to].click())
}

const counter = (root: HTMLElement) => within(root).getByText("canisters.movesLeft")

describe("the budget a canisters board is worked against", () => {
  /**
   * **The warning has to arrive while it can still be acted on.** It used to turn red at zero, which is a
   * board already dead — the pours are spent and the only moves left are undo and reset.
   */
  it("warns before the budget is gone, not once it is", () => {
    const root = open()
    expect(counter(root).className).toContain("text-stone-200")
    pour(root, 0, 1)
    expect(counter(root).className).toContain("text-amber-300")
  })

  /**
   * A spent budget refuses pours in silence (`pourInto`) — a tap that does nothing and says nothing.
   * The board says it instead of leaving the sentence behind the hint button.
   */
  it("says so on the board once there is nothing left to pour", () => {
    const root = open()
    expect(screen.queryByText("canisters.hint.overBudget")).toBeNull()
    pour(root, 0, 1)
    pour(root, 1, 2)
    pour(root, 2, 0)
    expect(counter(root).className).toContain("text-rose-400")
    expect(screen.getByText("canisters.hint.overBudget")).toBeTruthy()
  })

  /** Undo gives the move back as well as the pour, so it is the way out of a budget spent wrongly. */
  it("offers undo from the shell's control row, dimmed until there is a pour to take back", () => {
    const root = open()
    const undo = () => within(root).getByRole<HTMLButtonElement>("button", { name: /ui.undo/ })
    expect(undo().disabled).toBe(true)
    pour(root, 0, 1)
    expect(undo().disabled).toBe(false)
    act(() => undo().click())
    expect(undo().disabled).toBe(true)
    expect(counter(root).className).toContain("text-stone-200")
  })
})
