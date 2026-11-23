import { expect, it } from "vitest"
import { gateKeyOf } from "@/game/carve/ids"
import { instanceName } from "@/game/floorLocks"
import { lastDoorsOf } from "@/game/lockSolved"
import { assemblePlayedFloor } from "./useAssembledFloor"
import { allFloors } from "./worldFloors.testing"
import "@/mods/registerModApps"

it("every lock's last door carries the key the lock-solved event reads", () => {
  const failures: string[] = []
  const silent: string[] = []
  let doors = 0
  for (const floor of allFloors()) {
    const locks = floor.config.locks
    if (!locks?.length) continue
    const carved = assemblePlayedFloor(
      floor.journeyId,
      floor.config,
      floor.seed - floor.floorIndex,
      floor.floorIndex,
      floor.levelIndex
    )
    if (!carved.success) continue
    const keys = new Set(
      carved.grid.cells.flatMap(row => row.flatMap(cell => (cell.type === "room" && cell.requiredKeyId) || []))
    )
    const floorRef = { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex }
    for (const placed of locks) {
      const last = lastDoorsOf(placed)
      if (last.length === 0) silent.push(`${floor.label}: ${instanceName(placed)}`)
      for (const id of last) {
        doors++
        if (!keys.has(gateKeyOf(floorRef, id))) failures.push(`${floor.label}: ${id} has no gate cell`)
      }
    }
  }
  console.info(`locks with no last door (never chime):\n${silent.join("\n") || "none"}`)
  expect(doors).toBeGreaterThan(0)
  expect(failures).toEqual([])
}, 1_800_000)
