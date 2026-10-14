import { progressState } from "./sequence"
import type { MechanismRecord } from "./siteTypes"

/**
 * WHAT PLAY KEEPS ABOUT A SEQUENCE WHOSE DOOR HIDES ITS ORDER (a procession door), beside its state and never seen by
 * the walk: every step whose tile was ever crossed, from any state, and whether the order was read at the door.
 * `walked` unlocks the step's bar on the board; `read` is the board solved once, and stays.
 */
export type SequenceRead = { readonly walked: readonly number[]; readonly read?: true }

const NOTHING: SequenceRead = { walked: [] }

/** `entry` with `steps` walked as well; the same entry when none of them is new. */
export const withWalked = (entry: SequenceRead | undefined, steps: readonly number[]): SequenceRead => {
  const known = entry ?? NOTHING
  const added = steps.filter(step => !known.walked.includes(step))
  if (added.length === 0 && entry) return entry
  return { ...known, walked: [...new Set([...known.walked, ...added])].sort((a, b) => a - b) }
}

/** Whether every one of `steps` steps was walked, which is when the board can be solved. */
export const everyStepWalked = (entry: SequenceRead | undefined, steps: number): boolean =>
  Array.from({ length: steps }, (_, step) => step).every(step => entry?.walked.includes(step) ?? false)

/** The state a sequence's record opens its gates in. */
export const doneOf = (record: MechanismRecord): string =>
  progressState(record.states.filter(state => /^\d+$/.test(state)).length - 1)

/**
 * WHETHER A HIDING SEQUENCE'S ORDER COUNTS AS READ: the board was solved, or the run is `done` with nothing walked on
 * record. The second is a save from before the door hid its order — a door the player opened stays open — and a run
 * reaching `done` now records its steps on the way, so a new player meets only the first.
 */
export const orderRead = (record: MechanismRecord, state: string, entry: SequenceRead | undefined): boolean =>
  entry?.read === true || (entry === undefined && state === doneOf(record))
