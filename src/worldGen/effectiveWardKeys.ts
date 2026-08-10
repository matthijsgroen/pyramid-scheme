import type { SiteConfig, SideSection, TreasureReward } from "./types"
import type { Difficulty } from "../data/difficultyLevels"

// Which ward keys a player must hold to reach a given placed reward — the FULL chain, propagated
// across staircases, not just the gate on the reward's own section.
//
// Why this exists separately from slots.ts's `Slot.wardKeys`: that field is section-local by
// design. A section reached by descending a ward-gated staircase starts a fresh chain, because the
// placement engine learns "this floor is behind a key" from reachability.ts's floor model instead
// (`reachableFloors`), never from the slot tag. That's fine for placement, but it means no existing
// structure answers "what actually guards this reward" for a whole-world audit — a floor two hops
// behind a master key looks ungated if you only read section gates.
//
// The gap is not theoretical: a starter pyramid's ward path once opened a JUNIOR floor, so the
// first key in the game paid out junior mosaic glass and junior fragments before the player had
// seen a junior expedition (fixed in #171 by tying a ward staircase's target floor difficulty to
// its key — wardGateInvariants.spec.ts). That check guards the one structural cause; this helper
// exists so a mod can assert the player-facing OUTCOME for its own currency — cross-tier loot is
// never reachable without a key at least as hard as the loot — and so catch any future cause.
//
// Structural only: yields each reward with the difficulty of the node holding it and its key
// chain. It never interprets a reward type, so it names no currency (docs/mods/ARCHITECTURE.md:
// core owns mechanisms, mods own meaning) — each mod reads its own rewards out of the result.

export type PlacedReward = {
  journeyId: string
  levelIndex: number
  floorIndex: number
  /** The node's OWN authored difficulty — the tier every currency filters placement on. */
  difficulty: Difficulty
  /** Every ward key gating the path to this reward, nearest-last. Empty = freely reachable. */
  wardKeys: string[]
  reward: TreasureReward
}

const stairIdOf = (link: SideSection["end"] | SiteConfig[number]["entrance"]): string | undefined =>
  typeof link === "object" && link !== null && "stairId" in link ? link.stairId : undefined

const gateKeyOf = (section: SideSection): string | undefined =>
  section.gate?.type === "tomb-key" ? section.gate.wardKeyId : undefined

// Every reward placed anywhere in the world, each tagged with the key chain guarding it.
// Two passes per pyramid: first map every staircase to the keys guarding it, so a floor entered
// by that staircase inherits them; then walk each floor's rewards with that inherited chain as
// the starting point.
export const collectPlacedRewards = (configs: Record<string, SiteConfig[]>): PlacedReward[] => {
  const placed: PlacedReward[] = []

  for (const [journeyId, siteConfigs] of Object.entries(configs)) {
    siteConfigs.forEach((floors, levelIndex) => {
      const keysByStair = new Map<string, string[]>()
      const mapStairs = (inherited: string[], section: SideSection): void => {
        const key = gateKeyOf(section)
        const keys = key ? [...inherited, key] : inherited
        const stairId = stairIdOf(section.end)
        if (stairId) keysByStair.set(stairId, keys)
        for (const sub of section.sideSections ?? []) mapStairs(keys, sub)
      }
      for (const floor of floors) for (const section of floor.sideSections) mapStairs([], section)

      floors.forEach((floor, floorIndex) => {
        // A floor's own gating is whatever guarded the staircase that enters it. Resolved one hop
        // at a time, but chains compose: the mapping above already carries the full chain down to
        // each staircase, so a floor three ward gates deep inherits all three.
        const entryStair = stairIdOf(floor.entrance)
        const floorKeys = entryStair ? (keysByStair.get(entryStair) ?? []) : []
        const at = (difficulty: Difficulty, wardKeys: string[], reward: TreasureReward | undefined) => {
          if (reward) placed.push({ journeyId, levelIndex, floorIndex, difficulty, wardKeys, reward })
        }

        at(floor.difficulty, floorKeys, floor.mainEndReward)
        for (const r of floor.rewards ?? []) at(floor.difficulty, floorKeys, r)

        const walk = (inherited: string[], section: SideSection): void => {
          const key = gateKeyOf(section)
          const keys = key ? [...inherited, key] : inherited
          at(section.difficulty, keys, section.endReward)
          for (const r of section.rewards ?? []) at(section.difficulty, keys, r)
          for (const sub of section.sideSections ?? []) walk(keys, sub)
        }
        for (const section of floor.sideSections) walk(floorKeys, section)
      })
    })
  }

  return placed
}
