// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import type { InputHandler } from "./actions"
import { controlsInARow, press } from "./controlsInARow.testing"
import { useFocusBoard } from "./useFocusBoard"

beforeEach(() => {
  controlsInARow()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const Board = ({
  onPress,
  focusFirst,
  onSignal,
  wrap,
}: {
  onPress: (label: string) => void
  focusFirst?: boolean
  onSignal?: InputHandler
  wrap?: (board: InputHandler) => InputHandler
}) => {
  const root = useFocusBoard<HTMLDivElement>({ focusFirst, onSignal, wrap })
  return (
    <>
      <button onClick={() => onPress("outside")}>outside</button>
      <div ref={root}>
        {["a", "b", "c"].map(label => (
          <button key={label} onClick={() => onPress(label)}>
            {label}
          </button>
        ))}
      </div>
    </>
  )
}

describe(useFocusBoard, () => {
  it("walks the board's own controls and presses the focused one, as a tap presses it", () => {
    const onPress = vi.fn()
    render(<Board onPress={onPress} focusFirst />)
    expect(document.activeElement).toBe(screen.getByText("a"))
    press("ArrowRight")
    press("ArrowRight")
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByText("c"))
    press("Enter")
    expect(onPress.mock.calls).toEqual([["c"]])
  })

  it("starts on no control without focusFirst, so a stray Enter presses nothing", () => {
    const onPress = vi.fn()
    render(<Board onPress={onPress} />)
    press("Enter")
    expect(onPress).not.toHaveBeenCalled()
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByText("a"))
  })

  it("hands the board's own keys to it first, and the rest through the wrap", () => {
    const onPress = vi.fn()
    const onSignal = vi.fn<InputHandler>(({ action }) => action.kind === "value")
    const wrapped = vi.fn<InputHandler>()
    const wrap =
      (board: InputHandler): InputHandler =>
      signal => {
        wrapped(signal)
        return board(signal)
      }
    render(<Board onPress={onPress} focusFirst onSignal={onSignal} wrap={wrap} />)
    press("Digit2")
    press("ArrowRight")
    expect(onSignal).toHaveBeenCalledTimes(4)
    expect(wrapped).toHaveBeenCalledTimes(4)
    expect(document.activeElement).toBe(screen.getByText("b"))
  })
})
