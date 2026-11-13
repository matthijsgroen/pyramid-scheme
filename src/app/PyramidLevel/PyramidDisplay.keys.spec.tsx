// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { act, useState } from "react"
import type { Pyramid } from "@/game/types"
import { PyramidDisplay } from "./PyramidDisplay"

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

// Three floors: the top and the middle floor open, the bottom given.
const pyramid: Pyramid = {
  floorCount: 3,
  blocks: [
    { id: "A", isOpen: true },
    { id: "B", isOpen: true },
    { id: "C", isOpen: true },
    { id: "D", value: 1, isOpen: false },
    { id: "E", value: 2, isOpen: false },
    { id: "F", value: 3, isOpen: false },
  ],
}

// Sent where focus is, as a browser does: a key typed into an open field is that field's.
const key = (code: string) =>
  act(() => {
    const at = document.activeElement ?? document.body
    const name = code.replace(/^Digit/, "")
    at.dispatchEvent(new KeyboardEvent("keydown", { code, key: name, bubbles: true, cancelable: true }))
    at.dispatchEvent(new KeyboardEvent("keyup", { code, key: name, bubbles: true }))
  })

const renderBoard = () => {
  let answers: Record<string, number | undefined> = {}
  const Board = () => {
    const [values, setValues] = useState<Record<string, number | undefined>>({})
    answers = values
    return (
      <PyramidDisplay
        levelNr={1}
        pyramid={pyramid}
        values={values}
        decorated={false}
        onAnswer={(id, value) => setValues(now => ({ ...now, [id]: value }))}
      />
    )
  }
  const { container } = render(<Board />)
  return { container, answers: () => answers, inputs: () => [...container.querySelectorAll("input")] }
}

describe("PyramidDisplay by keys", () => {
  it("fills the block the arrows reach with the digit pressed, as typing into a tapped block does", () => {
    const keys = renderBoard()
    key("ArrowDown")
    key("ArrowRight")
    key("Digit5")
    const keyed = keys.answers()
    cleanup()

    const taps = renderBoard()
    fireEvent.change(taps.inputs()[2], { target: { value: "5" } })
    expect(keyed).toEqual(taps.answers())
    expect(keyed).toEqual({ C: 5 })
  })

  it("opens the block's field on Enter, and Enter in it closes it again", () => {
    const { inputs } = renderBoard()
    key("ArrowDown")
    key("Enter")
    expect(document.activeElement).toBe(inputs()[1])
    key("Enter")
    expect(document.activeElement).toBe(document.body)
    // Back on the board: the arrows move again.
    key("ArrowRight")
    key("Digit4")
    expect(document.activeElement).toBe(inputs()[2])
  })

  it("counts the selected block up and down on a pad's shoulder buttons", () => {
    const { answers } = renderBoard()
    for (let i = 0; i < 8; i++) key("BracketRight")
    key("BracketLeft")
    expect(answers()).toEqual({ A: 7 })
  })
})

describe("PyramidDisplay's way back", () => {
  it("is the screen's: Escape while the board has the keys goes back", () => {
    const onBack = vi.fn()
    render(
      <PyramidDisplay levelNr={1} pyramid={pyramid} values={{}} decorated={false} onBack={onBack} onAnswer={() => {}} />
    )
    key("Escape")
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("takes no keys once nobody can answer it", () => {
    const onBack = vi.fn()
    render(<PyramidDisplay levelNr={1} pyramid={pyramid} values={{}} decorated={false} onBack={onBack} />)
    key("Escape")
    expect(onBack).not.toHaveBeenCalled()
  })
})
