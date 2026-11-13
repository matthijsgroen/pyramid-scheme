// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { press } from "@/app/input/controlsInARow.testing"
import type { RushHourPuzzle as RushHourPuzzleData } from "@/mods/puzzle/game/rushHour/rushHour"
import { RushHourPuzzle } from "./RushHourPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

//  P P . A . .   the player, and a blocker standing up across its lane at column 3.
//  . . . A . .
const board: RushHourPuzzleData = {
  size: 6,
  pieces: [
    { lane: 0, offset: 0, len: 2, horizontal: true },
    { lane: 3, offset: 0, len: 2, horizontal: false },
  ],
}

const CELL = 100
const cells = (count: number) => `${(100 / 6) * count}%`

const open = (onCancel = () => {}) => {
  const { container } = render(<RushHourPuzzle puzzle={board} onSolved={() => {}} onCancel={onCancel} />)
  const piece = (index: number) => within(container).getByRole("button", { name: `piece ${index + 1}` })
  const frame = container.querySelector<HTMLElement>(".aspect-square")!
  frame.getBoundingClientRect = () => ({ width: CELL * 6, height: CELL * 6, x: 0, y: 0 }) as DOMRect
  return {
    piece,
    undo: () => within(container).getByRole("button", { name: /↩/ }),
    /** A drag that crosses `steps` cells one at a time, as a finger does. */
    drag: (index: number, dx: number, dy: number, steps = 1) => {
      act(() => fireEvent.pointerDown(piece(index), { clientX: 0, clientY: 0, pointerId: 1 }))
      for (let step = 1; step <= steps; step++)
        act(() => fireEvent.pointerMove(frame, { clientX: (dx * step) / steps, clientY: (dy * step) / steps }))
      act(() => fireEvent.pointerUp(frame, { pointerId: 1 }))
    },
  }
}

describe("RushHourPuzzle by keys", () => {
  it("shoves a held piece as a drag over the same cells shoves it", () => {
    const keys = open()
    press("ArrowRight") // from the player to the nearest piece east: the blocker
    press("Enter")
    press("ArrowDown")
    press("ArrowDown")
    press("ArrowDown")
    press("Enter")
    const keyed = keys.piece(1).style.top
    cleanup()

    const taps = open()
    taps.drag(1, 0, CELL * 3, 3)
    expect(keyed).toBe(taps.piece(1).style.top)
    expect(keyed).toBe(cells(3))
  })

  it("stops a held piece where something is in its way, as a drag stops", () => {
    const keys = open()
    press("Enter")
    press("ArrowRight")
    press("ArrowRight")
    press("ArrowRight")
    expect(keys.piece(0).style.left).toBe(cells(1))
  })

  it("counts taking a piece to letting it go as one move: one undo puts the whole shove back", () => {
    const keys = open()
    press("ArrowRight")
    press("Enter")
    press("ArrowDown")
    press("ArrowDown")
    press("ArrowDown")
    press("Enter")
    press("KeyZ")
    expect(keys.piece(1).style.top).toBe("0%")
    expect(keys.undo().hasAttribute("disabled")).toBe(true)
    cleanup()

    const taps = open()
    taps.drag(1, 0, CELL * 3, 3)
    act(() => taps.undo().click())
    expect(taps.piece(1).style.top).toBe("0%")
    expect(taps.undo().hasAttribute("disabled")).toBe(true)
  })

  it("makes no move of a piece taken and put back where it stood", () => {
    const keys = open()
    press("ArrowRight")
    press("Enter")
    press("ArrowDown")
    press("ArrowUp")
    press("Enter")
    expect(keys.undo().hasAttribute("disabled")).toBe(true)
  })

  it("ignores a direction across a held piece's lane", () => {
    const keys = open()
    press("ArrowRight")
    press("Enter")
    press("ArrowLeft")
    press("ArrowRight")
    expect(keys.piece(0).style.left).toBe("0%")
    expect(keys.piece(1).style.left).toBe(cells(3))
    expect(keys.piece(1).dataset.held).toBe("true")
  })

  it("lets a held piece go on back instead of leaving the board", () => {
    const onCancel = vi.fn()
    const keys = open(onCancel)
    press("Enter")
    expect(keys.piece(0).dataset.held).toBe("true")
    press("Escape")
    expect(keys.piece(0).dataset.held).toBeUndefined()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("lets go and takes the move back on undo while a piece is held", () => {
    const keys = open()
    press("ArrowRight")
    press("Enter")
    press("ArrowDown")
    press("KeyZ")
    expect(keys.piece(1).style.top).toBe("0%")
    expect(keys.piece(1).dataset.held).toBeUndefined()
  })
})
