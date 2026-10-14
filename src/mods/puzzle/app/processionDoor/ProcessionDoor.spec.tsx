// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { SequenceFace } from "@/game/gateFace"
import { castGlyphs } from "@/mods/puzzle/game/procession/casts"
import type { ProcessionPuzzle } from "@/mods/puzzle/game/procession/procession"
import { ProcessionDoor } from "./ProcessionDoor"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)
// jsdom draws no pointer capture; a drag only needs the call to be there.
Element.prototype.setPointerCapture ??= () => {}

// A made-up board: three pinned bars, so its one answer starts bar 1, then bar 0, then bar 2.
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
const ANSWER = [5, 0, 8]
const SIGNS = castGlyphs("default")

const faceOf = (walked: boolean[], read = false): SequenceFace & { hidden: NonNullable<SequenceFace["hidden"]> } => ({
  id: "P",
  tiles: [SIGNS[3], SIGNS[0], SIGNS[4]].map(glyph => ({ glyph, status: "unwalked" as const })),
  hidden: { address: "main#0/P", read, walked },
})

const door = (props: Partial<Parameters<typeof ProcessionDoor>[0]> = {}) => {
  const onRead = vi.fn()
  const onStarts = vi.fn()
  const view = render(
    <ProcessionDoor
      puzzle={PUZZLE}
      face={faceOf([true, true, true])}
      markers={[]}
      onStarts={onStarts}
      onRead={onRead}
      onTurnAround={vi.fn()}
      {...props}
    />
  )
  return { ...view, onRead, onStarts }
}

const drag = (bar: number) => {
  const handle = screen.getByRole("button", { name: `bar ${bar + 1}` })
  fireEvent.pointerDown(handle, { clientX: 0, pointerId: 1 })
  fireEvent.pointerMove(handle.parentElement!.parentElement!, { clientX: 40, pointerId: 1 })
}

describe("a procession door's board", () => {
  it("does not move a bar whose tile is not yet walked, and moves one whose tile is", () => {
    // Step 0 (bar 1) walked, step 1 (bar 0) not.
    const { onStarts } = door({ face: faceOf([true, false, true]) })
    drag(0)
    expect(onStarts).not.toHaveBeenCalled()
    drag(1)
    expect(onStarts).toHaveBeenCalled()
  })

  it("is not solved while a bar is locked, even with every mark holding", () => {
    const { onRead } = door({ face: faceOf([true, false, true]), savedStarts: ANSWER })
    expect(onRead).not.toHaveBeenCalled()
  })

  it("reads the order once on the first solve", () => {
    const { onRead, rerender } = door({ savedStarts: ANSWER })
    rerender(
      <ProcessionDoor
        puzzle={PUZZLE}
        face={faceOf([true, true, true])}
        markers={[]}
        savedStarts={ANSWER}
        onStarts={vi.fn()}
        onRead={onRead}
        onTurnAround={vi.fn()}
      />
    )
    expect(onRead).toHaveBeenCalledTimes(1)
  })

  it("opens solved once read, whatever the bars were left on, and offers the reset", () => {
    const onReset = vi.fn()
    const { onRead } = door({ face: faceOf([true, true, true], true), savedStarts: [0, 3, 2], onReset })
    expect(onRead).not.toHaveBeenCalled()
    const lefts = [0, 1, 2].map(bar => screen.getByRole("button", { name: `bar ${bar + 1}` }).style.left)
    expect(lefts).toEqual(ANSWER.map(start => `${start * 10}%`))
    fireEvent.click(screen.getByRole("button", { name: "gateFace.reset" }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it("offers no reset before the first solve, and shows no order tiles", () => {
    const { container } = door({ face: faceOf([true, false, false]), onReset: vi.fn() })
    expect(screen.queryByRole("button", { name: "gateFace.reset" })).toBeNull()
    expect(container.querySelectorAll("[data-status]")).toHaveLength(0)
  })

  it("dresses each bar in the sign of the step it is, in the answer's order", () => {
    const { container } = door()
    const rows = Array.from(container.querySelectorAll("svg text"))
      .slice(0, 3)
      .map(text => text.textContent)
    // Bar 0 starts second (step 1), bar 1 first (step 0), bar 2 third (step 2).
    expect(rows).toEqual([SIGNS[0], SIGNS[3], SIGNS[4]].map(sign => String.fromCodePoint(sign)))
  })
})
