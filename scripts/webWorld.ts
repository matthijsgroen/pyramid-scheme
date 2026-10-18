/**
 * The wizard tier as a web reads it, off the last bake: each floor carved from `generatedWorld.ts` as the game
 * carves it, and read by src/worldGen/webWorld.ts.
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import type { FloorConfig, FloorGrid } from "../src/game/siteTypes"
import { carveWorldFloor } from "../src/mods/buildWorldConfigs"
import { readWebWorld } from "../src/worldGen/webWorld"
import type { CarvedPyramid, ReadWorld } from "../src/worldGen/webWorld"

/** The wizard journeys of the baked world, read as a web reads them, with their carved floors. */
export const bakedWebWorld = (): ReadWorld & {
  grids: Record<string, FloorGrid[][]>
  pyramids: Record<number, CarvedPyramid[]>
} => {
  const pyramids: Record<number, CarvedPyramid[]> = {}
  const grids: Record<string, FloorGrid[][]> = {}
  for (const [journeyId, sites] of Object.entries(generatedWorldConfigs)) {
    const m = /^wizard_(\d+)$/.exec(journeyId)
    if (!m) continue
    grids[journeyId] = sites.map((site, p) =>
      site.map((config, f) => carveWorldFloor(journeyId, p + 1, f, config as FloorConfig))
    )
    pyramids[Number(m[1])] = sites.map((site, p) => ({
      configs: site as FloorConfig[],
      grids: grids[journeyId][p],
    }))
  }
  return { ...readWebWorld(pyramids), grids, pyramids }
}
