import { playSound } from "@/app/audio/audio"
import { CORE_SOUNDS } from "@/app/audio/coreSounds"
import type { SoundOptions } from "@/app/audio/soundRegistry"

/**
 * The cue a sequence's new state plays (state format in `src/game/sequence.ts`): k tiles walked in order play
 * the k-th note of the scale, a spoiled run its wrong tone, and the reset to "0" nothing.
 */
export const sequenceCue = (state: string): { name: string; options?: SoundOptions } | undefined => {
  if (state.startsWith("x")) return { name: CORE_SOUNDS.sequenceWrong }
  const walked = Number(state)
  if (!Number.isInteger(walked) || walked < 1) return undefined
  return { name: CORE_SOUNDS.sequenceStep, options: { note: walked - 1 } }
}

/** One cue per press of a walk, each timed to when the explorer reaches its tile. */
export const playWalkCues = (
  presses: readonly { state: string; at: readonly [number, number] }[],
  delayMsAt: (row: number, col: number) => number
): void => {
  for (const { state, at } of presses) {
    const cue = sequenceCue(state)
    if (cue) playSound(cue.name, { ...cue.options, delay: delayMsAt(at[0], at[1]) / 1000 })
  }
}
