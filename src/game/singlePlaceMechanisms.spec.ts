import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter, type ResolveEncounter } from "./siteAssembler"
import { floorLock, regionsOf } from "./floorLock"
import { legalTargets } from "./mechanismDoors"
import { reachableStates, type LockSpec } from "./lockWalk"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { designerDoubleBack, forkSwitchFloorConfig } from "./testSupport/forkSwitchFixtures"
import { handleFloorConfig } from "./testSupport/handleFixtures"
import {
  andDoorFloor,
  anyDoorFloor,
  floorKeyDoorFloor,
  soloLeverDoorFloor,
  soloTorchDoorFloor,
  threeOwnerDoorFloor,
} from "./testSupport/gateFaceFixtures"
import {
  offRouteSluiceFloor,
  onRouteSluiceFloor,
  strandingSluiceFloor,
  unwinnableSluiceFloor,
} from "./testSupport/regionBarrierFixtures"

const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const FLOORS: { name: string; config: FloorConfig }[] = [
  { name: "an and door", config: andDoorFloor() },
  { name: "a three-owner door", config: threeOwnerDoorFloor() },
  { name: "an any door", config: anyDoorFloor() },
  { name: "a torch's door", config: soloTorchDoorFloor() },
  { name: "a lever's door", config: soloLeverDoorFloor() },
  { name: "a floor-key door", config: floorKeyDoorFloor() },
  { name: "the designer's doubleBack", config: designerDoubleBack() },
  { name: "a fork-switch", config: forkSwitchFloorConfig() },
  {
    name: "two levers",
    config: handleFloorConfig(
      { in: "lever", left: ["vault"], right: ["pocket"] },
      { in: "lever2", left: ["vault2"], right: ["pocket2"] }
    ),
  },
  { name: "an off-route sluice", config: offRouteSluiceFloor() },
  { name: "an on-route sluice", config: onRouteSluiceFloor() },
  { name: "an unwinnable sluice", config: unwinnableSluiceFloor() },
  { name: "a stranding sluice", config: strandingSluiceFloor() },
]

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

const carved = (): { name: string; grid: FloorGrid }[] =>
  FLOORS.flatMap(({ name, config }) =>
    SEEDS.flatMap(seed => {
      const result = assembleFloor("site-single-place", config, seed, reEnterable)
      return result.success ? [{ name: `${name} at seed ${seed}`, grid: result.grid }] : []
    })
  )

// What every mechanism's moves were before a move could be placed: each one made in the region of the
// cell the mechanism stands in. Built from the grid's own regions, not from floorLock's, so the
// comparison is against a reading that has no say in where a move is placed.
const asBefore = (grid: FloorGrid, lock: LockSpec): LockSpec => {
  const { of } = regionsOf(grid)
  const mechanisms = { ...lock.mechanisms }
  let found = 0
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" || !cell.mechanism) return
      const id = Object.keys(mechanisms).find(key => key.endsWith(` ${r},${c}`))!
      found++
      mechanisms[id] = {
        ...mechanisms[id],
        transitions: cell.mechanism.states.flatMap(from =>
          legalTargets(cell.mechanism!, from).map(to => ({ from, to, at: of.get(`${r},${c}`)! }))
        ),
      }
    })
  )
  expect(found).toBeGreaterThan(0)
  return { ...lock, mechanisms }
}

describe("a mechanism that works in one place", () => {
  const floors = carved()

  it("is swept over floors that carve, from every kind of control", () => {
    expect(floors.length).toBeGreaterThan(FLOORS.length)
    expect(
      floors.filter(({ grid }) => grid.cells.flat().some(cell => cell.type === "room" && cell.mechanism)).length
    ).toBeGreaterThan(FLOORS.length)
  })

  it("reaches exactly the states it reached before moves could be placed", () => {
    for (const { name, grid } of floors) {
      const lock = floorLock(grid)
      if (!lock) continue
      const before = asBefore(grid, lock)
      expect(lock.mechanisms, name).toEqual(before.mechanisms)
      expect(reachableStates(lock), name).toEqual(reachableStates(before))
    }
  })
})
