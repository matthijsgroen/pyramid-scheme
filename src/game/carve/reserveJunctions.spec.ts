import { describe, expect, it, beforeAll } from "vitest"
import { carveFloor } from "./carveFloor"
import {
  firstCarved,
  plainFloor,
  prepOf,
  DIR_MOVE,
  findRoom,
  FLOOR_REF,
  SWITCH_KEY,
  ONE_SWITCH,
  reEnterableFamilies,
  assembleAt,
  switchConfig,
  assembleWithSwitch,
} from "./carveFixtures"
import { freeWaysOut, rooms } from "./derive"
import { PASSES, finishAttempt } from "./passes"
import { assembleFloor } from "./assembleFloor"
import { reachableFrom, validateSite } from "../siteValidator"
import { cellSlot } from "../cellSlot"
import { freeRegions } from "../lockAuthoring"
import { parseLock } from "../lockNotation"
import type { FloorConfig, Direction, FloorGrid, RoomCell } from "../siteTypes"
describe("reserveJunctions", () => {
  it("reserves a fork room with as many free ways out as the demand asks", () => {
    const state = firstCarved(
      prepOf(
        plainFloor({
          pathPuzzles: 2,
          sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
          forks: [{ exits: 2, count: 1 }],
        })
      )
    )
    const full = state as Required<typeof state>
    const { reserved, switchesPlaced } = state.forks!
    expect(reserved).toHaveLength(1)
    expect(rooms(full).get(reserved[0])?.roomType).toBe("fork")
    expect(freeWaysOut(full)(reserved[0]).length).toBeGreaterThanOrEqual(2)
    expect(switchesPlaced).toBe(0)
  })

  it("names the demand no junction answers, where the only branch is a ward's", () => {
    const config: FloorConfig = plainFloor({
      difficulty: "junior",
      sideSections: [
        { pathPuzzles: 0, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "ward:k" } },
      ],
      forks: [{ exits: 2, count: 1 }],
    })
    const result = carveFloor(prepOf(config, 3), PASSES, finishAttempt)
    expect(result.success === false && result.reasons).toContainEqual({
      type: "forksUnsatisfied",
      exits: 2,
      count: 1,
      carved: 0,
    })
  })
})

describe("a switch fork", () => {
  it("is both a fork and its encounter", () => {
    const { cell } = assembleWithSwitch(ONE_SWITCH)
    expect(cell.roomType).toBe("fork")
    expect(cell.family).toBe("sumplete")
    expect(cell.tags).toContain("puzzle")
  })

  it("keeps the exits the puzzle standing in it has to choose between", () => {
    const { cell } = assembleWithSwitch(ONE_SWITCH)
    expect(cell.exits?.length).toBe(cell.dirs.size)
    expect(cell.exits?.length).toBeGreaterThan(1)
  })

  it("wears the floor's own tier, skin and role, like any other encounter room", () => {
    const { cell } = assembleWithSwitch(ONE_SWITCH)
    expect(cell.difficulty).toBe("junior")
    expect(cell.theme).toBe("dusk")
    expect(cell.role).toBe("puzzle")
  })

  it("is the only fork that gains one", () => {
    const { grid } = assembleWithSwitch(ONE_SWITCH)
    const switches = grid.cells
      .flat()
      .filter(cell => cell.type === "room" && cell.roomType === "fork" && cell.family !== undefined)
    expect(switches.length).toBe(1)
  })

  it("leaves every fork bare on a floor that authors none", () => {
    const { grid } = assembleWithSwitch()
    const withFamily = grid.cells
      .flat()
      .filter(cell => cell.type === "room" && cell.roomType === "fork" && cell.family !== undefined)
    expect(withFamily).toEqual([])
  })

  it("never takes a junction that already holds a main-path room", () => {
    let compared = 0
    for (let seed = 0; seed < 30; seed++) {
      const authored = assembleAt(`site-switch-steal-${seed}`, switchConfig(ONE_SWITCH), seed)
      const bare = assembleAt(`site-switch-steal-${seed}`, switchConfig(), seed)
      if (!authored.success || !bare.success) continue
      compared++
      // Every room the bare floor holds is still there on the authored one: a switch is written onto a
      // junction that was nothing else, never over the entrance, a puzzle or the goal chest. Its own
      // gates are what it adds, so they sit out.
      const rooms = (grid: FloorGrid) =>
        grid.cells
          .flat()
          .flatMap(cell =>
            cell.type === "room" && cell.roomType !== "fork" && cell.gateVariant === undefined
              ? [cell.family ?? cell.roomType]
              : []
          )
          .sort()
      expect(rooms(authored.grid)).toEqual(rooms(bare.grid))
    }
    // A loop that skipped every seed would pass having compared nothing.
    expect(compared).toBeGreaterThan(0)
  })

  // Half-finished puzzle state is filed under the room's address and its board index. The address is
  // carve-independent because a switch has a slot, so the board must be too — otherwise the player
  // comes back to a different puzzle on the room they left.
  it("deals itself the same board wherever the next carve puts it", () => {
    const config = switchConfig(ONE_SWITCH)
    const at = (seed: number) => {
      const result = assembleAt("site-switch-board", config, seed)
      if (!result.success) return null
      return findRoom(result.grid, cell => cell.roomType === "fork" && cell.family !== undefined)
    }
    const first = at(7)
    const second = at(8)
    if (!first || !second) throw new Error("both seeds must carve a switch")

    expect(first.cell.boardIndex).toBeDefined()
    expect(second.cell.boardIndex).toBe(first.cell.boardIndex)
    // And the junction really did move, or the board was never asked to stand still.
    expect([second.r, second.c]).not.toEqual([first.r, first.c])
  })

  it("serves the board the world deals its mechanism, where a dealer is given", () => {
    const result = assembleFloor("site-switch-dealt", switchConfig(ONE_SWITCH), 7, reEnterableFamilies, {
      floorRef: FLOOR_REF,
      resolveBoardIndex: (_familyId, address) => (address.section === "mechanism:switch:0" ? 41 : undefined),
    })
    if (!result.success) throw new Error("seed 7 must carve a switch")
    const room = findRoom(result.grid, cell => cell.roomType === "fork" && cell.family !== undefined)
    expect(room?.cell.boardIndex).toBe(41)
  })

  // Walks the grid the way a player without a single key does: through open cells, never into a gate.
  const reachesWithoutGates = (grid: FloorGrid, from: readonly [number, number], to: readonly [number, number]) => {
    const seen = new Set([`${from[0]},${from[1]}`])
    const queue: [number, number][] = [[from[0], from[1]]]
    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      if (r === to[0] && c === to[1]) return true
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty") continue
      if (cell.type === "room" && cell.requiredKeyId !== undefined) continue
      for (const dir of cell.dirs) {
        const [dr, dc] = DIR_MOVE[dir]
        if (seen.has(`${r + dr},${c + dc}`)) continue
        seen.add(`${r + dr},${c + dc}`)
        queue.push([r + dr, c + dc])
      }
    }
    return false
  }

  // What the builder closed, and what it reported closing, have to be the same set — whatever stands
  // in the switch reads the exits and would otherwise mint keys for doors that are not there.
  const gatedExitsOf = (grid: FloorGrid, at: { r: number; c: number; cell: RoomCell }) =>
    (at.cell.exits ?? [])
      .filter(exit => exit.gateKeyId !== undefined)
      .map(exit => {
        const [dr, dc] = DIR_MOVE[exit.dir]
        const beyond = grid.cells[at.r + dr * 2]?.[at.c + dc * 2]
        return { exit, beyond }
      })

  // A floor with ward-gated branches and enough of them to put two junctions side by side, so the
  // ways out a switch may not close turn up at all.
  const wardedSwitchConfig = (): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "junior",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
      { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
      { pathPuzzles: 0, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "ward:a" } },
      { pathPuzzles: 0, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "ward:b" } },
    ],
    forks: [{ exits: 2, count: 1 }],
    switches: ONE_SWITCH,
  })

  it("closes at least two of its ways out, on keys the author's own stem names", () => {
    const { grid } = assembleWithSwitch(ONE_SWITCH)
    const at = findRoom(grid, cell => cell.roomType === "fork" && cell.family !== undefined)
    if (!at) throw new Error("no switch was carved")
    const gated = gatedExitsOf(grid, at)

    expect(gated.length).toBeGreaterThanOrEqual(2)
    for (const { exit, beyond } of gated) {
      expect(beyond?.type).toBe("room")
      expect(beyond?.type === "room" && beyond.gateVariant).toBe("floor-key")
      // Named for the path it stands at, which is what the save names a room by too.
      expect(beyond?.type === "room" && beyond.requiredKeyId).toBe(
        beyond?.type === "room" ? `${SWITCH_KEY}:${beyond.sectionAddress}` : undefined
      )
      expect(exit.gateKeyId).toBe(beyond?.type === "room" ? beyond.requiredKeyId : undefined)
      // The key comes from whatever stands in the switch, so the floor grows no chest holding it.
      expect(beyond?.type === "room" && beyond.keyIsAuthored).toBe(true)
    }
    // The opener comes before the blockers: the way BACK is never one of the ways it closed, so the
    // player reaches the switch without needing a key the switch itself hands out.
    expect(reachesWithoutGates(grid, grid.entrancePos, [at.r, at.c])).toBe(true)
  })

  describe("the gate a switch closes", () => {
    // One assembled floor for all three, because the carve is the cost here and none of them change
    // it: the first seed that produces a switch, and at most the sixty `assembleWithSwitch` tries.
    let grid: FloorGrid
    let gates: { pos: readonly [number, number]; keyId: string }[]
    beforeAll(() => {
      const found = assembleWithSwitch(ONE_SWITCH)
      grid = found.grid
      gates = (found.cell.exits ?? []).flatMap(exit => {
        if (exit.gateKeyId === undefined) return []
        const [dr, dc] = DIR_MOVE[exit.dir]
        return [{ pos: [found.r + dr * 2, found.c + dc * 2] as const, keyId: exit.gateKeyId }]
      })
      // Every assertion below is per gate, so a switch that closed nothing would prove nothing.
      if (gates.length < 2) throw new Error(`a switch closed ${gates.length} ways out`)
    })

    it("holds nothing to enter, and is a gate by its tags alone", () => {
      for (const { pos } of gates) {
        const cell = grid.cells[pos[0]][pos[1]]
        expect(cell.type === "room" && cell.family).toBeUndefined()
        expect(cell.type === "room" && cell.tags).toEqual(["gate"])
      }
    })

    it("shuts the walk until the key the switch mints is held", () => {
      for (const { pos, keyId } of gates) {
        const at = `${pos[0]},${pos[1]}`
        expect(reachableFrom(grid, grid.entrancePos).has(at)).toBe(false)
        expect(reachableFrom(grid, grid.entrancePos, new Set([keyId])).has(at)).toBe(true)
      }
    })
  })

  // THE KEY MUST NOT CARRY THE CARVE. The one a player is holding outlives the layout it was minted
  // on, so if its id named the compass, a re-carve that swung a branch to another quarter would stand
  // the new door in that quarter open for free. Proven by finding the same id on two different
  // compass points, which is exactly what a compass-named id can never do.
  it("names a gate for the path it stands at, so the same key never follows the compass", () => {
    const dirsPerKeyId = new Map<string, Set<Direction>>()
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleAt("site-switch-stable", switchConfig(ONE_SWITCH), seed)
      if (!result.success) continue
      const at = findRoom(result.grid, cell => cell.roomType === "fork" && cell.family !== undefined)
      for (const exit of at?.cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const dirs = dirsPerKeyId.get(exit.gateKeyId) ?? new Set<Direction>()
        dirs.add(exit.dir)
        dirsPerKeyId.set(exit.gateKeyId, dirs)
      }
    }

    expect(dirsPerKeyId.size).toBeGreaterThan(0)
    expect([...dirsPerKeyId.values()].some(dirs => dirs.size > 1)).toBe(true)
  })

  // A ward's door already owns that boundary and a second door on it reads as two doors; a gate
  // between two junctions draws a wall through the middle of one open space.
  it("leaves the ways out something else already owns alone", () => {
    const seen = { ward: 0, fork: 0 }
    for (let seed = 0; seed < 120; seed++) {
      const result = assembleAt(`site-switch-owned-`, wardedSwitchConfig(), seed)
      if (!result.success) continue
      const at = findRoom(result.grid, cell => cell.roomType === "fork" && cell.family !== undefined)
      if (!at) continue
      for (const exit of at.cell.exits ?? []) {
        if (exit.kind !== "ward" && exit.kind !== "fork") continue
        seen[exit.kind]++
        expect(exit.gateKeyId).toBeUndefined()
      }
    }
    // Both kinds have to actually occur, or the case was never put to the test.
    expect(seen.ward).toBeGreaterThan(0)
    expect(seen.fork).toBeGreaterThan(0)
  })

  it("refuses a floor where no junction has two ways out left to close", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      // The one branch off the main path is a ward's, so the only junction owns one way out it could
      // close — the main path onward — and a switch that decides nothing is an authoring mistake.
      sideSections: [
        { pathPuzzles: 0, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "ward:k" } },
      ],
      forks: [{ exits: 2, count: 1 }],
      switches: ONE_SWITCH,
    }
    const result = assembleAt("site-switch-alone", config, 3)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toContainEqual({
      type: "forksUnsatisfied",
      exits: 2,
      count: 1,
      carved: 0,
    })
  })

  it("holds a junction on a floor a lock is laid on, its switch choosing between two of the ungated paths", () => {
    const chest = { pathPuzzles: 1, difficulty: "junior" as const, end: "treasure" as const }
    const config: FloorConfig = {
      ...switchConfig(ONE_SWITCH),
      sideSections: [chest, chest, chest, chest],
      realisations: { toggle: "handle" },
      locks: [{ lock: freeRegions(parseLock("in -- hall\nhall -[G]- out\nG toggle @in", "laidLesson").lock) }],
    }
    const results = [1, 2, 3].map(seed => assembleAt(`site-switch-laid-${seed}`, config, seed))

    expect(results.map(result => result.success)).toEqual([true, true, true])
    for (const result of results) {
      if (!result.success) continue
      const at = findRoom(result.grid, cell => cell.roomType === "fork" && cell.family === "sumplete")
      expect(at?.cell.exits?.filter(exit => exit.gateKeyId !== undefined)).toHaveLength(2)
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })

  // Two rooms of one section answering to the same name would share one save entry. A switch is named
  // for the mechanism, so realising it as a chest does not make it answer to its section's chest.
  it("assembles a floor whose switch is realised by a chest, the two rooms answering to different slots", () => {
    const result = assembleAt("site-switch-board", switchConfig({ encounter: "treasure-chest", min: 1, max: 1 }), 7)

    expect(result.success).toBe(true)
    if (!result.success) return
    const slotsOf = (match: (cell: RoomCell) => boolean) =>
      result.grid.cells.flatMap((row, r) =>
        row.flatMap((cell, c) => (cell.type === "room" && match(cell) ? [cellSlot(result.grid, r, c)] : []))
      )
    expect(slotsOf(cell => cell.roomType === "fork" && cell.mechanismId !== undefined)).toEqual(["xmech:switch:0"])
    expect(slotsOf(cell => cell.roomType !== "fork" && cell.family === "treasure-chest")).toContain("xtreasure-chest")
  })

  // A gate the player can see says something is there; a hidden section says nothing is, until they
  // find otherwise. So the two may never meet, and the way this is proven is by the switch standing on a
  // floor that HAS a hidden branch and closing some other way out instead.
  it("never closes a way out into a hidden branch", () => {
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      // Two visible branches for the switch to choose among, and one hidden one it must leave alone.
      sideSections: [
        { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
      ],
      forks: [{ exits: 2, count: 1 }],
      switches: ONE_SWITCH,
    }
    let carved = 0
    for (let seed = 0; seed < 40; seed++) {
      const result = assembleAt(`site-switch-hidden-`, config, seed)
      if (!result.success) continue
      const at = findRoom(result.grid, cell => cell.roomType === "fork" && cell.family !== undefined)
      if (!at) continue
      carved++
      for (const exit of at.cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const [dr, dc] = DIR_MOVE[exit.dir]
        const beyond = result.grid.cells[at.r + dr * 2]?.[at.c + dc * 2]
        expect(beyond?.type !== "empty" && beyond?.hidden).toBeUndefined()
      }
    }
    // A loop that carved no switch would pass having looked at nothing.
    expect(carved).toBeGreaterThan(0)
  })
})
