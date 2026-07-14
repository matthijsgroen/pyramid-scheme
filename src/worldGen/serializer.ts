import type { FloorConfig, SideSection, SiteConfig, TreasureReward } from "./types"
import { WORLD_SEED } from "./data"

// The per-hieroglyph required-fragment counts a mod owns (docs/mods/TARGET.md rule 2) — injected
// by the caller (scripts/generateWorld.ts, from the hieroglyph mod), never imported here. Empty
// when no such currency is registered, so the serializer stays mod-agnostic.
type HieroglyphRequired = Record<string, number>

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

const serializeEncounter = (encounter: string | string[]): string =>
  Array.isArray(encounter) ? `[${encounter.map(e => `"${e}"`).join(", ")}]` : `"${encounter}"`

// Emit a reward as an object literal from whatever fields it carries — core enumerates no reward
// type or currency id (docs/mods/distribution-primitive-design.md §D; ARCHITECTURE invariant 1).
// Reward payloads are flat scalars (type + amount/itemId/hieroglyphId/pieceIndex/…). fragmentSlot
// is the placement sentinel; any hieroglyph pieceIndex is already stamped by the hieroglyph
// finalize pass (scripts/generateWorld.ts) before we get here.
const serializeValue = (v: unknown): string => (typeof v === "string" ? `"${v}"` : `${v}`)
const serializeReward = (r: TreasureReward): string => {
  if (r.type === "fragmentSlot")
    throw new Error("fragmentSlot reached serializer — placement must fill or clear every slot first")
  return `{ ${Object.entries(r)
    .map(([k, v]) => `${k}: ${serializeValue(v)}`)
    .join(", ")} }`
}

const serializePuzzleRewards = (rewards: (TreasureReward | undefined)[]): string =>
  `[${rewards.map(r => (r ? serializeReward(r) : "undefined")).join(", ")}]`

const serializeSideSection = (s: SideSection): string => {
  const endStr = typeof s.end === "object" ? `{ stairId: "${s.end.stairId}" }` : `"${s.end}"`
  const parts = [`pathPuzzles: ${s.pathPuzzles}`, `difficulty: "${s.difficulty}"`, `end: ${endStr}`]
  if (s.gate)
    parts.push(
      s.gate.type === "tomb-key"
        ? `gate: { type: "tomb-key", wardKeyId: "${s.gate.wardKeyId}" }`
        : s.gate.color
          ? `gate: { type: "floor-key", color: "${s.gate.color}" }`
          : `gate: { type: "floor-key" }`
    )
  if (s.endReward) parts.push(`endReward: ${serializeReward(s.endReward)}`)
  if (s.shopPrice !== undefined) parts.push(`shopPrice: ${s.shopPrice}`)
  if (s.puzzleRewards?.length) parts.push(`puzzleRewards: ${serializePuzzleRewards(s.puzzleRewards)}`)
  if (s.hidden) parts.push(`hidden: true`)
  if (s.sealed) parts.push(`sealed: true`)
  if (s.encounter) parts.push(`encounter: ${serializeEncounter(s.encounter)}`)
  if (s.sideSections?.length)
    parts.push(`sideSections: [${s.sideSections.map(sub => serializeSideSection(sub as SideSection)).join(", ")}]`)
  return `{ ${parts.join(", ")} }`
}

const serializeFloor = (c: FloorConfig): string => {
  const sideSectionsStr =
    c.sideSections.length === 0
      ? "[]"
      : `[\n${c.sideSections.map(s => `      ${serializeSideSection(s)}`).join(",\n")},\n    ]`
  const lines: string[] = [
    `    pathPuzzles: ${c.pathPuzzles},`,
    `    difficulty: "${c.difficulty}",`,
    `    end: "treasure",`,
    typeof c.exitOrStaircase === "object"
      ? `    exitOrStaircase: { stairId: "${c.exitOrStaircase.stairId}" },`
      : `    exitOrStaircase: "${c.exitOrStaircase}",`,
    `    sideSections: ${sideSectionsStr},`,
  ]
  if (c.entrance) {
    const val = typeof c.entrance === "object" ? `{ stairId: "${c.entrance.stairId}" }` : `"${c.entrance}"`
    lines.push(`    entrance: ${val},`)
  }
  if (c.encounter) lines.push(`    encounter: ${serializeEncounter(c.encounter)},`)
  if (c.lastMainPuzzleFamily) lines.push(`    lastMainPuzzleFamily: "${c.lastMainPuzzleFamily}",`)
  if (c.corridorStraightness !== undefined) lines.push(`    corridorStraightness: ${c.corridorStraightness},`)
  if (c.packing !== undefined) lines.push(`    packing: ${c.packing},`)
  if (c.sealed) lines.push(`    sealed: true,`)
  if (c.mainEndReward) lines.push(`    mainEndReward: ${serializeReward(c.mainEndReward)},`)
  if (c.puzzleRewards?.length) lines.push(`    puzzleRewards: ${serializePuzzleRewards(c.puzzleRewards)},`)
  return `  {\n${lines.join("\n")}\n  }`
}

const serializeSiteConfig = (floors: SiteConfig): string => {
  if (floors.length === 1) return `[${serializeFloor(floors[0]).trimStart()}]`
  const inner = floors.map(f => `    ${serializeFloor(f).trimStart()}`).join(",\n")
  return `[\n${inner},\n  ]`
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

export const generateFile = (
  configs: Record<string, SiteConfig[]>,
  hieroglyphRequired: HieroglyphRequired = {}
): string => {
  const entries = Object.entries(configs)
    .map(([id, siteConfigs]) => {
      const inner = siteConfigs.map(c => `    ${serializeSiteConfig(c)}`).join(",\n")
      return `  ${id}: [\n${inner},\n  ]`
    })
    .join(",\n")

  // `hieroglyphRequired` is already capped-to-placed by the hieroglyph finalize (generateWorld);
  // core just emits it. Core does not count or cap any reward type.
  const hieroglyphRequiredEntries = Object.keys(hieroglyphRequired)
    .map(id => `  "${id}": ${hieroglyphRequired[id]}`)
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
${hieroglyphRequiredEntries},
}
`
}

// ---------------------------------------------------------------------------
// Validation summary
// ---------------------------------------------------------------------------

export const printStats = (configs: Record<string, SiteConfig[]>): void => {
  let pyramidJourneys = 0
  let tombJourneys = 0
  let pyramidLevels = 0
  let tombFloors = 0
  // Reward tally is by type, discovered from the data — core names no reward id. A mod prints its
  // own richer stats (e.g. hieroglyph coverage) from generateWorld.
  const byType = new Map<string, number>()
  const tally = (r: TreasureReward | undefined) => {
    if (r) byType.set(r.type, (byType.get(r.type) ?? 0) + 1)
  }

  for (const [journeyId, siteConfigs] of Object.entries(configs)) {
    if (journeyId.includes("tomb")) {
      tombJourneys++
      for (const floors of siteConfigs) tombFloors += floors.length
    } else {
      pyramidJourneys++
      pyramidLevels += siteConfigs.length
    }
    for (const floors of siteConfigs) {
      for (const cfg of floors) {
        tally(cfg.mainEndReward)
        for (const r of cfg.puzzleRewards ?? []) tally(r)
        for (const s of cfg.sideSections) {
          tally(s.endReward)
          for (const r of s.puzzleRewards ?? []) tally(r)
          for (const sub of s.sideSections ?? []) {
            tally(sub.endReward)
            for (const r of sub.puzzleRewards ?? []) tally(r)
          }
        }
      }
    }
  }

  console.log(
    `✓ Configs generated: ${pyramidJourneys} pyramid journeys (${pyramidLevels} levels), ${tombJourneys} tombs (${tombFloors} floors)`
  )
  const tallyLine = [...byType.entries()]
    .filter(([type]) => type !== "fragmentSlot")
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${type} ${n}`)
    .join(", ")
  console.log(`  Rewards placed: ${tallyLine}`)
}
