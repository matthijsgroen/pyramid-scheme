// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import { act } from "react"
import type { RushHourPuzzle as RushHourPuzzleData } from "@/mods/puzzle/game/rushHour/rushHour"
import { buildRushHourHint } from "./rushHourHint"
import { RushHourPuzzle } from "./RushHourPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("./rushHourHint", () => ({ buildRushHourHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

const board: RushHourPuzzleData = {
  size: 6,
  pieces: [
    { lane: 0, offset: 0, len: 2, horizontal: true },
    { lane: 3, offset: 0, len: 2, horizontal: false },
  ],
}
const CELL = 100

const hint = (key: "drive" | "back") => ({
  key,
  action: "right" as const,
  move: { index: 0, offset: 1 },
  cells: [1, 2],
})

const open = () => {
  vi.mocked(buildRushHourHint).mockReset()
  vi.mocked(buildRushHourHint).mockReturnValueOnce(hint("drive")).mockReturnValue(hint("back"))
  const view = render(<RushHourPuzzle puzzle={board} onSolved={() => {}} onCancel={() => {}} />)
  const frame = view.container.querySelector<HTMLElement>(".aspect-square")!
  frame.getBoundingClientRect = () => ({ width: CELL * 6, height: CELL * 6, x: 0, y: 0 }) as DOMRect
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const slide = (index: number, dx: number, dy: number) => {
    const piece = within(view.container).getByRole("button", { name: `piece ${index + 1}` })
    act(() => fireEvent.pointerDown(piece, { clientX: 0, clientY: 0, pointerId: 1 }))
    act(() => fireEvent.pointerMove(frame, { clientX: dx, clientY: dy, pointerId: 1 }))
    act(() => fireEvent.pointerUp(frame, { pointerId: 1 }))
  }
  return { slide, shown: () => view.container.textContent ?? "" }
}

describe("RushHourPuzzle hint that stays", () => {
  it("shows the hint it was asked for and builds it once, not again as the board is drawn", () => {
    const { shown } = open()
    expect(shown()).toContain("drive")
    expect(buildRushHourHint).toHaveBeenCalledTimes(1)
  })

  it("ends the hint when a piece is slid", () => {
    const { slide, shown } = open()
    slide(1, 0, CELL * 3)
    expect(shown()).not.toContain("drive")
  })
})
