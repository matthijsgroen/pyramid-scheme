import { produce } from "immer"

export type CrocodileAnswer = "left" | "right" | "noneLeft" | "noneRight"

export type CrocodileState = {
  focus: number
  answers: Record<number, CrocodileAnswer>
}

export const createCrocodileState = (): CrocodileState => ({ focus: 0, answers: {} })

export const previewLeft = produce((state: CrocodileState) => {
  const current = state.answers[state.focus] ?? "noneRight"
  if (current.startsWith("none")) state.answers[state.focus] = "noneLeft"
})

export const previewRight = produce((state: CrocodileState) => {
  const current = state.answers[state.focus] ?? "noneLeft"
  if (current.startsWith("none")) state.answers[state.focus] = "noneRight"
})

export const commitLeft = produce((state: CrocodileState) => {
  state.answers[state.focus] = "left"
})

export const commitRight = produce((state: CrocodileState) => {
  state.answers[state.focus] = "right"
})

export const advanceFocus = produce((state: CrocodileState) => {
  state.focus += 1
})

export const resetCrocodileState = produce((state: CrocodileState) => {
  state.focus = 0
  state.answers = {}
})
