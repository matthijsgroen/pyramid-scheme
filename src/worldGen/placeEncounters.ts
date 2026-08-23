import type { SiteConfig, SubSection, Difficulty } from "./types"
import { hashString } from "@/support/hashString"

// A role (a family tag, or a list of tags meaning "any of these") resolved to a concrete family id for a
// slot at `tier`, deterministically in `seed`. Injected from src/mods (allFamilyMeta's allocateEncounter-
// Family) — src/worldGen can't read the family registry directly. Returns the role unchanged when
// no enabled family matches (runtime family-absence pass-through then owns the room).
export type EncounterAllocator = (role: string | string[], tier: Difficulty, seed: number) => string | string[]

// How many reward slots a node whose encounter resolves to a given family exposes (injected from
// src/mods's familyCapacityFor). >1 means a stock-bearing node (a shop) — its `rewards[]` is seeded
// to this length here, before slot collection, so the mods have that many slots to fill.
export type FamilyCapacityFor = (encounter: string | string[] | undefined, defaultTag: string) => number

// Whether a resolved encounter is a trap (injected from src/mods's familyIsTrap). Trapped content has
// to be cut off from leftover maze edges, and that is the ONLY thing about an encounter the layout
// depends on — so gen writes it down as `sealed`, the authored structural field that asks for the
// same isolation. The assembler then reads only structure, and re-authoring which puzzle a room
// serves can never move a wall.
export type IsTrapFamily = (encounter: string | string[] | undefined, defaultTag: string) => boolean

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
  capacityFor?: FamilyCapacityFor,
  isTrap?: IsTrapFamily
): void => {
  for (const [journeyId, siteConfigs] of Object.entries(allConfigs)) {
    siteConfigs.forEach((floors, levelIndex) => {
      floors.forEach((floor, floorIndex) => {
        const seedFor = (node: string) => hashString(`${journeyId}:${levelIndex}:${floorIndex}:${node}`)

        // Main path rooms (only when the floor actually has them) — the chain default family.
        if (floor.pathPuzzles > 0) {
          // **The role is kept, not just the family it resolved to.** Baking used to write the answer over
          // the question, and a room that has forgotten which pool it was drawn for cannot dress for it —
          // the same board is a star map drawn for `sky` and a haul-road network drawn for `trade`.
          const role = roleOf(floor.encounter, "puzzle")
          floor.role = role
          floor.encounter = allocate(role, floor.difficulty, seedFor("main"))
        }
        // Per-node overrides (authored `nodes` selectors — e.g. the last room's capstone).
        assignByIndex(floor.encountersByIndex, floor.difficulty, seedFor, "main", allocate)
        // Side sections + their nested sub-sections.
        floor.sideSections.forEach((section, si) =>
          assignSection(section, seedFor, `s${si}`, allocate, capacityFor, isTrap)
        )
      })
    })
  }
}

const assignSection = (
  section: SubSection & { sideSections?: SubSection[] },
  seedFor: (node: string) => number,
  node: string,
  allocate: EncounterAllocator,
  capacityFor?: FamilyCapacityFor,
  isTrap?: IsTrapFamily
): void => {
  // Resolve this section's encounter when it has puzzle rooms (the chain default family) OR when it
  // authors an encounter with no chain (e.g. a shop: `pathPuzzles: 0, encounter: "shop"` — with no
  // chain, `encounter` describes the section's single end node). A chainless section with no authored
  // encounter stays a plain treasure end.
  if (section.pathPuzzles > 0 || section.encounter !== undefined) {
    const role = roleOf(section.encounter, "puzzle")
    section.role = role
    section.encounter = allocate(role, section.difficulty, seedFor(node))
  }
  // A stock-bearing family (a shop, capacity 6) exposes that many reward slots on this node: seed its
  // `rewards[]` stock array (the mods fill it later). Capacity 1 (ordinary node) leaves rewards as
  // initPuzzleChains built it. Only reached once the encounter is resolved above.
  if (capacityFor) {
    const capacity = capacityFor(section.encounter, "treasure")
    if (capacity > 1) section.rewards = Array.from({ length: capacity }, () => undefined)
  }
  // A trap needs its stretch cut off from leftover maze edges. Written down as `sealed` rather than
  // left for the assembler to infer from the encounter: the isolation is a structural fact about this
  // section, and recording it here is what lets the encounter itself stay structurally inert. A
  // section already sealed or gated keeps the same layout, so this only ever adds.
  if (isTrap?.(section.encounter, "puzzle")) section.sealed = true
  assignByIndex(section.encountersByIndex, section.difficulty, seedFor, node, allocate)
  section.sideSections?.forEach((sub, i) => assignSection(sub, seedFor, `${node}.${i}`, allocate, capacityFor, isTrap))
}
