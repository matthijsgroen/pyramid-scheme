// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { press } from "@/app/input/controlsInARow.testing"
import { pairsOf, type Star } from "@/mods/puzzle/game/constellation/constellation"
import type { ConstellationPuzzleWithAnswer } from "@/mods/puzzle/game/constellation/generateConstellation"
import { ConstellationPuzzle } from "./ConstellationPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

//  3 . 3     four stars on the corners of a square, each wanting more lines than the board will be given here.
//  . . .
//  3 . 3
const stars: Star[] = [
  { cell: 0, count: 3 },
  { cell: 2, count: 3 },
  { cell: 6, count: 3 },
  { cell: 8, count: 3 },
]
const pairs = pairsOf(3, stars)
const puzzle: ConstellationPuzzleWithAnswer = {
  size: 3,
  stars,
  pairs,
  solution: pairs.map(() => 1),
  techniqueCap: "capacity",
}

const hold = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
  })
const letGo = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code }))
  })

const open = (onCancel = () => {}) => {
  const { container } = render(<ConstellationPuzzle puzzle={puzzle} onSolved={() => {}} onCancel={onCancel} />)
  const star = (index: number) =>
    within(container)
      .getAllByRole("button")
      .filter(button => button.className.includes("-translate-1/2"))[index]
  return {
    star,
    /** The drawn sky and the stars' lit state: everything a line changes. */
    board: () => [
      container.querySelector("svg")!.innerHTML,
      stars.map((_, index) => star(index).firstElementChild!.className),
    ],
    drag: (index: number, deltaRow: number, deltaCol: number) =>
      act(() => {
        fireEvent.pointerDown(star(index), { clientX: 100, clientY: 100, pointerId: 1 })
        fireEvent.pointerMove(star(index), { clientX: 100 + deltaCol * 60, clientY: 100 + deltaRow * 60, pointerId: 1 })
        fireEvent.pointerUp(star(index), { pointerId: 1 })
      }),
  }
}

describe("ConstellationPuzzle by keys", () => {
  it("moves the cursor to the nearest star a direction points at, drawing nothing", () => {
    const keys = open()
    const before = keys.board()
    press("ArrowDown")
    press("ArrowRight")
    expect(keys.star(3).className).toContain("cursor-brackets")
    expect(keys.star(0).className).not.toContain("cursor-brackets")
    expect(keys.board()).toEqual(before)
  })

  it("cycles the line a direction points at while alt is held, as a drag that way cycles it", () => {
    const keys = open()
    hold("ShiftLeft")
    press("ArrowRight")
    press("ArrowRight")
    letGo("ShiftLeft")
    press("ArrowDown")
    hold("KeyN")
    press("ArrowRight")
    letGo("KeyN")
    const keyed = keys.board()
    cleanup()

    const taps = open()
    taps.drag(0, 0, 1)
    taps.drag(0, 0, 1)
    taps.drag(2, 0, 1)
    expect(keyed).toEqual(taps.board())
    expect(keyed).not.toEqual(open().board())
  })

  it("cycles the line a direction points at once Enter has picked the star up, as a drag that way cycles it", () => {
    const keys = open()
    press("Enter")
    expect(keys.star(0).dataset.held).toBe("true")
    press("ArrowRight")
    press("ArrowRight")
    expect(keys.star(0).className).toContain("cursor-brackets")
    const keyed = keys.board()
    cleanup()

    const taps = open()
    taps.drag(0, 0, 1)
    taps.drag(0, 0, 1)
    expect(keyed).toEqual(taps.board())
  })

  it("lets the star go on a second Enter, so a direction moves the cursor again", () => {
    const keys = open()
    press("Enter")
    press("Enter")
    expect(keys.star(0).dataset.held).toBeUndefined()
    const before = keys.board()
    press("ArrowRight")
    expect(keys.star(1).className).toContain("cursor-brackets")
    expect(keys.board()).toEqual(before)
  })

  it("lets a held star go on Escape instead of leaving the board", () => {
    const onCancel = vi.fn()
    const keys = open(onCancel)
    press("Enter")
    press("Escape")
    expect(keys.star(0).dataset.held).toBeUndefined()
    expect(onCancel).not.toHaveBeenCalled()
    press("ArrowRight")
    expect(keys.star(1).className).toContain("cursor-brackets")
  })

  it("shows the held star while alt is held down, and not after", () => {
    const keys = open()
    hold("ShiftLeft")
    expect(keys.star(0).dataset.held).toBe("true")
    letGo("ShiftLeft")
    expect(keys.star(0).dataset.held).toBeUndefined()
  })

  it("lets a held star go when a pointer takes a star", () => {
    const keys = open()
    press("Enter")
    keys.drag(2, 0, 0)
    expect(keys.star(0).dataset.held).toBeUndefined()
    expect(keys.star(2).dataset.held).toBeUndefined()
  })

  it("cycles once for a held direction, not on its repeat", () => {
    const keys = open()
    hold("ShiftLeft")
    press("ArrowRight")
    const once = keys.board()
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight", repeat: true, cancelable: true }))
    })
    expect(keys.board()).toEqual(once)
  })

  it("takes back one line change per undo", () => {
    const keys = open()
    hold("ShiftLeft")
    press("ArrowRight")
    const first = keys.board()
    press("ArrowDown")
    letGo("ShiftLeft")
    press("KeyZ")
    expect(keys.board()).toEqual(first)
  })
})
