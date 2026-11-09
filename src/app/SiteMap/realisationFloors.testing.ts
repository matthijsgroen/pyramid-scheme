import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { designerDoubleBack, forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { andDoorFloor, threeOwnerDoorFloor } from "@/game/testSupport/gateFaceFixtures"

export const REALISATIONS = ["handle", "torch", "lightbeamSwitch"]

export const wallsOf = (grid: FloorGrid): string =>
  grid.cells
    .map(row => row.map(cell => (cell.type === "empty" ? "e" : `x${[...cell.dirs].sort().join("")}`)).join(" "))
    .join("\n")

const withEncounter = (config: FloorConfig, encounter: string): FloorConfig => ({
  ...config,
  controls: config.controls?.map(c => ("states" in c && !("control" in c) ? { ...c, encounter } : c)),
})

/** The floor carved once per realisation of its controls; undefined where that realisation's carve refused. */
export const carveRealisations = (siteId: string, config: FloorConfig, seed: number): (FloorGrid | undefined)[] =>
  REALISATIONS.map(encounter => {
    const result = assembleFloor(siteId, withEncounter(config, encounter), seed, resolveEncounter, {
      resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
      floorRef: { journeyId: siteId, floorIndex: 0 },
    })
    return result.success ? result.grid : undefined
  })

export type RealisationFloor = {
  name: string
  config: FloorConfig
  /** The first three seeds of 1..60 that carve, as `sweepRealisations` finds them. */
  carvingSeeds: number[]
  /** A seed before the last carving one that every realisation refuses, where the floor has one. */
  refusedSeed?: number
}

export const REALISATION_FLOORS: RealisationFloor[] = [
  { name: "a torch and a lever on one door", config: andDoorFloor(), carvingSeeds: [1, 2, 3] },
  { name: "two torches and a lever on one door", config: threeOwnerDoorFloor(), carvingSeeds: [1, 2, 3] },
  { name: "the doubleBack's controls", config: designerDoubleBack(), carvingSeeds: [2, 3, 10], refusedSeed: 1 },
  {
    name: "a fork-switch beside the doubleBack's controls",
    config: forkSwitchFloorConfig(),
    carvingSeeds: [4, 49],
    refusedSeed: 1,
  },
]

/** Seeds 1..60 until three carve: which carved, which every realisation refused, and which only some refused. */
export const sweepRealisations = (floor: RealisationFloor) => {
  const carving: number[] = []
  const refused: number[] = []
  const mixed: number[] = []
  for (let seed = 1; seed <= 60 && carving.length < 3; seed++) {
    const grids = carveRealisations(floor.name, floor.config, seed)
    if (grids.every(grid => grid !== undefined)) carving.push(seed)
    else if (grids.every(grid => grid === undefined)) refused.push(seed)
    else mixed.push(seed)
  }
  return { carving, refused, mixed }
}
