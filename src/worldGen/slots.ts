import type { SiteConfig, SubSection, Tier, TreasureReward, FragmentSlotReward } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
import { capabilitiesFor } from "./capabilities"
import type { FloorRef } from "./reachability"
import { defaultResolveEncounter } from "../game/encounterFallback"
import { endsInShopBy } from "./shopStock"
import type { ResolveEncounter } from "../game/siteAssembler"

// A candidate reward-placement site, tagged with the floor it lives on so a distribution
// rule can be filtered down to only the currently-reachable ones (see
// docs/game-design/keys-and-locks-solver.md, "The placement algorithm"). Generalizes
// fragments.ts's own SlotRef with floor-level addressing, which that module never needed
// (it placed fragments into a static global pool, not a reachability-filtered one).
export type Slot = {
  ref: FloorRef
  journeyId: string
  tier: Tier
  /** Ward keys already gating this slot (its section's and sub-section's tomb-key gates, for an end and a puzzle
   * alike) — empty means ungated. Used by a currency's own distribution rule (e.g. hieroglyph fragments preferring
   * slots behind a specific tomb run's ward keys, camp loot taking ungated rooms first). */
  wardKeys: readonly string[]
  /** True for an explicit `fragmentSlot` sentinel (always eligible); false for an open,
   * not-yet-rewarded tomb-key gate (eligible only until something else claims it). */
  isPlaceholder: boolean
  /** The placeholder standing in the slot's room until it is filled: a walk that lists it among its reached rewards
   * has reached the room itself, not only the floor around it. An open tomb-key gate's end is given one here. */
  sentinel?: FragmentSlotReward
  /** Soft authored placement preference (a bucket id, e.g. `mapPiece:starter_treasure_tomb`)
   * — a ranking boost for that currency, not an exclusive claim. See
   * docs/game-design/keys-and-locks-solver.md, "A slot's authored placement preference is a
   * soft tag, not an exclusive claim". */
  preference?: string
  /** `"end"` = a path-end reward (fragmentSlot / open ward gate) — the only slots the gating
   * worklist and capped pass touch. `"puzzle"` = a puzzle-chain position — filler-only, seen
   * exclusively by the dynamic loot pass (mod-owned distributions). */
  kind: "end" | "puzzle"
  /** True when this slot lives in a hidden (discovery-gated) section — a hidden corridor is an
   * OPTIONAL loot pocket (docs/mods/collection-and-detector-design.md §7.3): structurally
   * reachable but off the guaranteed path, since discovery isn't guaranteed (needs the corridor
   * detector or a lucky stumble). So the gating worklist must NEVER place a progression-gating
   * currency here — placeFragments excludes hidden end slots. Only optional filler (capped/dynamic)
   * may land in a hidden pocket. Set for a hidden section or any descendant of one. */
  hidden?: boolean
  /** Puzzle slots only: the owning site (`journeyId:levelIndex`) and its per-site sequence, so
   * the dynamic pass can replay placement deterministically per site (distribution-primitive-
   * design.md). Undefined for `"end"` slots. */
  siteId?: string
  puzzleSeq?: number
  /** Reward priority (fill order) to bear loot, from the slot's own encounter family (FamilyMeta.rewardPriority):
   * chest 100, puzzle 60, trap/tableau/crocodile/gate/shop 0. The dynamic loot pass fills higher
   * priority first and treats 0 as loot-ineligible. Stamped at collect time (docs/mods/
   * distribution-primitive-design.md). */
  rewardPriority: number
  /** The concrete family this slot's node resolved to (e.g. "fez-shop", "sumplete"), when known —
   * the §A.3 encounter identity a mod's placement/fill joins on (a shop's stock slots carry
   * "fez-shop"). Undefined for a plain treasure end. Distinct from rewardPriority (a number): this
   * is the family id, so a mod can target "shop slots" directly instead of via the weight proxy. */
  encounter?: string
  /** Assign this slot's reward, or clear it to empty (`undefined`) — a leftover placeholder with
   * no filler (e.g. a chest when the shop mod is off) becomes an empty path end. */
  assign: (reward: TreasureReward | undefined) => void
}

// The reward-weight of the family an authored `encounter` resolves to — injected (built from
// ALL_FAMILY_META in src/mods/allFamilyMeta.ts), since src/worldGen can't import mod family meta.
// Defaults to 0 (loot-ineligible) when omitted, so tests/callers that don't inject it place no
// dynamic loot rather than crashing.
export type FamilyPriorityFor = (encounter: string | string[] | undefined, defaultTag: string) => number

// A path end that held a loot slot when the layout was picked stays a loot end once placement is done, filled or
// left empty, so the carve reads the same free ends after placement as before it.
const fillLootEnd =
  (section: SubSection) =>
  (reward: TreasureReward | undefined): void => {
    section.endReward = reward
    if (reward === undefined) section.lootEnd = true
    else delete section.lootEnd
  }

// The ward keys a section's own tomb-key gate asks for: none when it has no such gate.
const tombKeysOf = (section: SubSection): string[] =>
  section.gate?.type === "tomb-key" ? [section.gate.wardKeyId] : []

// Every fragmentSlot sentinel and open (unrewarded) tomb-key gate across every site that
// opts into the emitFragmentSlots capability — the same eligibility fragments.ts's own
// collectSlots used, now with each slot's own FloorRef attached.
export const collectSlots = (
  allConfigs: Record<string, SiteConfig[]>,
  familyPriorityFor: FamilyPriorityFor = () => 0,
  resolveEncounter: ResolveEncounter = defaultResolveEncounter
): Slot[] => {
  const slots: Slot[] = []
  // Every emitted end slot is a treasure-chest path end → chest reward priority (100). Resolved
  // through the injected lookup rather than hardcoded, so a mod set that redefines "treasure" still wins.
  const chestWeight = familyPriorityFor(undefined, "treasure")
  // A section whose encounter resolves to the shop ends in a shop room, which shows its stock and
  // never its endReward (carve/roomSpecs.ts endRoomSpec asks the same question). So its end is no
  // slot. Its placeholder is cleared before the layout is picked (shopStock.ts clearShopEnds), and
  // nothing here writes to it.
  const endsInShop = endsInShopBy(resolveEncounter)

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
      hidden: boolean,
      assign: (r: TreasureReward | undefined) => void,
      sentinel?: FragmentSlotReward
    ) =>
      slots.push({
        ref,
        journeyId,
        tier: difficulty as Tier,
        wardKeys,
        isPlaceholder,
        ...(sentinel ? { sentinel } : {}),
        preference,
        kind: "end",
        rewardPriority: chestWeight,
        ...(hidden ? { hidden: true } : {}),
        assign,
      })

    siteConfigs.forEach((floors, levelIndex) => {
      // Puzzle-chain slots: one per position of every `rewards` array initPuzzleChains
      // (buildSite) created, walked in that same order (floor main path → each side section →
      // its sub-sections) so the dynamic loot pass replays dynamic-loot placement per site
      // deterministically. Tagged `kind:"puzzle"` + a per-site `puzzleSeq`; the gating worklist
      // and capped pass skip them (they were never reward-slot candidates — only filler is).
      const siteId = `${journeyId}:${levelIndex}`
      let puzzleSeq = 0
      // A puzzle chain's reward priority comes from each room's own encounter family (default "puzzle" →
      // sumplete 60 when unset). Tomb main paths author encounter "tomb-puzzle" → tableau (0) and
      // side paths default to sumplete (60), so tomb main-path puzzles are loot-ineligible while
      // tomb side paths still bear loot — no special-casing, it falls out of the family weights.
      // Per-node overrides (authored `nodes` selectors, e.g. a capstone or an every-3rd trap) are
      // resolved PER room index: a weight-0 family (crocodile/trap) at position k makes only that
      // room loot-ineligible, not its neighbours (§G).
      const emitPuzzle = (
        rewards: (TreasureReward | undefined)[] | undefined,
        ref: FloorRef,
        chain: {
          difficulty: Difficulty
          difficultiesByIndex?: Record<number, Difficulty>
          loot?: false
          lootByIndex?: Record<number, false>
        },
        encounter: string | string[] | undefined,
        encountersByIndex: Record<number, string | string[]> | undefined,
        hidden: boolean,
        wardKeys: string[]
      ) => {
        if (!rewards) return
        rewards.forEach((rw, i) => {
          // A reward already standing in a puzzle room (a web activator) is placed, not a slot to fill or clear.
          if (rw !== undefined && rw.type !== "fragmentSlot") return
          const arr = rewards
          // A room's loot is tiered by its SECTION, never by its node's own difficulty: a node picks
          // the board, so a junior node on a starter path must not pull junior loot into it.
          // A lootless room (or chain) offers nothing to the pool. A currency sentinel a mod tagged into
          // it would never be filled, so it goes too.
          if (chain.loot === false || chain.lootByIndex?.[i] === false) {
            if (rw?.type === "fragmentSlot") arr[i] = undefined
            return
          }
          const enc = encountersByIndex?.[i] ?? encounter
          const encId = Array.isArray(enc) ? enc[0] : enc
          // A reward-array entry that's a fragmentSlot sentinel is a currency placeholder (a shop's
          // stock slot the mods tagged for their currency) — it needs the capped/gating fill, which
          // only touch `kind:"end"`. So emit it as an end slot (placeholder + its prefers tag), not a
          // puzzle-chain filler slot. Empty entries stay puzzle-kind (dynamic loot fill).
          const frag = rw?.type === "fragmentSlot" ? (rw as FragmentSlotReward) : undefined
          slots.push({
            ref,
            journeyId,
            tier: chain.difficulty as Tier,
            wardKeys,
            isPlaceholder: frag !== undefined,
            ...(frag ? { sentinel: frag } : {}),
            ...(frag?.prefers ? { preference: frag.prefers } : {}),
            kind: frag ? "end" : "puzzle",
            ...(frag ? {} : { siteId, puzzleSeq: puzzleSeq++ }),
            rewardPriority: familyPriorityFor(enc, "puzzle"),
            ...(encId ? { encounter: encId } : {}),
            ...(hidden ? { hidden: true } : {}),
            assign: r => {
              arr[i] = r
            },
          })
        })
      }
      floors.forEach((floor, floorIndex) => {
        const pRef: FloorRef = { journeyId, levelIndex, floorIndex }
        emitPuzzle(floor.rewards, pRef, floor, floor.encounter, floor.encountersByIndex, false, [])
        for (const section of floor.sideSections) {
          const secHidden = !!section.hidden
          const secWardKeys = tombKeysOf(section)
          emitPuzzle(
            section.rewards,
            pRef,
            section,
            section.encounter,
            section.encountersByIndex,
            secHidden,
            secWardKeys
          )
          for (const sub of section.sideSections ?? [])
            emitPuzzle(sub.rewards, pRef, sub, sub.encounter, sub.encountersByIndex, secHidden || !!sub.hidden, [
              ...secWardKeys,
              ...tombKeysOf(sub),
            ])
        }
      })

      floors.forEach((floor, floorIndex) => {
        const ref: FloorRef = { journeyId, levelIndex, floorIndex }
        if (floor.mainEndReward?.type === "fragmentSlot") {
          const f = floor
          const sentinel = floor.mainEndReward as FragmentSlotReward
          addSlot(
            ref,
            floor.difficulty,
            [],
            true,
            sentinel.prefers,
            false,
            r => {
              f.mainEndReward = r
            },
            sentinel
          )
        }
        for (const section of floor.sideSections) {
          const sWardKeys = section.gate?.type === "tomb-key" ? [section.gate.wardKeyId] : []
          const secHidden = !!section.hidden
          // A section whose `end` is a stairhead (`"staircase"` / `{ stairId }`) is a pure
          // floor-to-floor connector, never a loot node — buildSite.ts's `wireSideSectionStaircases`
          // ("the treasure IS the key", pyramid-interior-design.md §8) and the carve's own
          // room-building (the stairhead branch never reads `endReward`) agree: only an
          // `end: "treasure"` section can actually display/grant a reward at runtime. An open
          // tomb-key gate leading to a stairhead must never be handed to a currency as a fillable
          // slot — the reward would be silently dropped, capping that currency one instance short.
          const shopEnd = endsInShop(section)
          const rewardCapable = section.end === "treasure" && !shopEnd
          if (!shopEnd && section.endReward?.type === "fragmentSlot") {
            const s = section
            addSlot(
              ref,
              section.difficulty,
              sWardKeys,
              true,
              (section.endReward as FragmentSlotReward).prefers,
              secHidden,
              fillLootEnd(s),
              section.endReward as FragmentSlotReward
            )
          } else if (section.gate?.type === "tomb-key" && !section.endReward && rewardCapable) {
            const s = section
            // An open gate's end holds a placeholder too while placement runs, so the walk can tell its room reached
            // from its floor reached. Filled or cleared like every slot, so none survives placement.
            const sentinel: FragmentSlotReward = { type: "fragmentSlot" }
            s.endReward = sentinel
            addSlot(
              ref,
              section.difficulty,
              sWardKeys,
              false,
              undefined,
              secHidden,
              r => {
                s.endReward = r
              },
              sentinel
            )
          }
          for (const sub of section.sideSections ?? []) {
            const subWardKeys = [...sWardKeys, ...(sub.gate?.type === "tomb-key" ? [sub.gate.wardKeyId] : [])]
            const subHidden = secHidden || !!sub.hidden
            const subShopEnd = endsInShop(sub)
            const subRewardCapable = sub.end === "treasure" && !subShopEnd
            if (!subShopEnd && sub.endReward?.type === "fragmentSlot") {
              const ss = sub
              addSlot(
                ref,
                sub.difficulty,
                subWardKeys,
                true,
                (sub.endReward as FragmentSlotReward).prefers,
                subHidden,
                fillLootEnd(ss),
                sub.endReward as FragmentSlotReward
              )
            } else if (sub.gate?.type === "tomb-key" && !sub.endReward && subRewardCapable) {
              const ss = sub
              const sentinel: FragmentSlotReward = { type: "fragmentSlot" }
              ss.endReward = sentinel
              addSlot(
                ref,
                sub.difficulty,
                subWardKeys,
                false,
                undefined,
                subHidden,
                r => {
                  ss.endReward = r
                },
                sentinel
              )
            }
          }
        }
      })
    })
  }

  return slots
}

// Sites collectSlots never visits (capabilitiesFor().emitFragmentSlots === false) still get the
// fragmentSlot sentinels buildSite puts on every path end — and nothing ever fills or clears them,
// because filling and clearing are both things the slot pool does. A sentinel that survives reaches
// the serializer, which refuses it. Drop them here instead: a site outside the loot economy has ends
// that hold nothing, which is precisely what it is for.
export const clearUncollectedSlots = (allConfigs: Record<string, SiteConfig[]>): void => {
  const clear = (r: TreasureReward | undefined) => (r?.type === "fragmentSlot" ? undefined : r)
  const clearSub = (s: SubSection) => {
    s.endReward = clear(s.endReward)
    s.rewards = s.rewards?.map(clear)
  }
  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    if (capabilitiesFor(journeyId)?.emitFragmentSlots !== false) continue
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        floor.mainEndReward = clear(floor.mainEndReward)
        floor.rewards = floor.rewards?.map(clear)
        for (const section of floor.sideSections) {
          clearSub(section)
          for (const sub of section.sideSections ?? []) clearSub(sub)
        }
      }
    }
  }
}
