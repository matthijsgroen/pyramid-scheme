// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { act } from "react"
import type { CrossingPuzzle } from "@/mods/trap/game/crocodile/crossingRules"
import { CrocodilePit } from "./CrocodilePit"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const takeTrapDamage = vi.fn()
vi.mock("@/mods/trap/app/useTrapProgress", () => ({
  useTrapProgress: () => ({ currentHealth: 4, maxHealth: 6, takeTrapDamage }),
}))

const stone = (value: number) => ({
  value,
  formula: { left: value, right: 0, operation: "+" as const, result: value },
})

// Biggest, then smallest: 9 then 1.
const puzzle: CrossingPuzzle = {
  columns: [
    [stone(4), stone(9), stone(6)],
    [stone(7), stone(1)],
  ],
  signs: ["biggest", "smallest"],
}

const key = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
    window.dispatchEvent(new KeyboardEvent("keyup", { code }))
  })

const stones = () => screen.getAllByRole("button").filter(button => /^\d+ \+ 0/.test(button.textContent ?? ""))
const stoneOf = (value: number) => stones().find(button => button.textContent?.startsWith(`${value} + 0`))!
const cursorOn = () =>
  stones()
    .find(button => button.classList.contains("board-cursor"))
    ?.textContent?.split(" ")[0]

const renderPit = () => {
  takeTrapDamage.mockClear()
  const onSolved = vi.fn()
  render(<CrocodilePit puzzle={puzzle} difficulty="expert" onSolved={onSolved} onCancel={vi.fn()} />)
  return onSolved
}

describe("CrocodilePit by keys", () => {
  it("moves the cursor along the row on offer and steps where a tap steps", () => {
    renderPit()
    expect(cursorOn()).toBe("4")
    key("ArrowRight")
    expect(cursorOn()).toBe("9")
    key("ArrowDown")
    expect(cursorOn()).toBe("9")
    key("Enter")
    expect(takeTrapDamage).not.toHaveBeenCalled()
    // The next row is on offer now, and the cursor is on it.
    expect((stoneOf(7) as HTMLButtonElement).disabled).toBe(false)
    expect((stoneOf(4) as HTMLButtonElement).disabled).toBe(true)
    expect(cursorOn()).toBe("1")
  })

  it("is bitten on the stone a tap is bitten on", () => {
    renderPit()
    key("Enter")
    const keyed = takeTrapDamage.mock.calls.length
    cleanup()

    renderPit()
    act(() => stoneOf(4).click())
    expect(keyed).toBe(1)
    expect(takeTrapDamage).toHaveBeenCalledTimes(1)
  })

  it("crosses by keys alone", () => {
    renderPit()
    key("ArrowRight")
    key("Enter")
    key("ArrowRight")
    key("Enter")
    expect(takeTrapDamage).not.toHaveBeenCalled()
    expect(document.querySelector("[inert]")).not.toBeNull()
  })
})
