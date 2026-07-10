import type { FloorConfig, SubSection, TreasureReward } from "./types"
import { hashStr, rollConsumable, rollMoney } from "./rewards"
import { mulberry32, shuffle } from "../game/random"

// Global design target: ~441/1714 puzzles carry a consumable, ~199/1714 carry loose money.
// Applied per-journey via shuffle+slice, so the realized total drifts slightly from this
// exact ratio in aggregate — acceptable, not validator-enforced.
const CONSUMABLE_FRACTION = 441 / 1714
const MONEY_FRACTION = 199 / 1714

type Chain = {
  puzzleCount: number
  rewards: (TreasureReward | undefined)[]
}

// A trapped chain's puzzle slots render as trap rooms, not puzzle rooms (siteAssembler.ts) —
// excluded here so a reward is never assigned somewhere it can't be delivered.
const isTrapEncounter = (encounter: string | undefined): boolean =>
  encounter === "trap" || encounter === "arithmetic-reflex"

const chainFor = (section: SubSection): Chain | undefined => {
  if (isTrapEncounter(section.encounter) || section.pathPuzzles === 0) return undefined
  const rewards: (TreasureReward | undefined)[] = new Array(section.pathPuzzles).fill(undefined)
  section.puzzleRewards = rewards
  return { puzzleCount: section.pathPuzzles, rewards }
}

const collectChains = (floors: FloorConfig[]): Chain[] => {
  const chains: Chain[] = []
  for (const floor of floors) {
    if (floor.pathPuzzles > 0) {
      const rewards: (TreasureReward | undefined)[] = new Array(floor.pathPuzzles).fill(undefined)
      floor.puzzleRewards = rewards
      chains.push({ puzzleCount: floor.pathPuzzles, rewards })
    }
    for (const section of floor.sideSections) {
      const sectionChain = chainFor(section)
      if (sectionChain) chains.push(sectionChain)
      for (const sub of section.sideSections ?? []) {
        const subChain = chainFor(sub)
        if (subChain) chains.push(subChain)
      }
    }
  }
  return chains
}

// Seeds a single shuffle over every rewardable puzzle slot in a journey's floors (main
// path + every non-trapped section/sub-section), then slices consumable/money quotas off
// the front — deterministic, no drift between builds for the same journeyId + floor shape.
// Mutates `floors` in place (writes `puzzleRewards` onto each FloorConfig/SubSection).
// This flat shuffle+slice is the ad hoc precursor to the generic weighted-fill reward
// allocator docs/mods-architecture.md's "reward weight" section calls for once more than
// trap/puzzle compete for the same slots. Fine as an MVP; a pointer for whoever replaces it.
export const assignPuzzleRewards = (
  journeyId: string,
  floors: FloorConfig[],
  rates: { bandage: number; oil: number; trapTool: number }
): void => {
  const chains = collectChains(floors)
  const totalSlots = chains.reduce((sum, c) => sum + c.puzzleCount, 0)
  if (totalSlots === 0) return

  const shuffled = shuffle(
    Array.from({ length: totalSlots }, (_, i) => i),
    mulberry32(hashStr(`${journeyId}:puzzleRewards`))
  )
  const consumableCount = Math.round(totalSlots * CONSUMABLE_FRACTION)
  const moneyCount = Math.round(totalSlots * MONEY_FRACTION)
  const kindByFlatIndex = new Map<number, "consumable" | "money">()
  shuffled.slice(0, consumableCount).forEach(idx => kindByFlatIndex.set(idx, "consumable"))
  shuffled.slice(consumableCount, consumableCount + moneyCount).forEach(idx => kindByFlatIndex.set(idx, "money"))

  let flatIndex = 0
  for (const chain of chains) {
    for (let localIndex = 0; localIndex < chain.puzzleCount; localIndex++) {
      const kind = kindByFlatIndex.get(flatIndex)
      const seed = `${journeyId}:puzzleReward:${flatIndex}`
      if (kind === "consumable")
        chain.rewards[localIndex] = { type: "consumable", consumable: rollConsumable(seed, rates) }
      else if (kind === "money") chain.rewards[localIndex] = { type: "money", amount: rollMoney(seed) }
      flatIndex++
    }
  }
}
