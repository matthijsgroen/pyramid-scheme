import { expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { TOPOLOGY_ON } from "@/game/testSupport/modOff"
import { anchorHoldsRoomShut, completeCell, walkableFrom } from "@/game/gridNavigation"
import { roomDoors } from "@/game/roomShape"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"
import "@/mods/registerModApps"

it("no shipped room lets a player walk from one door to another past an encounter on its anchor not yet done", () => {
  const failures: string[] = []
  let shutRooms = 0
  for (const floor of allFloors()) {
    const carved = assembleFloor(floor.journeyId, floor.config, floor.seed, TOPOLOGY_ON.resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
    })
    if (!carved.success) continue
    const grid = carved.grid
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type !== "room" || !cell.prefabRoom || !anchorHoldsRoomShut(cell)) return
        const doors = roomDoors(grid, r, c).map(({ at }) => `${at[0]},${at[1]}`)
        if (doors.length < 2) return
        shutRooms++
        const room = `${floor.label}: ${cell.family} room at ${r},${c}`
        for (const door of doors) {
          const [dr, dc] = door.split(",").map(Number)
          const entered = completeCell(grid, dr, dc)
          const walkable = walkableFrom(entered, [dr, dc])
          if (!walkable.has(`${r},${c}`)) failures.push(`${room}: entered by ${door}, its stop is out of reach`)
          const past = doors.filter(other => other !== door && walkable.has(other))
          if (past.length > 0)
            failures.push(`${room}: entered by ${door}, ${past.join(" and ")} open before it is done`)
          const done = walkableFrom(completeCell(entered, r, c), [r, c])
          const shut = doors.filter(other => !done.has(other))
          if (shut.length > 0) failures.push(`${room}: done, ${shut.join(" and ")} still shut`)
        }
      })
    )
  }
  expect(shutRooms).toBeGreaterThan(0)
  expect(failures).toEqual([])
}, 1_800_000)
