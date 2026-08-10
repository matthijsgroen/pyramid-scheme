import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { collectPlacedRewards } from "@/worldGen/effectiveWardKeys"
import { difficulties, difficultyCompare, wardKeyDifficulty, type Difficulty } from "@/data/difficultyLevels"
import type { TreasureReward } from "@/worldGen/types"
import { MOSAIC_TIERS } from "./mosaicCurrency"

// Mosaic glass must never show up easier-to-reach than the difficulty it belongs to. Two separate
// promises, both of which have been broken in shipped builds:
//
// 1. A piece sits on a node of its own difficulty. Enforced by MOSAIC_CURRENCIES' hard
//    `eligible: slot => slot.tier === tier` filter — asserted here so a change to that filter
//    (or to how slots report their tier) can't silently re-tier the registers.
//
// 2. A piece harder than the journey hosting it is behind a key at least as hard as the piece.
//    This is the player-facing outcome, and it regressed for real: a starter pyramid's ward path
//    opened a JUNIOR floor, so the first ward key in the game handed out junior glass before the
//    player had set foot in a junior expedition (fixed in #171). `wardGateInvariants.spec.ts`
//    guards the structural cause that produced it (a ward staircase's target floor must match its
//    key's difficulty); this guards the consequence, so ANY future cause is caught — a mis-tiered
//    loot pocket, a nested subsection, a longer staircase chain — not just that one mechanism.
//
// Cross-tier glass is deliberate, not a bug to eliminate: a junior wing inside a starter pyramid
// is a "come back stronger" pocket (pyramid-interior-design.md). The rule is only that reaching it
// requires that tier's own key.

const rank = (d: Difficulty) => difficulties.indexOf(d)

const journeyTierOf = (journeyId: string): Difficulty | undefined =>
  difficulties.find(t => journeyId.startsWith(`${t}_`))

// `TreasureReward` is deliberately open (`{ type: string } & Record<string, unknown>`), so a mod
// narrows to its own reward shape with a predicate — same pattern as mosaicPlacement.spec.ts.
const isMosaic = (r: TreasureReward): r is TreasureReward & { tier: Difficulty } => r.type === "mosaicPiece"

// Each piece with its own tier lifted out of mosaic's reward vocabulary (`{ type, tier }`).
const glass = collectPlacedRewards(generatedWorldConfigs)
  .filter(p => isMosaic(p.reward))
  .map(p => ({ ...p, tier: (p.reward as TreasureReward & { tier: Difficulty }).tier }))

describe("mosaic glass lands at its own difficulty", () => {
  it("places every piece (a broken traversal can't pass by finding nothing)", () => {
    expect(glass.length).toBeGreaterThan(0)
  })

  it("puts each piece on a node of its own difficulty", () => {
    const offTier = glass
      .filter(p => p.tier !== p.difficulty)
      .map(p => `${p.tier} glass on ${p.difficulty} node in ${p.journeyId} L${p.levelIndex}`)
    expect(offTier, `${offTier.length} off-tier piece(s): ${offTier.slice(0, 8).join("; ")}`).toEqual([])
  })

  it("only uses tiers the mosaic actually has registers for", () => {
    const unknown = [...new Set(glass.map(p => p.tier))].filter(t => !(MOSAIC_TIERS as readonly string[]).includes(t))
    expect(unknown).toEqual([])
  })
})

describe("mosaic glass harder than its host journey stays behind an equally-hard key", () => {
  // Only pieces deeper than the journey they sit in can leak a tier early; a starter piece in a
  // starter pyramid needs no key to be legitimate.
  const crossTier = glass.filter(p => {
    const journeyTier = journeyTierOf(p.journeyId)
    return journeyTier !== undefined && difficultyCompare(p.tier, journeyTier) > 0
  })

  it("has cross-tier glass to check (else this spec proves nothing)", () => {
    expect(crossTier.length).toBeGreaterThan(0)
  })

  it("guards each cross-tier piece with a key of at least the piece's own difficulty", () => {
    const leaks = crossTier
      .filter(p => {
        const keyTiers = p.wardKeys.map(wardKeyDifficulty).filter((d): d is Difficulty => d !== undefined)
        const strongest = keyTiers.length ? Math.max(...keyTiers.map(rank)) : -1
        return strongest < rank(p.tier)
      })
      .map(
        p =>
          `${p.tier} glass in ${p.journeyId} (${journeyTierOf(p.journeyId)}) L${p.levelIndex} ` +
          `floor${p.floorIndex} guarded by [${p.wardKeys.join(", ") || "nothing"}]`
      )
    expect(leaks, `${leaks.length} early-tier leak(s): ${leaks.slice(0, 8).join("; ")}`).toEqual([])
  })
})
