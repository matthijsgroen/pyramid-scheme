import { describe, it, expect } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { TOMB_SYMBOLS } from "@/data/tableaus"
import { EXPECTED_HIEROGLYPH_FRAGMENTS } from "./hieroglyphCurrency"
import type { SiteConfig } from "@/worldGen/types"
import type { Difficulty } from "@/data/difficultyLevels"

// Invariant guard for HIEROGLYPH_CURRENCY.rank's hard tier filter (hieroglyphCurrency.ts): a
// hieroglyph fragment may only ever land in a slot whose OWN authored difficulty equals that
// hieroglyph's tier — the native tier's own pyramids/tombs, or a deliberately cross-tier-tagged
// floor/ward pocket marked with that difficulty (slots.ts's own "tier is the slot's own
// difficulty, not its journey's" rule). This walks the whole shipped world and would fail if a
// future spec change (or a regression in the rank filter) let a fragment leak cross-tier again.

const TIER_BY_HIEROGLYPH: Record<string, Difficulty> = (() => {
  const result: Record<string, Difficulty> = {}
  for (const [tier, ids] of Object.entries(TOMB_SYMBOLS) as [Difficulty, string[]][]) {
    for (const id of ids) result[id] = tier
  }
  return result
})()

type Offender = { where: string; hieroglyphId: string; expectedTier: string; actualDifficulty: string }

const auditWorld = (configs: Record<string, SiteConfig[]>): { offenders: Offender[]; visited: number } => {
  const offenders: Offender[] = []
  let visited = 0

  const check = (where: string, hieroglyphId: string, difficulty: string) => {
    visited++
    const expectedTier = TIER_BY_HIEROGLYPH[hieroglyphId]
    if (difficulty !== expectedTier) offenders.push({ where, hieroglyphId, expectedTier, actualDifficulty: difficulty })
  }

  // A section's own `rewards[]` (puzzle-chain filler slots, see slots.ts's emitPuzzle) can also
  // carry a fragmentSlot-placeholder-filled hieroglyphFragment — same difficulty as the section
  // it belongs to, since a rewards-array entry has no difficulty of its own.
  const checkRewards = (where: string, rewards: unknown[] | undefined, difficulty: string) => {
    for (const r of rewards ?? []) {
      const reward = r as { type: string; hieroglyphId: string } | undefined
      if (reward?.type === "hieroglyphFragment") check(where, reward.hieroglyphId, difficulty)
    }
  }

  // Recurses to arbitrary depth — sideSections can nest (key-chain showcases go 2 deep today,
  // but nothing here should assume a fixed depth).
  type Section = { endReward?: unknown; difficulty: string; rewards?: unknown[]; sideSections?: Section[] }
  const visitSection = (where: string, section: Section) => {
    const endReward = section.endReward as { type: string; hieroglyphId: string } | undefined
    if (endReward?.type === "hieroglyphFragment") check(where, endReward.hieroglyphId, section.difficulty)
    checkRewards(`${where} rewards`, section.rewards, section.difficulty)
    for (const sub of section.sideSections ?? []) visitSection(`${where} sub`, sub)
  }

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    siteConfigs.forEach((floors, levelIndex) => {
      floors.forEach((floor, floorIndex) => {
        const where = `${siteId}#${levelIndex}:${floorIndex}`
        const mainEndReward = floor.mainEndReward as { type: string; hieroglyphId: string } | undefined
        if (mainEndReward?.type === "hieroglyphFragment")
          check(`${where} main`, mainEndReward.hieroglyphId, floor.difficulty)
        checkRewards(`${where} rewards`, floor.rewards, floor.difficulty)
        for (const s of floor.sideSections) visitSection(`${where} side`, s)
      })
    })
  }
  return { offenders, visited }
}

describe("hieroglyph fragments stay within their own tier (over the generated world)", () => {
  const { offenders, visited } = auditWorld(generatedWorldConfigs)

  it("visited every fragment (a broken traversal can't pass by visiting nothing)", () => {
    expect(visited).toBe(EXPECTED_HIEROGLYPH_FRAGMENTS)
  })

  it("every fragment's containing floor/section difficulty equals that symbol's own tier", () => {
    expect(
      offenders,
      `${offenders.length} fragment(s) placed off-tier. First few: ${JSON.stringify(offenders.slice(0, 8))}`
    ).toEqual([])
  })
})
