// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { press } from "@/app/input/controlsInARow.testing"
import { hexagon, hexFromKey, hexKey, type Hex } from "@/mods/puzzle/game/hidato/hex"
import type { HidatoPuzzle as HidatoPuzzleData } from "@/mods/puzzle/game/hidato/generateHidato"
import { HidatoPuzzle } from "./HidatoPuzzle"

const FRAME = 400

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: FRAME, height: FRAME, right: FRAME, bottom: FRAME, x: 0, y: 0 }) as DOMRect
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Seven cells: the run goes round the ring from the west cell, 1, clockwise, and ends on the centre, 7.
//     2 3
//    1 7 4
//     6 5
// Six steps on seven cells cannot use all six directions (they would end where they began); the hook's own
// spec covers each one.
const solution: Record<string, number> = {
  "-1,0": 1,
  "0,-1": 2,
  "1,-1": 3,
  "1,0": 4,
  "0,1": 5,
  "-1,1": 6,
  "0,0": 7,
}
const puzzle: HidatoPuzzleData = {
  cells: hexagon(1),
  givens: { "-1,0": 1, "0,0": 7 },
  solution,
  pruning: "adjacency",
}
const order = Object.entries(solution)
  .sort(([, a], [, b]) => a - b)
  .map(([key]) => key)

/** Every number on the board, by cell. */
const numbers = (root: HTMLElement) =>
  Object.fromEntries(
    [...root.querySelectorAll("svg text")].map(text => {
      // A number is drawn at its cell's centre: pointy-top axial, q east and r south-east (hidato.md).
      const r = Number(text.getAttribute("y")) / 15
      const q = Number(text.getAttribute("x")) / (Math.sqrt(3) * 10) - r / 2
      return [hexKey({ q: Math.round(q), r: Math.round(r) }), Number(text.textContent)]
    })
  )

/** The cell under the keys' cursor, read off the lifted hex drawn at its centre. */
const cursorAt = (root: HTMLElement) => {
  const [x, y] = root
    .querySelector("g.svg-cursor")!
    .getAttribute("transform")!
    .match(/translate\(([-\d.e]+) ([-\d.e]+)\)/)!
    .slice(1)
    .map(Number)
  const r = y / 15
  const q = x / (Math.sqrt(3) * 10) - r / 2
  return hexKey({ q: Math.round(q), r: Math.round(r) })
}

// Seven cells with the 3 in the centre, picked up there: up-left is the 5 the puzzle wrote in, which does not go
// on from the 3, and up-right is where the 4 goes.
//     5 4
//    2 3 1
//     6 7
const leftBlocked: HidatoPuzzleData = {
  cells: hexagon(1),
  givens: { "1,0": 1, "0,0": 3, "0,-1": 5, "-1,1": 7 },
  solution: { "1,0": 1, "0,1": 2, "0,0": 3, "1,-1": 4, "0,-1": 5, "-1,0": 6, "-1,1": 7 },
  pruning: "adjacency",
}
// The same with the 4 written in up-right, so the run passes through it.
const leftBlockedRightGiven: HidatoPuzzleData = { ...leftBlocked, givens: { ...leftBlocked.givens, "1,-1": 4 } }
// The same without the 5, so the 4 could go up-left or up-right.
const bothOpen: HidatoPuzzleData = { ...leftBlocked, givens: { "1,0": 1, "0,0": 3, "-1,1": 7 } }
// Mirrored: up-right is the 5 written in, up-left is where the 4 goes.
//     4 5
//    1 3 6
//     2 7
const rightBlocked: HidatoPuzzleData = {
  cells: hexagon(1),
  givens: { "-1,0": 1, "0,0": 3, "1,-1": 5, "0,1": 7 },
  solution: { "-1,0": 1, "-1,1": 2, "0,0": 3, "0,-1": 4, "1,-1": 5, "1,0": 6, "0,1": 7 },
  pruning: "adjacency",
}

const open = (onCancel = () => {}, board = puzzle) => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  const onSolved = vi.fn()
  const { container } = render(
    <HidatoPuzzle puzzle={board} difficulty="starter" onSolved={onSolved} onCancel={onCancel} />
  )
  const undo = () => within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ })
  const svg = container.querySelector("svg")!
  const cell = (key: string) => container.querySelectorAll('g[role="button"]')[puzzle.cells.map(hexKey).indexOf(key)]
  const pointAt = ({ q, r }: Hex) => {
    const [left, top, side] = svg.getAttribute("viewBox")!.split(" ").map(Number)
    const x = Math.sqrt(3) * 10 * (q + r / 2)
    const y = 1.5 * 10 * r
    return { clientX: ((x - left) / side) * FRAME, clientY: ((y - top) / side) * FRAME }
  }
  return {
    container,
    onSolved,
    undo,
    /** Every Z until the undo button greys out: how many moves the board remembers. */
    undoCount: () => {
      let count = 0
      while (!undo().disabled) {
        press("KeyZ")
        count++
      }
      return count
    },
    /** A finger down on the first cell and dragged through the rest without lifting. */
    drag: (keys: string[]) => {
      act(() => void fireEvent.pointerDown(cell(keys[0]), { pointerId: 1 }))
      for (const key of keys.slice(1))
        act(() => void fireEvent.pointerMove(svg, { pointerId: 1, ...pointAt(hexFromKey(key)) }))
      act(() => void fireEvent.pointerUp(svg, { pointerId: 1 }))
    },
    tap: (key: string) =>
      act(() => {
        fireEvent.pointerDown(cell(key), { pointerId: 1 })
        fireEvent.pointerUp(svg, { pointerId: 1 })
      }),
  }
}

const shifted = (code: string) => {
  act(() => void window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft", cancelable: true })))
  press(code)
  act(() => void window.dispatchEvent(new KeyboardEvent("keyup", { code: "ShiftLeft" })))
}

/** Round the ring from the 1 and into the centre: upper-right, right, lower-right, lower-left, left, upper-right. */
const keyedRun = () => {
  press("Enter")
  press("KeyE")
  press("ArrowRight")
  shifted("ArrowDown")
  press("ArrowDown")
  press("ArrowLeft")
  shifted("ArrowUp")
}

describe("HidatoPuzzle by keys", () => {
  it("carries the run along the same cells a drag goes through, to the same numbers", () => {
    const keys = open()
    press("Enter")
    press("KeyE")
    press("ArrowRight")
    press("KeyX")
    const keyed = numbers(keys.container)
    const keyedUndos = keys.undoCount()
    cleanup()

    const finger = open()
    finger.drag(order.slice(0, 4))
    expect(numbers(finger.container)).toEqual(keyed)
    expect(keyed).toMatchObject({ "0,-1": 2, "1,-1": 3, "1,0": 4 })
    expect(finger.undoCount()).toBe(keyedUndos)
  })

  it("fills the whole run by keys alone", () => {
    const keys = open()
    keyedRun()
    expect(numbers(keys.container)).toEqual(solution)
  })

  it("takes the run's head back off on Enter, as a tap on it does, as one more move", () => {
    const keys = open()
    press("Enter")
    press("KeyE")
    press("Enter")
    const keyed = numbers(keys.container)
    const keyedUndos = keys.undoCount()
    cleanup()

    const finger = open()
    finger.tap(order[0])
    finger.tap(order[1])
    finger.tap(order[1])
    expect(numbers(finger.container)).toEqual(keyed)
    expect(keyed).toEqual(puzzle.givens)
    expect(finger.undoCount()).toBe(keyedUndos)
  })

  it("moves the cursor without laying anything while no run is picked up", () => {
    const keys = open()
    press("KeyE")
    press("ArrowRight")
    expect(numbers(keys.container)).toEqual(puzzle.givens)
    expect(keys.undo().disabled).toBe(true)
  })

  it("goes up and down to the right-hand cell where the left-hand one is off the board", () => {
    const keys = open()
    expect(cursorAt(keys.container)).toBe("-1,0")
    press("ArrowUp")
    expect(cursorAt(keys.container)).toBe("0,-1")
    press("ArrowDown")
    expect(cursorAt(keys.container)).toBe("-1,0")
    press("ArrowDown")
    expect(cursorAt(keys.container)).toBe("-1,1")
  })

  it("still goes up to the left-hand cell where both upper cells are on the board", () => {
    const keys = open()
    press("ArrowRight")
    press("ArrowUp")
    expect(cursorAt(keys.container)).toBe("0,-1")
  })

  it("bent right, goes to the left-hand cell where the right-hand one is off the board", () => {
    const keys = open()
    press("ArrowRight")
    press("ArrowRight")
    shifted("ArrowUp")
    expect(cursorAt(keys.container)).toBe("1,-1")
    press("KeyX")
    expect(cursorAt(keys.container)).toBe("1,0")
    shifted("ArrowDown")
    expect(cursorAt(keys.container)).toBe("0,1")
    press("KeyE")
    press("KeyE")
    expect(cursorAt(keys.container)).toBe("1,-1")
  })

  it("extends a picked-up run to the right-hand cell where the left-hand one is off the board", () => {
    const keys = open()
    press("Enter")
    press("ArrowUp")
    expect(numbers(keys.container)).toEqual({ ...puzzle.givens, "0,-1": 2 })
  })

  it("with a run picked up, goes up to the right where only the right-hand cell lets it go on", () => {
    const keys = open(undefined, leftBlocked)
    press("ArrowLeft")
    press("Enter")
    press("ArrowUp")
    expect(numbers(keys.container)).toEqual({ ...leftBlocked.givens, "1,-1": 4 })
    expect(cursorAt(keys.container)).toBe("1,-1")
  })

  it("with a run picked up, goes up to the right to pass through the next number written in there", () => {
    const keys = open(undefined, leftBlockedRightGiven)
    press("ArrowLeft")
    press("Enter")
    press("ArrowUp")
    expect(cursorAt(keys.container)).toBe("1,-1")
  })

  it("with a run picked up, keeps up on the left where both sides let it go on", () => {
    const keys = open(undefined, bothOpen)
    press("ArrowLeft")
    press("Enter")
    press("ArrowUp")
    expect(numbers(keys.container)).toEqual({ ...bothOpen.givens, "0,-1": 4 })
  })

  it("without a run picked up, goes up to the left whatever stands there", () => {
    const keys = open(undefined, leftBlocked)
    press("ArrowLeft")
    press("ArrowUp")
    expect(cursorAt(keys.container)).toBe("0,-1")
  })

  it("bent right with a run picked up, goes to the left where only the left-hand cell lets it go on", () => {
    const keys = open(undefined, rightBlocked)
    press("ArrowRight")
    press("Enter")
    shifted("ArrowUp")
    expect(numbers(keys.container)).toEqual({ ...rightBlocked.givens, "0,-1": 4 })
  })

  it("bent right with a run picked up, keeps to the right where both sides let it go on", () => {
    const keys = open(undefined, bothOpen)
    press("ArrowLeft")
    press("Enter")
    press("KeyE")
    expect(numbers(keys.container)).toEqual({ ...bothOpen.givens, "1,-1": 4 })
  })

  it("puts the run down on Escape instead of leaving, and leaves on the next", () => {
    const onCancel = vi.fn()
    const keys = open(onCancel)
    press("Enter")
    press("Escape")
    expect(onCancel).not.toHaveBeenCalled()
    press("KeyE")
    expect(numbers(keys.container)).toEqual(puzzle.givens)
    press("Escape")
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
