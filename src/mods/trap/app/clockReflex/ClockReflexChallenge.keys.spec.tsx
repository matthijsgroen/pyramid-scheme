// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import type { ClockQuestion } from "@/mods/trap/game/clockReflex/generate"
import { ClockReflexChallenge } from "./ClockReflexChallenge"

beforeEach(() => {
  vi.useFakeTimers()
  controlsInARow()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// Half past three, against the readings a hurried eye makes of it.
const question: ClockQuestion = { time: 210, answer: 210, choices: [390, 210, 180, 240] }

const open = () => {
  const onPass = vi.fn()
  const onFail = vi.fn()
  render(<ClockReflexChallenge question={question} timeLimit={8} onPass={onPass} onFail={onFail} />)
  const choices = () => screen.getAllByRole("button")
  return { onPass, onFail, choices }
}

describe("ClockReflexChallenge by keys", () => {
  it("takes a digit as the tap on that choice, on the press itself", () => {
    const keys = open()
    press("Digit2")
    expect(keys.onPass).toHaveBeenCalledOnce()
    cleanup()

    const taps = open()
    act(() => taps.choices()[1].click())
    expect(taps.onPass).toHaveBeenCalledOnce()
  })

  it("starts on no choice, so a stray Enter picks nothing before the clock runs out", () => {
    const { onPass, onFail } = open()
    press("Enter")
    expect(onPass).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(8000))
    expect(onFail).toHaveBeenCalledOnce()
  })

  it("walks the choices and picks the focused one, as a tap picks it", () => {
    const { onPass, onFail, choices } = open()
    press("ArrowRight")
    press("ArrowRight")
    expect(document.activeElement).toBe(choices()[1])
    press("Enter")
    expect(onPass).toHaveBeenCalledOnce()
    expect(onFail).not.toHaveBeenCalled()
  })
})
