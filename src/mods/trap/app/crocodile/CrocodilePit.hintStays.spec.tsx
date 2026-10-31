// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { act } from "react"
import type { CrossingPuzzle } from "@/mods/trap/game/crocodile/crossingRules"
import { CrocodilePit } from "./CrocodilePit"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, params?: { value: number }) => `${key}:${params?.value}` }),
}))
vi.mock("@/mods/trap/app/useTrapProgress", () => ({
  useTrapProgress: () => ({ currentHealth: 4, maxHealth: 6, takeTrapDamage: vi.fn() }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const stone = (value: number) => ({
  value,
  formula: { left: value, right: 0, operation: "+" as const, result: value },
})

const puzzle: CrossingPuzzle = {
  columns: [
    [stone(4), stone(9), stone(2)],
    [stone(7), stone(1), stone(3)],
  ],
  signs: ["biggest", "smallest"],
}

const tap = (label: number) =>
  act(() =>
    screen
      .getAllByRole("button")
      .find(button => button.textContent?.startsWith(`${label} + 0`))!
      .click()
  )
const hintButton = () => screen.getByRole("button", { name: /hint/i })
const shown = () => document.body.textContent ?? ""

describe("crocodile hint that stays", () => {
  it("ends the hint on a step onto the stone it wanted", () => {
    render(<CrocodilePit puzzle={puzzle} difficulty="expert" onSolved={vi.fn()} onCancel={vi.fn()} />)
    act(() => hintButton().click())
    expect(shown()).toContain("crocodile.hint.biggest:9")
    tap(9)
    expect(shown()).not.toContain("crocodile.hint.biggest")
  })

  it("ends the hint on a wrong, biting step", () => {
    render(<CrocodilePit puzzle={puzzle} difficulty="expert" onSolved={vi.fn()} onCancel={vi.fn()} />)
    act(() => hintButton().click())
    tap(4)
    expect(shown()).not.toContain("crocodile.hint.biggest")
  })

  it("keeps the hint through a tap the pit ignores while a bite is under way", () => {
    render(<CrocodilePit puzzle={puzzle} difficulty="expert" onSolved={vi.fn()} onCancel={vi.fn()} />)
    tap(4) // bitten; the bite lasts until its timer runs out
    act(() => hintButton().click())
    expect(shown()).toContain("crocodile.hint.biggest:9")
    tap(2) // ignored: the pit is mid-bite
    expect(shown()).toContain("crocodile.hint.biggest:9")
  })
})
