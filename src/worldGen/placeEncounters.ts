import type { SiteConfig, SubSection, Difficulty } from "./types"
import { hashString } from "@/support/hashString"

// A role (a family tag, or a list of tags meaning "any of these") resolved to a concrete family id for a
// slot at `tier`, deterministically in `seed`. Injected from src/mods (allFamilyMeta's allocateEncounter-
// Family) — src/worldGen can't read the family registry directly. Returns the role unchanged when
// no enabled family matches (runtime family-absence pass-through then owns the room).
// Asked for `count` rooms at once, and answered as a hand rather than as `count` independent rolls —
// see allocateEncounterSpread. One room is just a hand of one.
export type EncounterAllocator = (
  role: string | string[],
  tier: Difficulty,
  seed: number,
  count: number
) => (string | string[])[]

const one = (
  allocate: EncounterAllocator,
  role: string | string[],
  tier: Difficulty,
  seed: number
): string | string[] => allocate(role, tier, seed, 1)[0]

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
    byIndex[+key] = one(allocate, role, difficulty, seedFor(`${node}#${key}`))
  }
}

/** A chain of puzzle rooms: a floor's main path, or a section's. */
type Chain = {
  pathPuzzles: number
  difficulty: Difficulty
  encounter?: string | string[]
  encountersByIndex?: Record<number, string | string[]>
}

// Bake every room of one chain. **The chain is dealt a hand, not rolled a family per room.** A section
// used to resolve to a single family and hand it to all of its rooms, so a corridor of five was the same
// puzzle five times over; rolling per room instead would only trade that for the same puzzle twice in a
// row now and then. One hand from the allocator answers both (see allocateEncounterSpread), and the ROLE
// is untouched — the section still dresses as one place, it just stops being one puzzle.
//
// Rooms an authored `nodes` selector already named keep what they were given (they are baked before this
// runs) and sit out the deal. `encounter` stays the chain's default for anything the hand does not name.
const dealChain = (chain: Chain, role: string | string[], seed: number, allocate: EncounterAllocator): void => {
  const byIndex = chain.encountersByIndex ?? {}
  const open = Array.from({ length: chain.pathPuzzles }, (_, room) => room).filter(room => byIndex[room] === undefined)
  if (open.length === 0) {
    chain.encounter = one(allocate, role, chain.difficulty, seed)
    return
  }
  const hand = allocate(role, chain.difficulty, seed, open.length)
  open.forEach((room, i) => (byIndex[room] = hand[i]))
  chain.encounter = hand[0]
  chain.encountersByIndex = byIndex
}

// Gen-time encounter pass. Walks every floor/section that actually has encounter rooms and bakes
// its authored role → a concrete family, chosen from the tag pool by the injected allocator. Runs
// before slot collection (so rewardPriority derives from the chosen family) and before serialization
// (so generatedWorld stores the concrete choice). A section is dealt a hand rather than a family, so its
// rooms differ from one another while the section keeps one role and reads as one place (dealChain).
// Seeded per (journey, level, floor, node) so the deal is stable across regens and tunable by reseeding.
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

        // Per-node overrides (authored `nodes` selectors — e.g. the last room's capstone). Baked first:
        // an authored room owns its index, and the deal below fills only what is left.
        assignByIndex(floor.encountersByIndex, floor.difficulty, seedFor, "main", allocate)
        // Main path rooms (only when the floor actually has them).
        if (floor.pathPuzzles > 0) {
          // **The role is kept, not just the family it resolved to.** Baking used to write the answer over
          // the question, and a room that has forgotten which pool it was drawn for cannot dress for it —
          // the same board is a star map drawn for `sky` and a haul-road network drawn for `trade`.
          const role = roleOf(floor.encounter, "puzzle")
          floor.role = role
          dealChain(floor, role, seedFor("main"), allocate)
        }
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
  // Authored per-node overrides first, so the deal below fills only the rooms nothing has named.
  assignByIndex(section.encountersByIndex, section.difficulty, seedFor, node, allocate)
  // Resolve this section when it has puzzle rooms (dealt, one family a room) OR when it authors an
  // encounter with no chain (e.g. a shop: `pathPuzzles: 0, encounter: "shop"` — with no chain,
  // `encounter` describes the section's single end node). A chainless section with no authored
  // encounter stays a plain treasure end.
  if (section.pathPuzzles > 0 || section.encounter !== undefined) {
    const role = roleOf(section.encounter, "puzzle")
    section.role = role
    if (section.pathPuzzles > 0) dealChain(section, role, seedFor(node), allocate)
    else section.encounter = one(allocate, role, section.difficulty, seedFor(node))
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
  section.sideSections?.forEach((sub, i) => assignSection(sub, seedFor, `${node}.${i}`, allocate, capacityFor, isTrap))
}
