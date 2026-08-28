import { beforeAll, describe, expect, it } from "vitest"
import { fireEvent, render, within } from "@testing-library/react"
import { act } from "react"
import type { RushHourPuzzle as RushHourPuzzleData } from "@/mods/puzzle/game/rushHour/rushHour"
import { RushHourPuzzle } from "./RushHourPuzzle"

//  P P . A . .   the player, one blocker across its lane at column 3, and room to shove.
//  . . . A . .
const board: RushHourPuzzleData = {
  size: 6,
  pieces: [
    { lane: 0, offset: 0, len: 2, horizontal: true },
    { lane: 3, offset: 0, len: 2, horizontal: false },
  ],
}

// The shell scrolls a revealed hint into view, and a drag captures the pointer so the cells it crosses
// still report to the piece it started on. jsdom implements neither. A board is also laid out by
// percentages of a frame jsdom gives no size to, so the frame is measured for it.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})

const CELL = 100
const pieceIn = (root: HTMLElement, index: number) => within(root).getByRole("button", { name: `piece ${index + 1}` })

const drag = (piece: HTMLElement, from: HTMLElement, dx: number, dy: number) => {
  from.getBoundingClientRect = () => ({ width: CELL * 6, height: CELL * 6, x: 0, y: 0 }) as DOMRect
  act(() => fireEvent.pointerDown(piece, { clientX: 0, clientY: 0, pointerId: 1 }))
  act(() => fireEvent.pointerMove(from, { clientX: dx, clientY: dy, pointerId: 1 }))
  act(() => fireEvent.pointerUp(from, { pointerId: 1 }))
}

/** The frame every piece is positioned inside — the one element that knows how big a cell came out. */
const frameOf = (container: HTMLElement) => container.querySelector<HTMLElement>(".aspect-square")!

describe("RushHourPuzzle", () => {
  it("shoves a piece along its lane, and stops it where something is in the way", () => {
    const { container } = render(<RushHourPuzzle puzzle={board} onSolved={() => {}} onCancel={() => {}} />)
    const frame = frameOf(container)

    // Two cells right: the player owns columns 0–1 and column 3 is taken, so it lands on column 1.
    drag(pieceIn(container, 0), frame, CELL * 2, 0)
    expect(pieceIn(container, 0).style.left).toBe(`${(100 / 6) * 1}%`)

    // Straight through the blocker: it stops in front of it rather than refusing the whole gesture.
    drag(pieceIn(container, 0), frame, CELL * 4, 0)
    expect(pieceIn(container, 0).style.left).toBe(`${(100 / 6) * 1}%`)
  })

  it("steps a shove back off the board", () => {
    const { container } = render(<RushHourPuzzle puzzle={board} onSolved={() => {}} onCancel={() => {}} />)
    const frame = frameOf(container)
    const undo = () => within(container).getByRole("button", { name: /↩/ })

    expect(undo().hasAttribute("disabled")).toBe(true)
    drag(pieceIn(container, 1), frame, 0, CELL * 3)
    expect(pieceIn(container, 1).style.top).toBe(`${(100 / 6) * 3}%`)
    act(() => undo().click())
    expect(pieceIn(container, 1).style.top).toBe("0%")
    expect(undo().hasAttribute("disabled")).toBe(true)
  })
})
