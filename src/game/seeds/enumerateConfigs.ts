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
 * Two numbers, and keeping them apart is what stops ordinary authoring from forcing a regeneration.
 *
 * `seedTarget` is what the offline pass AIMS for: half again the rooms that draw from the bucket. The
 * surplus is not variety — boards are dealt, one per room (boardIndex.ts), so a list holding its floor
 * repeats nothing. It is headroom, so that moving rooms between buckets doesn't push one past its list.
 *
 * `seedFloor` is what the shipped artifact must CLEAR, and it is the demand itself — and since a room
 * is dealt an entry rather than drawing one, clearing it is exactly what makes a repeat impossible. The gap between
 * them is deliberate headroom: re-authoring a journey moves room counts around constantly, and a
 * bucket filled to 1.5× its old demand still covers the new one unless that demand grew by half. So
 * the build goes red when the lists genuinely cannot cover the world — a family added, a family
 * reaching a tier it had never been drawn at — and stays quiet for the churn of moving rooms between
 * buckets that already exist.
 *
 * `SEED_CAP` is where the artifact's own size wins: past it the biggest buckets stop growing, and a
 * bucket that big has plenty of variety regardless. The seed script takes the same rule (its `--cap`
 * overrides the ceiling).
 */
export const SEED_CAP = 200
const SEED_SURPLUS = 1.5
export const seedTarget = (demand: ConfigDemand, cap: number = SEED_CAP): number =>
  Math.min(Math.ceil(demand.rooms * SEED_SURPLUS), cap)
export const seedFloor = (demand: ConfigDemand, cap: number = SEED_CAP): number => Math.min(demand.rooms, cap)

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
