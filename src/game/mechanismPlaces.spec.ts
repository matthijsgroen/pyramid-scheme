import { describe, expect, it } from "vitest"
import { floorLock, regionsOf } from "./floorLock"
import { reachableStates, type LockSpec } from "./lockWalk"
import { mechanismWorkedAt, mechanismAddress } from "./mechanismDoors"
import { cellAddress } from "./cellAddress"
import type { FloorGrid } from "./siteTypes"
import { gateKey } from "./testSupport/handleFixtures"
import { leverAt, leverFloor, roomBeyondDoorOf, withRemoteMove } from "./testSupport/remoteMechanismFixtures"

const LEVER = (grid: ReturnType<typeof leverFloor>) => {
  const [r, c] = leverAt(grid)
  return `handle ${r},${c}`
}

/** Each region of the lever floor by what it is: the lever's own ground, the vault and the pocket, and their doors. */
const regionNames = (grid: FloorGrid): Map<string, string> => {
  const { of } = regionsOf(grid)
  const regionOf = ([r, c]: readonly [number, number]) => of.get(`${r},${c}`)!
  const doorOf = (section: string) => {
    const r = grid.cells.findIndex(row =>
      row.some(cell => cell.type === "room" && cell.requiredKeyId === gateKey(section))
    )
    const c = grid.cells[r].findIndex(cell => cell.type === "room" && cell.requiredKeyId === gateKey(section))
    return regionOf([r, c])
  }
  return new Map([
    [regionOf(leverAt(grid)), "home"],
    [regionOf(roomBeyondDoorOf(grid, "vault")), "vault"],
    [regionOf(roomBeyondDoorOf(grid, "pocket")), "pocket"],
    [doorOf("vault"), "vault door"],
    [doorOf("pocket"), "pocket door"],
  ])
}

/** Where the walk stood, by name, with the side the lever stood on. */
const visited = (grid: FloorGrid, spec: LockSpec) => {
  const walk = reachableStates(spec)
  if (walk === "tooLarge") throw new Error("too large")
  const names = regionNames(grid)
  return walk.order.map(s => `${names.get(s.region) ?? s.region} ${Object.values(s.config).join()}`).sort()
}

describe("a mechanism's moves made in several places", () => {
  it("makes every move in the mechanism's own region when the record places none", () => {
    const grid = leverFloor()
    const lock = floorLock(grid)!
    const home = lock.mechanisms[LEVER(grid)].transitions[0].at
    expect(lock.mechanisms[LEVER(grid)].transitions).toEqual([
      { from: "left", to: "right", at: home },
      { from: "right", to: "left", at: home },
    ])
  })

  it("moves a placed transition into the region its place stands in, and leaves the others at home", () => {
    const grid = leverFloor()
    const home = floorLock(grid)!.mechanisms[LEVER(grid)].transitions[0].at
    const [r, c] = roomBeyondDoorOf(grid, "vault")
    const placed = withRemoteMove(grid, { to: "right", at: [r, c] })
    const lock = floorLock(placed)!
    const vaultRegion = lock.mechanisms[LEVER(grid)].transitions[0].at

    expect(vaultRegion).not.toBe(home)
    expect(lock.mechanisms[LEVER(grid)].transitions).toEqual([
      { from: "left", to: "right", at: vaultRegion },
      { from: "right", to: "left", at: home },
    ])
  })

  it("throws the lever right from anywhere when its move stands at home", () => {
    const grid = leverFloor()
    expect(visited(grid, floorLock(grid)!)).toEqual([
      "home left",
      "home right",
      "pocket door right",
      "pocket right",
      "vault door left",
      "vault left",
    ])
  })

  it("throws the lever right only from inside the vault when that is where the move is placed", () => {
    const grid = leverFloor()
    const placed = withRemoteMove(grid, { to: "right", at: roomBeyondDoorOf(grid, "vault") })
    // Right is reached with the player standing in the vault, and never at the lever: the way back out
    // is the vault's own door, which only the left side opens.
    expect(visited(grid, floorLock(placed)!)).toEqual(["home left", "vault door left", "vault left", "vault right"])
  })

  it("never throws the lever right when the move is placed where only right opens the way", () => {
    const grid = leverFloor()
    const placed = withRemoteMove(grid, { to: "right", at: roomBeyondDoorOf(grid, "pocket") })
    expect(visited(grid, floorLock(placed)!)).toEqual(["home left", "vault door left", "vault left"])
  })

  it("refuses a place that is no ground the walk can stand on", () => {
    const grid = leverFloor()
    const r = grid.cells.findIndex(row => row.some(cell => cell.type === "empty"))
    const c = grid.cells[r].findIndex(cell => cell.type === "empty")
    expect(() => floorLock(withRemoteMove(grid, { to: "right", at: [r, c] }))).toThrow(
      /no ground the walk can stand on/
    )
  })

  it("refuses a cell pointing at a transition the record places somewhere else", () => {
    const grid = leverFloor()
    const [r, c] = roomBeyondDoorOf(grid, "vault")
    const placed = withRemoteMove(grid, { to: "right", at: [r, c] })
    const cells = placed.cells.map((row, ri) =>
      row.map((cell, ci) =>
        cell.type === "room" && ri === r && ci === c
          ? { ...cell, worksMechanism: { mechanismId: "lever", transition: 5 } }
          : cell
      )
    )
    expect(() => floorLock({ ...placed, cells })).toThrow(/does not place there/)
  })
})

describe("a cell that works a mechanism standing elsewhere", () => {
  it("knows which mechanism it works and which transition", () => {
    const grid = leverFloor()
    const home = leverAt(grid)
    const remote = roomBeyondDoorOf(grid, "vault")
    const placed = withRemoteMove(grid, { to: "right", at: remote })
    const record = (placed.cells[home[0]][home[1]] as { mechanism: unknown }).mechanism

    expect(mechanismWorkedAt(placed, remote[0], remote[1])).toEqual({ home, record, transition: 0 })
    expect(mechanismWorkedAt(placed, home[0], home[1])).toEqual({ home, record })
  })

  it("files its state under its home's address and no address of its own", () => {
    const grid = leverFloor()
    const home = leverAt(grid)
    const remote = roomBeyondDoorOf(grid, "vault")
    const placed = withRemoteMove(grid, { to: "right", at: remote })

    expect(cellAddress(placed, 0, remote[0], remote[1])).not.toBe(cellAddress(placed, 0, home[0], home[1]))
    expect(mechanismAddress(placed, 0, remote[0], remote[1])).toBe(cellAddress(placed, 0, home[0], home[1]))
  })
})
