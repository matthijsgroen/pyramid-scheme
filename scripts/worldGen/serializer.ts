import type { FloorConfig, SideSection, SiteConfig, TreasureReward, Tier } from "./types"
import { WORLD_SEED, TOMB_SYMBOLS, FRAGMENT_COUNT } from "./data"

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

const serializeReward = (r: TreasureReward): string => {
  switch (r.type) {
    case "hieroglyphFragment":
      return `{ type: "hieroglyphFragment", hieroglyphId: "${r.hieroglyphId}" }`
    case "tombKey":
      return `{ type: "tombKey", keyId: "${r.keyId}" }`
    case "mapPiece":
      return `{ type: "mapPiece", tombId: "${r.tombId}" }`
    default:
      return `{ type: "${r.type}" }`
  }
}

const serializeSideSection = (s: SideSection): string => {
  const parts = [`pathPuzzles: ${s.pathPuzzles}`, `difficulty: "${s.difficulty}"`, `end: "${s.end}"`]
  if (s.chestEvery !== undefined) parts.push(`chestEvery: ${s.chestEvery}`)
  if (s.gate)
    parts.push(
      s.gate.type === "tomb-key"
        ? `gate: { type: "tomb-key", wardKeyId: "${s.gate.wardKeyId}" }`
        : s.gate.color
          ? `gate: { type: "floor-key", color: "${s.gate.color}" }`
          : `gate: { type: "floor-key" }`
    )
  if (s.endReward) parts.push(`endReward: ${serializeReward(s.endReward)}`)
  return `{ ${parts.join(", ")} }`
}

const serializeFloor = (c: FloorConfig): string => {
  const sideSectionsStr =
    c.sideSections.length === 0
      ? "[]"
      : `[\n${c.sideSections.map(s => `      ${serializeSideSection(s)}`).join(",\n")},\n    ]`
  const lines: string[] = [
    `    pathPuzzles: ${c.pathPuzzles},`,
    `    chestEvery: ${c.chestEvery ?? 0},`,
    `    difficulty: "${c.difficulty}",`,
    `    end: "treasure",`,
    `    exitOrStaircase: "${c.exitOrStaircase}",`,
    `    sideSections: ${sideSectionsStr},`,
  ]
  if (c.puzzleFamily) lines.push(`    puzzleFamily: "${c.puzzleFamily}",`)
  if (c.mainEndReward) lines.push(`    mainEndReward: ${serializeReward(c.mainEndReward)},`)
  if (c.chestRewards && c.chestRewards.length > 0) {
    const rewards = c.chestRewards.map(r => `      ${serializeReward(r)}`).join(",\n")
    lines.push(`    chestRewards: [\n${rewards},\n    ],`)
  }
  return `  {\n${lines.join("\n")}\n  }`
}

const serializeSiteConfig = (floors: SiteConfig): string => {
  if (floors.length === 1) return `[${serializeFloor(floors[0]).trimStart()}]`
  const inner = floors.map(f => `    ${serializeFloor(f).trimStart()}`).join(",\n")
  return `[\n${inner},\n  ]`
}

export const generateFile = (configs: Record<string, SiteConfig[]>): string => {
  const entries = Object.entries(configs)
    .map(([id, siteConfigs]) => {
      const inner = siteConfigs.map(c => `    ${serializeSiteConfig(c)}`).join(",\n")
      return `  ${id}: [\n${inner},\n  ]`
    })
    .join(",\n")

  return `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// Run: yarn generate-world
// World seed: ${WORLD_SEED}
import type { SiteConfig } from "@/game/siteTypes"

export const generatedWorldConfigs: Record<string, SiteConfig[]> = {
${entries},
}
`
}

// ---------------------------------------------------------------------------
// Validation summary
// ---------------------------------------------------------------------------

export const printStats = (configs: Record<string, SiteConfig[]>): void => {
  let totalFragments = 0
  let uniqueAssignedFragments = 0
  let totalMapPieces = 0
  let totalMosaicPieces = 0
  let pyramidJourneys = 0
  let tombJourneys = 0
  let pyramidLevels = 0
  let tombFloors = 0
  const fragCoverage = new Map<string, number>()

  for (const [journeyId, siteConfigs] of Object.entries(configs)) {
    const isTomb = journeyId.includes("tomb")
    if (isTomb) {
      tombJourneys++
      for (const floors of siteConfigs) tombFloors += floors.length
    } else {
      pyramidJourneys++
      pyramidLevels += siteConfigs.length
    }
    for (const floors of siteConfigs) {
      for (const cfg of floors) {
        if (cfg.mainEndReward?.type === "mapPiece") totalMapPieces++
        if (cfg.mainEndReward?.type === "mosaicPiece") totalMosaicPieces++
        for (const s of cfg.sideSections) {
          if (s.endReward?.type === "mapPiece") totalMapPieces++
          if (s.endReward?.type === "mosaicPiece") totalMosaicPieces++
        }
        for (const r of cfg.chestRewards ?? []) {
          if (r.type === "hieroglyphFragment") {
            totalFragments++
            const prev = fragCoverage.get(r.hieroglyphId) ?? 0
            fragCoverage.set(r.hieroglyphId, prev + 1)
          }
        }
      }
    }
  }

  const allHieroglyphs = Object.values(TOMB_SYMBOLS).flat()
  const totalUnique = allHieroglyphs.reduce(
    (s, id) =>
      s + FRAGMENT_COUNT[(Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]).find(([, ids]) => ids.includes(id))![0]],
    0
  )
  uniqueAssignedFragments = allHieroglyphs.reduce(
    (s, id) =>
      s +
      Math.min(
        fragCoverage.get(id) ?? 0,
        FRAGMENT_COUNT[(Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]).find(([, ids]) => ids.includes(id))![0]]
      ),
    0
  )
  const uncovered = allHieroglyphs.filter(id => !fragCoverage.has(id))
  const under2 = allHieroglyphs.filter(id => {
    const count = fragCoverage.get(id) ?? 0
    const tier = (Object.entries(TOMB_SYMBOLS) as [Tier, string[]][]).find(([, ids]) => ids.includes(id))?.[0]
    return tier ? count < FRAGMENT_COUNT[tier] : false
  })

  console.log(
    `✓ Configs generated: ${pyramidJourneys} pyramid journeys (${pyramidLevels} levels), ${tombJourneys} tombs (${tombFloors} floors)`
  )
  console.log(`  Map pieces placed: ${totalMapPieces}`)
  console.log(`  Mosaic pieces placed: ${totalMosaicPieces}`)
  console.log(
    `  Hieroglyph fragments: ${uniqueAssignedFragments}/${totalUnique} unique + ${totalFragments - uniqueAssignedFragments} repeats (${totalFragments} total chest slots)`
  )
  if (uncovered.length > 0) console.warn(`  ⚠ Hieroglyphs with 0 fragments: ${uncovered.join(", ")}`)
  if (under2.length > 0) console.warn(`  ⚠ Hieroglyphs under target count: ${under2.join(", ")}`)
}
