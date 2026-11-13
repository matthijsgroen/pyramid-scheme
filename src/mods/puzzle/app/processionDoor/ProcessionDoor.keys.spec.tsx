// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import type { SequenceFace } from "@/game/gateFace"
import { castGlyphs } from "@/mods/puzzle/game/procession/casts"
import type { ProcessionPuzzle } from "@/mods/puzzle/game/procession/procession"
import { ProcessionDoor } from "./ProcessionDoor"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// A made-up board: three pinned bars on a day of ten, all open at 0 or so; its one answer is [5, 0, 8].
const PUZZLE: ProcessionPuzzle = {
  ticks: 10,
  bars: [
    { len: 2, start: 0 },
    { len: 2, start: 3 },
    { len: 2, start: 2 },
  ],
  marks: [
    { kind: "pin", a: 0, tick: 5 },
    { kind: "pin", a: 1, tick: 0 },
    { kind: "pin", a: 2, tick: 8 },
  ],
}
const SIGNS = castGlyphs("default")
const TICK = 100

// Bar 1 is step 0, bar 0 step 1, bar 2 step 2: walked[1] false locks bar 0.
const faceOf = (walked: boolean[], read = false): SequenceFace & { hidden: NonNullable<SequenceFace["hidden"]> } => ({
  id: "P",
  tiles: [SIGNS[3], SIGNS[0], SIGNS[4]].map(glyph => ({ glyph, status: "unwalked" as const })),
  hidden: { address: "main#0/P", read, walked },
})

const door = (walked = [true, true, true], read = false) => {
  const onStarts = vi.fn()
  const onReset = vi.fn()
  const onTurnAround = vi.fn()
  const view = render(
    <ProcessionDoor
      puzzle={PUZZLE}
      face={faceOf(walked, read)}
      markers={[]}
      onStarts={onStarts}
      onRead={() => {}}
      onReset={onReset}
      onTurnAround={onTurnAround}
    />
  )
  const bar = (index: number) => screen.getByRole("button", { name: `bar ${index + 1}` })
  const frame = bar(0).parentElement!.parentElement!
  frame.getBoundingClientRect = () => ({ width: TICK * PUZZLE.ticks, height: 96, x: 0, y: 0 }) as DOMRect
  return {
    ...view,
    onStarts,
    onReset,
    onTurnAround,
    starts: () => [0, 1, 2].map(index => bar(index).style.left),
    drag: (index: number, ticks: number) => {
      act(() => fireEvent.pointerDown(bar(index), { clientX: 0, pointerId: 1 }))
      act(() => fireEvent.pointerMove(frame, { clientX: ticks * TICK }))
      act(() => fireEvent.pointerUp(frame, { pointerId: 1 }))
    },
  }
}

describe("ProcessionDoor by keys", () => {
  it("slides the cursor row's bar one tick per press, as a drag over the same ticks slides it", () => {
    const keys = door()
    press("ArrowRight")
    press("ArrowRight")
    press("ArrowDown")
    press("ArrowLeft")
    const keyed = keys.starts()
    cleanup()

    const taps = door()
    taps.drag(0, 2)
    taps.drag(1, -1)
    expect(keyed).toEqual(taps.starts())
    expect(keyed).toEqual(["20%", "20%", "20%"])
  })

  it("passes a locked row by, as a drag cannot move its bar", () => {
    const keys = door([true, false, true])
    press("ArrowRight")
    press("ArrowUp")
    press("ArrowRight")
    expect(keys.onStarts.mock.calls).toEqual([[[0, 4, 2]], [[0, 5, 2]]])
  })

  it("asks for the hint with the hint key, as a tap on the hint button does", () => {
    const keys = door()
    press("KeyH")
    const keyed = keys.container.innerHTML
    cleanup()

    const taps = door()
    act(() => screen.getByRole("button", { name: "procession.door.hintButton" }).click())
    expect(keyed).toEqual(taps.container.innerHTML)
    expect(screen.queryByRole("button", { name: "procession.door.hintButton" })).toBeNull()
  })

  it("leaves the hint key alone while a bar is locked, as the hint button is not there to tap", () => {
    const keys = door([true, false, true])
    const before = keys.container.innerHTML
    press("KeyH")
    expect(keys.container.innerHTML).toEqual(before)
  })

  it("walks the door's buttons once it is read, and Enter on reset is its tap", () => {
    controlsInARow()
    const keys = door([true, true, true], true)
    const reset = screen.getByRole("button", { name: "gateFace.reset" })
    for (let step = 0; step < 10 && document.activeElement !== reset; step++) press("ArrowRight")
    expect(document.activeElement).toBe(reset)
    press("Enter")
    expect(keys.onReset).toHaveBeenCalledTimes(1)
    expect(keys.onStarts).not.toHaveBeenCalled()
  })

  it("turns around on Escape, as the turn-around button does", () => {
    const keys = door()
    press("Escape")
    expect(keys.onTurnAround).toHaveBeenCalledTimes(1)
  })
})
