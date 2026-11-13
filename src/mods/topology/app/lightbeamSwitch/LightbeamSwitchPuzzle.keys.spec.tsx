// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, within } from "@testing-library/react"
import { act } from "react"
import { BACKSLASH, DIR, SLASH } from "@/mods/core/game/beam/physics"
import type { LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { LightbeamSwitchPuzzle } from "./LightbeamSwitchPuzzle"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

// Three mirrors standing apart on a 4×4 floor, none of them in line with another.
const board: LightbeamSwitchBoard = {
  grid: {
    size: 4,
    sun: { at: { row: 1, col: 0 }, facing: DIR.right },
    mirrors: [
      { row: 0, col: 1 },
      { row: 2, col: 3 },
      { row: 3, col: 0 },
    ],
    initial: [SLASH, SLASH, BACKSLASH],
  },
  shrines: [{ canonicalDir: "e", at: { row: 1, col: 3 } }],
}

const key = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
    window.dispatchEvent(new KeyboardEvent("keyup", { code }))
  })

const mirrorsIn = (root: HTMLElement) =>
  within(root)
    .getAllByRole("button")
    .filter(button => button.className.includes("aspect-square"))

const renderBoard = () => {
  const onAngles = vi.fn()
  const { container } = render(
    <LightbeamSwitchPuzzle board={board} exits={[]} onRoute={() => {}} onAngles={onAngles} onSolved={() => {}} />
  )
  return { container, angles: () => onAngles.mock.lastCall?.[0] }
}

describe("LightbeamSwitchPuzzle by keys", () => {
  it("lands on mirrors only, the nearest one in the direction pressed", () => {
    const { container } = renderBoard()
    const cursorOn = () => mirrorsIn(container).findIndex(mirror => mirror.classList.contains("board-cursor"))
    expect(cursorOn()).toBe(0)
    key("ArrowRight")
    expect(cursorOn()).toBe(1)
    key("ArrowRight")
    expect(cursorOn()).toBe(1)
    key("ArrowDown")
    expect(cursorOn()).toBe(2)
  })

  it("turns the mirror under the cursor the way a tap turns it", () => {
    const keys = renderBoard()
    key("Enter")
    key("ArrowRight")
    key("Enter")
    key("ArrowDown")
    key("Enter")
    key("Enter")
    const keyed = keys.angles()
    cleanup()

    const taps = renderBoard()
    for (const mirror of [0, 1, 2, 2]) act(() => mirrorsIn(taps.container)[mirror].click())
    expect(keyed).toEqual(taps.angles())
    expect(keyed).toEqual([BACKSLASH, BACKSLASH, BACKSLASH])
  })
})
