import type { FamilyMeta } from "@/game/families/familyMeta"
import type { EncounterResolution, ResolveEncounter } from "@/game/siteAssembler"
import type { FloorConfig, SiteConfig, SubSection } from "@/game/siteTypes"
import { configHash } from "./configHash"

/**
 * Where a room sits in the AUTHORING — which chain, and which room along it. Not a maze position:
 * a floor re-carves whenever its seed moves, but the chains it was authored from do not, so this is
 * what stays put across a re-carve.
 */
export type RoomAddress = { section: string; pathIndex: number }

/** What the assembler asks for a room, once it knows which family the room actually resolved to. */
export type ResolveBoardIndex = (familyId: string, address: RoomAddress) => number | undefined

/**
 * Which entry of its family's seed list each room in the world draws (`docs/instructions/puzzle-screens.md`
 * §6.1). Every room in one list's bucket gets a DIFFERENT entry — the whole point, since the previous
 * scheme indexed the list by a hash of the room's identity and so drew with replacement: 14 rooms over a
 * 14-board list handed some board out three times and left five unused. Dealing instead of drawing makes
 * a repeat impossible while the list covers the bucket, which is exactly the invariant `seedFloor` in
 * enumerateConfigs.ts already fails the build on.
 *
 * Ordinals are assigned world-wide rather than per journey, so no two rooms anywhere serve the same board.
 * They are also positional: insert a room early in a bucket and every later room in it shifts along one.
 * That costs nothing at play time (a room the player has already solved is remembered as explored, not as
 * a board) but it does mean the puzzle waiting in an unvisited room can change when the world is
 * re-authored.
 */
export type BoardIndexes = (
  journeyId: string,
  levelIndex: number,
  floorIndex: number,
  familyId: string,
  address: RoomAddress
) => number | undefined

const addressKey = (
  journeyId: string,
  levelIndex: number,
  floorIndex: number,
  familyId: string,
  { section, pathIndex }: RoomAddress
): string => `${journeyId}|${levelIndex}|${floorIndex}|${section}|${pathIndex}|${familyId}`

/**
 * One floor's chains, addressed exactly as the assembler addresses them: the main path, then each side
 * section, then that section's own sub-sections. Nesting stops one level down because that is as deep as
 * the assembler carves — anything deeper is authored but never built, and must not consume a board.
 */
const chainsOf = (floor: FloorConfig): Array<{ section: SubSection | FloorConfig; address: string }> => [
  { section: floor, address: "main" },
  ...floor.sideSections.flatMap((side, i) => [
    { section: side, address: `s${i}` },
    ...(side.sideSections ?? []).map((sub, j) => ({ section: sub, address: `s${i}.${j}` })),
  ]),
]

/** `world` is keyed by journey and indexed by LEVEL, not by authored site (src/data/worldLevels.ts) — a
 * tomb re-enters its one site once per level, and each of those visits is a room of its own. */
export const buildBoardIndexes = (
  world: Record<string, SiteConfig[]>,
  families: FamilyMeta[],
  resolveEncounter: ResolveEncounter
): BoardIndexes => {
  const byId = new Map(families.map(family => [family.id, family]))
  const nextInBucket = new Map<string, number>()
  const indexes = new Map<string, number>()

  // Sorted so the walk cannot ride on the generated file's key order.
  for (const journeyId of Object.keys(world).sort())
    world[journeyId].forEach((levelSite, levelIndex) =>
      levelSite.forEach((floor, floorIndex) => {
        for (const { section, address } of chainsOf(floor))
          for (let pathIndex = 0; pathIndex < section.pathPuzzles; pathIndex++) {
            // The assembler's own resolution, injected — an authored tag, an "any of these" pool, or
            // nothing at all must land on the same family here as it does when the floor is built.
            const { familyId }: EncounterResolution = resolveEncounter(
              section.encountersByIndex?.[pathIndex] ?? section.encounter,
              "puzzle"
            )
            const seedable = byId.get(familyId)?.seedable
            if (!seedable) continue
            const bucket = configHash(seedable.resolveOptions({ difficulty: section.difficulty }))
            const ordinal = nextInBucket.get(bucket) ?? 0
            nextInBucket.set(bucket, ordinal + 1)
            indexes.set(
              addressKey(journeyId, levelIndex, floorIndex, familyId, { section: address, pathIndex }),
              ordinal
            )
          }
      })
    )

  return (journeyId, levelIndex, floorIndex, familyId, address) =>
    indexes.get(addressKey(journeyId, levelIndex, floorIndex, familyId, address))
}
