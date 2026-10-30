#!/usr/bin/env tsx
/**
 * Carves every shipped floor on the rooms engine and on the lattice, and prints per floor the rooms size, the lattice
 * size, their area ratio, the longest walk from one room to the next on each, the bare corridor cells on each and
 * their ratio and the rooms engine's own sketch's, the strings the press left longer than their stops need, the
 * layouts the rooms carve tried and how long the rooms carve took.
 * Run: yarn layout-measure
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { bareCorridorCells, layoutTally, longestRoomToRoom } from "../src/game/carve/embed/embedFloor"
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
const bareRatios: number[] = []
const starterBareRatios: number[] = []
let slackStrings = 0
let slowest = { ms: 0, key: "" }
let failed = 0
let total = { layouts: 0, attempts: 0, refused: 0 }
console.log(
  "floor | rooms | lattice | ratio | longest rooms | longest lattice | bare rooms | bare lattice | bare ratio | " +
    "bare sketch | " +
    "slack strings | layouts | attempts | refused | rooms ms"
)
for (const [journeyId, site] of Object.entries(generatedWorldConfigs))
  site.forEach((floors, levelIndex) =>
    floors.forEach((config, floorIndex) => {
      const key = `${journeyId}#${levelIndex + 1}#${floorIndex}`
      const lattice = worldFloorCarve(journeyId, levelIndex + 1, floorIndex, LATTICE_ENGINE).carve(config)
      layoutTally.layouts = layoutTally.attempts = layoutTally.refused = layoutTally.slack = layoutTally.sketchBare = 0
      const started = performance.now()
      const rooms = worldFloorCarve(journeyId, levelIndex + 1, floorIndex, ROOMS_ENGINE).carve(config)
      const ms = Math.round(performance.now() - started)
      slowest = ms > slowest.ms ? { ms, key } : slowest
      const tally = { ...layoutTally }
      total = {
        layouts: total.layouts + tally.layouts,
        attempts: total.attempts + tally.attempts,
        refused: total.refused + tally.refused,
      }
      const tried = `${tally.layouts} | ${tally.attempts} | ${tally.refused} | ${ms}`
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
      const [bareRooms, bareLattice] = [bareCorridorCells(rooms.grid), bareCorridorCells(lattice.grid)]
      const bareRatio = bareRooms / Math.max(1, bareLattice)
      bareRatios.push(bareRatio)
      if (journeyId.startsWith("starter")) starterBareRatios.push(bareRatio)
      slackStrings += tally.slack
      console.log(
        [
          key,
          `${rooms.grid.rows}x${rooms.grid.cols}`,
          `${lattice.grid.rows}x${lattice.grid.cols}`,
          ratio.toFixed(2),
          walk,
          longestRoomToRoom(lattice.grid),
          bareRooms,
          bareLattice,
          bareRatio.toFixed(2),
          tally.sketchBare,
          tally.slack,
          tried,
        ].join(" | ")
      )
    })
  )
const share = total.attempts ? ((100 * total.refused) / total.attempts).toFixed(2) : "0"
console.log(
  `SUMMARY floors ${ratios.length + failed}, failed ${failed}, median ratio ${median(ratios).toFixed(2)}, ` +
    `worst starter ratio ${Math.max(...starterRatios).toFixed(2)}, median longest ${median(longest)}, ` +
    `max longest ${Math.max(...longest)}, median bare ratio ${median(bareRatios).toFixed(2)}, ` +
    `worst starter bare ratio ${Math.max(...starterBareRatios).toFixed(2)}, ` +
    `starter bare ratios over 1.1 ${starterBareRatios.filter(r => r > 1.1).length}/${starterBareRatios.length}, ` +
    `slack strings ${slackStrings}, slowest rooms carve ${slowest.ms} ms (${slowest.key}), layouts ${total.layouts}, attempts ${total.attempts}, ` +
    `refused ${total.refused} (${share}% of attempts)`
)
