import type { AssemblerReason } from "../siteTypes"
import type { CarveState, Refusal, Shortfall } from "./state"

type Kind = Shortfall["type"]
type OfKind<K extends Kind> = Extract<Shortfall, { type: K }>

/** What the attempts came up short on so far: one shortfall per kind, so the failure can name it. */
type ShortfallMemory = { readonly [K in Kind]?: OfKind<K> }

export const noShortfalls: ShortfallMemory = {}

/**
 * Keeps the first shortfall of each kind — the path lengthens across the attempt budget, so what one
 * attempt cannot seat a later one may, and only the budget's end may call it. Two kinds read otherwise:
 * a fork shortfall keeps the attempt that carved the most junctions, the closest any came; and an
 * off-route seam left uncarved is not named once a run of gates has come up short, since the short run
 * is the cause.
 */
export const remember = (memory: ShortfallMemory, shortfall: Shortfall): ShortfallMemory => {
  if (shortfall.type === "forksUnsatisfied") {
    const held = memory.forksUnsatisfied
    return !held || shortfall.carved > held.carved ? { ...memory, forksUnsatisfied: shortfall } : memory
  }
  if (shortfall.type === "obstacleSeamNotCarved" && shortfall.onChain && memory.barriersNotSeated) return memory
  if (memory[shortfall.type]) return memory
  return { ...memory, [shortfall.type]: shortfall }
}

/** Folds one failed attempt into the memory: a run of chain gates noted short, then what the attempt refused on. */
export const rememberAttempt = (
  memory: ShortfallMemory,
  state: Pick<CarveState, "chainGates">,
  refusal: Extract<Refusal, { retry: unknown }>
): ShortfallMemory => {
  const runShort = state.chainGates?.runShort
  const noted = runShort ? remember(memory, { type: "barriersNotSeated", ...runShort }) : memory
  return refusal.retry.reduce(remember, noted)
}

/** Why no attempt carved: every shortfall held, in the order a reader should meet them, then `layoutNotFound`. */
export const reasonsOf = (memory: ShortfallMemory): AssemblerReason[] => {
  const {
    lockNotLaid,
    contentNotLaid,
    forkSeamsNotLaid,
    forksUnsatisfied,
    oneWayUnsatisfied,
    regionNotSeated,
    obstacleSeamNotCarved,
    barriersNotSeated,
    regionBarrierNotSeated,
    controlNotSeated,
    sequenceTileNotPlaced,
    plateNotPlaced,
    controlPuzzleUndisplaceable,
    carveDisagreement,
    regionWillNotTake,
  } = memory
  // The fork shortfall first where it ever applied: a floor no carve could give the junctions it
  // asks for is an authoring mistake, and "no layout" alone would send the reader after the maze.
  return [
    ...(lockNotLaid ? [lockNotLaid] : []),
    ...(contentNotLaid ? [contentNotLaid] : []),
    ...(forkSeamsNotLaid
      ? [
          {
            type: "forkSeamsNotLaid" as const,
            region: forkSeamsNotLaid.fork.region,
            seams: forkSeamsNotLaid.fork.seams,
          },
        ]
      : []),
    ...(forksUnsatisfied ? [forksUnsatisfied] : []),
    ...(oneWayUnsatisfied ? [oneWayUnsatisfied] : []),
    ...(regionNotSeated ? [regionNotSeated] : []),
    ...(obstacleSeamNotCarved ? [{ type: "obstacleSeamNotCarved" as const, ids: obstacleSeamNotCarved.ids }] : []),
    ...(barriersNotSeated ? [barriersNotSeated] : []),
    ...(regionBarrierNotSeated ? [regionBarrierNotSeated] : []),
    ...(controlNotSeated ? [controlNotSeated] : []),
    ...(sequenceTileNotPlaced ? [sequenceTileNotPlaced] : []),
    ...(plateNotPlaced ? [plateNotPlaced] : []),
    ...(controlPuzzleUndisplaceable ? [controlPuzzleUndisplaceable] : []),
    ...(carveDisagreement?.faults ?? []),
    ...(regionWillNotTake?.mismatch.map(({ region, kind }) => ({ type: "regionWillNotTake" as const, region, kind })) ??
      []),
    { type: "layoutNotFound" },
  ]
}
