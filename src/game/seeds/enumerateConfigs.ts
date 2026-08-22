import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { SiteConfig, SubSection } from "@/game/siteTypes"
import { configHash } from "./configHash"

/** One bucket the baked world asks for, and how much of the world draws from it. */
export type ConfigDemand = {
  hash: string
  familyId: string
  difficulty: Difficulty
  /** Rooms in the baked world that build from this bucket — the seed count worth aiming for. */
  rooms: number
}

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
 * (docs/offline-puzzle-seeds.md).
 *
 * This is what makes the offline pass finite. It enumerates *configurations*, never the seeds a player
 * can meet — a room's own hash only indexes the resulting list — so reassembling a floor or
 * regenerating the world cannot invalidate what it produces.
 *
 * Every room on a floor generates at the **floor's** difficulty, including rooms in side sections
 * authored at another tier: `SiteMapScreen` passes `floorConfig.difficulty` once per floor and a
 * `RoomCell` carries none of its own. Mirrored here deliberately, or the pass would fill buckets
 * nobody visits and miss the ones everybody does.
 */
export const enumerateConfigs = (world: Record<string, SiteConfig[]>, families: FamilyMeta[]): ConfigDemand[] => {
  const byMeta = new Map(families.map(family => [family.id, family]))
  const demand = new Map<string, ConfigDemand>()

  for (const sites of Object.values(world))
    for (const site of sites)
      for (const floor of site) {
        const { difficulty } = floor
        const sections = [floor, ...floor.sideSections.flatMap(section => sectionsOf(section))]
        for (const familyId of sections.flatMap(roomFamilies)) {
          const seedable = byMeta.get(familyId)?.seedable
          if (!seedable) continue
          const hash = configHash(seedable.resolveOptions({ difficulty }))
          const seen = demand.get(hash)
          if (seen) seen.rooms++
          else demand.set(hash, { hash, familyId, difficulty, rooms: 1 })
        }
      }

  return [...demand.values()].sort((a, b) => b.rooms - a.rooms)
}
