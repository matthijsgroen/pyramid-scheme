import type { FloorConfig, SideSection, SiteConfig, TreasureReward } from "./types"
import { WORLD_SEED } from "./data"

// Extra top-level exports a mod wants baked into the generated world file (name → JSON-serializable
// value), e.g. the hieroglyph mod's per-hieroglyph required-fragment counts. Injected by the caller
// (scripts/generateWorld.ts) so core never names a mod's data — it just writes `export const
// <name> = <value>`, and the mod imports it back from src/data/generatedWorld. Empty when no mod
// contributes any (docs/mods/TARGET.md rule 2).
export type ModExports = Record<string, unknown>

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

const serializeEncounter = (encounter: string | string[]): string =>
  Array.isArray(encounter) ? `[${encounter.map(e => `"${e}"`).join(", ")}]` : `"${encounter}"`

// Per-node encounter overrides: `{ 1: "crocodile" }` — ascending index order for stable output.
const serializeEncountersByIndex = (m: Record<number, string | string[]>): string =>
  `{ ${Object.keys(m)
    .map(Number)
    .sort((a, b) => a - b)
    .map(k => `${k}: ${serializeEncounter(m[k])}`)
    .join(", ")} }`

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
  if (s.rewards?.length) parts.push(`rewards: ${serializePuzzleRewards(s.rewards)}`)
  if (s.hidden) parts.push(`hidden: true`)
  if (s.sealed) parts.push(`sealed: true`)
  if (s.encounter) parts.push(`encounter: ${serializeEncounter(s.encounter)}`)
  if (s.encounterArgs !== undefined) parts.push(`encounterArgs: ${JSON.stringify(s.encounterArgs)}`)
  if (s.theme) parts.push(`theme: ${JSON.stringify(s.theme)}`)
  if (s.decorations?.length) parts.push(`decorations: ${JSON.stringify(s.decorations)}`)
  if (s.wallDecorations?.length) parts.push(`wallDecorations: ${JSON.stringify(s.wallDecorations)}`)
  if (s.role) parts.push(`role: ${serializeEncounter(s.role)}`)
  if (s.encountersByIndex && Object.keys(s.encountersByIndex).length)
    parts.push(`encountersByIndex: ${serializeEncountersByIndex(s.encountersByIndex)}`)
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
  if (c.encounterArgs !== undefined) lines.push(`    encounterArgs: ${JSON.stringify(c.encounterArgs)},`)
  if (c.theme) lines.push(`    theme: ${JSON.stringify(c.theme)},`)
  if (c.decorations?.length) lines.push(`    decorations: ${JSON.stringify(c.decorations)},`)
  if (c.wallDecorations?.length) lines.push(`    wallDecorations: ${JSON.stringify(c.wallDecorations)},`)
  if (c.role) lines.push(`    role: ${serializeEncounter(c.role)},`)
  if (c.encountersByIndex && Object.keys(c.encountersByIndex).length)
    lines.push(`    encountersByIndex: ${serializeEncountersByIndex(c.encountersByIndex)},`)
  if (c.corridorStraightness !== undefined) lines.push(`    corridorStraightness: ${c.corridorStraightness},`)
  if (c.packing !== undefined) lines.push(`    packing: ${c.packing},`)
  if (c.sealed) lines.push(`    sealed: true,`)
  if (c.mainEndReward) lines.push(`    mainEndReward: ${serializeReward(c.mainEndReward)},`)
  if (c.rewards?.length) lines.push(`    rewards: ${serializePuzzleRewards(c.rewards)},`)
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

export const generateFile = (configs: Record<string, SiteConfig[]>, modExports: ModExports = {}): string => {
  const entries = Object.entries(configs)
    .map(([id, siteConfigs]) => {
      const inner = siteConfigs.map(c => `    ${serializeSiteConfig(c)}`).join(",\n")
      return `  ${id}: [\n${inner},\n  ]`
    })
    .join(",\n")

  // Each mod-contributed export, written generically — core names none of them. The value is
  // already-finalized mod data (e.g. capped hieroglyphRequired); JSON is valid TS for the plain
  // records mods bake, and TS infers the type at the import site.
  const modExportLines = Object.entries(modExports)
    .map(([name, value]) => `export const ${name} = ${JSON.stringify(value)}\n`)
    .join("\n")

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

${modExportLines}`
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
        for (const r of cfg.rewards ?? []) tally(r)
        for (const s of cfg.sideSections) {
          tally(s.endReward)
          for (const r of s.rewards ?? []) tally(r)
          for (const sub of s.sideSections ?? []) {
            tally(sub.endReward)
            for (const r of sub.rewards ?? []) tally(r)
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
