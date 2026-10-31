import { prepareFloor } from "@/game/carve/prepareFloor"
import type { FloorPrep } from "@/game/carve/state"
import { expandFloorLocks } from "@/game/floorLocks"
import { appetiteOf, standsBeforeContent } from "@/game/lockPuzzles"
import { planLockFloor } from "@/game/lockPlan"
import type { AssembleFloorKeyRequirements, ResolveEncounter } from "@/game/siteAssembler"
import type { AssemblerFailure, FloorConfig, SubSection } from "@/game/siteTypes"
import type { CarveRefusal } from "./carveSeedSearch"

// WHAT NO SEED CAN ANSWER. Each check here reads the authoring alone and holds for every seed, so a floor failing
// one is reported as infeasible without a single carve, and the author is told which field to change rather than
// left to read a search's refusal counts as bad luck.

/** The floor as the assembler prepares it before its first attempt: refused by name, or ready to carve. */
export type PreparedLayout = { ok: true; prep: FloorPrep } | { ok: false; reasons: AssemblerFailure["reasons"] }

/** Prepares a floor exactly as `assembleFloor` does before it carves (locks expanded, the lock plan laid out),
 * carving nothing. */
export const prepareLayout = (
  siteId: string,
  config: FloorConfig,
  addressSeed: number,
  resolvers: AssembleFloorKeyRequirements & { resolveEncounter?: ResolveEncounter } = {}
): PreparedLayout => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) return { ok: false, reasons: expanded.reasons }
  return prepareFloor(siteId, expanded.config, addressSeed, resolvers, planLockFloor(expanded))
}

/** Encounter rooms on sections a player walks into through no gate: an ungated, visible section, sealed or not,
 * its puzzles and its chest or shop, and the same of the sections hanging off it. Only these can stand on a lock's way,
 * since a gate cuts its ground off from the way; a sealed section may stand on a lock corridor. */
const openEncounters = (sections: readonly (SubSection & { sideSections?: SubSection[] })[]): number =>
  sections.reduce(
    (sum, section) =>
      section.gate || section.hidden
        ? sum
        : sum + section.pathPuzzles + (section.end === "treasure" ? 1 : 0) + openEncounters(section.sideSections ?? []),
    0
  )

/** Every puzzle and every reward the floor authors, wherever it stands. */
const allPuzzles = (sections: readonly { pathPuzzles: number; sideSections?: SubSection[] }[]): number =>
  sections.reduce((sum, section) => sum + section.pathPuzzles + allPuzzles(section.sideSections ?? []), 0)
const allRewards = (sections: readonly { end: SubSection["end"]; sideSections?: SubSection[] }[]): number =>
  sections.reduce(
    (sum, section) => sum + (section.end === "treasure" ? 1 : 0) + allRewards(section.sideSections ?? []),
    0
  )

/**
 * EVERY HARD CRITERION THE AUTHORING CANNOT MEET AT ANY SEED:
 * - the assembler refuses it before any attempt (a one-way naming a missing section, a switch asking for more
 *   junctions than `forks` reserves): `carves`;
 * - a lock floor with no encounter that may stand on a lock's way, no puzzle on the main path and no room on an
 *   ungated, visible section: `lock holds an encounter`. A lock standing before the floor's content is asked for none (`standsBeforeContent`);
 * - more lock regions asking for puzzles, or for a reward, than the floor has to give: `lock holds an encounter`.
 */
export const layoutInfeasible = (floor: FloorConfig, prep: PreparedLayout): CarveRefusal[] => {
  if (!prep.ok)
    return [
      { criterion: "carves", detail: `the assembler refuses it before any carve: ${JSON.stringify(prep.reasons)}` },
    ]
  const locks = floor.locks ?? []
  if (locks.length === 0) return []
  const found: CarveRefusal[] = []
  const names = locks.filter(placed => !standsBeforeContent(placed)).map(placed => placed.as ?? placed.lock.name)
  if (names.length > 0 && floor.pathPuzzles + openEncounters(floor.sideSections) === 0)
    found.push({
      criterion: "lock holds an encounter",
      detail: `lock ${names.join(", ")}: pathPuzzles is 0 and every side section stands behind a gate or a hidden way, so no encounter can stand on a lock's way`,
    })
  const asking = (appetite: "puzzles" | "reward") =>
    locks.flatMap(placed =>
      Object.keys(placed.lock.regions)
        .filter(region => appetiteOf({ kind: "region", placed, region }) === appetite)
        .map(region => `${placed.as ?? placed.lock.name}.${region}`)
    )
  const puzzles = floor.pathPuzzles + allPuzzles(floor.sideSections)
  const rewards = 1 + allRewards(floor.sideSections)
  for (const [appetite, has] of [
    ["puzzles", puzzles],
    ["reward", rewards],
  ] as const) {
    const regions = asking(appetite)
    if (regions.length > has)
      found.push({
        criterion: "lock holds an encounter",
        detail: `${regions.join(", ")} ask for ${appetite}, ${regions.length} region(s), and the floor authors ${has}`,
      })
  }
  return found
}
