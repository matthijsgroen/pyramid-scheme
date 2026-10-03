import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { journeys as allJourneys } from "@/data/journeys"
import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import { boardIndexesForFloor } from "./boardIndexes"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { designerDoubleBack, forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { andDoorFloor, threeOwnerDoorFloor } from "@/game/testSupport/gateFaceFixtures"

const REALISATIONS = ["handle", "torch", "lightbeamSwitch"]

const wallsOf = (grid: FloorGrid): string =>
  grid.cells
    .map(row => row.map(cell => (cell.type === "empty" ? "e" : `x${[...cell.dirs].sort().join("")}`)).join(" "))
    .join("\n")

const withEncounter = (config: FloorConfig, encounter: string): FloorConfig => ({
  ...config,
  controls: config.controls?.map(c => ("states" in c && !("control" in c) ? { ...c, encounter } : c)),
})

const carveAt = (siteId: string, config: FloorConfig, seed: number): FloorGrid | undefined => {
  const result = assembleFloor(siteId, config, seed, resolveEncounter, {
    resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
    floorRef: { journeyId: siteId, floorIndex: 0 },
  })
  return result.success ? result.grid : undefined
}

const sweep = (siteId: string, config: FloorConfig) => {
  const walls = new Map<string, string[]>()
  let carvedSeeds = 0
  for (let seed = 1; seed <= 60 && carvedSeeds < 3; seed++) {
    const grids = REALISATIONS.map(encounter => carveAt(siteId, withEncounter(config, encounter), seed))
    if (grids.some(g => g === undefined)) {
      // One realisation refusing a seed the others carve would be the encounter moving the carve.
      expect(
        grids.every(g => g === undefined),
        `${siteId} seed ${seed}: all realisations carve or none does`
      ).toBe(true)
      continue
    }
    carvedSeeds++
    walls.set(
      String(seed),
      grids.map(g => wallsOf(g!))
    )
  }
  expect(carvedSeeds, `${siteId} carved on some seed`).toBeGreaterThan(0)
  return walls
}

describe("no encounter moves a wall", () => {
  const floors: [string, FloorConfig][] = [
    ["a torch and a lever on one door", andDoorFloor()],
    ["two torches and a lever on one door", threeOwnerDoorFloor()],
    ["the doubleBack's controls", designerDoubleBack()],
    ["a fork-switch beside the doubleBack's controls", forkSwitchFloorConfig()],
  ]
  it.each(floors)(
    "%s: every cell keeps its walls whichever realisation its controls take",
    (name, config) => {
      for (const [seed, byRealisation] of sweep(name, config))
        for (const walls of byRealisation) expect(walls, `${name} seed ${seed}`).toBe(byRealisation[0])
    },
    600_000
  )

  it("the plain switch of the shipped junior_2 pyramid 2 keeps its walls whichever board realises it", () => {
    const config = allJourneys.find(j => j.id === "junior_2")!.siteConfigs![1][0] as FloorConfig
    const walls = ["lightbeamSwitch", "handle"].map(encounter => {
      const result = assembleFloor(
        "junior_2",
        { ...config, switches: { ...config.switches!, encounter } },
        floorAssemblySeed(persistentInteriorSeed("junior_2"), 2, 0),
        resolveEncounter,
        {
          resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
          floorRef: { journeyId: "junior_2", levelIndex: 1, floorIndex: 0 },
          resolveBoardIndex: boardIndexesForFloor("junior_2", 1, 0),
        }
      )
      if (!result.success) throw new Error("junior_2 floor refused")
      return wallsOf(result.grid)
    })
    expect(walls[1]).toBe(walls[0])
  })
})
