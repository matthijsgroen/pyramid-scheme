import type { FloorConfig, SideSection, SiteConfig, TreasureReward } from "./types"
import { WORLD_SEED, TOMB_SYMBOLS, HIEROGLYPH_REQUIRED } from "./data"

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

type FragmentCounter = (hieroglyphId: string) => number

const serializeReward = (r: TreasureReward, nextIdx: FragmentCounter): string => {
  switch (r.type) {
    case "hieroglyphFragment": {
      const pieceIndex = nextIdx(r.hieroglyphId)
      return `{ type: "hieroglyphFragment", hieroglyphId: "${r.hieroglyphId}", pieceIndex: ${pieceIndex} }`
    }
    case "tombKey":
      return `{ type: "tombKey", keyId: "${r.keyId}" }`
    case "mapPiece":
      return `{ type: "mapPiece", tombId: "${r.tombId}" }`
    default:
      return `{ type: "${r.type}" }`
  }
}

const serializeSideSection = (s: SideSection, nextIdx: FragmentCounter): string => {
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
  if (s.endReward) parts.push(`endReward: ${serializeReward(s.endReward, nextIdx)}`)
  return `{ ${parts.join(", ")} }`
}

const serializeFloor = (c: FloorConfig, nextIdx: FragmentCounter): string => {
  const sideSectionsStr =
    c.sideSections.length === 0
      ? "[]"
      : `[\n${c.sideSections.map(s => `      ${serializeSideSection(s, nextIdx)}`).join(",\n")},\n    ]`
  const lines: string[] = [
    `    pathPuzzles: ${c.pathPuzzles},`,
    `    chestEvery: ${c.chestEvery ?? 0},`,
    `    difficulty: "${c.difficulty}",`,
    `    end: "treasure",`,
    `    exitOrStaircase: "${c.exitOrStaircase}",`,
    `    sideSections: ${sideSectionsStr},`,
  ]
  if (c.puzzleFamily) lines.push(`    puzzleFamily: "${c.puzzleFamily}",`)
  if (c.mainEndReward) lines.push(`    mainEndReward: ${serializeReward(c.mainEndReward, nextIdx)},`)
  if (c.chestRewards && c.chestRewards.length > 0) {
    const rewards = c.chestRewards.map(r => `      ${serializeReward(r, nextIdx)}`).join(",\n")
    lines.push(`    chestRewards: [\n${rewards},\n    ],`)
  }
  return `  {\n${lines.join("\n")}\n  }`
}

const serializeSiteConfig = (floors: SiteConfig, nextIdx: FragmentCounter): string => {
  if (floors.length === 1) return `[${serializeFloor(floors[0], nextIdx).trimStart()}]`
  const inner = floors.map(f => `    ${serializeFloor(f, nextIdx).trimStart()}`).join(",\n")
  return `[\n${inner},\n  ]`
}

const countPlacedFragments = (configs: Record<string, SiteConfig[]>): Map<string, number> => {
  const placed = new Map<string, number>()
  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const cfg of floors) {
        for (const r of cfg.chestRewards ?? []) {
          if (r.type === "hieroglyphFragment") placed.set(r.hieroglyphId, (placed.get(r.hieroglyphId) ?? 0) + 1)
        }
        for (const s of cfg.sideSections) {
          if (s.endReward?.type === "hieroglyphFragment")
            placed.set(s.endReward.hieroglyphId, (placed.get(s.endReward.hieroglyphId) ?? 0) + 1)
        }
      }
    }
  }
  return placed
}

const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export const generateFile = (configs: Record<string, SiteConfig[]>): string => {
  // Counter assigns unique piece indices per hieroglyphId across the entire world
  const fragmentCounts = new Map<string, number>()
  const nextFragmentIndex: FragmentCounter = (id: string) => {
    const idx = fragmentCounts.get(id) ?? 0
    fragmentCounts.set(id, idx + 1)
    return idx
  }

  const entries = Object.entries(configs)
    .map(([id, siteConfigs]) => {
      const inner = siteConfigs.map(c => `    ${serializeSiteConfig(c, nextFragmentIndex)}`).join(",\n")
      return `  ${id}: [\n${inner},\n  ]`
    })
    .join(",\n")

  // Use actual placed counts as required — never expect more fragments than exist in the world.
  // The matrix in data.ts is the aspirational max; placed count is the real target.
  const placed = countPlacedFragments(configs)
  const hieroglyphRequired = Object.keys(HIEROGLYPH_REQUIRED)
    .map(id => `  "${id}": ${placed.get(id) ?? 1}`)
    .join(",\n")

  // Hash of all site config entries — changes whenever world content is regenerated.
  // Stored in save data so stale exploration state can be detected and discarded.
  const contentHash = hashString(entries)

  return `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// Run: yarn generate-world
// World seed: ${WORLD_SEED}
import type { SiteConfig } from "../game/siteTypes"

export const worldContentHash = ${contentHash}

export const generatedWorldConfigs: Record<string, SiteConfig[]> = {
${entries},
}

export const hieroglyphRequired: Record<string, number> = {
${hieroglyphRequired},
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
  const totalUnique = allHieroglyphs.reduce((s, id) => s + (HIEROGLYPH_REQUIRED[id] ?? 0), 0)
  uniqueAssignedFragments = allHieroglyphs.reduce(
    (s, id) => s + Math.min(fragCoverage.get(id) ?? 0, HIEROGLYPH_REQUIRED[id] ?? 0),
    0
  )
  const uncovered = allHieroglyphs.filter(id => !fragCoverage.has(id))
  const under2 = allHieroglyphs.filter(id => (fragCoverage.get(id) ?? 0) < (HIEROGLYPH_REQUIRED[id] ?? 0))

  console.log(
    `✓ Configs generated: ${pyramidJourneys} pyramid journeys (${pyramidLevels} levels), ${tombJourneys} tombs (${tombFloors} floors)`
  )
  console.log(`  Map pieces placed: ${totalMapPieces}`)
  console.log(`  Mosaic pieces placed: ${totalMosaicPieces}`)
  console.log(
    `  Hieroglyph fragments: ${uniqueAssignedFragments}/${totalUnique} unique + ${totalFragments - uniqueAssignedFragments} repeats (${totalFragments} total chest slots)`
  )
  if (uncovered.length > 0) console.warn(`  ⚠ Hieroglyphs with 0 fragments: ${uncovered.join(", ")}`)
  if (under2.length > 0)
    console.log(`  ℹ Matrix target not yet reached (${under2.length} hieroglyphs) — game uses actual placed counts`)
}
