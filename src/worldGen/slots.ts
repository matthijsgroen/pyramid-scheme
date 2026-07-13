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
  /** `"end"` = a path-end reward (fragmentSlot / open ward gate) — the only slots the gating
   * worklist and capped pass touch. `"puzzle"` = a puzzle-chain position — filler-only, seen
   * exclusively by the dynamic loot pass (money/consumables). */
  kind: "end" | "puzzle"
  /** Puzzle slots only: the owning site (`journeyId:levelIndex`) and its per-site sequence, so
   * the dynamic pass can replay placement deterministically per site (distribution-primitive-
   * design.md). Undefined for `"end"` slots. */
  siteId?: string
  puzzleSeq?: number
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
    ) => slots.push({ ref, journeyId, tier, wardKeys, isPlaceholder, preference, kind: "end", assign })

    siteConfigs.forEach((floors, levelIndex) => {
      // Puzzle-chain slots: one per position of every `puzzleRewards` array initPuzzleChains
      // (buildSite) created, walked in that same order (floor main path → each side section →
      // its sub-sections) so the dynamic loot pass replays money/consumable placement per site
      // deterministically. Tagged `kind:"puzzle"` + a per-site `puzzleSeq`; the gating worklist
      // and capped pass skip them (they were never reward-slot candidates — only filler is).
      const siteId = `${journeyId}:${levelIndex}`
      let puzzleSeq = 0
      const emitPuzzle = (rewards: (TreasureReward | undefined)[] | undefined, ref: FloorRef) => {
        if (!rewards) return
        rewards.forEach((_, i) => {
          const arr = rewards
          slots.push({
            ref,
            journeyId,
            tier,
            wardKeys: [],
            isPlaceholder: false,
            kind: "puzzle",
            siteId,
            puzzleSeq: puzzleSeq++,
            assign: r => {
              arr[i] = r
            },
          })
        })
      }
      floors.forEach((floor, floorIndex) => {
        const pRef: FloorRef = { journeyId, levelIndex, floorIndex }
        emitPuzzle(floor.puzzleRewards, pRef)
        for (const section of floor.sideSections) {
          emitPuzzle(section.puzzleRewards, pRef)
          for (const sub of section.sideSections ?? []) emitPuzzle(sub.puzzleRewards, pRef)
        }
      })

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
