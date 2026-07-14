import type { SiteConfig, Tier, TreasureReward } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
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
  /** Eagerness to bear loot, from the slot's own encounter family (FamilyMeta.rewardWeight):
   * chest 100, puzzle 60, trap/tableau/crocodile/gate/shop 0. The dynamic loot pass fills higher
   * weight first and treats 0 as loot-ineligible. Stamped at collect time (docs/mods/
   * distribution-primitive-design.md). */
  rewardWeight: number
  /** Assign this slot's reward, or clear it to empty (`undefined`) — a leftover placeholder with
   * no filler (e.g. a chest when the shop mod is off) becomes an empty path end. */
  assign: (reward: TreasureReward | undefined) => void
}

// The reward-weight of the family an authored `encounter` resolves to — injected (built from
// ALL_FAMILY_META in src/mods/allFamilyMeta.ts), since src/worldGen can't import mod family meta.
// Defaults to 0 (loot-ineligible) when omitted, so tests/callers that don't inject it place no
// dynamic loot rather than crashing.
export type FamilyWeightFor = (encounter: string | string[] | undefined, defaultTag: string) => number

// Every fragmentSlot sentinel and open (unrewarded) tomb-key gate across every site that
// opts into the emitFragmentSlots capability — the same eligibility fragments.ts's own
// collectSlots used, now with each slot's own FloorRef attached.
export const collectSlots = (
  allConfigs: Record<string, SiteConfig[]>,
  familyWeightFor: FamilyWeightFor = () => 0
): Slot[] => {
  const slots: Slot[] = []
  // Every emitted end slot is a treasure-chest path end (shop ends carry shopPrice and are never
  // fragmentSlot sentinels, so they aren't collected) → chest eagerness (100). Resolved through
  // the injected lookup rather than hardcoded, so a mod set that redefines "treasure" still wins.
  const chestWeight = familyWeightFor(undefined, "treasure")

  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    if (!capabilitiesFor(journeyId)?.emitFragmentSlots) continue

    // A slot's tier is its OWN floor/section difficulty, not the journey's tier — so a
    // deliberately-tiered ward path/wing (e.g. a starter path inside a wizard tomb, or an
    // expert "come back stronger" wing in a junior pyramid) tiers its loot by that marked
    // difficulty. Difficulty and Tier share the same value set (difficultyLevels.ts).
    const addSlot = (
      ref: FloorRef,
      difficulty: Difficulty,
      wardKeys: string[],
      isPlaceholder: boolean,
      preference: string | undefined,
      assign: (r: TreasureReward | undefined) => void
    ) =>
      slots.push({
        ref,
        journeyId,
        tier: difficulty as Tier,
        wardKeys,
        isPlaceholder,
        preference,
        kind: "end",
        rewardWeight: chestWeight,
        assign,
      })

    siteConfigs.forEach((floors, levelIndex) => {
      // Puzzle-chain slots: one per position of every `puzzleRewards` array initPuzzleChains
      // (buildSite) created, walked in that same order (floor main path → each side section →
      // its sub-sections) so the dynamic loot pass replays money/consumable placement per site
      // deterministically. Tagged `kind:"puzzle"` + a per-site `puzzleSeq`; the gating worklist
      // and capped pass skip them (they were never reward-slot candidates — only filler is).
      const siteId = `${journeyId}:${levelIndex}`
      let puzzleSeq = 0
      // A puzzle chain's eagerness comes from its own encounter family (default "puzzle" → sumplete
      // 60 when unset). Tomb main paths author encounter "tomb-puzzle" → tableau (0) and side paths
      // default to sumplete (60), so tomb main-path puzzles are loot-ineligible while tomb side
      // paths still bear loot — no special-casing, it falls out of the family weights.
      // (`lastMainPuzzleFamily` is crocodile-only, weight 0 like tableau, so it never changes a
      // main puzzle's eligibility; not threaded here. Revisit if it ever names a nonzero family.)
      const emitPuzzle = (
        rewards: (TreasureReward | undefined)[] | undefined,
        ref: FloorRef,
        difficulty: Difficulty,
        encounter: string | string[] | undefined
      ) => {
        if (!rewards) return
        const rewardWeight = familyWeightFor(encounter, "puzzle")
        rewards.forEach((_, i) => {
          const arr = rewards
          slots.push({
            ref,
            journeyId,
            tier: difficulty as Tier,
            wardKeys: [],
            isPlaceholder: false,
            kind: "puzzle",
            siteId,
            puzzleSeq: puzzleSeq++,
            rewardWeight,
            assign: r => {
              arr[i] = r
            },
          })
        })
      }
      floors.forEach((floor, floorIndex) => {
        const pRef: FloorRef = { journeyId, levelIndex, floorIndex }
        emitPuzzle(floor.puzzleRewards, pRef, floor.difficulty, floor.encounter)
        for (const section of floor.sideSections) {
          emitPuzzle(section.puzzleRewards, pRef, section.difficulty, section.encounter)
          for (const sub of section.sideSections ?? [])
            emitPuzzle(sub.puzzleRewards, pRef, sub.difficulty, sub.encounter)
        }
      })

      floors.forEach((floor, floorIndex) => {
        const ref: FloorRef = { journeyId, levelIndex, floorIndex }
        if (floor.mainEndReward?.type === "fragmentSlot") {
          const f = floor
          addSlot(ref, floor.difficulty, [], true, floor.mainEndReward.prefers, r => {
            f.mainEndReward = r
          })
        }
        for (const section of floor.sideSections) {
          const sWardKeys = section.gate?.type === "tomb-key" ? [section.gate.wardKeyId] : []
          if (section.endReward?.type === "fragmentSlot") {
            const s = section
            addSlot(ref, section.difficulty, sWardKeys, true, section.endReward.prefers, r => {
              s.endReward = r
            })
          } else if (section.gate?.type === "tomb-key" && !section.endReward) {
            const s = section
            addSlot(ref, section.difficulty, sWardKeys, false, undefined, r => {
              s.endReward = r
            })
          }
          for (const sub of section.sideSections ?? []) {
            const subWardKeys = [...sWardKeys, ...(sub.gate?.type === "tomb-key" ? [sub.gate.wardKeyId] : [])]
            if (sub.endReward?.type === "fragmentSlot") {
              const ss = sub
              addSlot(ref, sub.difficulty, subWardKeys, true, sub.endReward.prefers, r => {
                ss.endReward = r
              })
            } else if (sub.gate?.type === "tomb-key" && !sub.endReward) {
              const ss = sub
              addSlot(ref, sub.difficulty, subWardKeys, false, undefined, r => {
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
