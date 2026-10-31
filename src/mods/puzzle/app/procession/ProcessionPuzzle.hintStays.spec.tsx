// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import { act } from "react"
import type { ProcessionPuzzle as ProcessionPuzzleData } from "@/mods/puzzle/game/procession/procession"
import { buildProcessionHint } from "./processionHint"
import { ProcessionPuzzle } from "./ProcessionPuzzle"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string | string[]) => [key].flat()[0] }) }))
vi.mock("./processionHint", () => ({ buildProcessionHint: vi.fn() }))

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.setPointerCapture = () => {}
})
afterEach(cleanup)

const puzzle: ProcessionPuzzleData = {
  ticks: 6,
  bars: [
    { len: 2, start: 0 },
    { len: 2, start: 1 },
  ],
  marks: [{ kind: "before", a: 0, b: 1 }],
}

const open = () => {
  vi.mocked(buildProcessionHint).mockReset()
  vi.mocked(buildProcessionHint)
    .mockReturnValueOnce({ rung: "alpha" as never, bar: 0, tick: 1 })
    .mockReturnValue({ rung: "beta" as never, bar: 1, tick: 1 })
  const view = render(<ProcessionPuzzle puzzle={puzzle} onSolved={() => {}} onCancel={() => {}} />)
  const ground = view.container.querySelector<HTMLElement>(".touch-none")!
  ground.getBoundingClientRect = () => ({ width: 600, height: 100, x: 0, y: 0 }) as DOMRect
  act(() => within(view.container).getByRole("button", { name: /hint/i }).click())
  const bar = (index: number) => within(view.container).getByRole("button", { name: `bar ${index + 1}` })
  return {
    focus: () => act(() => within(view.container).getByRole("button", { name: "mark 1" }).click()),
    slide: (index: number, dx: number) => {
      act(() => fireEvent.pointerDown(bar(index), { clientX: 0, pointerId: 1 }))
      act(() => fireEvent.pointerMove(ground, { clientX: dx, pointerId: 1 }))
      act(() => fireEvent.pointerUp(ground, { pointerId: 1 }))
    },
    shown: () => view.container.textContent ?? "",
  }
}

describe("ProcessionPuzzle hint that stays", () => {
  it("keeps the hint, and the words it was asked with, while a mark is selected", () => {
    const { focus, shown } = open()
    expect(shown()).toContain("procession.hint.default.alpha")
    focus()
    expect(shown()).toContain("procession.hint.default.alpha")
    expect(shown()).not.toContain("beta")
  })

  it("ends the hint when a bar is slid", () => {
    const { slide, shown } = open()
    slide(0, 100)
    expect(shown()).not.toContain("alpha")
  })
})
