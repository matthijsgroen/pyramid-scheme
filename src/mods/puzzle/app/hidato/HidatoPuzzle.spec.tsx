import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, waitFor, within } from "@testing-library/react"
import { act } from "react"
import { generateHidato, type HidatoPuzzle as HidatoBoardData } from "@/mods/puzzle/game/hidato/generateHidato"
import { HIDATO_CONFIG } from "@/mods/puzzle/game/hidato/hidatoConfig"
import { hexFromKey, hexKey } from "@/mods/puzzle/game/hidato/hex"
import { HidatoPuzzle } from "./HidatoPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  // jsdom has neither, and the board asks for both: capture is what keeps a drag's moves coming once
  // the finger has left the cell it started on, and the box is what turns a client point into a cell.
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: FRAME, height: FRAME, right: FRAME, bottom: FRAME, x: 0, y: 0 }) as DOMRect
})

/** The size the board is pretended to be drawn at, so a client point maps to a cell. */
const FRAME = 400

afterEach(() => {
  vi.unstubAllGlobals()
})

const cellsIn = (root: HTMLElement) => [...root.querySelectorAll<SVGGElement>('g[role="button"]')]

const numbersIn = (root: HTMLElement) => [...root.querySelectorAll("svg text")].map(text => text.textContent)

/**
 * A press and a release on the same cell. The press alone is not a tap: it picks the run up and leaves
 * what the touch meant to be decided when the finger lifts (design doc §6.5).
 */
const tapCell = (cell: SVGGElement, root: HTMLElement) =>
  act(() => {
    fireEvent.pointerDown(cell, { pointerId: 1 })
    fireEvent.pointerUp(root.querySelector("svg")!, { pointerId: 1 })
  })

/** The finger going down on a cell and staying down — the start of a drag rather than a tap. */
const press = (root: HTMLElement, puzzle: HidatoBoardData, key: string) =>
  act(() => void fireEvent.pointerDown(cellsIn(root)[puzzle.cells.map(hexKey).indexOf(key)], { pointerId: 1 }))

const release = (root: HTMLElement) => act(() => void fireEvent.pointerUp(root.querySelector("svg")!, { pointerId: 1 }))

/**
 * Where a cell's centre lands on screen, from the board's own viewBox and the layout its design doc §7
 * states: pointy-top axial, q east and r south-east. Written out here rather than imported so a change
 * to either half has to be a deliberate change to both.
 */
const dragTo = (root: HTMLElement, cell: { q: number; r: number }) => {
  const svg = root.querySelector("svg")!
  const [left, top, side] = svg.getAttribute("viewBox")!.split(" ").map(Number)
  const x = Math.sqrt(3) * 10 * (cell.q + cell.r / 2)
  const y = 1.5 * 10 * cell.r
  act(
    () =>
      void fireEvent.pointerMove(svg, {
        pointerId: 1,
        clientX: ((x - left) / side) * FRAME,
        clientY: ((y - top) / side) * FRAME,
      })
  )
}

/** The cell the answer puts a number in. */
const cellOf = (puzzle: HidatoBoardData, value: number) =>
  Object.entries(puzzle.solution).find(([, other]) => other === value)![0]

/** Cells the completion run has reached — the lit wax, which is the whole of the animation. */
const litIn = (root: HTMLElement) => root.querySelectorAll(".fill-amber-300").length

/**
 * Walks the run: tap the cell holding 1, then every cell in order. A cell that already holds its number
 * picks the run up there instead of writing anything, which is what carries the walk across the givens.
 */
const walk = (root: HTMLElement, puzzle: HidatoBoardData) => {
  const order = puzzle.cells.map(hexKey)
  for (let value = 1; value <= puzzle.cells.length; value++) {
    const key = Object.entries(puzzle.solution).find(([, other]) => other === value)![0]
    tapCell(cellsIn(root)[order.indexOf(key)], root)
  }
}

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

const puzzle = generateHidato(4, HIDATO_CONFIG.starter)

describe("the hidato screen", () => {
  it("fills the comb by tapping along the run, then reports the solve", async () => {
    reducedMotion(false)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    walk(container, puzzle)

    // Mid-run: the light is travelling the comb and the banner has not landed.
    await waitFor(() => expect(litIn(container)).toBeGreaterThan(0))
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  it("refuses input while the run is flying", async () => {
    reducedMotion(false)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    walk(container, puzzle)
    // Undo would take the last number back off, landing a solve on a board that is no longer solved.
    expect(within(container).getByRole<HTMLButtonElement>("button", { name: /↩/ }).disabled).toBe(true)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  it("skips the run entirely under prefers-reduced-motion", async () => {
    reducedMotion(true)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    walk(container, puzzle)
    expect(litIn(container)).toBe(0)
    await waitFor(() => expect(within(container).getByText(/⏱/)).toBeDefined(), { timeout: 5000 })
  })

  it("carries the run along a drag, and rubs it out on the way back", () => {
    reducedMotion(true)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    // Pressed on the 1 and dragged along the answer without lifting: the numbers follow the finger.
    press(container, puzzle, cellOf(puzzle, 1))
    for (const value of [2, 3, 4]) dragTo(container, hexFromKey(cellOf(puzzle, value)))
    expect(numbersIn(container)).toContain("4")

    // Back the way it came: crossing into the cell holding the number before rubs the last one out.
    dragTo(container, hexFromKey(cellOf(puzzle, 3)))
    expect(numbersIn(container)).not.toContain("4")
    release(container)

    // And with the finger up, moving over the comb changes nothing.
    dragTo(container, hexFromKey(cellOf(puzzle, 4)))
    expect(numbersIn(container)).not.toContain("4")
  })

  it("drags the whole run in from either end, straight across the numbers the puzzle wrote in", () => {
    reducedMotion(true)
    const last = puzzle.cells.length
    for (const from of [1, last]) {
      const { container, unmount } = render(
        <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
      )
      // Picked up at one end and dragged along the answer without lifting. Every given on the way is a
      // cell the run passes THROUGH, and picking the run up at the far end counts it down instead —
      // which the drag has to read as going forwards, not as backing out of the number just laid.
      press(container, puzzle, cellOf(puzzle, from))
      const order =
        from === 1 ? [...Array(last).keys()].map(step => step + 1) : [...Array(last).keys()].map(step => last - step)
      for (const value of order.slice(1)) dragTo(container, hexFromKey(cellOf(puzzle, value)))
      release(container)
      expect(numbersIn(container)).toHaveLength(last)
      unmount()
    }
  })

  it("lays nothing when a drag crosses a number on its way past", () => {
    reducedMotion(true)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const before = numbersIn(container).length
    // Nothing pressed: a finger crossing the board is not a move at all.
    dragTo(container, hexFromKey(cellOf(puzzle, 2)))
    expect(numbersIn(container)).toHaveLength(before)
  })

  it("does not rub out the number a drag starts from", () => {
    reducedMotion(true)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    // Lay a 2, so the run is standing on a number the player wrote and could rub out.
    press(container, puzzle, cellOf(puzzle, 1))
    dragTo(container, hexFromKey(cellOf(puzzle, 2)))
    release(container)
    expect(numbersIn(container)).toContain("2")

    // Now press that very cell to start another drag. Reading the press as a tap took the 2 straight
    // back off, and every move after it did nothing — the run had been put down (§6.5).
    press(container, puzzle, cellOf(puzzle, 2))
    expect(numbersIn(container)).toContain("2")
    dragTo(container, hexFromKey(cellOf(puzzle, 3)))
    expect(numbersIn(container)).toContain("3")
    release(container)
  })

  it("puts the board back to the numbers it shipped with", () => {
    reducedMotion(true)
    const { container } = render(
      <HidatoPuzzle puzzle={puzzle} difficulty="starter" onSolved={() => {}} onCancel={() => {}} />
    )
    const written = () => container.querySelectorAll("svg text").length
    const shipped = written()
    const order = puzzle.cells.map(hexKey)
    // Walks the run from 1 until it reaches a cell the board did NOT ship a number in, so this holds
    // whatever the tier's thinning happened to leave written in.
    for (let value = 1; value <= puzzle.cells.length; value++) {
      const key = Object.entries(puzzle.solution).find(([, other]) => other === value)![0]
      tapCell(cellsIn(container)[order.indexOf(key)], container)
      if (puzzle.givens[key] === undefined) break
    }
    expect(written()).toBeGreaterThan(shipped)

    act(() => within(container).getByRole("button", { name: /reset/i }).click())
    expect(written()).toBe(shipped)
  })
})
