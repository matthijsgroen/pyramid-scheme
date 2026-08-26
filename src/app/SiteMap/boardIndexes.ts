import { worldLevelSites } from "@/data/worldLevels"
import { buildBoardIndexes, type ResolveBoardIndex } from "@/game/seeds/boardIndex"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import { resolveEncounter } from "@/app/families/familyRegistry"

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
    indexes ??= buildBoardIndexes(worldLevelSites, ALL_FAMILY_META, resolveEncounter)
    return indexes(journeyId, levelIndex, floorIndex, familyId, address)
  }
