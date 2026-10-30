#!/usr/bin/env tsx
/**
 * Carves every shipped floor on the rooms engine and on the lattice, and prints per floor the rooms size, the lattice
 * size, their area ratio, the longest walk from one room to the next on each, the bare corridor cells on each, on the
 * rooms engine's own sketch and the rooms/sketch ratio, the layouts the rooms carve ran and refused, and how long the
 * rooms carve took.
 * Run: yarn layout-measure
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { longestRoomToRoom } from "../src/game/carve/embed/embedFloor"
import { MOVES } from "../src/game/carve/embed/graph"
import { LATTICE_ENGINE, ROOMS_ENGINE, type Engine } from "../src/game/carve/engines"
import { TAIL_READS } from "../src/game/carve/passes"
import { render } from "../src/game/carve/render"
import { requireReads } from "../src/game/carve/state"
import type { FloorGrid } from "../src/game/siteTypes"
import { worldFloorCarve } from "../src/mods/carveWorldFloor"

/** The corridor cells that are bare floor: no stop, door, gate, drop or fork, so not a room, not part of a drop or
 * next to one, not next to a room, and leaving by at most two ways. */
const bareCorridorCells = (grid: FloorGrid): number => {
  const at = (r: number, c: number) => grid.cells[r]?.[c]
  let bare = 0
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "corridor" || cell.obstacle || cell.openGate || cell.prefabRoom || cell.dirs.size > 2) return
      const near = Object.values(MOVES).map(([dr, dc]) => at(r + dr, c + dc))
      if (near.some(next => next?.type === "room" || (next?.type === "corridor" && next.obstacle))) return
      bare++
    })
  )
  return bare
}
const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** The rooms engine, counting the layouts it runs and refuses and reading the bare corridor of its last sketch. */
const tally = { layouts: 0, refused: 0, sketchBare: 0 }
const MEASURED: Engine = {
  ...ROOMS_ENGINE,
  finish: (prep, state) => {
    tally.layouts++
    tally.sketchBare = bareCorridorCells(render(prep, requireReads("measure", [...TAIL_READS, "plan"], state)))
    const finished = ROOMS_ENGINE.finish(prep, state)
    if ("refused" in finished) tally.refused++
    return finished
  },
}

const ratios: number[] = []
const longest: number[] = []
const sketchRatios: number[] = []
const starterSketchRatios: number[] = []
let slowest = { ms: 0, key: "" }
let failed = 0
const total = { layouts: 0, refused: 0 }
console.log(
  "floor | rooms | lattice | ratio | longest rooms | longest lattice | bare rooms | bare lattice | bare sketch | " +
    "bare rooms/sketch | layouts | refused | rooms ms"
)
for (const [journeyId, site] of Object.entries(generatedWorldConfigs))
  site.forEach((floors, levelIndex) =>
    floors.forEach((config, floorIndex) => {
      const key = `${journeyId}#${levelIndex + 1}#${floorIndex}`
      const lattice = worldFloorCarve(journeyId, levelIndex + 1, floorIndex, LATTICE_ENGINE).carve(config)
      Object.assign(tally, { layouts: 0, refused: 0, sketchBare: 0 })
      const started = performance.now()
      const rooms = worldFloorCarve(journeyId, levelIndex + 1, floorIndex, MEASURED).carve(config)
      const ms = Math.round(performance.now() - started)
      slowest = ms > slowest.ms ? { ms, key } : slowest
      total.layouts += tally.layouts
      total.refused += tally.refused
      const tried = `${tally.layouts} | ${tally.refused} | ${ms}`
      if (!rooms.success || !lattice.success) {
        failed++
        console.log(
          `${key} | ${rooms.success ? "" : "FAILED"} | ${lattice.success ? "" : "FAILED"} | | | | | | | | ${tried}`
        )
        return
      }
      const ratio = (rooms.grid.rows * rooms.grid.cols) / (lattice.grid.rows * lattice.grid.cols)
      ratios.push(ratio)
      const walk = longestRoomToRoom(rooms.grid)
      longest.push(walk)
      const bare = bareCorridorCells(rooms.grid)
      const sketchRatio = bare / Math.max(1, tally.sketchBare)
      sketchRatios.push(sketchRatio)
      if (journeyId.startsWith("starter")) starterSketchRatios.push(sketchRatio)
      console.log(
        [
          key,
          `${rooms.grid.rows}x${rooms.grid.cols}`,
          `${lattice.grid.rows}x${lattice.grid.cols}`,
          ratio.toFixed(2),
          walk,
          longestRoomToRoom(lattice.grid),
          bare,
          bareCorridorCells(lattice.grid),
          tally.sketchBare,
          sketchRatio.toFixed(2),
          tried,
        ].join(" | ")
      )
    })
  )
console.log(
  `SUMMARY floors ${ratios.length + failed}, failed ${failed}, median ratio ${median(ratios).toFixed(2)}, ` +
    `median longest ${median(longest)}, max longest ${Math.max(...longest)}, ` +
    `median bare rooms/sketch ${median(sketchRatios).toFixed(2)}, ` +
    `starter bare rooms/sketch over 1.2 ${starterSketchRatios.filter(r => r > 1.2).length}/${starterSketchRatios.length}, ` +
    `slowest rooms carve ${slowest.ms} ms (${slowest.key}), layouts ${total.layouts}, refused ${total.refused}`
)
