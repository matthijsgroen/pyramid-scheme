import type { FloorConfig, SubSection } from "./types"

// A puzzle chain's reward slots are created empty here at build time; the dynamic-loot
// distributions (allocateDistributions, run after gating/capped placement) fill them from the
// unified slot pool. Splitting creation from fill is what lets puzzle-chain positions BE slots
// collectSlots emits — see distribution-primitive-design.md, "core allocates, the mod fills".

// A trapped chain's puzzle slots render as trap rooms, not puzzle rooms (siteAssembler.ts) —
// excluded here so a reward is never assigned somewhere it can't be delivered.
const isTrapEncounter = (encounter: string | string[] | undefined): boolean => {
  const tags = Array.isArray(encounter) ? encounter : [encounter]
  return tags.includes("trap") || tags.includes("arithmetic-reflex")
}

const initSection = (section: SubSection): void => {
  if (isTrapEncounter(section.encounter) || section.pathPuzzles === 0) return
  section.puzzleRewards = new Array(section.pathPuzzles).fill(undefined)
}

// Creates an empty `puzzleRewards` array on every rewardable puzzle chain in a site's floors
// (main path + every non-trapped section/sub-section). Order — floor main, then each section,
// then its sub-sections — is the order collectSlots walks to number puzzle slots, keeping the
// dynamic pass's per-site placement deterministic.
export const initPuzzleChains = (floors: FloorConfig[]): void => {
  for (const floor of floors) {
    if (floor.pathPuzzles > 0) floor.puzzleRewards = new Array(floor.pathPuzzles).fill(undefined)
    for (const section of floor.sideSections) {
      initSection(section)
      for (const sub of section.sideSections ?? []) initSection(sub)
    }
  }
}
