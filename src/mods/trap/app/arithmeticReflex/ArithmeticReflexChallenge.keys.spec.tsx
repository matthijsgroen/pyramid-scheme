// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import type { ArithmeticQuestion } from "@/mods/trap/game/arithmeticReflex/generate"
import { ArithmeticReflexChallenge } from "./ArithmeticReflexChallenge"

beforeEach(() => {
  vi.useFakeTimers()
  controlsInARow()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const question: ArithmeticQuestion = { a: 3, b: 4, op: "+", answer: 7, choices: [6, 7, 8, 12] }

const open = () => {
  const onPass = vi.fn()
  const onFail = vi.fn()
  render(<ArithmeticReflexChallenge question={question} timeLimit={8} onPass={onPass} onFail={onFail} />)
  return { onPass, onFail }
}

describe("ArithmeticReflexChallenge by keys", () => {
  it("takes a digit as the tap on that choice, on the press itself", () => {
    const keys = open()
    press("Digit2")
    expect(keys.onPass).toHaveBeenCalledOnce()
    cleanup()

    const taps = open()
    act(() => screen.getByText("7").click())
    expect(taps.onPass).toHaveBeenCalledOnce()
  })

  it("starts on no choice, so a stray Enter picks nothing before the clock runs out", () => {
    const { onPass, onFail } = open()
    press("Enter")
    expect(onPass).not.toHaveBeenCalled()
    expect(onFail).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(8000))
    expect(onFail).toHaveBeenCalledOnce()
  })

  it("walks the choices and picks the focused one, as a tap picks it", () => {
    const { onPass, onFail } = open()
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByText("6"))
    press("ArrowRight")
    press("ArrowRight")
    press("Enter")
    expect(onFail).toHaveBeenCalledOnce()
    press("Digit2")
    expect(onPass).not.toHaveBeenCalled()
  })
})
