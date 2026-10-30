// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import { act } from "react"
import { generateHidato } from "@/mods/puzzle/game/hidato/generateHidato"
import { HIDATO_CONFIG } from "@/mods/puzzle/game/hidato/hidatoConfig"
import { hexKey } from "@/mods/puzzle/game/hidato/hex"
import { buildHidatoHint } from "@/mods/puzzle/app/hidato/hidatoHint"
import { HidatoPuzzle } from "./HidatoPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/mods/puzzle/app/hidato/hidatoHint", () => ({ buildHidatoHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

const puzzle = generateHidato(4, HIDATO_CONFIG.starter)
const order = puzzle.cells.map(hexKey)
const cellOf = (value: number) => Object.entries(puzzle.solution).find(([, other]) => other === value)![0]
const isGiven = (value: number) => puzzle.givens[cellOf(value)] !== undefined
/** The first number the player has to write, so every number before it is a given. */
const firstToWrite = puzzle.cells.map((_, index) => index + 1).find(value => !isGiven(value))!

const hintOf = (key: string) => ({ key, params: {}, cell: cellOf(firstToWrite), evidence: new Set<string>(), place: 1 })

const open = () => {
  vi.mocked(buildHidatoHint).mockReset()
  vi.mocked(buildHidatoHint).mockImplementation(() => hintOf("alpha"))
  vi.mocked(buildHidatoHint).mockReturnValueOnce(hintOf("alpha")).mockReturnValue(hintOf("beta"))
  const view = render(<HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />)
  const cells = () => [...view.container.querySelectorAll<SVGGElement>('g[role="button"]')]
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const svg = () => view.container.querySelector("svg")!
  return {
    press: (value: number) =>
      act(() => void fireEvent.pointerDown(cells()[order.indexOf(cellOf(value))], { pointerId: 1 })),
    tap: (value: number) => {
      // Two acts, as the two events of a real tap are: the lift must see the board the press left.
      act(() => void fireEvent.pointerDown(cells()[order.indexOf(cellOf(value))], { pointerId: 1 }))
      act(() => void fireEvent.pointerUp(svg(), { pointerId: 1 }))
    },
    shown: () => view.container.textContent ?? "",
  }
}

describe("HidatoPuzzle hint that stays", () => {
  it("keeps the hint, in the words it was asked with, when the run is only picked up", () => {
    const { press, shown } = open()
    expect(shown()).toContain("reason.alpha")
    press(1)
    expect(shown()).toContain("reason.alpha")
    expect(shown()).not.toContain("reason.beta")
  })

  it("keeps the hint through taps that only walk over the numbers already given", () => {
    const { tap, shown } = open()
    for (let value = 1; value < firstToWrite; value++) tap(value)
    expect(shown()).toContain("reason.alpha")
  })

  it("ends the hint when a number is written", () => {
    const { tap, shown } = open()
    for (let value = 1; value <= firstToWrite; value++) tap(value)
    expect(shown()).not.toContain("reason.alpha")
  })
})
