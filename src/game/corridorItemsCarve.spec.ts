import { describe, expect, it } from "vitest"
import { walkFloorLock } from "./floorLockWalk"
import { freeRegions } from "./lockAuthoring"
import { parseLock } from "./lockNotation"
import { CORRIDOR_ITEMS } from "./testSupport/corridorFixtures"
import { BINDING, carveLockFloor } from "./testSupport/lockFixtures"

describe("a lock whose corridors carry items, carved", { timeout: 180_000 }, () => {
  it.each([
    ["two corridors on one pair", "in -[A]- hall\nin -[B]- hall\nhall -- out\nA toggle @in\nB toggle @in"],
    ["a gate then a drop", "in -- out\nin -[A]- >> pit\npit -- out\nA toggle @in"],
    ["a drop between two gates", "in -- out\nin -[A]- >> -[A]- pit\npit -- out\nA toggle @in"],
    ["a gate aligned right", "in ---[A]- hall\nhall -- out\nA toggle @in"],
    ["every shape at once", CORRIDOR_ITEMS],
  ])("carves %s and walks it sound", (_, text) => {
    const grid = carveLockFloor(freeRegions(parseLock(text, "items").lock), BINDING)
    expect(walkFloorLock(grid)).toEqual({ sound: true, states: expect.any(Number) })
  })
})
