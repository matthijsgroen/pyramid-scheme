import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"

/** Three labelled side paths and nothing else, so a handle has a section to stand in and two to drive. */
const floorConfig = (handle: { in: string; drives: string[] }): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lever" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "vault" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "pocket" },
  ],
  handles: [handle],
})

/** One labelled side path carrying two unlabelled sub-paths, so a handle can name a `s0.1` it drives. */
const nestedFloorConfig = (handle: { in: string; drives: string[] }): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    {
      pathPuzzles: 1,
      difficulty: "junior",
      end: "treasure",
      label: "branch",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
      ],
    },
  ],
  handles: [handle],
})

/**
 * A carved floor standing one handle, authored on `dev_topology` level 0 floor 0 — which is what its
 * gate key ids are derived from.
 *
 * Which cells a carve offers is the seed's choice, so seeds are tried until one takes the handle;
 * running out throws, carrying every reason verbatim so a refusal can be read by the name it named.
 */
export const floorWithHandle = (
  handle: { in: string; drives: string[] },
  shape: (handle: { in: string; drives: string[] }) => FloorConfig = floorConfig
): { grid: FloorGrid } => {
  const config = shape(handle)
  const refused: unknown[] = []
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("dev_topology:1", config, seed, undefined, {
      floorRef: { journeyId: "dev_topology", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success) return { grid: result.grid }
    for (const reason of result.reasons) refused.push(reason)
  }
  throw new Error(`no seed carved the authored handle: ${JSON.stringify(refused)}`)
}

/** The same, on a floor whose driven section has only a positional address to be named by. */
export const nestedFloorWithHandle = (handle: { in: string; drives: string[] }) =>
  floorWithHandle(handle, nestedFloorConfig)
