import { difficulties, isDifficultyReleased, isFreeOrderDifficulty, type Difficulty } from "@/data/difficultyLevels"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"
import type { Journey } from "@/data/journeys"
import type { JourneyNeed } from "./allJourneys"

// Which expeditions the player may pick, and why.
//
// Crossing into a difficulty tier is a possession check, not a completion count: holding ANY ONE of
// that tier's unlock treasures admits you (docs/game-design/keys-and-locks-solver.md, "Global-scoped
// — the next difficulty tier unlocks"). World-gen's solver guarantees the world is finishable along
// exactly that ladder (`isTierUnlocked` in worldGen/reachability.ts), so the screen has to gate on
// the same fact — a second, different rule here is what let the two drift apart.
//
// Within a free-order tier (wizard) every journey opens with the tier key. Any other tier opens
// them one at a time: its first as soon as the tier is, each later one when the pyramid before it
// has been completed.

export const holdsTierKey = (difficulty: Difficulty, heldKeys: ReadonlySet<string>): boolean => {
  // The first tier has no entry key — nothing gates the start of the game.
  const keys = TIER_UNLOCK_PERK_IDS[difficulty]
  if (!keys) return true
  return keys.some(keyId => heldKeys.has(keyId))
}

// `gateOpen` is what a mod's other needs on the tier say (gateNeeds); no need means open.
export const isTierUnlocked = (
  difficulty: Difficulty,
  heldKeys: ReadonlySet<string>,
  gateOpen: (tier: Difficulty) => boolean = () => true
): boolean => isDifficultyReleased(difficulty) && holdsTierKey(difficulty, heldKeys) && gateOpen(difficulty)

// The chapter the player is in: the last tier, in order, that is open to them. The first tier is always
// open, so a player holding no key is in it.
export const currentChapter = (
  heldKeys: ReadonlySet<string>,
  gateOpen: (tier: Difficulty) => boolean = () => true
): Difficulty => [...difficulties].reverse().find(d => isTierUnlocked(d, heldKeys, gateOpen)) ?? difficulties[0]

// The player earned the key to a tier this release doesn't ship yet — they've reached the end of
// the content and should be told more is coming, not left wondering why nothing opened.
export const comingSoonDifficulty = (heldKeys: ReadonlySet<string>): Difficulty | undefined =>
  difficulties.find(d => !isDifficultyReleased(d) && holdsTierKey(d, heldKeys))

export const availablePyramidJourneyIds = (
  journeys: readonly Journey[],
  heldKeys: ReadonlySet<string>,
  isCompleted: (journeyId: string) => boolean,
  isFreeOrder: (difficulty: Difficulty) => boolean = isFreeOrderDifficulty,
  gateOpen: (tier: Difficulty) => boolean = () => true
): ReadonlySet<string> => {
  const available = new Set<string>()
  const previousInTier = new Map<Difficulty, Journey>()
  for (const journey of journeys) {
    // An entry-locked journey is governed by its lock, not by the tier ladder.
    if (journey.entryLock) continue
    const previous = previousInTier.get(journey.difficulty)
    previousInTier.set(journey.difficulty, journey)
    if (!isTierUnlocked(journey.difficulty, heldKeys, gateOpen)) continue
    if (!previous || isFreeOrder(journey.difficulty) || isCompleted(previous.id)) available.add(journey.id)
  }
  return available
}

// The expedition the completion screen offers next: the pyramid journey following this one, and
// only if the player may actually pick it — announcing a locked tier would be a dead end. In a
// free-order tier every journey is open, so the offer is the first one not yet completed after this
// one (then any before it), or nothing.
export const nextPyramidJourneyId = (
  journeys: readonly Journey[],
  journeyId: string,
  heldKeys: ReadonlySet<string>,
  isCompleted: (journeyId: string) => boolean = () => false,
  isFreeOrder: (difficulty: Difficulty) => boolean = isFreeOrderDifficulty,
  gateOpen: (tier: Difficulty) => boolean = () => true
): string | undefined => {
  const index = journeys.findIndex(j => j.id === journeyId)
  if (index === -1) return undefined
  const current = journeys[index]
  if (isFreeOrder(current.difficulty)) {
    if (!isTierUnlocked(current.difficulty, heldKeys, gateOpen)) return undefined
    const others = journeys.filter(j => !j.entryLock && j.difficulty === current.difficulty && j.id !== journeyId)
    const split = others.findIndex(j => journeys.indexOf(j) > index)
    const ordered = split === -1 ? others : [...others.slice(split), ...others.slice(0, split)]
    return ordered.find(j => !isCompleted(j.id))?.id
  }
  const next = journeys[index + 1]
  if (!next || next.entryLock) return undefined
  return isTierUnlocked(next.difficulty, heldKeys, gateOpen) ? next.id : undefined
}

// What stands between the player and a tier: one of its unlock treasures. The tomb gives its floors
// in order, so the first floor's treasure is always the one found first and the only one shown, lit
// when held. A tier with no unlock treasures has nothing to find.
export const tierKeyNeed = (
  tier: Difficulty,
  heldKeys: ReadonlySet<string>,
  display: (keyId: string) => { symbol: string } | undefined,
  label: string
): JourneyNeed | undefined => {
  const keys = TIER_UNLOCK_PERK_IDS[tier]
  if (!keys || keys.length === 0) return undefined
  const symbols = keys.slice(0, 1).flatMap(keyId => {
    const shown = display(keyId)
    return shown ? [{ symbol: shown.symbol, held: heldKeys.has(keyId) }] : []
  })
  return { key: `tier:${tier}`, label, symbols }
}
