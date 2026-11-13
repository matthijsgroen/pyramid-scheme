// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { press } from "@/app/input/controlsInARow.testing"
import type { ProcessionPuzzle as ProcessionPuzzleData } from "@/mods/puzzle/game/procession/procession"
import { ProcessionPuzzle } from "./ProcessionPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

/** Two bars on a day of eight, the first before the second and the second pinned at 5. Both open at 0. */
const puzzle: ProcessionPuzzleData = {
  ticks: 8,
  bars: [
    { len: 2, start: 0 },
    { len: 3, start: 0 },
  ],
  marks: [
    { kind: "before", a: 0, b: 1 },
    { kind: "pin", a: 1, tick: 5 },
  ],
}

const TICK = 100

const open = () => {
  const { container } = render(<ProcessionPuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />)
  const bar = (index: number) => within(container).getByRole("button", { name: `bar ${index + 1}` })
  const mark = (index: number) => within(container).getByRole("button", { name: `mark ${index + 1}` })
  const frame = bar(0).parentElement!.parentElement!
  frame.getBoundingClientRect = () => ({ width: TICK * 8, height: 96, x: 0, y: 0 }) as DOMRect
  return {
    bar,
    mark,
    starts: () => [bar(0).style.left, bar(1).style.left],
    look: () => [0, 1].map(index => [bar(index).className, mark(index).className]),
    drag: (index: number, ticks: number) => {
      act(() => fireEvent.pointerDown(bar(index), { clientX: 0, pointerId: 1 }))
      act(() => fireEvent.pointerMove(frame, { clientX: ticks * TICK }))
      act(() => fireEvent.pointerUp(frame, { pointerId: 1 }))
    },
  }
}

describe("ProcessionPuzzle by keys", () => {
  it("slides the cursor row's bar one tick per press, as a drag over the same ticks slides it", () => {
    const keys = open()
    press("ArrowRight")
    press("ArrowRight")
    press("ArrowDown")
    press("ArrowRight")
    press("ArrowRight")
    press("ArrowRight")
    const keyed = keys.starts()
    cleanup()

    const taps = open()
    taps.drag(0, 2)
    taps.drag(1, 3)
    expect(keyed).toEqual(taps.starts())
    expect(keyed).toEqual([`${(100 / 8) * 2}%`, `${(100 / 8) * 3}%`])
  })

  it("stops a bar at the edge of the day, as a drag does", () => {
    const keys = open()
    press("ArrowLeft")
    expect(keys.bar(0).style.left).toBe("0%")
  })

  it("picks the marks with prev and next as a tap on each picks it, and nothing after the last", () => {
    const keys = open()
    press("BracketRight")
    press("BracketRight")
    const second = keys.look()
    press("BracketRight")
    const none = keys.look()
    press("BracketLeft")
    expect(keys.look()).toEqual(second)
    cleanup()

    const taps = open()
    const untouched = taps.look()
    act(() => taps.mark(1).click())
    expect(second).toEqual(taps.look())
    expect(none).toEqual(untouched)
  })
})
