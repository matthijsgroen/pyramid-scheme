#!/usr/bin/env tsx
/**
 * Generates src/data/generatedWorld.ts — pyramid site configs with reward assignments.
 *
 * Run: yarn generate-world
 *
 * Design rules applied:
 * - Every pyramid journey's main goal is a mapPiece (one per tier's first tomb, one per journey)
 * - Intermediate chest nodes hold hieroglyphFragment rewards (specific inventory item IDs)
 * - Fragment spread: starter fragments in starter+junior; junior in junior+expert; etc.
 * - No two fragments of the same hieroglyph in the same journey
 * - Fragment distribution is deterministic (fixed WORLD_SEED)
 */

import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Fixed seed RNG (same mulberry32 as src/game/random.ts, inlined)
// ---------------------------------------------------------------------------
const mulberry32 = (seed: number) => {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = <T>(arr: T[], rand: () => number): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const WORLD_SEED = 42_195_837

// ---------------------------------------------------------------------------
// Pyramid journey catalogue (matches journeys.ts tier/id + siteConfigs.ts pathPuzzles)
// ---------------------------------------------------------------------------
type Tier = "starter" | "junior" | "expert" | "master" | "wizard"

type JourneyDef = { id: string; tier: Tier; pathPuzzles: number }

const PYRAMID_JOURNEYS: JourneyDef[] = [
  // Starter
  { id: "starter_1", tier: "starter", pathPuzzles: 2 },
  { id: "starter_2", tier: "starter", pathPuzzles: 2 },
  { id: "starter_3", tier: "starter", pathPuzzles: 3 },
  { id: "starter_4", tier: "starter", pathPuzzles: 3 },
  // Junior
  { id: "junior_1", tier: "junior", pathPuzzles: 3 },
  { id: "junior_2", tier: "junior", pathPuzzles: 4 },
  { id: "junior_3", tier: "junior", pathPuzzles: 5 },
  { id: "junior_4", tier: "junior", pathPuzzles: 4 },
  // Expert
  { id: "expert_1", tier: "expert", pathPuzzles: 4 },
  { id: "expert_2", tier: "expert", pathPuzzles: 5 },
  { id: "expert_3", tier: "expert", pathPuzzles: 6 },
  { id: "expert_4", tier: "expert", pathPuzzles: 5 },
  // Master
  { id: "master_1", tier: "master", pathPuzzles: 5 },
  { id: "master_2", tier: "master", pathPuzzles: 7 },
  { id: "master_3", tier: "master", pathPuzzles: 7 },
  { id: "master_4", tier: "master", pathPuzzles: 6 },
  // Wizard
  { id: "wizard_1", tier: "wizard", pathPuzzles: 8 },
  { id: "wizard_2", tier: "wizard", pathPuzzles: 8 },
  { id: "wizard_3", tier: "wizard", pathPuzzles: 8 },
  { id: "wizard_4", tier: "wizard", pathPuzzles: 8 },
]

// ---------------------------------------------------------------------------
// Hieroglyph IDs per tier (mirrors TOMB_SYMBOLS in tableaus.ts)
// These ARE the inventory item IDs from inventory.ts
// ---------------------------------------------------------------------------
const TOMB_SYMBOLS: Record<Tier, string[]> = {
  starter: ["p10", "p8", "art1", "a6", "a8", "art5", "d1"],
  junior: ["p1", "p11", "p9", "a2", "a13", "art2", "art7", "art12", "d2", "d15"],
  expert: ["p2", "p3", "p7", "p12", "a5", "a7", "a11", "art3", "art4", "art6", "art14", "d3", "d4", "d9"],
  master: ["p4", "p5", "p14", "p15", "a1", "a3", "a14", "a15", "art9", "art10", "art11", "art15", "d5", "d6", "d10"],
  wizard: ["p6", "p13", "a4", "a9", "a10", "a12", "d7", "d8", "d11", "d12", "d13", "d14"],
}

// Fragment count per hieroglyph by tier
const FRAGMENT_COUNT: Record<Tier, number> = {
  starter: 2,
  junior: 2,
  expert: 3,
  master: 3,
  wizard: 3,
}

// Which pyramid tiers can host fragments from each hieroglyph tier
// Rule: fragments appear in same tier and +1 adjacent tier (overlap for revisit motivation)
const FRAGMENT_HOST_TIERS: Record<Tier, Tier[]> = {
  starter: ["starter", "junior"],
  junior: ["junior", "expert"],
  expert: ["expert", "master"],
  master: ["master", "wizard"],
  wizard: ["wizard"],
}

// ---------------------------------------------------------------------------
// Compute chest counts per journey
// chestEvery strategy: every 2 puzzles for pp≥4; every pp puzzles for pp<4 (1 chest)
// ---------------------------------------------------------------------------
const chestEveryFor = (pp: number): number => (pp >= 4 ? 2 : pp)

const chestCountFor = (pp: number): number => {
  const ce = chestEveryFor(pp)
  let count = 0
  for (let p = 1; p <= pp; p++) if (p % ce === 0) count++
  return count
}

// ---------------------------------------------------------------------------
// Fragment assignment
// Greedy: for each hieroglyph tier, build the full fragment list, shuffle it,
// then assign to available chest slots in tier-preferred order.
// Constraint: no duplicate hieroglyphId within the same journey.
// ---------------------------------------------------------------------------
type FragmentSlot = { journeyId: string; slotIndex: number }
type Assignment = { journeyId: string; slotIndex: number; hieroglyphId: string }

const computeFragmentAssignments = (): Assignment[] => {
  const rand = mulberry32(WORLD_SEED)

  // Build chest slots per journey in tier-preference order
  const slotsByTier: Record<Tier, FragmentSlot[]> = {
    starter: [],
    junior: [],
    expert: [],
    master: [],
    wizard: [],
  }
  for (const j of PYRAMID_JOURNEYS) {
    const count = chestCountFor(j.pathPuzzles)
    for (let i = 0; i < count; i++) {
      slotsByTier[j.tier].push({ journeyId: j.id, slotIndex: i })
    }
  }

  // Shuffle slots within each tier for variety
  for (const tier of Object.keys(slotsByTier) as Tier[]) {
    slotsByTier[tier] = shuffle(slotsByTier[tier], rand)
  }

  const assignments: Assignment[] = []
  // Track which hieroglyphs are already placed in each journey (constraint)
  const placedInJourney = new Map<string, Set<string>>()
  for (const j of PYRAMID_JOURNEYS) placedInJourney.set(j.id, new Set())

  // Track how many fragments each hieroglyph still needs
  type FragEntry = { hieroglyphId: string; remaining: number; tier: Tier }
  const fragQueue: FragEntry[] = []
  for (const tier of ["starter", "junior", "expert", "master", "wizard"] as Tier[]) {
    const ids = shuffle(TOMB_SYMBOLS[tier], rand)
    for (const id of ids) fragQueue.push({ hieroglyphId: id, remaining: FRAGMENT_COUNT[tier], tier })
  }

  // For each hieroglyph, find available slots across its host tiers and assign
  for (const frag of fragQueue) {
    const hostTiers = FRAGMENT_HOST_TIERS[frag.tier]
    let placed = 0

    for (const hostTier of hostTiers) {
      const slots = slotsByTier[hostTier]
      // Find a slot in this tier whose journey doesn't already have this hieroglyph
      for (let si = 0; si < slots.length; si++) {
        if (placed >= frag.remaining) break
        const slot = slots[si]
        if (placedInJourney.get(slot.journeyId)!.has(frag.hieroglyphId)) continue
        // Assign
        assignments.push({ journeyId: slot.journeyId, slotIndex: slot.slotIndex, hieroglyphId: frag.hieroglyphId })
        placedInJourney.get(slot.journeyId)!.add(frag.hieroglyphId)
        slots.splice(si, 1)
        placed++
        si-- // adjust after splice
      }
    }

    if (placed < frag.remaining) {
      // Fallback: try any remaining tier with open slots
      const allSlots = (Object.keys(slotsByTier) as Tier[])
        .filter(t => !hostTiers.includes(t))
        .flatMap(t => slotsByTier[t])
      for (let si = 0; si < allSlots.length; si++) {
        if (placed >= frag.remaining) break
        const slot = allSlots[si]
        if (placedInJourney.get(slot.journeyId)!.has(frag.hieroglyphId)) continue
        assignments.push({ journeyId: slot.journeyId, slotIndex: slot.slotIndex, hieroglyphId: frag.hieroglyphId })
        placedInJourney.get(slot.journeyId)!.add(frag.hieroglyphId)
        // Remove from slotsByTier
        const tier = PYRAMID_JOURNEYS.find(j => j.id === slot.journeyId)!.tier
        const tierSlots = slotsByTier[tier]
        const tsi = tierSlots.findIndex(s => s.journeyId === slot.journeyId && s.slotIndex === slot.slotIndex)
        if (tsi >= 0) tierSlots.splice(tsi, 1)
        placed++
      }
    }

    if (placed < frag.remaining) {
      console.warn(
        `⚠ Only placed ${placed}/${frag.remaining} fragments for ${frag.hieroglyphId} (${frag.tier}) — more slots needed (add chestEvery or branches)`
      )
    }
  }

  return assignments
}

// ---------------------------------------------------------------------------
// Build final FloorConfig per journey
// ---------------------------------------------------------------------------
type TreasureReward =
  | { type: "mosaicPiece" }
  | { type: "mapPiece" }
  | { type: "hieroglyphs" }
  | { type: "hieroglyphFragment"; hieroglyphId: string }
  | { type: "tombKey"; keyId: string }

type Difficulty = "easy" | "medium" | "hard"

type SideSection = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure" | "staircase"
  gate?: { type: "floor-key" } | { type: "tomb-key" }
}

type FloorConfig = {
  pathPuzzles: number
  chestEvery?: number
  difficulty: Difficulty
  end: "treasure"
  exitOrStaircase: "exit" | "staircase"
  sideSections: SideSection[]
  mainEndReward?: TreasureReward
  chestRewards?: TreasureReward[]
}

const TIER_DIFFICULTY: Record<Tier, Difficulty> = {
  starter: "easy",
  junior: "easy",
  expert: "medium",
  master: "medium",
  wizard: "hard",
}

const buildConfigs = (): Record<string, FloorConfig> => {
  const assignments = computeFragmentAssignments()

  // Group assignments by journeyId → sorted by slotIndex
  const byJourney = new Map<string, string[]>()
  for (const j of PYRAMID_JOURNEYS) {
    const slots: string[] = Array(chestCountFor(j.pathPuzzles)).fill("")
    for (const a of assignments.filter(a => a.journeyId === j.id)) {
      slots[a.slotIndex] = a.hieroglyphId
    }
    byJourney.set(j.id, slots)
  }

  const configs: Record<string, FloorConfig> = {}
  for (const j of PYRAMID_JOURNEYS) {
    const pp = j.pathPuzzles
    const ce = chestEveryFor(pp)
    const slots = byJourney.get(j.id)!
    const chestRewards: TreasureReward[] = slots.map(id =>
      id ? ({ type: "hieroglyphFragment", hieroglyphId: id } as TreasureReward) : { type: "hieroglyphs" }
    )

    configs[j.id] = {
      pathPuzzles: pp,
      chestEvery: ce,
      difficulty: TIER_DIFFICULTY[j.tier],
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
      mainEndReward: { type: "mapPiece" },
      chestRewards,
    }
  }
  return configs
}

// ---------------------------------------------------------------------------
// Serialise and write
// ---------------------------------------------------------------------------
const serializeReward = (r: TreasureReward): string => {
  switch (r.type) {
    case "hieroglyphFragment":
      return `{ type: "hieroglyphFragment", hieroglyphId: "${r.hieroglyphId}" }`
    case "tombKey":
      return `{ type: "tombKey", keyId: "${r.keyId}" }`
    default:
      return `{ type: "${r.type}" }`
  }
}

const serializeConfig = (c: FloorConfig): string => {
  const lines: string[] = [
    `    pathPuzzles: ${c.pathPuzzles},`,
    `    chestEvery: ${c.chestEvery ?? 0},`,
    `    difficulty: "${c.difficulty}",`,
    `    end: "treasure",`,
    `    exitOrStaircase: "${c.exitOrStaircase}",`,
    `    sideSections: [],`,
  ]
  if (c.mainEndReward) lines.push(`    mainEndReward: ${serializeReward(c.mainEndReward)},`)
  if (c.chestRewards && c.chestRewards.length > 0) {
    const rewards = c.chestRewards.map(r => `      ${serializeReward(r)}`).join(",\n")
    lines.push(`    chestRewards: [\n${rewards},\n    ],`)
  }
  return `  {\n${lines.join("\n")}\n  }`
}

const generateFile = (configs: Record<string, FloorConfig>): string => {
  const entries = Object.entries(configs)
    .map(([id, cfg]) => `  ${id}: ${serializeConfig(cfg).trimStart()}`)
    .join(",\n")

  return `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// Run: yarn generate-world
// World seed: ${WORLD_SEED}
import type { FloorConfig } from "@/game/siteTypes"

export const generatedWorldConfigs: Record<string, FloorConfig> = {
${entries},
}
`
}

// ---------------------------------------------------------------------------
// Validation summary
// ---------------------------------------------------------------------------
const printStats = (configs: Record<string, FloorConfig>) => {
  let totalFragments = 0
  let totalMapPieces = 0
  let totalMosaicPieces = 0
  const fragCoverage = new Map<string, number>()

  for (const cfg of Object.values(configs)) {
    if (cfg.mainEndReward?.type === "mapPiece") totalMapPieces++
    if (cfg.mainEndReward?.type === "mosaicPiece") totalMosaicPieces++
    for (const r of cfg.chestRewards ?? []) {
      if (r.type === "hieroglyphFragment") {
        totalFragments++
        fragCoverage.set(r.hieroglyphId, (fragCoverage.get(r.hieroglyphId) ?? 0) + 1)
      }
    }
  }

  const allHieroglyphs = Object.values(TOMB_SYMBOLS).flat()
  const uncovered = allHieroglyphs.filter(id => !fragCoverage.has(id))
  const under2 = allHieroglyphs.filter(id => {
    const count = fragCoverage.get(id) ?? 0
    const tier = (Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]).find(([, ids]) => ids.includes(id))?.[0]
    return tier ? count < FRAGMENT_COUNT[tier] : false
  })

  console.log(`✓ Configs generated: ${Object.keys(configs).length} pyramid journeys`)
  console.log(`  Map pieces placed: ${totalMapPieces} (target: 20 for 5 first-tombs)`)
  console.log(`  Mosaic pieces placed: ${totalMosaicPieces}`)
  console.log(`  Hieroglyph fragments placed: ${totalFragments} / 157`)
  if (uncovered.length > 0) console.warn(`  ⚠ Hieroglyphs with 0 fragments: ${uncovered.join(", ")}`)
  if (under2.length > 0) console.warn(`  ⚠ Hieroglyphs under target count: ${under2.join(", ")}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const configs = buildConfigs()
printStats(configs)
const content = generateFile(configs)

const outPath = join(__dirname, "../src/data/generatedWorld.ts")
writeFileSync(outPath, content)
console.log(`✓ Written: src/data/generatedWorld.ts`)
