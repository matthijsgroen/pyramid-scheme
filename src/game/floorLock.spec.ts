import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { walkLock } from "./lockWalk"
import { floorLock } from "./floorLock"

const plainFloor = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
})

// A floor that must carve one junction with two ways out free to close, and stands a puzzle in it.
const switchFloor = (): FloorConfig => ({
  ...plainFloor(),
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "sumplete", min: 1, max: 1 },
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
  ],
})

// Whether a finished room is walked back into is the family registry's answer, and core assembles
// without the registry — a switch is refused outright unless its family offers the walk back, so the
// stub grants it. (The same stub `src/worldGen/switchAuthoring.spec.ts` uses, for the same reason.)
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const standsASwitch = (grid: FloorGrid): boolean =>
  grid.cells.flat().some(cell => cell.type === "room" && (cell.exits ?? []).some(exit => exit.gateKeyId !== undefined))

// Which junction a carve offers is the seed's choice, so seeds are tried until one carves what the
// test needs — and running out is a throw, never a silent skip.
const assembled = (config: FloorConfig, wants: (grid: FloorGrid) => boolean = () => true): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config, seed, reEnterableFamilies, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success && wants(result.grid)) return result.grid
  }
  throw new Error("no seed carved the floor this spec needs")
}

describe("floorLock", () => {
  it("has nothing to say about a floor with no switch on it", () => {
    expect(floorLock(assembled(plainFloor()))).toBeUndefined()
  })

  it("names one mechanism per switch: unset until solved, then a state per way out", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes("unset"))!
    expect(board.states.length).toBeGreaterThanOrEqual(3)
    expect(board.opens.unset).toEqual([])
    for (const state of board.states.filter(s => s !== "unset")) expect(board.opens[state].length).toBeGreaterThan(0)
    // Re-solvable from every state into every other, which is what lets a player change their mind.
    expect(board.transitions).toHaveLength(board.states.length * (board.states.length - 1))
  })

  it("declares every region it then refers to", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    expect(lock.regions).toContain(lock.in)
    expect(lock.regions).toContain(lock.out)
    for (const gate of Object.values(lock.gates)) {
      expect(lock.regions).toContain(gate.from)
      expect(lock.regions).toContain(gate.to)
    }
  })

  it("stands the switch in the region its doors lead out of, so the opener comes before the blocker", () => {
    const lock = floorLock(assembled(switchFloor(), standsASwitch))!
    const board = Object.values(lock.mechanisms).find(mechanism => mechanism.states.includes("unset"))!
    const at = new Set(board.transitions.map(transition => transition.at))
    expect(at.size).toBe(1)
    const [fork] = [...at]
    // Each way out it shuts is one door, and a door is a region joined to the fork it leads out of and
    // to whatever lies beyond it. So every state opens the gates of exactly one door, and one of them
    // starts in the fork the player is standing in.
    for (const state of board.states.filter(s => s !== "unset")) {
      expect(new Set(board.opens[state].map(gateId => lock.gates[gateId].to)).size).toBe(1)
      expect(board.opens[state].some(gateId => lock.gates[gateId].from === fork)).toBe(true)
    }
  })

  it("hands the walk a lock that reads", () => {
    const result = walkLock(floorLock(assembled(switchFloor(), standsASwitch))!)
    expect(result.sound || result.failure.type !== "malformed").toBe(true)
  })
})
