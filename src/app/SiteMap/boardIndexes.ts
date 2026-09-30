import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "@/data/journeyStructure"
import { worldLevelSites } from "@/data/worldLevels"
import { buildBoardIndexes, type ResolveBoardIndex } from "@/game/seeds/boardIndex"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import { resolveEncounter } from "@/app/families/familyRegistry"

const tierById = new Map([...PYRAMID_STRUCTURES, ...TOMB_STRUCTURES].map(({ id, tier }) => [id, tier]))

// The whole world's board assignment, built once on first use (a few thousand entries) and kept for the
// session — every floor assembled after that is a map lookup.
let indexes: ReturnType<typeof buildBoardIndexes> | null = null

/**
 * The board assignment for one floor of one site, in the form the assembler wants: it knows a room's
 * chain and position along it, this closure knows which floor of which site that chain belongs to.
 */
export const boardIndexesForFloor =
  (journeyId: string, levelIndex: number, floorIndex: number): ResolveBoardIndex =>
  (familyId, address) => {
    indexes ??= buildBoardIndexes(worldLevelSites, ALL_FAMILY_META, resolveEncounter, id => {
      const tier = tierById.get(id)
      if (!tier) throw new Error(`journey ${id} has no tier`)
      return tier
    })
    return indexes(journeyId, levelIndex, floorIndex, familyId, address)
  }
