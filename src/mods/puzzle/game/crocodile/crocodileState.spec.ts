import { describe, expect, it } from "vitest"
import {
  advanceFocus,
  commitLeft,
  commitRight,
  createCrocodileState,
  previewLeft,
  previewRight,
  resetCrocodileState,
} from "./crocodileState"

describe("crocodileState", () => {
  it("starts at focus 0 with no answers", () => {
    expect(createCrocodileState()).toEqual({ focus: 0, answers: {} })
  })

  it("previews a direction only while unanswered", () => {
    const s0 = createCrocodileState()
    const s1 = previewLeft(s0)
    expect(s1.answers[0]).toBe("noneLeft")
    const s2 = previewRight(s1)
    expect(s2.answers[0]).toBe("noneRight")
  })

  it("commits an answer regardless of preview state", () => {
    const s0 = createCrocodileState()
    const s1 = commitLeft(s0)
    expect(s1.answers[0]).toBe("left")
    const s2 = commitRight(s1)
    expect(s2.answers[0]).toBe("right")
  })

  it("advances focus to the next comparison", () => {
    const s0 = createCrocodileState()
    const s1 = advanceFocus(s0)
    expect(s1.focus).toBe(1)
  })

  it("resets focus and answers", () => {
    const s0 = advanceFocus(commitLeft(createCrocodileState()))
    const s1 = resetCrocodileState(s0)
    expect(s1).toEqual({ focus: 0, answers: {} })
  })

  it("does not mutate the previous state", () => {
    const s0 = createCrocodileState()
    commitLeft(s0)
    expect(s0.answers[0]).toBeUndefined()
  })
})
