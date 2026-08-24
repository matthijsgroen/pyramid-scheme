import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { SiteConfig, SubSection } from "@/game/siteTypes"
import { configHash } from "./configHash"

/** One bucket the baked world asks for, and how much of the world draws from it. */
export type ConfigDemand = {
  hash: string
  familyId: string
  difficulty: Difficulty
  /** Rooms in the baked world that build from this bucket. */
  rooms: number
}

/**
 * How many seeds a bucket is worth filling to. Deliberately more than the rooms that draw from it:
 * a room picks its board by `roomSeed % seeds.length` from an arbitrary hash, so a list sized to its
 * demand exactly still hands one board out twice while leaving another unused. The surplus is what
 * makes a repeat unlikely instead of certain.
 *
 * `SEED_CAP` is where the artifact's own size wins — past it the biggest buckets stop growing, and a
 * bucket that big has plenty of variety regardless. The seed script takes the same rule (its `--cap`
 * overrides the ceiling), and `src/mods/puzzleSeeds.spec.ts` holds the shipped lists to it.
 */
export const SEED_CAP = 200
const SEED_SURPLUS = 1.5
export const seedTarget = (demand: ConfigDemand, cap: number = SEED_CAP): number =>
  Math.min(Math.ceil(demand.rooms * SEED_SURPLUS), cap)

/**
 * Every room on a section, as the family id it was baked to. Room k takes its per-index override
 * where the authoring left one, and the section's default otherwise.
 */
const roomFamilies = (section: Pick<SubSection, "pathPuzzles" | "encounter" | "encountersByIndex">): string[] =>
  Array.from({ length: section.pathPuzzles }, (_unused, room) => {
    const baked = section.encountersByIndex?.[room] ?? section.encounter
    // An array survives baking where the authoring named a pool rather than a family; the assembler
    // resolves it per room, so a list of candidates is a list of buckets any of them may need.
    return Array.isArray(baked) ? baked : baked ? [baked] : []
  }).flat()

const sectionsOf = (section: SubSection & { sideSections?: SubSection[] }): SubSection[] => [
  section,
  ...(section.sideSections ?? []).flatMap(sub => sectionsOf(sub)),
]

/**
 * The configurations the baked world can ask a generator for, with the demand behind each
 * (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * This is what makes the offline pass finite. It enumerates *configurations*, never the seeds a player
 * can meet — a room's own hash only indexes the resulting list — so reassembling a floor or
 * regenerating the world cannot invalidate what it produces.
 *
 * A room generates at its own **section's** difficulty, which is the floor's only where the section
 * authored none of its own: the assembler stamps it onto the `RoomCell` and `useEncounter` reads it
 * back. Mirrored here, or the pass would fill buckets nobody visits and miss the ones everybody does
 * — a starter section on a wizard floor asks for starter boards.
 */
export const enumerateConfigs = (world: Record<string, SiteConfig[]>, families: FamilyMeta[]): ConfigDemand[] => {
  const byMeta = new Map(families.map(family => [family.id, family]))
  const demand = new Map<string, ConfigDemand>()

  for (const sites of Object.values(world))
    for (const site of sites)
      for (const floor of site) {
        const sections = [floor, ...floor.sideSections.flatMap(section => sectionsOf(section))]
        for (const section of sections) {
          const { difficulty } = section
          for (const familyId of roomFamilies(section)) {
            const seedable = byMeta.get(familyId)?.seedable
            if (!seedable) continue
            const hash = configHash(seedable.resolveOptions({ difficulty }))
            const seen = demand.get(hash)
            if (seen) seen.rooms++
            else demand.set(hash, { hash, familyId, difficulty, rooms: 1 })
          }
        }
      }

  return [...demand.values()].sort((a, b) => b.rooms - a.rooms)
}
