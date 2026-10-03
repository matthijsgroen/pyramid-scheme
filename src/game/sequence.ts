import type { MechanismRecord } from "./siteTypes"

type Place = readonly [number, number]

// A SEQUENCE IS ONE MECHANISM WITH ONE STATE, however many tiles it has. The state is progress along the
// order, so it says how many tiles were walked in order and, once spoiled, which tile was walked wrong:
//
//   "0" … "n-1"   that many tiles walked in order; the next one is due
//   "n"           the order is done, and it stays done: tiles do nothing and the reset leaves it alone
//   "x<k>.<w>"    spoiled: k tiles were walked in order, then tile w > k was walked out of order
//
// A tile already walked in order does nothing when stepped on again, because ground to the tiles ahead
// may run across it. A spoiled run is left only by the reset at the door, and it keeps what it was so
// each tile can show unwalked, walked in order, or walked out of order (`tileStatus`).

/** The state with `walked` tiles walked in order. */
export const progressState = (walked: number): string => String(walked)

/** The state spoiled after `walked` tiles in order by stepping on tile `wrong`. */
export const spoiledState = (walked: number, wrong: number): string => `x${walked}.${wrong}`

/** Every state of a sequence of `tiles` tiles: progress first, then each way to spoil it. */
export const sequenceStates = (tiles: number): string[] => [
  ...Array.from({ length: tiles + 1 }, (_, k) => progressState(k)),
  ...Array.from({ length: tiles }, (_, k) =>
    Array.from({ length: tiles - k - 1 }, (_, j) => spoiledState(k, k + 1 + j))
  ).flat(),
]

export type TileStatus = "unwalked" | "inOrder" | "outOfOrder"

/** How the tile of `step` stands in `state`. A state this build does not have reads as untouched. */
export const tileStatus = (state: string, step: number): TileStatus => {
  const spoiled = /^x(\d+)\.(\d+)$/.exec(state)
  if (spoiled) {
    if (step === Number(spoiled[2])) return "outOfOrder"
    return step < Number(spoiled[1]) ? "inOrder" : "unwalked"
  }
  return /^\d+$/.test(state) && step < Number(state) ? "inOrder" : "unwalked"
}

/**
 * THE RECORD OF ONE SEQUENCE, with its moves placed where they are made: advancing and spoiling at the
 * tiles, resetting at the door. Every move is placed (`placedOnly`), so the solver and play offer exactly
 * these and no other; the reset is offered out of every state but the first and the last.
 */
export const compileSequence = ({
  tiles,
  door,
  gates,
}: {
  tiles: readonly Place[]
  door: Place
  gates: readonly { gateKeyId: string; mode?: "any" }[]
}): MechanismRecord => {
  const done = progressState(tiles.length)
  const states = sequenceStates(tiles.length)
  return {
    states,
    initial: progressState(0),
    returnsToInitial: true,
    positions: gates.map(({ gateKeyId, mode }) => ({ state: done, gateKeyId, ...(mode ? { mode } : {}) })),
    placedOnly: true,
    transitions: [
      ...tiles.flatMap((at, step) => [
        { from: progressState(step), to: progressState(step + 1), at },
        ...Array.from({ length: step }, (_, walked) => ({
          from: progressState(walked),
          to: spoiledState(walked, step),
          at,
        })),
      ]),
      ...states
        .filter(from => from !== progressState(0) && from !== done)
        .map(from => ({ from, to: progressState(0), at: door })),
    ],
  }
}
