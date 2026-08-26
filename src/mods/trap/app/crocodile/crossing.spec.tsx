import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { act } from "react"
import type { CrossingPuzzle } from "@/mods/trap/game/crocodile/crossingRules"
import { CrocodilePit } from "./CrocodilePit"

// The shell scrolls a revealed hint into view; jsdom does not implement it.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

// No global auto-cleanup in this suite, and a board left mounted from the last test is another set of
// stones with the same numbers on them — every tap would land on the wrong board.
afterEach(cleanup)

const takeTrapDamage = vi.fn()
vi.mock("@/mods/trap/app/useTrapProgress", () => ({
  useTrapProgress: () => ({ currentHealth: 4, maxHealth: 6, takeTrapDamage }),
}))

const stone = (value: number) => ({
  value,
  formula: { left: value, right: 0, operation: "+" as const, result: value },
})

/**
 * Three crocodiles that do not all want the same thing: biggest, then smallest, then biggest. Every
 * other stone in a row is a bite.
 */
const puzzle: CrossingPuzzle = {
  columns: [
    [stone(4), stone(9)],
    [stone(7), stone(1)],
    [stone(2), stone(8)],
  ],
  signs: ["biggest", "smallest", "biggest"],
}

const stones = () => screen.getAllByRole("button").filter(button => /^\d+ \+ 0/.test(button.textContent ?? ""))

const tap = (label: string) => {
  const target = stones().find(button => button.textContent?.startsWith(`${label} + 0`))
  if (!target) throw new Error(`no stone ${label} on the board`)
  act(() => target.click())
}

const renderPit = (onSolved = vi.fn()) => {
  takeTrapDamage.mockClear()
  render(<CrocodilePit puzzle={puzzle} difficulty="expert" onSolved={onSolved} onCancel={vi.fn()} />)
  return onSolved
}

describe("crossing the pit", () => {
  it("draws every stone, near bank first", () => {
    renderPit()
    expect(stones()).toHaveLength(6)
  })

  it("takes health for a step the crocodile refuses, and puts the player back on the bank", () => {
    renderPit()
    tap("4") // this crocodile wants the biggest of 4 and 9
    expect(takeTrapDamage).toHaveBeenCalledTimes(1)
    // Back on the near bank: the first row is on offer again, so tapping its answer steps rather than bites.
    tap("9")
    expect(takeTrapDamage).toHaveBeenCalledTimes(1)
  })

  it("crosses without a bite when every step obeys its crocodile", () => {
    const onSolved = renderPit()
    tap("9") // biggest
    tap("1") // smallest
    tap("8") // biggest
    expect(takeTrapDamage).not.toHaveBeenCalled()
    // Standing on the last column IS the far bank: the shell hears the solve and freezes the board
    // (it goes inert), then waits for the banner to be tapped — so the room is not left yet.
    expect(document.querySelector("[inert]")).not.toBeNull()
    expect(onSolved).not.toHaveBeenCalled()
  })
})
