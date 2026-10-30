#!/usr/bin/env tsx
/**
 * Carves every shipped floor on the rooms engine and on the lattice, and prints per floor the rooms size, the lattice
 * size, their area ratio, the longest walk from one room to the next on each, and the layouts the rooms carve tried.
 * Run: yarn layout-measure
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { layoutTally, longestRoomToRoom } from "../src/game/carve/embed/embedFloor"
import { LATTICE_ENGINE, ROOMS_ENGINE } from "../src/game/carve/engines"
import { worldFloorCarve } from "../src/mods/carveWorldFloor"

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const ratios: number[] = []
const starterRatios: number[] = []
const longest: number[] = []
let failed = 0
let total = { layouts: 0, attempts: 0, refused: 0 }
console.log("floor | rooms | lattice | ratio | longest rooms | longest lattice | layouts | attempts | refused")
for (const [journeyId, site] of Object.entries(generatedWorldConfigs))
  site.forEach((floors, levelIndex) =>
    floors.forEach((config, floorIndex) => {
      const key = `${journeyId}#${levelIndex + 1}#${floorIndex}`
      const lattice = worldFloorCarve(journeyId, levelIndex + 1, floorIndex, LATTICE_ENGINE).carve(config)
      layoutTally.layouts = layoutTally.attempts = layoutTally.refused = 0
      const rooms = worldFloorCarve(journeyId, levelIndex + 1, floorIndex, ROOMS_ENGINE).carve(config)
      const tally = { ...layoutTally }
      total = {
        layouts: total.layouts + tally.layouts,
        attempts: total.attempts + tally.attempts,
        refused: total.refused + tally.refused,
      }
      const tried = `${tally.layouts} | ${tally.attempts} | ${tally.refused}`
      if (!rooms.success || !lattice.success) {
        failed++
        console.log(`${key} | ${rooms.success ? "" : "FAILED"} | ${lattice.success ? "" : "FAILED"} | | | | ${tried}`)
        return
      }
      const ratio = (rooms.grid.rows * rooms.grid.cols) / (lattice.grid.rows * lattice.grid.cols)
      ratios.push(ratio)
      if (journeyId.startsWith("starter")) starterRatios.push(ratio)
      const walk = longestRoomToRoom(rooms.grid)
      longest.push(walk)
      console.log(
        [
          key,
          `${rooms.grid.rows}x${rooms.grid.cols}`,
          `${lattice.grid.rows}x${lattice.grid.cols}`,
          ratio.toFixed(2),
          walk,
          longestRoomToRoom(lattice.grid),
          tried,
        ].join(" | ")
      )
    })
  )
const share = total.attempts ? ((100 * total.refused) / total.attempts).toFixed(2) : "0"
console.log(
  `SUMMARY floors ${ratios.length + failed}, failed ${failed}, median ratio ${median(ratios).toFixed(2)}, ` +
    `worst starter ratio ${Math.max(...starterRatios).toFixed(2)}, median longest ${median(longest)}, ` +
    `max longest ${Math.max(...longest)}, layouts ${total.layouts}, attempts ${total.attempts}, ` +
    `refused ${total.refused} (${share}% of attempts)`
)
