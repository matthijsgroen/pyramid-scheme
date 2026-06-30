/**
 * Fragment assignment — greedy algorithm
 *
 * For each hieroglyph tier, build the full fragment list, shuffle it, then assign
 * to available chest slots in tier-preferred order.
 * Constraint: no duplicate hieroglyphId within the same journey.
 *
 * Slot indices are continuous across all pyramids in a journey.
 * configBuilder uses a chestOffset per pyramid to map back to local indices.
 */
import type { Tier, Assignment, FragmentSlot, ChestSlotPlan } from "./types"
import { WORLD_SEED, TOMB_SYMBOLS, HIEROGLYPH_REQUIRED, FRAGMENT_HOST_TIERS, chestCountFor } from "./data"
import { mulberry32, shuffle } from "../game/random"

const buildChestSlotsByTier = (plan: ChestSlotPlan[], rand: () => number): Record<Tier, FragmentSlot[]> => {
  const slotsByTier: Record<Tier, FragmentSlot[]> = {
    starter: [],
    junior: [],
    expert: [],
    master: [],
    wizard: [],
  }

  // Group plan entries by journey, preserving order (pyramidIndex order)
  const byJourney = new Map<string, ChestSlotPlan[]>()
  for (const p of plan) {
    const list = byJourney.get(p.journeyId) ?? []
    list.push(p)
    byJourney.set(p.journeyId, list)
  }

  for (const [journeyId, pyramids] of byJourney) {
    const tier = pyramids[0].tier
    let globalSlot = 0
    for (const p of pyramids) {
      const count = chestCountFor(p.pathPuzzles)
      for (let s = 0; s < count; s++) {
        slotsByTier[tier].push({ journeyId, slotIndex: globalSlot })
        globalSlot++
      }
    }
  }

  for (const tier of Object.keys(slotsByTier) as Tier[]) {
    slotsByTier[tier] = shuffle(slotsByTier[tier], rand)
  }
  return slotsByTier
}

// Greedily assigns fragments from `slots` (mutates it). Returns updated `placed` count.
const assignFromSlots = (
  slots: FragmentSlot[],
  hieroglyphId: string,
  placedInJourney: Map<string, Set<string>>,
  assignments: Assignment[],
  needed: number,
  placed: number
): number => {
  for (let si = 0; si < slots.length && placed < needed; si++) {
    const slot = slots[si]
    if (placedInJourney.get(slot.journeyId)!.has(hieroglyphId)) continue
    assignments.push({ journeyId: slot.journeyId, slotIndex: slot.slotIndex, hieroglyphId })
    placedInJourney.get(slot.journeyId)!.add(hieroglyphId)
    slots.splice(si, 1)
    placed++
    si--
  }
  return placed
}

export const computeFragmentAssignments = (plan: ChestSlotPlan[]): Assignment[] => {
  const rand = mulberry32(WORLD_SEED)
  const slotsByTier = buildChestSlotsByTier(plan, rand)

  const assignments: Assignment[] = []
  const journeyIds = [...new Set(plan.map(p => p.journeyId))]
  const placedInJourney = new Map<string, Set<string>>()
  for (const id of journeyIds) placedInJourney.set(id, new Set())

  type FragEntry = { hieroglyphId: string; remaining: number; tier: Tier }
  const fragQueue: FragEntry[] = []
  for (const tier of ["starter", "junior", "expert", "master", "wizard"] as Tier[]) {
    for (const id of shuffle(TOMB_SYMBOLS[tier], rand)) {
      fragQueue.push({ hieroglyphId: id, remaining: HIEROGLYPH_REQUIRED[id] ?? 2, tier })
    }
  }

  for (const frag of fragQueue) {
    let placed = 0
    const hostTiers = FRAGMENT_HOST_TIERS[frag.tier]

    for (const hostTier of hostTiers) {
      placed = assignFromSlots(
        slotsByTier[hostTier],
        frag.hieroglyphId,
        placedInJourney,
        assignments,
        frag.remaining,
        placed
      )
    }

    if (placed < frag.remaining) {
      for (const fallbackTier of (Object.keys(slotsByTier) as Tier[]).filter(t => !hostTiers.includes(t))) {
        placed = assignFromSlots(
          slotsByTier[fallbackTier],
          frag.hieroglyphId,
          placedInJourney,
          assignments,
          frag.remaining,
          placed
        )
        if (placed >= frag.remaining) break
      }
    }

    if (placed < frag.remaining) {
      console.log(
        `  ℹ ${frag.hieroglyphId} (${frag.tier}): placed ${placed}/${frag.remaining} — matrix target not yet achievable (world needs more branches/floors)`
      )
    }
  }

  return assignments
}
