import { describe, expect, it } from "vitest"
import {
  firstCarved,
  plainFloor,
  prepOf,
  basicConfig,
  isPuzzleRoom,
  isTreasureRoom,
  isStairheadRoom,
  findRoom,
} from "./carveFixtures"
import { forkPositions, keyOf, routeStepOf } from "./derive"
import { assembleFloor } from "./assembleFloor"
import type { FloorConfig, RoomCell } from "../siteTypes"
describe("mainRooms", () => {
  const carvedWith = (exitOrStaircase: "exit" | "staircase") => {
    const prep = prepOf(
      plainFloor({
        pathPuzzles: 2,
        exitOrStaircase,
        sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      })
    )
    const state = firstCarved(prep)
    return {
      state,
      rooms: state.mainRooms!,
      at: (step: number) => state.mainRooms!.get(keyOf(state.maze!.mainPath[step])),
    }
  }

  it("opens on a portal, numbers the puzzles in path order, and ends on the goal chest", () => {
    const { state, at } = carvedWith("exit")
    const { placed, goal } = state.content!
    expect(at(0)).toEqual({ roomType: "portal" })
    expect(placed.slice(0, -1).map(step => at(step)?.pathIndex)).toEqual([0, 1])
    expect(at(goal)?.family).toBe("treasure-chest")
  })

  it("numbers a room among the rooms of its own family on the chain", () => {
    const state = firstCarved(
      prepOf(plainFloor({ pathPuzzles: 4, encounter: "tableau", encountersByIndex: { 1: "sumplete" } }))
    )
    const rooms = state.content!.placed.slice(0, 4).map(step => state.mainRooms!.get(keyOf(state.maze!.mainPath[step])))
    expect(rooms.map(room => [room?.family, room?.familyOrdinal])).toEqual([
      ["tableau", 0],
      ["sumplete", 0],
      ["tableau", 1],
      ["tableau", 2],
    ])
  })

  it("makes the exit a plain portal, or a stairhead where the floor goes down", () => {
    const exit = (exitOrStaircase: "exit" | "staircase") => {
      const { state, rooms } = carvedWith(exitOrStaircase)
      return rooms.get(keyOf(state.maze!.exit))
    }
    expect(exit("exit")).toEqual({ roomType: "portal" })
    expect(exit("staircase")?.stairId).toBeDefined()
  })

  it("makes every cell a branch hangs from a fork, unless a main-path room already stands there", () => {
    const { state, rooms } = carvedWith("exit")
    const stepOf = routeStepOf(state.maze!)
    const roomed = new Set([0, ...state.content!.placed])
    const junctions = [...forkPositions(state as Required<typeof state>)]
    expect(junctions.length).toBeGreaterThan(0)
    for (const key of junctions) expect(rooms.get(key)?.roomType === "fork").toBe(!roomed.has(stepOf.get(key) ?? -1))
  })
})

describe("carved through assembleFloor", () => {
  /**
   * The skin follows the room, not the floor it happens to sit on.
   *
   * A skin is stamped on every puzzle room it was authored for, main path and side path alike, so the family
   * rendering that room can read it without knowing anything about world-gen. Rooms of a site that authored
   * no skin carry none, and every family then draws its default.
   */
  it("stamps each puzzle room with the skin its own path authored", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      pathPuzzles: 2,
      theme: "night",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", theme: "day" }],
    }
    const result = assembleFloor("site-1", config, 42)
    if (!result.success) throw new Error("assembly failed")
    const rooms = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && isPuzzleRoom(c))
    expect(rooms.filter(r => r.theme === "night")).toHaveLength(2)
    expect(rooms.filter(r => r.theme === "day")).toHaveLength(1)
  })

  it("leaves rooms of an unthemed site carrying no skin at all", () => {
    const result = assembleFloor("site-1", { ...basicConfig(), pathPuzzles: 2 }, 42)
    if (!result.success) throw new Error("assembly failed")
    const rooms = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && isPuzzleRoom(c))
    expect(rooms.every(r => r.theme === undefined)).toBe(true)
  })

  /**
   * The tier follows the room too. A floor is authored as a mix — a gentle pocket, a ward section
   * pitched above the rest — and the board a player meets is the one its OWN section asked for,
   * not the floor's average.
   */
  it("stamps each puzzle room with the difficulty its own path authored", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      pathPuzzles: 2,
      difficulty: "wizard",
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 1, difficulty: "master", end: "treasure" }],
        },
      ],
    }
    const result = assembleFloor("site-1", config, 42)
    if (!result.success) throw new Error("assembly failed")
    const rooms = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && isPuzzleRoom(c))
    expect(rooms.map(r => r.difficulty).sort()).toEqual(["master", "starter", "wizard", "wizard"])
  })

  it("draws a room whose node names another difficulty in its section's tileset", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      pathPuzzles: 2,
      difficulty: "starter",
      difficultiesByIndex: { 1: "junior" },
    }
    const result = assembleFloor("site-1", config, 42)
    if (!result.success) throw new Error("assembly failed")
    const rooms = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && isPuzzleRoom(c))
    const named = rooms.find(r => r.pathIndex === 1)
    expect(named).toMatchObject({ difficulty: "junior", tileset: "starter" })
    expect(rooms.find(r => r.pathIndex === 0)?.tileset).toBeUndefined()
  })

  it("draws a room whose node names another difficulty in the floor's tileset when the floor names one", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      pathPuzzles: 2,
      difficulty: "starter",
      tileset: "cave",
      difficultiesByIndex: { 1: "junior" },
    }
    const result = assembleFloor("site-1", config, 42)
    if (!result.success) throw new Error("assembly failed")
    expect(result.grid.tileset).toBe("cave")
    const rooms = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && isPuzzleRoom(c))
    expect(rooms.find(r => r.pathIndex === 1)).toMatchObject({ difficulty: "junior", tileset: "cave" })
  })

  it("stamps a section's own tileset on its cells and leaves the others to the floor", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      pathPuzzles: 1,
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", tileset: "cave", end: "treasure" }],
    }
    const result = assembleFloor("site-1", config, 42)
    if (!result.success) throw new Error("assembly failed")
    expect(result.grid.tileset).toBeUndefined()
    const tilesets = result.grid.cells.flat().flatMap(c => (c.type === "empty" || !c.tileset ? [] : [c.tileset]))
    expect(tilesets.length).toBeGreaterThan(0)
    expect(new Set(tilesets)).toEqual(new Set(["cave"]))
  })

  it("resolves a main-path puzzle room's own key requirement via the injected resolver, tagged with its path index and the floor's encounterArgs", () => {
    const config: FloorConfig = { ...basicConfig(), pathPuzzles: 2, encounter: "tableau", encounterArgs: { runNr: 7 } }
    const result = assembleFloor("starter_treasure_tomb:2", config, 42, undefined, {
      resolveKeyRequirements: (familyId, ctx) =>
        familyId === "tableau"
          ? [`hieroglyph:${ctx.journeyId}:${ctx.floorIndex}:${ctx.pathIndex}:${JSON.stringify(ctx.encounterArgs)}`]
          : undefined,
      floorRef: { journeyId: "starter_treasure_tomb", floorIndex: 2 },
    })
    if (!result.success) throw new Error("assembly failed")
    const puzzleRooms = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && isPuzzleRoom(c))
    expect(puzzleRooms).toHaveLength(2)
    const pathIndices = puzzleRooms.map(c => c.pathIndex).sort()
    expect(pathIndices).toEqual([0, 1])
    for (const room of puzzleRooms) {
      expect(room.requiredKeyIds).toEqual([
        `hieroglyph:starter_treasure_tomb:2:${room.pathIndex}:${JSON.stringify({ runNr: 7 })}`,
      ])
    }
  })

  it("goal room grants nothing, not a free mosaicPiece, when mainEndReward is unset", () => {
    // Regression guard: an unset mainEndReward used to fall back to `{type:"mosaicPiece"}` —
    // a free, uncounted reward validate.ts's 298-budget guard can never see (it only reads
    // stored config, never this runtime fallback).
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const goal = findRoom(result.grid, isTreasureRoom)
    expect(goal?.cell.reward).toBeUndefined()
  })

  it("carries stairId through to a stairhead room, and populates grid.staircases from it", () => {
    // Regression guard: RoomSpec→RoomCell conversion listed every field except stairId,
    // so grid.staircases was always empty — masked because every existing wing/path setup
    // has at most one wing, so the client's "assume next floor" fallback happened to agree.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: { stairId: "test:main" },
      sideSections: [],
    }
    const result = assembleFloor("stair-site", config, 0)
    if (!result.success) throw new Error("assembly failed")
    const stairhead = findRoom(result.grid, isStairheadRoom)
    expect(stairhead?.cell.stairId).toBe("test:main")
    expect(result.grid.staircases["test:main"]).toEqual([stairhead!.r, stairhead!.c])
  })

  it("exitOrStaircase: staircase produces a stairhead on the main path", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "staircase",
      sideSections: [],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const [exR, exC] = result.grid.exitPos
      const exitCell = result.grid.cells[exR][exC]
      expect(exitCell.type).toBe("room")
      if (exitCell.type === "room") expect(exitCell.stairId).toBeDefined()
    }
  })
})
