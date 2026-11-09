import { assembleFloor, defaultResolveEncounter } from "../siteAssembler"
import type { ResolveEncounter } from "../siteAssembler"
import type { FloorConfig, FloorGrid } from "../siteTypes"
import { designerDoubleBack, forkSwitchFloorConfig } from "./forkSwitchFixtures"
import { handleFloorConfig } from "./handleFixtures"

export const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

export const LEVERS: NonNullable<FloorConfig["handles"]> = [
  { in: "lever", left: ["vault"], right: ["pocket"] },
  { in: "lever2", left: ["vault2"], right: ["pocket2"] },
]

export const withSwitch = (config: FloorConfig): FloorConfig => ({
  ...config,
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "sumplete", min: 1, max: 1 },
})

export type MarkFloor = {
  name: string
  siteId: string
  config: () => FloorConfig
  mechanics: number
  /** The seeds the search below finds: the first `want` that carve among 1..`seeds`. */
  search: { seeds: number; want: number }
  carvingSeeds: number[]
}

export const MARK_FLOORS: MarkFloor[] = [
  {
    name: "doubleBack with a fork and two toggles",
    siteId: "site-marks-double",
    config: designerDoubleBack,
    mechanics: 3,
    search: { seeds: 60, want: 12 },
    carvingSeeds: [2, 3, 10, 18, 19, 22, 24, 27, 30, 32, 33, 36],
  },
  {
    name: "doubleBack with a fork-switch and two toggles",
    siteId: "site-marks-fork",
    config: forkSwitchFloorConfig,
    mechanics: 3,
    search: { seeds: 60, want: 12 },
    carvingSeeds: [4, 49],
  },
  ...["a", "b", "c", "d"].map(suffix => ({
    name: `two levers and a plain switch (${suffix})`,
    siteId: `site-marks-levers-${suffix}`,
    config: () => withSwitch(handleFloorConfig(...LEVERS)),
    mechanics: 3,
    search: { seeds: 40, want: 4 },
    carvingSeeds: [31],
  })),
]

export const carveMarkFloor = (floor: MarkFloor, seed: number): FloorGrid | undefined => {
  const result = assembleFloor(floor.siteId, floor.config(), seed, reEnterable)
  return result.success ? result.grid : undefined
}

export const searchCarvingSeeds = (floor: MarkFloor): number[] => {
  const found: number[] = []
  for (let seed = 1; seed <= floor.search.seeds && found.length < floor.search.want; seed++)
    if (carveMarkFloor(floor, seed)) found.push(seed)
  return found
}
