import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"

export type Handle = { in: string; drives: string[] }

/** Where these floors are authored, and so what their handles' gate key ids are derived from. */
export const HANDLE_SITE_ID = "dev_topology:1"
export const HANDLE_FLOOR_REF = { journeyId: "dev_topology", levelIndex: 0, floorIndex: 0 }

const path = (label: string) => ({ pathPuzzles: 1, difficulty: "junior" as const, end: "treasure" as const, label })

/** Six labelled side paths, so two handles have a section each to stand in and two each to drive. */
export const handleFloorConfig = (...handles: Handle[]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: ["lever", "vault", "pocket", "lever2", "vault2", "pocket2"].map(path),
  handles,
})

/** One labelled side path carrying two unlabelled sub-paths, so a handle can name a `s0.1` it drives. */
export const nestedHandleFloorConfig = (...handles: Handle[]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    {
      ...path("branch"),
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
      ],
    },
  ],
  handles,
})

/** One carve attempt, at a seed a legal floor of this shape carves at — so a refusal is the config's. */
export const attemptFloor = (config: FloorConfig) =>
  assembleFloor(HANDLE_SITE_ID, config, 1, undefined, { floorRef: HANDLE_FLOOR_REF })

/**
 * A carved floor, authored on `dev_topology` level 0 floor 0.
 *
 * Which cells a carve offers is the seed's choice, so seeds are tried until one takes the handles;
 * running out throws, carrying every reason verbatim.
 */
export const carveFloor = (config: FloorConfig): { grid: FloorGrid } => {
  const refused: unknown[] = []
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor(HANDLE_SITE_ID, config, seed, undefined, { floorRef: HANDLE_FLOOR_REF })
    if (result.success) return { grid: result.grid }
    for (const reason of result.reasons) refused.push(reason)
  }
  throw new Error(`no seed carved the authored handle: ${JSON.stringify(refused)}`)
}

export const floorWithHandle = (...handles: Handle[]) => carveFloor(handleFloorConfig(...handles))

/** The same, on a floor whose driven section has only a positional address to be named by. */
export const nestedFloorWithHandle = (...handles: Handle[]) => carveFloor(nestedHandleFloorConfig(...handles))
