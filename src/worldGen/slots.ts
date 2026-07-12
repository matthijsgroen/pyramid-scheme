import type { SiteConfig, Tier, TreasureReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { capabilitiesFor } from "./capabilities"
import type { FloorRef } from "./reachability"

// A candidate reward-placement site, tagged with the floor it lives on so a distribution
// rule can be filtered down to only the currently-reachable ones (see
// docs/game-design/keys-and-locks-solver.md, "The placement algorithm"). Generalizes
// fragments.ts's own SlotRef with floor-level addressing, which that module never needed
// (it placed fragments into a static global pool, not a reachability-filtered one).
export type Slot = {
  ref: FloorRef
  journeyId: string
  tier: Tier
  /** Ward keys already gating this slot (its own side section's tomb-key gate, if any) —
   * empty means ungated. Used by a currency's own distribution rule (e.g. hieroglyph
   * fragments preferring slots behind a specific tomb run's ward keys). */
  wardKeys: readonly string[]
  /** True for an explicit `fragmentSlot` sentinel (always eligible); false for an open,
   * not-yet-rewarded tomb-key gate (eligible only until something else claims it). */
  isPlaceholder: boolean
  /** Soft authored placement preference (a bucket id, e.g. `mapPiece:starter_treasure_tomb`)
   * — a ranking boost for that currency, not an exclusive claim. See
   * docs/game-design/keys-and-locks-solver.md, "A slot's authored placement preference is a
   * soft tag, not an exclusive claim". */
  preference?: string
  assign: (reward: TreasureReward) => void
}

// Every fragmentSlot sentinel and open (unrewarded) tomb-key gate across every site that
// opts into the emitFragmentSlots capability — the same eligibility fragments.ts's own
// collectSlots used, now with each slot's own FloorRef attached.
export const collectSlots = (allConfigs: Record<string, SiteConfig[]>): Slot[] => {
  const slots: Slot[] = []

  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    if (!capabilitiesFor(journeyId)?.emitFragmentSlots) continue
    const pyramidJourney = PYRAMID_JOURNEYS.find(j => j.id === journeyId)
    const tombJourney = TOMB_JOURNEYS.find(j => j.id === journeyId)
    const tier = (pyramidJourney ?? tombJourney)!.tier as Tier

    const addSlot = (
      ref: FloorRef,
      wardKeys: string[],
      isPlaceholder: boolean,
      preference: string | undefined,
      assign: (r: TreasureReward) => void
    ) => slots.push({ ref, journeyId, tier, wardKeys, isPlaceholder, preference, assign })

    siteConfigs.forEach((floors, levelIndex) => {
      floors.forEach((floor, floorIndex) => {
        const ref: FloorRef = { journeyId, levelIndex, floorIndex }
        if (floor.mainEndReward?.type === "fragmentSlot") {
          const f = floor
          addSlot(ref, [], true, floor.mainEndReward.prefers, r => {
            f.mainEndReward = r
          })
        }
        for (const section of floor.sideSections) {
          const sWardKeys = section.gate?.type === "tomb-key" ? [section.gate.wardKeyId] : []
          if (section.endReward?.type === "fragmentSlot") {
            const s = section
            addSlot(ref, sWardKeys, true, section.endReward.prefers, r => {
              s.endReward = r
            })
          } else if (section.gate?.type === "tomb-key" && !section.endReward) {
            const s = section
            addSlot(ref, sWardKeys, false, undefined, r => {
              s.endReward = r
            })
          }
          for (const sub of section.sideSections ?? []) {
            const subWardKeys = [...sWardKeys, ...(sub.gate?.type === "tomb-key" ? [sub.gate.wardKeyId] : [])]
            if (sub.endReward?.type === "fragmentSlot") {
              const ss = sub
              addSlot(ref, subWardKeys, true, sub.endReward.prefers, r => {
                ss.endReward = r
              })
            } else if (sub.gate?.type === "tomb-key" && !sub.endReward) {
              const ss = sub
              addSlot(ref, subWardKeys, false, undefined, r => {
                ss.endReward = r
              })
            }
          }
        }
      })
    })
  }

  return slots
}
