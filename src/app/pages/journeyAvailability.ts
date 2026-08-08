import type { Difficulty } from "@/data/difficultyLevels"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import type { Journey } from "@/data/journeys"

// Which expeditions the player may pick, and why.
//
// Crossing into a difficulty tier is a possession check, not a completion count: holding ANY ONE of
// that tier's unlock treasures admits you (docs/game-design/keys-and-locks-solver.md, "Global-scoped
// — the next difficulty tier unlocks"). World-gen's solver guarantees the world is finishable along
// exactly that ladder (`isTierUnlocked` in worldGen/reachability.ts), so the screen has to gate on
// the same fact — a second, different rule here is what let the two drift apart.
//
// Within a tier, journeys still open one at a time: the tier's first is available as soon as the
// tier is, each later one when the pyramid before it has been completed.

export const isTierUnlocked = (difficulty: Difficulty, heldKeys: ReadonlySet<string>): boolean => {
  // The first tier has no entry key — nothing gates the start of the game.
  const keys = TIER_UNLOCK_PERK_IDS[difficulty]
  if (!keys) return true
  return keys.some(keyId => heldKeys.has(keyId))
}

export const availablePyramidJourneyIds = (
  journeys: readonly Journey[],
  heldKeys: ReadonlySet<string>,
  isCompleted: (journeyId: string) => boolean
): ReadonlySet<string> => {
  const available = new Set<string>()
  const previousInTier = new Map<Difficulty, Journey>()
  for (const journey of journeys) {
    if (journey.type !== "pyramid") continue
    const previous = previousInTier.get(journey.difficulty)
    previousInTier.set(journey.difficulty, journey)
    if (!isTierUnlocked(journey.difficulty, heldKeys)) continue
    if (!previous || isCompleted(previous.id)) available.add(journey.id)
  }
  return available
}

// The expedition the completion screen offers next: the pyramid journey following this one, and
// only if the player may actually pick it — announcing a locked tier would be a dead end.
export const nextPyramidJourneyId = (
  journeys: readonly Journey[],
  journeyId: string,
  heldKeys: ReadonlySet<string>
): string | undefined => {
  const index = journeys.findIndex(j => j.id === journeyId)
  if (index === -1) return undefined
  const next = journeys[index + 1]
  if (!next || next.type !== "pyramid") return undefined
  return isTierUnlocked(next.difficulty, heldKeys) ? next.id : undefined
}
