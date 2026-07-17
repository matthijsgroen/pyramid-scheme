import type { SiteConfig, SubSection, Difficulty } from "./types"
import { hashString } from "@/support/hashString"

// A role (a family tag, or an AND-array of tags) resolved to a concrete family id for a slot at
// `tier`, deterministically in `seed`. Injected from src/mods (allFamilyMeta's allocateEncounter-
// Family) — src/worldGen can't read the family registry directly. Returns the role unchanged when
// no enabled family matches (runtime family-absence pass-through then owns the room).
export type EncounterAllocator = (role: string | string[], tier: Difficulty, seed: number) => string | string[]

// How many reward slots a node whose encounter resolves to a given family exposes (injected from
// src/mods's familyCapacityFor). >1 means a stock-bearing node (a shop) — its `rewards[]` is seeded
// to this length here, before slot collection, so the mods have that many slots to fill.
export type FamilyCapacityFor = (encounter: string | string[] | undefined, defaultTag: string) => number

const roleOf = (authored: string | string[] | undefined, fallback: string): string | string[] => authored ?? fallback

// Bake each per-node encounter override (`encountersByIndex`, from authored `nodes` selectors —
// e.g. the last room → "capstone") to a concrete family, seeded per node index. Its own default
// tag is the node's role itself (a capstone pool is single-family, so the seed is inert there).
const assignByIndex = (
  byIndex: Record<number, string | string[]> | undefined,
  difficulty: Difficulty,
  seedFor: (node: string) => number,
  node: string,
  allocate: EncounterAllocator
): void => {
  if (!byIndex) return
  for (const key of Object.keys(byIndex)) {
    const role = byIndex[+key]
    byIndex[+key] = allocate(role, difficulty, seedFor(`${node}#${key}`))
  }
}

// Gen-time encounter pass. Walks every floor/section that actually has encounter rooms and bakes
// its authored role → a concrete family, chosen from the tag pool by the injected allocator. Runs
// before slot collection (so rewardPriority derives from the chosen family) and before serialization
// (so generatedWorld stores the concrete choice). Per-floor/per-section granularity — a node's
// rooms share one family; variety spreads across floors, sites, and sections. Seeded per
// (journey, level, floor, node) so the spread is stable across regens and tunable by reseeding.
export const assignEncounters = (
  allConfigs: Record<string, SiteConfig[]>,
  allocate: EncounterAllocator,
  capacityFor?: FamilyCapacityFor
): void => {
  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    siteConfigs.forEach((floors, levelIndex) => {
      floors.forEach((floor, floorIndex) => {
        const seedFor = (node: string) => hashString(`${journeyId}:${levelIndex}:${floorIndex}:${node}`)

        // Main path rooms (only when the floor actually has them) — the chain default family.
        if (floor.pathPuzzles > 0) {
          floor.encounter = allocate(roleOf(floor.encounter, "puzzle"), floor.difficulty, seedFor("main"))
        }
        // Per-node overrides (authored `nodes` selectors — e.g. the last room's capstone).
        assignByIndex(floor.encountersByIndex, floor.difficulty, seedFor, "main", allocate)
        // Side sections + their nested sub-sections.
        floor.sideSections.forEach((section, si) => assignSection(section, seedFor, `s${si}`, allocate, capacityFor))
      })
    })
  }
}

const assignSection = (
  section: SubSection & { sideSections?: SubSection[] },
  seedFor: (node: string) => number,
  node: string,
  allocate: EncounterAllocator,
  capacityFor?: FamilyCapacityFor
): void => {
  // Resolve this section's encounter when it has puzzle rooms (the chain default family) OR when it
  // authors an encounter with no chain (e.g. a shop: `pathPuzzles: 0, encounter: "shop"` — with no
  // chain, `encounter` describes the section's single end node). A chainless section with no authored
  // encounter stays a plain treasure end.
  if (section.pathPuzzles > 0 || section.encounter !== undefined) {
    section.encounter = allocate(roleOf(section.encounter, "puzzle"), section.difficulty, seedFor(node))
  }
  // A stock-bearing family (a shop, capacity 6) exposes that many reward slots on this node: seed its
  // `rewards[]` stock array (the mods fill it later). Capacity 1 (ordinary node) leaves rewards as
  // initPuzzleChains built it. Only reached once the encounter is resolved above.
  if (capacityFor) {
    const capacity = capacityFor(section.encounter, "treasure")
    if (capacity > 1) section.rewards = Array.from({ length: capacity }, () => undefined)
  }
  assignByIndex(section.encountersByIndex, section.difficulty, seedFor, node, allocate)
  section.sideSections?.forEach((sub, i) => assignSection(sub, seedFor, `${node}.${i}`, allocate, capacityFor))
}
