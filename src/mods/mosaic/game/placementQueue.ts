import { LEVEL_STEPS, PIECES_BY_STEP } from "./mosaicRevealOrder"
import { MOSAIC_TIERS, type MosaicTier } from "./mosaicCurrency"

// What the player is carrying and where the next piece goes. A found piece is not in the window
// until the player sets it in, so "owned" and "placed" drift apart and this is what closes the gap.

export type TierCounts = Record<MosaicTier, number>

export const stepsOf = (tier: MosaicTier) => LEVEL_STEPS.filter(s => s.journeyId.startsWith(`${tier}_`))

export const piecesOfStep = (step: { journeyId: string; levelIndex: number }) =>
  PIECES_BY_STEP.get(`${step.journeyId}:${step.levelIndex}`) ?? []

// Pieces in hand per register. A register can only take as many as it has steps — a piece past
// its register's last step would reveal nothing, so it never counts as placeable.
export const carriedPieces = (owned: TierCounts, placed: TierCounts): { tier: MosaicTier; count: number }[] =>
  MOSAIC_TIERS.map(tier => ({
    tier,
    count: Math.max(0, Math.min(owned[tier], stepsOf(tier).length) - placed[tier]),
  })).filter(c => c.count > 0)

// The next piece to set, lowest register first — the window fills top to bottom, the way it reads.
export const nextPlacement = (
  owned: TierCounts,
  placed: TierCounts
): { tier: MosaicTier; pieceIds: string[] } | undefined => {
  const [next] = carriedPieces(owned, placed)
  if (!next) return undefined
  const step = stepsOf(next.tier)[placed[next.tier]]
  return { tier: next.tier, pieceIds: step ? piecesOfStep(step) : [] }
}

// A register's Fez conversation — fired when it completes, and again on demand from its caption.
export const beatFor = (tier: MosaicTier) => `mosaic${tier[0].toUpperCase()}${tier.slice(1)}`

export const isComplete = (tier: MosaicTier, placed: TierCounts) => placed[tier] === stepsOf(tier).length

export const completedTiers = (placed: TierCounts): MosaicTier[] => MOSAIC_TIERS.filter(t => isComplete(t, placed))

// The Fez beats a placement earns: the register it just finished, and the finale if that was the
// last one outstanding. Empty while a register is still filling. Beats stand alone and registers
// can be finished in any order, so this never looks further back than the window's current state.
export const beatsEarnedBy = (tier: MosaicTier, placedAfter: TierCounts): string[] => {
  if (!isComplete(tier, placedAfter)) return []
  const beats = [beatFor(tier)]
  if (MOSAIC_TIERS.every(t => isComplete(t, placedAfter))) beats.push("mosaicFinale")
  return beats
}

// Every piece id currently set into the window.
export const revealedPieceIds = (placed: TierCounts): Set<string> => {
  const revealed = new Set<string>()
  for (const tier of MOSAIC_TIERS) {
    for (const step of stepsOf(tier).slice(0, placed[tier])) {
      for (const id of piecesOfStep(step)) revealed.add(id)
    }
  }
  return revealed
}
