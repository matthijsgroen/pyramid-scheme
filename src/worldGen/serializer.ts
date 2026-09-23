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

// Emits every field the gate object carries (whatever they are) rather than a fixed field
// list — so an authored keyId/ownerMod, or any later field, survives the bake without this
// function needing to name it.
const serializeGate = (g: NonNullable<SideSection["gate"]>): string =>
  `{ ${Object.entries(g)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${serializeValue(v)}`)
    .join(", ")} }`

const serializeSideSection = (s: SideSection): string => {
  const endStr = typeof s.end === "object" ? `{ stairId: "${s.end.stairId}" }` : `"${s.end}"`
  const parts = [`pathPuzzles: ${s.pathPuzzles}`, `difficulty: "${s.difficulty}"`, `end: ${endStr}`]
  if (s.label !== undefined) parts.unshift(`label: ${JSON.stringify(s.label)}`)
  if (s.gate) parts.push(`gate: ${serializeGate(s.gate)}`)
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

// Emits every field the object carries rather than a fixed list, the way `serializeGate` does, so a
// field added to a switch later rides along without this function naming it.
const serializeObject = (o: object): string =>
  `{ ${Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === "string" || Array.isArray(v) ? serializeEncounter(v) : serializeValue(v)}`)
    .join(", ")} }`

/**
 * ONE EMITTER PER FloorConfig FIELD, and the type is what makes that exhaustive: a field added to
 * FloorConfig with no emitter here fails the build, instead of the floor being baked without it.
 *
 * A whitelist could not say that. Authoring silently absent from `src/data/generatedWorld.ts` — no
 * type error, no failing test, the world simply built without the feature — is the failure this shape
 * exists to make impossible.
 *
 * Key order is emission order. A `null` return omits the line: an empty pool or a false flag is not
 * worth a field in the baked world.
 */
const floorFieldEmitters: {
  [K in keyof Required<FloorConfig>]: (value: NonNullable<FloorConfig[K]>) => string | null
} = {
  pathPuzzles: v => `pathPuzzles: ${v}`,
  difficulty: v => `difficulty: "${v}"`,
  end: () => `end: "treasure"`,
  exitOrStaircase: v =>
    typeof v === "object" ? `exitOrStaircase: { stairId: "${v.stairId}" }` : `exitOrStaircase: "${v}"`,
  sideSections: v =>
    `sideSections: ${v.length === 0 ? "[]" : `[\n${v.map(s => `      ${serializeSideSection(s)}`).join(",\n")},\n    ]`}`,
  entrance: v => `entrance: ${typeof v === "object" ? `{ stairId: "${v.stairId}" }` : `"${v}"`}`,
  encounter: v => `encounter: ${serializeEncounter(v)}`,
  encounterArgs: v => `encounterArgs: ${JSON.stringify(v)}`,
  theme: v => `theme: ${JSON.stringify(v)}`,
  decorations: v => (v.length ? `decorations: ${JSON.stringify(v)}` : null),
  condition: v => `condition: ${JSON.stringify(v)}`,
  patron: v => `patron: ${JSON.stringify(v)}`,
  wallDecorations: v => (v.length ? `wallDecorations: ${JSON.stringify(v)}` : null),
  role: v => `role: ${serializeEncounter(v)}`,
  encountersByIndex: v => (Object.keys(v).length ? `encountersByIndex: ${serializeEncountersByIndex(v)}` : null),
  corridorStraightness: v => `corridorStraightness: ${v}`,
  packing: v => `packing: ${v}`,
  sealed: v => (v ? `sealed: true` : null),
  mainEndReward: v => `mainEndReward: ${serializeReward(v)}`,
  rewards: v => (v.length ? `rewards: ${serializePuzzleRewards(v)}` : null),
  switchFork: v => `switchFork: ${serializeObject(v)}`,
}

const serializeFloor = (c: FloorConfig): string => {
  const lines: string[] = []
  for (const key of Object.keys(floorFieldEmitters) as (keyof FloorConfig)[]) {
    const value = c[key]
    if (value === undefined) continue
    const line = (floorFieldEmitters[key] as (v: unknown) => string | null)(value)
    if (line !== null) lines.push(`    ${line},`)
  }
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
