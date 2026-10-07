import type { RealisationBinding } from "@/game/lockCompile"
import { parseLock } from "@/game/lockNotation"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"

// MADE-UP STONE LOCKS, never catalogue ones: a test pins the rule, `yarn lock` checks the catalogue. Every region
// takes `free`, so the floor holds the lock and nothing else. Placed without a namespace, a lock's ids read
// `stones.<id>` on the floor: its name is the namespace.

/** A stone on a shelf by the way in, and a door further on that waits for a stone on `p`. */
export const SHELF_AND_DOOR = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"

/** Two stones and an empty plate the door waits on: lifting one stone leaves the other to be refused. */
export const TWO_STONES = "in -[p]- out\np plate @in\na plate @in stone\nb plate @in stone\nin ?\nout ?"

export const stoneFloor = (text: string, more: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: parseLock(text, "stones").lock }],
  realisations: { weights: "stonePlate" },
  ...more,
})

/** Where the plate authored as `name` stands. */
export const plateNamed = (grid: FloorGrid, name: string): readonly [number, number] => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.plate?.id === `stones.${name}`) return [r, c]
    }
  throw new Error(`no plate ${name} on this floor`)
}

/** A stone on a shelf by the way in, and a narrow passage on to the way out: only empty hands go through. */
export const CRACK = "in -[unladen]- out\nshelf plate @in stone\nin ?\nout ?"

/** The stones as stone plates, a gate empty hands alone open as a narrow passage. */
export const PASSAGE_BINDING: RealisationBinding = { weights: "stonePlate", unladen: "narrowPassage" }

/** Where the floor's one narrow passage stands. */
export const passageAt = (grid: FloorGrid): readonly [number, number] => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.passage) return [r, c]
    }
  throw new Error("no narrow passage on this floor")
}
