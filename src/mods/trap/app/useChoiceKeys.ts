import { useFocusBoard } from "@/app/input/useFocusBoard"

/**
 * Keys and pad on a timed choice: a digit picks that choice outright, and a direction walks the choices with
 * confirm picking the focused one. Nothing is focused as the clock starts, so a stray Enter picks nothing.
 * Every key acts on the press itself, so keys run against the same clock as a tap.
 */
export const useChoiceKeys = (count: number, choose: (index: number) => void) =>
  useFocusBoard<HTMLDivElement>({
    onSignal: ({ action, repeat, released }) => {
      if (released || action.kind !== "value" || action.value > count) return false
      if (!repeat) choose(action.value - 1)
      return true
    },
  })
