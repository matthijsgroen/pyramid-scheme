import { beforeAll, describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter, encounterFromMeta } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import { MECHANISM_AT_REST } from "./siteTypes"
import type { Direction, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import type { StatefulControl } from "./obstacles"
import type { RegionGraph } from "./regions"
import { reachableFrom, validateSite } from "./siteValidator"
import { floorKeyRing } from "./floorKeys"
import { openDoorsFor } from "./mechanismDoors"
import { designerDoubleBack, forkSwitchFloorConfig as forkSwitched } from "./testSupport/forkSwitchFixtures"
import { cellAddress } from "./cellAddress"
import { cellSlot } from "./cellSlot"
import { floorLock } from "./floorLock"
import { walkLock } from "./lockWalk"
import { freeRegions } from "./lockAuthoring"
import { parseLock } from "./lockNotation"
// The real registry, for the one spec that has to prove the refusal against a family that
// genuinely lacks reEnterable rather than against the fallback resolver, which claims it for none.
import "@/mods/registerModApps"
import { resolveEncounter } from "@/app/families/familyRegistry"

const DIR_MOVE: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Pure structural BFS distance, ignoring exploration state — assembleFloor's output is a
// freshly-generated, unexplored grid, so findPath's real (state-aware) pathing has nothing
// to work with here; this measures the maze's actual graph shape instead.
const graphDistance = (grid: FloorGrid, from: readonly [number, number], to: readonly [number, number]): number => {
  const key = (r: number, c: number) => `${r},${c}`
  const visited = new Set([key(...from)])
  const queue: Array<[number, number, number]> = [[from[0], from[1], 0]]
  while (queue.length > 0) {
    const [r, c, d] = queue.shift()!
    if (r === to[0] && c === to[1]) return d
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue
    for (const dir of cell.dirs) {
      const [dr, dc] = DIR_MOVE[dir]
      const nr = r + dr,
        nc = c + dc
      if (visited.has(key(nr, nc))) continue
      visited.add(key(nr, nc))
      queue.push([nr, nc, d + 1])
    }
  }
  throw new Error(`no path from ${from} to ${to}`)
}

const basicConfig = (): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
})

const firstPyramid = (): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 1, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
  ],
})

// Classify an "encounter" room by its assigned family id.
const isPuzzleRoom = (c: RoomCell) =>
  c.roomType === "encounter" && ["sumplete", "tableau", "crocodile"].includes(c.family ?? "")
const isTrapRoom = (c: RoomCell) => c.roomType === "encounter" && c.family === "arithmetic-reflex"
const isTreasureRoom = (c: RoomCell) =>
  c.roomType === "encounter" && ["treasure-chest", "fez-shop"].includes(c.family ?? "")
const isGateRoom = (c: RoomCell) => c.roomType === "encounter" && !!c.tags?.includes("gate")
const isStairheadRoom = (c: RoomCell) => c.roomType === "portal" && !!c.stairId

const findRoom = (grid: FloorGrid, predicate: (cell: RoomCell) => boolean) => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && predicate(cell)) return { r, c, cell }
    }
  return null
}

describe(assembleFloor, () => {
  it("succeeds for a basic config with no sections", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    expect(result.success).toBe(true)
  })

  it("reports the attempt that carved the floor", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(result.attempt).toBe(0)
  })

  it("carves at the seed the floor was told, not the one it is handed", () => {
    const told = assembleFloor("site-1", { ...basicConfig(), seed: 7 }, 42)
    const direct = assembleFloor("site-1", basicConfig(), 7)
    const other = assembleFloor("site-1", { ...basicConfig(), seed: 7 }, 9999)
    if (!told.success || !direct.success || !other.success) throw new Error("assembly failed")
    expect(told.grid.cells).toEqual(direct.grid.cells)
    expect(other.grid.cells).toEqual(direct.grid.cells)
  })

  it("carves differently for a different told seed", () => {
    const grids = [1, 2, 3, 4, 5, 6].map(seed => {
      const result = assembleFloor("site-1", { ...basicConfig(), pathPuzzles: 3, seed }, 42)
      if (!result.success) throw new Error("assembly failed")
      return JSON.stringify(result.grid.cells)
    })
    expect(new Set(grids).size).toBeGreaterThan(1)
  })

  it("stops after maxAttempts", () => {
    const result = assembleFloor("site-1", basicConfig(), 42, undefined, { maxAttempts: 0 })
    expect(result.success).toBe(false)
  })

  it("produces a grid that passes validateSite", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(validateSite(result.grid)).toEqual({ valid: true })
  })

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

  it("resolves a side-section puzzle room's own key requirement via the injected resolver, using that section's own encounterArgs and its own room position", () => {
    const config: FloorConfig = {
      ...basicConfig(),
      sideSections: [
        {
          pathPuzzles: 2,
          difficulty: "starter",
          end: "treasure",
          encounter: "tableau",
          encounterArgs: { runNr: 3 },
        },
      ],
    }
    const result = assembleFloor("starter_treasure_tomb:2", config, 42, undefined, {
      resolveKeyRequirements: (familyId, ctx) =>
        familyId === "tableau" ? [`hieroglyph:${ctx.pathIndex}:${JSON.stringify(ctx.encounterArgs)}`] : undefined,
      floorRef: { journeyId: "starter_treasure_tomb", floorIndex: 2 },
    })
    if (!result.success) throw new Error("assembly failed")
    const puzzleRooms = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.family === "tableau")
    expect(puzzleRooms).toHaveLength(2)
    const keys = puzzleRooms.map(c => c.requiredKeyIds?.[0]).sort()
    expect(keys).toEqual([
      `hieroglyph:0:${JSON.stringify({ runNr: 3 })}`,
      `hieroglyph:1:${JSON.stringify({ runNr: 3 })}`,
    ])
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

  it("renders a shop section's stock array at its (chainless) end room", () => {
    // A shop is a pathPuzzles:0 section whose encounter resolves to fez-shop; its end node carries
    // the section's `rewards[]` as buyable stock.
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          encounter: "fez-shop",
          rewards: [{ type: "mosaicPiece" }, undefined],
        },
      ],
    }
    const result = assembleFloor("shop-site", config, 0)
    if (!result.success) throw new Error("assembly failed")
    const shops = result.grid.cells.flat().filter(c => c.type === "room" && c.family === "fez-shop") as RoomCell[]
    expect(shops).toHaveLength(1)
    expect(shops[0].stock).toEqual([{ type: "mosaicPiece" }, undefined])
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

  it("does not set stock on an ordinary (non-shop) end-of-path room", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const goal = findRoom(result.grid, isTreasureRoom)
    expect(goal?.cell.stock).toBeUndefined()
  })

  it("has an entrance node on the grid edge", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const [entR, entC] = result.grid.entrancePos
    const N = result.grid.rows
    const onEdge = entR === 0 || entR === N - 1 || entC === 0 || entC === N - 1
    expect(onEdge).toBe(true)
  })

  it("is deterministic: same seed produces same grid", () => {
    const a = assembleFloor("site-1", basicConfig(), 12345)
    const b = assembleFloor("site-1", basicConfig(), 12345)
    expect(a).toEqual(b)
  })

  it("packing scales the main path's actual walked length, not just the grid footprint", () => {
    // Regression guard: packing went through two wrong designs before this one — a first
    // cut that barely moved grid size (a fixed dominant term swamped it), then a fixed
    // grid-size formula that still didn't shorten the *visible* corridor, because
    // buildMaze always picked the spanning tree's true farthest node regardless of grid
    // size (the longest possible route, almost independent of how small the grid is).
    // The real fix targets path length directly, so this asserts the outcome that
    // actually matters: entrance-to-exit distance must grow with packing.
    const config = (packing: number): FloorConfig => ({
      pathPuzzles: 0,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      corridorStraightness: 0,
      packing,
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "staircase", gate: { type: "tomb-key", wardKeyId: "w" } },
        { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
      ],
    })
    const distanceFor = (packing: number) => {
      const result = assembleFloor("packing-test", config(packing), 7)
      if (!result.success) throw new Error("assembly failed")
      return graphDistance(result.grid, result.grid.entrancePos, result.grid.exitPos)
    }
    const tight = distanceFor(0.3)
    const normal = distanceFor(1)
    const spacious = distanceFor(2)
    expect(tight).toBeLessThan(normal)
    expect(normal).toBeLessThan(spacious)
  })

  it("the exit is always a dead-end — no corridor continues past it", () => {
    // Regression guard: the packing knob ends the main path at a mid-maze node, not the
    // maze's farthest leaf, so the exit cell could keep tree passages into adjacent used
    // side-section corridors — drawn as doors, making corridor read as continuing past an
    // exit that ends the visit when stepped on. The exit must have exactly one connection.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      packing: 1,
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "w" } },
        { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
      ],
    }
    for (let seed = 0; seed < 40; seed++) {
      const result = assembleFloor("exit-deadend", config, seed)
      if (!result.success) continue
      const [er, ec] = result.grid.exitPos
      const exit = result.grid.cells[er][ec]
      expect(exit.type).toBe("room")
      if (exit.type !== "room") continue
      expect(exit.dirs.size).toBe(1)
    }
  })

  it("packing's path-length target isn't inflated by heavy side-section content", () => {
    // Regression guard: the target was first derived from `minCells`, which folds in every
    // side-section's own cost — so a floor with two chunky gated sections got a much longer
    // main path than one with none, at the same packing, even though those sections branch
    // off the main path rather than extending it. Distances should land in the same
    // ballpark regardless of how much side-section content exists.
    const distanceFor = (sideSections: FloorConfig["sideSections"]) => {
      const config: FloorConfig = {
        pathPuzzles: 4,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        corridorStraightness: 0.65,
        packing: 0.3,
        sideSections,
      }
      const result = assembleFloor("packing-inflation-test", config, 7)
      if (!result.success) throw new Error("assembly failed")
      return graphDistance(result.grid, result.grid.entrancePos, result.grid.exitPos)
    }
    const bare = distanceFor([])
    const heavy = distanceFor([
      { pathPuzzles: 2, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "w" } },
      { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
    ])
    expect(heavy).toBeLessThan(bare * 1.5)
  })

  it("packing also scales a gated section's chain length, not just the main path", () => {
    // Regression guard: packing/corridorStraightness originally only reached buildMaze's
    // main-path selection — a section's chain was always *exactly* pathPuzzles + gate + end
    // cells, deaf to both knobs no matter how spacious or winding the rest of the floor got.
    const chainSizeFor = (packing: number) => {
      const config: FloorConfig = {
        pathPuzzles: 4,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        corridorStraightness: 0.65,
        packing,
        sideSections: [
          { pathPuzzles: 2, difficulty: "starter", end: "staircase", gate: { type: "tomb-key", wardKeyId: "w" } },
        ],
      }
      const result = assembleFloor("section-packing-test", config, 7)
      if (!result.success) throw new Error("assembly failed")
      const gate = findRoom(result.grid, c => c.gateVariant === "tomb-key")
      if (!gate) throw new Error("no gate room found")
      // Cells downstream of the gate, as a proxy for chain length — reuses graphDistance's
      // BFS shape but counts reachable cells instead of returning a single distance.
      const key = (r: number, c: number) => `${r},${c}`
      const seen = new Set([key(gate.r, gate.c)])
      const queue: Array<[number, number]> = [[gate.r, gate.c]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = result.grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE[dir]
          const nr = r + dr,
            nc = c + dc
          if (seen.has(key(nr, nc))) continue
          seen.add(key(nr, nc))
          queue.push([nr, nc])
        }
      }
      return seen.size
    }
    const tight = chainSizeFor(0.3)
    const spacious = chainSizeFor(2)
    expect(tight).toBeLessThan(spacious)
  })

  it("succeeds for the first pyramid config (0 main puzzles, 2 sections)", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, isStairheadRoom)).not.toBeNull()
      expect(findRoom(result.grid, isGateRoom)).not.toBeNull()
    }
  })

  it("key is reachable before the gate (validates keyBeforeGate)", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(validateSite(result.grid)).toEqual({ valid: true })
  })

  it("gated sections have no back-door — removing the gate room cuts off its whole chain", () => {
    // Reproduces a real bug: a leftover edge from buildMaze's whole-grid spanning tree
    // (see the "Gate isolation" comment in siteAssembler.ts) could connect a gated
    // section's interior straight back to the ungated backbone or another section,
    // letting a player reach gated content — even the exit — without ever passing
    // the gate. Sweep several seeds/configs; the gate room must be the section's only
    // entrance every time.
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      pathPuzzles: 3,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "staircase", gate: { type: "tomb-key", wardKeyId: "w" } },
        { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "floor-key" } }],
        },
      ],
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("gate-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const gates: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && cell.gateVariant) gates.push([r, c])
        }
      expect(gates.length).toBeGreaterThan(0)

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      for (const [gr, gc] of gates) {
        const withoutGate = reachableFrom(grid, grid.entrancePos, new Set([key(gr, gc)]))
        const onlyViaThisGate = [...fullyReachable].filter(k => !withoutGate.has(k))
        // More than just the gate cell itself must depend on it — a real chain behind it.
        expect(onlyViaThisGate.length).toBeGreaterThan(1)
      }
    }
  })

  it("a floor-key gated section's own authored endReward survives — never overwritten by a chain-internal relay key", () => {
    // Real bug found via reachability-aware fragment placement: when several floor-key
    // gated treasure-end sections share a floor, the chain-relay mechanism (each section's
    // end room grants the NEXT gate's key) picked chain[ci-1] as a host with zero regard for
    // whether that section already carried its own authored endReward — silently replacing
    // a real reward (e.g. a hieroglyph fragment) with a synthetic tombKey. Two free
    // (rewardless) gated sections plus one rewarded one, swept across seeds so the random
    // chain-shuffle can't dodge the bug by luck: the rewarded section's own reward must
    // always survive, regardless of where the shuffle places it in the chain.
    const config = (): FloorConfig => ({
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key", color: "blue" } },
        { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key", color: "red" } },
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          gate: { type: "floor-key", color: "green" },
          endReward: { type: "mapPiece", tombId: "starter_treasure_tomb" },
        },
      ],
    })

    let sawRewardedGate = false
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("chain-reward-safety", config(), seed)
      if (!result.success) continue
      const rewardedGateRoom = result.grid.cells
        .flat()
        .find((c): c is RoomCell => c.type === "room" && c.gateVariant === "floor-key" && c.keyColor === "green")
      if (!rewardedGateRoom) continue // this attempt's layout didn't place it reachably; skip
      sawRewardedGate = true
      const mapPieceRoom = result.grid.cells
        .flat()
        .find((c): c is RoomCell => c.type === "room" && c.reward?.type === "mapPiece")
      expect(mapPieceRoom).toBeDefined()
    }
    expect(sawRewardedGate).toBe(true) // otherwise this test never actually exercised the gate
  })

  it("sealed sections have no back-door either — removing the first room cuts off the whole chain", () => {
    // Same leftover-spanning-tree-edge risk as gated sections, but for an ungated one: without
    // isolation, a stray door could let a player step past what guards it and still reach the
    // section's reward. This is how a trap gets protected — world-gen writes `sealed` on any section
    // it gives a trap to (placeEncounters), because the assembler no longer reads encounters at all.
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      pathPuzzles: 3,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "treasure", hidden: true, encounter: "trap", sealed: true },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
      ],
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("trap-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const traps: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && isTrapRoom(cell)) traps.push([r, c])
        }
      if (traps.length === 0) continue

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      const [tr, tc] = traps[0]
      const withoutFirstTrap = reachableFrom(grid, grid.entrancePos, new Set([key(tr, tc)]))
      const onlyViaThisTrap = [...fullyReachable].filter(k => !withoutFirstTrap.has(k))
      expect(onlyViaThisTrap.length).toBeGreaterThan(1)
    }
  })

  it("a sealed side section has no back-door either — removing its puzzle room cuts off its whole chain", () => {
    // `sealed` opts an ordinary (visible, ungated) path into the same isolation gate/trapped
    // content already get, so a compact layout can't merge a shortcut around its puzzle room.
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      // 0 main-path puzzles, so a puzzle room in s0 below is one of the sealed section own rooms.
      pathPuzzles: 0,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "treasure", sealed: true },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
      ],
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("sealed-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const puzzles: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          // s0 is the sealed section. s1 carries a puzzle too, and an unsealed section is allowed
          // the back door this test exists to forbid, so blocking one of ITS rooms proves nothing.
          if (cell.type === "room" && isPuzzleRoom(cell) && cell.sectionAddress === "s0") puzzles.push([r, c])
        }
      if (puzzles.length === 0) continue

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      const [pr, pc] = puzzles[0]
      const withoutFirstPuzzle = reachableFrom(grid, grid.entrancePos, new Set([key(pr, pc)]))
      const onlyViaThisPuzzle = [...fullyReachable].filter(k => !withoutFirstPuzzle.has(k))
      expect(onlyViaThisPuzzle.length).toBeGreaterThan(1)
    }
  })

  it("a sealed main path has no back-door either — removing an early puzzle room cuts off the rest", () => {
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      pathPuzzles: 3,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
      sealed: true,
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("sealed-mainpath-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const puzzles: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && isPuzzleRoom(cell)) puzzles.push([r, c])
        }
      if (puzzles.length === 0) continue

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      const [pr, pc] = puzzles[0]
      const withoutFirstPuzzle = reachableFrom(grid, grid.entrancePos, new Set([key(pr, pc)]))
      const onlyViaThisPuzzle = [...fullyReachable].filter(k => !withoutFirstPuzzle.has(k))
      expect(onlyViaThisPuzzle.length).toBeGreaterThan(1)
    }
  })

  it("auto-injects an ungated section when all sections are gated with floor-key", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, isGateRoom)).not.toBeNull()
      expect(findRoom(result.grid, c => c.reward?.type === "tombKey")).not.toBeNull()
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })

  it("side-path puzzles are always sumplete, even when the floor's own puzzleFamily is tableau", () => {
    // Tableaus consume hieroglyph symbols the player may not have yet (found via a separate
    // minigame before entering) — side paths (e.g. a shop's) must stay reachable without them.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      encounter: "tableau",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    }
    const result = assembleFloor("site-1", config, 1)
    expect(result.success).toBe(true)
    if (result.success) {
      const mainPuzzle = findRoom(result.grid, c => isPuzzleRoom(c) && c.family === "tableau")
      expect(mainPuzzle).not.toBeNull()
      const sidePuzzle = findRoom(result.grid, c => isPuzzleRoom(c) && c.family === "sumplete")
      expect(sidePuzzle).not.toBeNull()
    }
  })

  it("a side section can explicitly opt into a non-default puzzle family", () => {
    // Not hardcoded to sumplete — a section that sets its own puzzleFamily is honored,
    // so a future puzzle family can be placed on a side path without new plumbing.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", encounter: "tableau" }],
    }
    const result = assembleFloor("site-1", config, 1)
    expect(result.success).toBe(true)
    if (result.success) {
      const sidePuzzle = findRoom(result.grid, c => isPuzzleRoom(c) && c.family === "tableau")
      expect(sidePuzzle).not.toBeNull()
    }
  })

  it("places exactly pathPuzzles puzzle rooms on the main path", () => {
    for (const pathPuzzles of [0, 1, 2, 3]) {
      const config: FloorConfig = {
        pathPuzzles,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
      }
      const result = assembleFloor("site-1", config, 42)
      expect(result.success, `pathPuzzles=${pathPuzzles} failed`).toBe(true)
      if (result.success) {
        const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && isPuzzleRoom(c))
        expect(puzzles.length, `pathPuzzles=${pathPuzzles} wrong count`).toBe(pathPuzzles)
      }
    }
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

  it("tomb-key gated section produces gate with gateVariant tomb-key and no floor key", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "test_ward" } },
      ],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const gate = findRoom(result.grid, isGateRoom)
      expect(gate).not.toBeNull()
      expect(gate!.cell.gateVariant).toBe("tomb-key")
      // tomb-key gates don't place a key on the floor
      expect(findRoom(result.grid, c => c.reward?.type === "tombKey")).toBeNull()
    }
  })

  it("rewards: attaches config.rewards[k] onto the k-th main-path puzzle room, in order", () => {
    const config: FloorConfig = {
      pathPuzzles: 4,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
      rewards: [undefined, { type: "money", amount: 5 }, undefined, { type: "consumable", consumable: "oil" }],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && isPuzzleRoom(c)) as RoomCell[]
      expect(puzzles).toHaveLength(4)
      const rewards = puzzles.map(p => p.reward?.type)
      expect(rewards).toContain("money")
      expect(rewards).toContain("consumable")
      expect(rewards.filter(r => r === undefined)).toHaveLength(2)
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })

  it("interleaves side-section forks with main-path puzzles instead of clustering them all after the last one", () => {
    // Before the fix, fork attachment was picked purely by which spot had the biggest open
    // pocket — reliably the unused corridor tail past the last main-path puzzle — so every
    // side section clustered there instead of spreading across the puzzle stretch.
    const config: FloorConfig = {
      pathPuzzles: 5,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
      ],
    }
    const seeds = 40
    let interleavedCount = 0
    for (let seed = 0; seed < seeds; seed++) {
      const result = assembleFloor(`site-${seed}`, config, seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (!result.success) continue
      const { grid } = result
      const distanceTo = (r: number, c: number) => graphDistance(grid, grid.entrancePos, [r, c])
      const puzzleDistances: number[] = []
      const branchDistances: number[] = []
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && isPuzzleRoom(cell)) puzzleDistances.push(distanceTo(r, c))
          // A branch point is any node with more than 2 connections — whether that's a
          // dedicated "fork" room, or a side section attached straight onto an existing
          // main-path room's own cell (which keeps that room's original roomType).
          if ((cell.type === "room" || cell.type === "corridor") && cell.dirs.size > 2) {
            branchDistances.push(distanceTo(r, c))
          }
        }
      }
      expect(puzzleDistances.length, `seed ${seed}`).toBe(5)
      const maxPuzzleDistance = Math.max(...puzzleDistances)
      if (branchDistances.some(d => d < maxPuzzleDistance)) interleavedCount++
    }
    // A strong majority, not literally every seed — maze shape can still legitimately leave
    // a seed with no good interleaved spot. Before the fix this was ~0/40.
    expect(interleavedCount).toBeGreaterThan(seeds * 0.7)
  })

  it("property: 100 seeds × basic config all pass validation", () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = assembleFloor(`site-${seed}`, basicConfig(), seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (result.success) {
        const v = validateSite(result.grid)
        expect(v.valid, `seed ${seed} failed validation: ${JSON.stringify(v)}`).toBe(true)
      }
    }
  })

  it("property: 50 seeds × first pyramid config all pass validation", () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = assembleFloor(`site-${seed}`, firstPyramid(), seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (result.success) {
        const v = validateSite(result.grid)
        expect(v.valid, `seed ${seed} failed validation: ${JSON.stringify(v)}`).toBe(true)
      }
    }
  })

  // An expert-shaped floor: a handful of main-path puzzles plus eight side sections, each of
  // which is carved at `paddedChainLength` (6× its content at the default packing). The grid
  // size used to be derived from the bare content count, so floors like this were sized for a
  // fraction of what the carve consumes and only assembled when the retry shuffle got lucky —
  // roughly 40% of seeds failed outright, and 17 real authored floors (expert_1's first pyramid
  // among them) fell on the wrong side of that coin flip at the one seed the runtime ever gives
  // them, rendering "Site layout unavailable." forever.
  const manySideSections = (): FloorConfig => ({
    pathPuzzles: 3,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: Array.from({ length: 8 }, () => ({
      pathPuzzles: 2,
      difficulty: "expert" as const,
      end: "treasure" as const,
    })),
  })

  it("property: 100 seeds × a side-section-heavy expert floor all pass validation", () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = assembleFloor(`site-${seed}`, manySideSections(), seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (result.success) {
        const v = validateSite(result.grid)
        expect(v.valid, `seed ${seed} failed validation: ${JSON.stringify(v)}`).toBe(true)
      }
    }
  }, 30_000)

  it("keeps the layout of floors that already assembled within the original attempt budget", () => {
    // The recovery re-size must stay invisible to any floor that never needed it. Interiors are
    // persistent places whose stored exploration is keyed to the layout (see the retry loop's
    // comment), so a change in grid size or entrance here means someone's saved progress moved.
    const basic = assembleFloor("site-1", basicConfig(), 42)
    const pyramid = assembleFloor("site-1", firstPyramid(), 7)
    if (!basic.success || !pyramid.success) throw new Error("assembly failed")
    expect([basic.grid.rows, basic.grid.cols, basic.grid.entrancePos, basic.grid.exitPos]).toEqual([
      7,
      7,
      [6, 6],
      [0, 0],
    ])
    expect([pyramid.grid.rows, pyramid.grid.cols, pyramid.grid.entrancePos, pyramid.grid.exitPos]).toEqual([
      7,
      7,
      [0, 0],
      [6, 4],
    ])
  })

  it("places every puzzle in a multi-puzzle sub-section at a distinct, valid room", () => {
    // Regression guard: sub-section content used to be indexed as `(contentStart + pi) * 2`
    // instead of `contentStart + pi` — harmless for a single-puzzle sub-section (index 0
    // either way) but wrong for any sub-section with more than one puzzle/chest, which had
    // zero test coverage before this. `packing: 0` keeps the chain at its bare minimum
    // length (no padding slack) so a too-large index reliably goes out of bounds instead of
    // landing on a padding cell that happens to still be in range.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      packing: 0,
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 3, difficulty: "junior", end: "treasure" }],
        },
      ],
    }
    const result = assembleFloor("sub-section-indexing-test", config, 42)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(validateSite(result.grid)).toEqual({ valid: true })
    const puzzleRooms = new Set<string>()
    for (let r = 0; r < result.grid.rows; r++)
      for (let c = 0; c < result.grid.cols; c++) {
        const cell = result.grid.cells[r][c]
        if (cell.type === "room" && isPuzzleRoom(cell)) puzzleRooms.add(`${r},${c}`)
      }
    // 1 main-path puzzle + 1 parent-section puzzle + 3 sub-section puzzles, all distinct.
    expect(puzzleRooms.size).toBe(5)
  })

  describe("multi-cell footprints", () => {
    it("assigns decorations from the section's authored pool, on the fork/endpoint's own room cell", () => {
      const config: FloorConfig = {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 0, difficulty: "starter", end: "treasure", decorations: ["sarcophagus"] },
          {
            pathPuzzles: 1,
            difficulty: "junior",
            end: "staircase",
            gate: { type: "floor-key" },
            decorations: ["statue"],
          },
        ],
      }
      let sawDecoration = false
      for (let seed = 0; seed < 30; seed++) {
        const result = assembleFloor(`site-${seed}`, config, seed)
        if (!result.success) continue
        const decorations = result.grid.cells
          .flat()
          .flatMap(cell => (cell.type === "room" ? [cell.decoration] : []))
          .filter(Boolean)
        if (decorations.length > 0) {
          sawDecoration = true
          for (const d of decorations) expect(["sarcophagus", "statue"]).toContain(d)
        }
      }
      expect(sawDecoration).toBe(true)
    })

    it("bundles some side sections onto a shared hub fork with a carved 4-way junction", () => {
      const config: FloorConfig = {
        pathPuzzles: 2,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 1, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
        ],
      }
      let sawHub = false
      for (let seed = 0; seed < 60; seed++) {
        const result = assembleFloor(`site-${seed}`, config, seed)
        if (!result.success) continue
        const v = validateSite(result.grid)
        expect(v.valid, `seed ${seed} failed validation: ${JSON.stringify(v)}`).toBe(true)
        if (result.grid.cells.flat().some(c => c.type === "room" && c.roomType === "fork" && c.dirs.size === 4)) {
          sawHub = true
        }
      }
      expect(sawHub).toBe(true)
    })
  })

  describe("trap rooms", () => {
    it("places trap rooms for a trapped section", () => {
      const config: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "expert",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 2, difficulty: "expert", end: "treasure", encounter: "trap" }],
      }
      const result = assembleFloor("site-trap", config, 42)
      expect(result.success).toBe(true)
      if (result.success) {
        const traps = result.grid.cells.flat().filter(c => c.type === "room" && isTrapRoom(c))
        const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && isPuzzleRoom(c))
        expect(traps.length).toBe(2)
        expect(puzzles.length).toBe(1) // only the main path puzzle
      }
    })

    it("does not place trap rooms for non-trapped sections", () => {
      const config: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 2, difficulty: "starter", end: "treasure" }],
      }
      const result = assembleFloor("site-notrap", config, 42)
      expect(result.success).toBe(true)
      if (result.success) {
        const traps = result.grid.cells.flat().filter(c => c.type === "room" && isTrapRoom(c))
        expect(traps.length).toBe(0)
      }
    })
  })

  describe("hidden sections", () => {
    it("never puts a floor key in a hidden section, whose cells are masked until they are found", () => {
      const keyGateBesideAHiddenPath: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 1, difficulty: "starter", end: "staircase", gate: { type: "floor-key" } },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
        ],
      }

      // Across seeds, because which free section hosts the key is the carve's choice: one seed
      // agreeing proves nothing about the one that picks the other candidate.
      for (let seed = 1; seed <= 25; seed++) {
        const result = assembleFloor("site-hidden-key", keyGateBesideAHiddenPath, seed)
        if (!result.success) continue
        const maskedKeyCells = result.grid.cells
          .flat()
          .filter(cell => "keyColor" in cell && cell.keyColor !== undefined && cell.hidden)
        expect(maskedKeyCells).toEqual([])
      }
    })

    it("includes hidden section cells in the grid, tagged hidden:true", () => {
      const withHidden: FloorConfig = {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
        ],
      }
      const withoutHidden: FloorConfig = {
        ...withHidden,
        sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      }
      const rWith = assembleFloor("site-h", withHidden, 99)
      const rWithout = assembleFloor("site-h", withoutHidden, 99)
      expect(rWith.success).toBe(true)
      expect(rWithout.success).toBe(true)
      if (rWith.success) {
        const allCells = rWith.grid.cells.flat()
        const hiddenCells = allCells.filter(c => (c.type === "room" || c.type === "corridor") && c.hidden)
        const visibleRooms = allCells.filter(c => c.type === "room" && !c.hidden)
        // Hidden section cells are present and tagged
        expect(hiddenCells.length).toBeGreaterThan(0)
        // Visible rooms are present (main path + visible side section)
        expect(visibleRooms.length).toBeGreaterThan(0)
        // No cell is both hidden and not hidden
        expect(allCells.filter(c => (c.type === "room" || c.type === "corridor") && c.hidden === false).length).toBe(0)
      }
    })

    it("hidden cells have no hidden:true on visible-section cells", () => {
      const config: FloorConfig = {
        pathPuzzles: 2,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
          { pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true },
        ],
      }
      const result = assembleFloor("site-htag", config, 55)
      expect(result.success).toBe(true)
      if (result.success) {
        const wronglyTagged = result.grid.cells.flat().filter(c => {
          if (c.type !== "room" && c.type !== "corridor") return false
          // All hidden:true cells must have a sectionHash (so we can identify them)
          return c.hidden && !c.sectionHash
        })
        expect(wronglyTagged.length).toBe(0)
      }
    })
  })
})

describe("section hashes across re-authored encounters", () => {
  // A save files its explored cells and found corridors under section hashes, so a hash that moves
  // costs the player that stretch of floor. Encounters are authored per pyramid and re-authored
  // often, and re-authoring one changes no walls — so it must change no hashes either.
  const SEED = 91
  const configWith = (encounter: string | undefined): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 1, difficulty: "expert", end: "treasure", encounter },
      { pathPuzzles: 1, difficulty: "expert", end: "treasure", hidden: true },
    ],
  })

  const hashesOf = (config: FloorConfig): string[] => {
    const result = assembleFloor("site-rehash", config, SEED)
    if (!result.success) throw new Error("assembly failed")
    return [
      ...new Set(
        result.grid.cells
          .flat()
          .filter(c => c.type === "room" || c.type === "corridor")
          .map(c => (c as RoomCell).sectionHash ?? "")
      ),
    ].sort()
  }

  const shapeOf = (config: FloorConfig): string => {
    const result = assembleFloor("site-rehash", config, SEED)
    if (!result.success) throw new Error("assembly failed")
    return JSON.stringify(
      result.grid.cells.map(row =>
        row.map(c => (c.type === "empty" ? "." : `${c.type[0]}${[...c.dirs].sort().join("")}`))
      )
    )
  }

  it("keeps a section's hash when its puzzle family is swapped for another", () => {
    expect(hashesOf(configWith("sumplete"))).toEqual(hashesOf(configWith(undefined)))
    // And the walls really are the same, so there was nothing for a save to lose.
    expect(shapeOf(configWith("sumplete"))).toBe(shapeOf(configWith(undefined)))
  })

  it("keeps a section's hash even when it becomes a trap — the encounter is not the structure", () => {
    // A trap used to carve differently, because the assembler isolated it from leftover maze edges
    // on the strength of its tag. That isolation is now an authored structural field, so which family
    // a room serves cannot reach the layout at all.
    expect(hashesOf(configWith("arithmetic-reflex"))).toEqual(hashesOf(configWith("sumplete")))
    expect(shapeOf(configWith("arithmetic-reflex"))).toBe(shapeOf(configWith("sumplete")))
  })

  it("moves a section's hash when it is sealed, because that really does move the walls", () => {
    const sealed = configWith("sumplete")
    sealed.sideSections![0] = { ...sealed.sideSections![0], sealed: true }
    expect(hashesOf(sealed)).not.toEqual(hashesOf(configWith("sumplete")))
  })
})

/**
 * A seed has to mean the same MAZE on every engine, for the same reason it has to mean the same board
 * (generateStarBattle.spec.ts): a comparator that draws from the seeded stream leaves the result to
 * the engine's sort. V8 sorts with TimSort, JavaScriptCore with a merge sort, and the two orders
 * differ — measured on the same seeded stream and the same draw count, V8 12.4 and Chrome 153 already
 * disagree. A floor that carves one way in the tests and another on the phone is a save restored
 * against a maze that was never there.
 */
describe("a floor does not depend on the engine's sort", () => {
  // A perfectly legal sort, just not this engine's. Stable, correct, different comparison order.
  const mergeSort = function <T>(this: T[], compare?: (a: T, b: T) => number): T[] {
    const cmp = compare ?? ((a: T, b: T) => (String(a) < String(b) ? -1 : 1))
    const sorted = (items: T[]): T[] => {
      if (items.length < 2) return items
      const mid = items.length >> 1
      const left = sorted(items.slice(0, mid))
      const right = sorted(items.slice(mid))
      const out: T[] = []
      let i = 0
      let j = 0
      while (i < left.length && j < right.length) out.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++])
      return out.concat(left.slice(i), right.slice(j))
    }
    const result = sorted([...this])
    for (let index = 0; index < result.length; index++) this[index] = result[index]
    return this
  }

  const underMergeSort = <T>(run: () => T): T => {
    const original = Array.prototype.sort
    Array.prototype.sort = mergeSort as typeof Array.prototype.sort
    try {
      return run()
    } finally {
      Array.prototype.sort = original
    }
  }

  // Every shuffle in the assembler is on a side-section list, a branch-candidate list or a hub slice,
  // so a floor with one section and no forks would carve identically however it sorted.
  const branchingConfig = (): FloorConfig => ({
    pathPuzzles: 3,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      { pathPuzzles: 2, difficulty: "expert", end: "treasure" },
      { pathPuzzles: 1, difficulty: "expert", end: "treasure", gate: { type: "floor-key" } },
      { pathPuzzles: 2, difficulty: "junior", end: "treasure" },
      { pathPuzzles: 1, difficulty: "expert", end: "treasure", hidden: true },
      { pathPuzzles: 3, difficulty: "master", end: "treasure" },
    ],
  })

  const wallsOf = (seed: number, sort: <T>(run: () => T) => T): string => {
    const result = sort(() => assembleFloor("site-portable", branchingConfig(), seed))
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    return JSON.stringify(
      result.grid.cells.map(row =>
        row.map(c => (c.type === "empty" ? "." : `${c.type[0]}${[...c.dirs].sort().join("")}${c.sectionAddress ?? ""}`))
      )
    )
  }

  it.each([1, 7, 42, 1234, 175768595654520])("carves the same walls at seed %i", seed => {
    expect(wallsOf(seed, underMergeSort)).toBe(wallsOf(seed, run => run()))
  })
})

/**
 * `packing` is a wish, not a contract. It asks for the shortest walk the author can get away with, and
 * the tightest wish is the one a maze is most likely to be unable to grant: at `packing: 0.1` a floor
 * with eight side sections has nowhere to hang them. The retry loop's other lever — growing the grid —
 * cannot help, because the main path's target length is what is starving the branches, so a floor that
 * fails at its authored packing fails at it sixty times over.
 *
 * So the retry widens the wish. Each rung asks for a little more room, and a floor settles at the
 * first one that carves — which is what makes one low default safe for the whole world instead of
 * every floor paying for the tightest one.
 */
describe("a floor too tight to carve widens until it does", () => {
  const eightSections = (packing: number): FloorConfig => ({
    pathPuzzles: 3,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    packing,
    sideSections: Array.from({ length: 8 }, () => ({
      pathPuzzles: 2,
      difficulty: "expert" as const,
      end: "treasure" as const,
    })),
  })

  it("carves all 40 seeds at a packing most of them cannot honour", () => {
    const failed: number[] = []
    for (let seed = 0; seed < 40; seed++)
      if (!assembleFloor(`site-tight-${seed}`, eightSections(0.1), seed).success) failed.push(seed)

    expect(failed, `${failed.length} of 40 seeds could not carve`).toEqual([])
  }, 60_000)

  it.each([0, 1, 2, 3, 4])(
    "never widens past the roomiest wish, at seed %i",
    seed => {
      // Unbounded, the widening compounds: an eight-section floor asking for 0.1 reached a packing of
      // 17 and carved a 321x321 grid for three puzzles. The ceiling is what keeps a rescue from
      // costing more than the wish the author refused in the first place.
      const walk = (packing: number) => {
        const result = assembleFloor(`site-walk-${seed}`, eightSections(packing), seed)
        if (!result.success) throw new Error(`assembly failed at packing ${packing}, seed ${seed}`)
        return graphDistance(result.grid, result.grid.entrancePos, result.grid.exitPos)
      }

      expect(walk(0.1)).toBeLessThanOrEqual(walk(1))
    },
    60_000
  )
})

/**
 * The walk between two puzzles is dead time, and for a long while the default was to carve six times
 * more corridor than a floor's content needed. The default is now the shortest wish the widening
 * above makes safe to hold world-wide: floors that cannot honour it widen on their own, so the rest
 * no longer pay for them.
 */
describe("a floor that authors no packing gets the short walk", () => {
  const plain = (packing?: number): FloorConfig => ({
    pathPuzzles: 3,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    ...(packing === undefined ? {} : { packing }),
    sideSections: [
      { pathPuzzles: 2, difficulty: "expert", end: "treasure" },
      { pathPuzzles: 1, difficulty: "expert", end: "treasure" },
    ],
  })

  const walk = (config: FloorConfig, seed: number) => {
    const result = assembleFloor(`site-default-${seed}`, config, seed)
    if (!result.success) throw new Error("assembly failed")
    return graphDistance(result.grid, result.grid.entrancePos, result.grid.exitPos)
  }

  it.each([1, 2, 3, 4, 5])(
    "at seed %i walks under a third of six-times-content",
    seed => {
      // Per seed, not across them: one maze can be twenty times another at the same packing, so a
      // comparison that mixes seeds says nothing about the packing at all.
      expect(walk(plain(), seed) * 3).toBeLessThan(walk(plain(1), seed))
    },
    30_000
  )
})

describe("an authored floor-key id", () => {
  const config = (): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "junior",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      {
        pathPuzzles: 1,
        difficulty: "junior",
        end: "treasure",
        endReward: { type: "mosaic", tier: "junior" },
        gate: { type: "floor-key", keyId: "authored:east" },
      },
    ],
  })

  it("is used verbatim as the gate's requiredKeyId", () => {
    const result = assembleFloor("site-authored-key", config(), 1234)
    if (!result.success) throw new Error("assembly failed")
    const gates = result.grid.cells.flat().filter(c => c.type === "room" && c.requiredKeyId)
    expect(gates.map(g => (g as { requiredKeyId?: string }).requiredKeyId)).toContain("authored:east")
  })

  it("grows no key-host section for that gate", () => {
    const result = assembleFloor("site-authored-key", config(), 1234)
    if (!result.success) throw new Error("assembly failed")
    const hostedKeys = result.grid.cells.flat().filter(c => c.type === "room" && c.reward?.type === "tombKey")
    expect(hostedKeys).toHaveLength(0)
  })

  // Colour is the sign pointing at the chest that holds the key, and there is no chest — a colour here
  // would show in the floor's key ring (src/game/floorKeys.ts) as a key to go and find.
  it("leaves the gate without a rotation colour", () => {
    const result = assembleFloor("site-authored-key", config(), 1234)
    if (!result.success) throw new Error("assembly failed")
    const authored = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.requiredKeyId === "authored:east")
    expect(authored).toHaveLength(1)
    expect(authored[0].keyColor).toBeUndefined()
    // The ring reads doors the player has SEEN, so the gate has to be out of the fog to count at all.
    const seen: FloorGrid = {
      ...result.grid,
      cells: result.grid.cells.map(row => row.map(c => (c === authored[0] ? { ...c, state: "visible" as const } : c))),
    }
    expect(floorKeyRing(seen, new Set()).needed).toEqual([])
  })

  it("still wears a colour the author named on it", () => {
    const spec = config()
    spec.sideSections![0].gate = { type: "floor-key", keyId: "authored:east", color: "green" }
    const result = assembleFloor("site-authored-key", spec, 1234)
    if (!result.success) throw new Error("assembly failed")
    const authored = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.requiredKeyId === "authored:east")
    expect(authored[0].keyColor).toBe("green")
  })
})

describe("a floor-key gate with no authored keyId", () => {
  it("stamps keyIsAuthored on none of its gate rooms", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    if (!result.success) throw new Error("assembly failed")
    const floorKeyGates = result.grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.gateVariant === "floor-key")
    expect(floorKeyGates.length).toBeGreaterThan(0)
    expect(floorKeyGates.every(c => c.keyIsAuthored === undefined)).toBe(true)
  })
})

describe("fork exits", () => {
  it("names each exit's compass direction and what lies down it", () => {
    const config: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    }
    let found: { r: number; c: number; cell: RoomCell; grid: FloorGrid } | null = null
    for (let seed = 0; seed < 60 && !found; seed++) {
      const result = assembleFloor(`site-fork-exits-${seed}`, config, seed)
      if (!result.success) continue
      const fork = findRoom(result.grid, cell => cell.roomType === "fork")
      if (fork) found = { ...fork, grid: result.grid }
    }
    if (!found) throw new Error("no seed produced a fork room")
    const { r, c, cell, grid } = found

    // What lies down each of the fork's own dirs, read off the neighbour node two grid cells
    // away (NODE_STEP) — never a hand-written direction, since the carve picks them, not this test.
    const [entR, entC] = grid.entrancePos
    const mainAddress = grid.cells[entR][entC].type !== "empty" ? grid.cells[entR][entC].sectionAddress : undefined
    const expectedKind = (nr: number, nc: number): "main" | "side" | "ward" | "fork" => {
      const neighbor = grid.cells[nr][nc]
      if (neighbor.type === "room" && neighbor.roomType === "fork") return "fork"
      if (neighbor.type === "room" && neighbor.gateVariant === "tomb-key") return "ward"
      if (neighbor.type !== "empty" && neighbor.sectionAddress === mainAddress) return "main"
      return "side"
    }
    const byDir = (a: { dir: Direction }, b: { dir: Direction }) => a.dir.localeCompare(b.dir)
    const expected = [...cell.dirs]
      .map(dir => {
        const [dr, dc] = DIR_MOVE[dir]
        return { dir, kind: expectedKind(r + dr * 2, c + dc * 2) }
      })
      .sort(byDir)

    expect(cell.exits).toBeDefined()
    expect([...(cell.exits ?? [])].sort(byDir)).toEqual(expected)
    // This config attaches one ungated side section to a main path with room to spare, so
    // every fork the carve produces owns both its main-path directions and exactly one side.
    expect(expected.filter(e => e.kind === "main").length).toBe(2)
    expect(expected.filter(e => e.kind === "side").length).toBe(1)
  })
})

describe("a switch fork", () => {
  // Every gate key is derived from where the floor was authored, so a spec that wants to name one
  // fixes the address and derives the stem the same way — never off the builder's own output.
  const FLOOR_REF = { journeyId: "switch-spec", levelIndex: 0, floorIndex: 0 }
  const SWITCH_KEY = `switch:${FLOOR_REF.journeyId}#0#0#0`
  const ONE_SWITCH = { encounter: "sumplete", min: 1, max: 1 }
  // Whether a finished room is walked back into is the registry's answer, off FamilyMeta.reEnterable,
  // and these specs assemble without the registry. A switch needs a family that offers the walk back,
  // so the stub grants it and each spec below stays about the one thing it names.
  const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
    ...defaultResolveEncounter(encounter, defaultTag),
    reEnterable: true,
  })
  const assembleAt = (siteId: string, config: FloorConfig, seed: number, resolve = reEnterableFamilies) =>
    assembleFloor(siteId, config, seed, resolve, { floorRef: FLOOR_REF })

  const switchConfig = (switches?: FloorConfig["switches"]): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "junior",
    end: "treasure",
    exitOrStaircase: "exit",
    theme: "dusk",
    role: "puzzle",
    sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    forks: [{ exits: 2, count: 1 }],
    ...(switches ? { switches } : {}),
  })

  const assembleWithSwitch = (switches?: FloorConfig["switches"]) => {
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleAt(`site-switch-${seed}`, switchConfig(switches), seed)
      if (!result.success) continue
      const fork = findRoom(result.grid, cell => cell.roomType === "fork")
      if (fork) return { ...fork, grid: result.grid }
    }
    throw new Error("no seed produced a fork room")
  }

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

  // Asked before a wall is carved, because no seed can settle it: there are two junctions to fill and
  // one held for them.
  it("refuses a floor asking for more switches than its forks reserve junctions", () => {
    const result = assembleAt("site-switch-crowded", switchConfig({ encounter: "sumplete", min: 2, max: 2 }), 3)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([{ type: "switchesExceedForks", min: 2, forks: 1 }])
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

  // A switch opens one way out and leaves the others shut. Keys accumulate, so spending the choice on a
  // side branch costs a walk back to the switch and a second choice — unless its room shut behind the
  // player, and then the main path onward is a door they can never open.
  //
  // Against the real registry, not the fallback stub: the fallback never claims `reEnterable` for
  // anyone, so it would refuse a switch whether or not this check still worked. Sumplete genuinely
  // has no `reEnterable` in its own FamilyMeta, so the real registry's refusal is the one this spec
  // names.
  it("refuses a switch whose room cannot be walked back into", () => {
    const result = assembleAt("site-switch-oneshot", switchConfig(ONE_SWITCH), 0, resolveEncounter)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([
      { type: "switchFamilyNotReEnterable", family: "sumplete" },
    ])
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

describe("a side path seating a chain of regions", () => {
  // doubleBack's own shape (docs/game-design/regions-and-containers.md; the doubleBack fixture at
  // lockWalk.spec.ts's describe(walkLock)): the route runs entrance → leftLower → out, leaving
  // rightLower and s1Chamber off it — one branch two regions deep, not two independent pendants,
  // since s1Chamber hangs off rightLower rather than off the route directly. Every appetite is "free"
  // so this stays a pure seating test: what fills a room is a separate concern (regions.spec.ts).
  const diamondLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "out", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "out"],
    ],
    in: "entrance",
    out: "out",
  })

  const diamondConfig = (): FloorConfig => ({
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: diamondLayout(),
    // One side section is all `rightLower`+`s1Chamber` need to share — offRouteChains groups them
    // into a single chain (regions.spec.ts), which this one chain hosts. `sealed` isolates it from
    // leftover maze edges: without a gate or `sealed` an ungated branch has always allowed a stray
    // tree edge to bypass its own content (unrelated to this task), which would make the "seats in
    // order" test below meaningless — it has to prove the order holds where something actually keeps
    // the player from cutting through.
    sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", sealed: true }],
  })

  const regionsOn = (grid: FloorGrid): Set<string> => {
    const seen = new Set<string>()
    for (const row of grid.cells)
      for (const cell of row) if (cell.type !== "empty" && cell.region) seen.add(cell.region)
    return seen
  }

  it("carves every declared region onto some cell", () => {
    const result = assembleFloor("site-diamond", diamondConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const seen = regionsOn(result.grid)
    for (const region of diamondLayout().regions) expect(seen.has(region.name)).toBe(true)
  })

  // The failure this test exists to catch is a chain seated out of order: `s1Chamber` reachable
  // without passing through `rightLower` first, which is a lever's gate (`greenRight`, doubleBack's own
  // fixture) a player could then walk straight past. A test that only asserts both regions appear
  // would pass under that bug — this instead proves the physical order, by sealing `rightLower`'s own
  // cells and checking `s1Chamber` becomes unreachable.
  it("seats the chain in order: the mouth-adjacent region stands between the entrance and the deeper one", () => {
    const result = assembleFloor("site-diamond", diamondConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const reachableWithoutRegion = (excludedRegion: string | undefined): Set<string> => {
      const key = (r: number, c: number) => `${r},${c}`
      const [er, ec] = grid.entrancePos
      const seen = new Set([key(er, ec)])
      const queue: Array<[number, number]> = [[er, ec]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r][c]
        if (cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE[dir]
          const nr = r + dr
          const nc = c + dc
          if (seen.has(key(nr, nc))) continue
          const next = grid.cells[nr]?.[nc]
          if (!next || next.type === "empty") continue
          if (next.region === excludedRegion) continue
          seen.add(key(nr, nc))
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const s1Cells = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type !== "empty" && cell.region === "s1Chamber" ? [`${r},${c}`] : []))
    )
    // Sanity: s1Chamber cells genuinely exist and are reachable at all, so the exclusion check below
    // fails for the right reason rather than because nothing was ever reachable.
    expect(s1Cells.length).toBeGreaterThan(0)
    const reachedFreely = reachableWithoutRegion(undefined)
    for (const cellKey of s1Cells) expect(reachedFreely.has(cellKey)).toBe(true)

    // The real check: with every rightLower cell treated as sealed, no s1Chamber cell is reachable.
    const reachedWithoutRightLower = reachableWithoutRegion("rightLower")
    for (const cellKey of s1Cells) expect(reachedWithoutRightLower.has(cellKey)).toBe(false)
  })

  // Watched failing: a floor with nowhere to seat rightLower/s1Chamber's chain (no side section to
  // match it to) must still be refused by name, not silently drop the content that would have gone
  // there into a region the author never named.
  it("still refuses by name when a region genuinely cannot be seated", () => {
    const config: FloorConfig = { ...diamondConfig(), sideSections: [] }
    const result = assembleFloor("site-diamond-unseatable", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toContainEqual({
      type: "regionNotSeated",
      regions: ["rightLower", "s1Chamber"],
    })
  })

  // A switch's ways out are closed on the grid, so the layout check must read the walls `forks` carved and not
  // the doors a switch minted: a carve's refusals are the same with the switch standing as without it.
  it("answers the layout check the same with a plain switch standing in the reserved junction as without one", () => {
    const resolve: ResolveEncounter = (encounter, defaultTag) => ({
      ...defaultResolveEncounter(encounter, defaultTag),
      reEnterable: true,
    })
    const outcome = (config: FloorConfig, seed: number) => {
      const result = assembleFloor("site-diamond-switch", config, seed, resolve)
      return result.success
        ? "carved"
        : result.reasons.map(reason => reason.type).filter(type => type !== "layoutNotFound")
    }
    const plain: FloorConfig = {
      ...diamondConfig(),
      pathPuzzles: 2,
      regionLayout: {
        regions: [
          { name: "entrance", appetite: "free" },
          { name: "leftLower", appetite: "free" },
          { name: "rightLower", appetite: "free" },
          { name: "leftDeep", appetite: "free" },
          { name: "out", appetite: "free" },
        ],
        connections: [
          ["entrance", "leftLower"],
          ["entrance", "rightLower"],
          ["leftLower", "leftDeep"],
          ["entrance", "out"],
        ],
        in: "entrance",
        out: "out",
      },
      oneWayRealisation: "zipline",
      obstacles: [
        { id: "deepGate", kind: "gate", at: { on: "connection", between: ["leftLower", "leftDeep"] } },
        { id: "mouthGate", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] } },
        { id: "dropHome", kind: "oneWay", at: { on: "connection", between: ["leftDeep", "entrance"] } },
      ],
      controls: [
        {
          id: "L",
          in: "entrance",
          states: ["unset", "open"],
          initial: "unset",
          returnsToInitial: false,
          opens: { unset: [], open: ["deepGate", "mouthGate"] },
        },
      ],
      sideSections: [
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", sealed: true },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", sealed: true },
      ],
      forks: [{ exits: 2, count: 1 }],
    }
    const switched: FloorConfig = { ...plain, switches: { encounter: "sumplete", min: 1, max: 1 } }
    const differing: string[] = []
    let carved = 0
    for (let seed = 1; seed <= 40; seed++) {
      const without = outcome(plain, seed)
      if (without === "carved") carved++
      const withSwitch = outcome(switched, seed)
      if (JSON.stringify(without) !== JSON.stringify(withSwitch))
        differing.push(`seed ${seed}: ${JSON.stringify(without)} vs ${JSON.stringify(withSwitch)}`)
    }
    expect(carved).toBeGreaterThan(0)
    expect(differing).toEqual([])
  }, 120_000)
})

describe("a control seated in an off-route region", () => {
  // rightLower/s1Chamber is a two-deep chain off `entrance` (doubleBack's own shape), gated by
  // `greenRight` — the same connection Task 2's own describe block above already proves seats a gate.
  // `S1` stands in `s1Chamber`, the DEEP end of the chain, and drives that gate: the control search
  // this task extends has to reach a region no main-path step ever names.
  const chamberLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "out", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
    ],
    connections: [
      ["entrance", "out"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
    ],
    in: "entrance",
    out: "out",
  })

  const chamberConfig = (): FloorConfig => ({
    pathPuzzles: 2,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: chamberLayout(),
    sideSections: [
      { pathPuzzles: 2, difficulty: "starter", end: "treasure", rewards: [{ type: "c0" }, { type: "c1" }] },
    ],
    obstacles: [{ id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } }],
    controls: [
      {
        id: "S1",
        in: "s1Chamber",
        states: ["start", "thrown"],
        initial: "start",
        returnsToInitial: false,
        opens: { start: ["greenRight"], thrown: [] },
      },
    ],
  })

  const GATE_KEY = "obstacle:site-chamber#0#0:greenRight"

  it("seats the control in the region it names, not just a main-path one", () => {
    const result = assembleFloor("site-chamber", chamberConfig(), 0)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const controlRoom = result.grid.cells
      .flat()
      .find((c): c is RoomCell => c.type === "room" && c.mechanism !== undefined)
    if (!controlRoom) throw new Error("no control room found")
    expect(controlRoom.region).toBe("s1Chamber")
  })

  // THE PROPERTY THAT MATTERS: a control seated off the main path has to drive its own gate the
  // ordinary way — `openDoorsFor` (mechanismDoors.ts), asked nothing about which region the room
  // stands in. A room that merely exists (the test above) would pass even if it were wired to nothing.
  it("drives its own gate from wherever it stands", () => {
    const result = assembleFloor("site-chamber", chamberConfig(), 0)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const controlRoom = grid.cells.flat().find((c): c is RoomCell => c.type === "room" && c.mechanism !== undefined)
    if (!controlRoom) throw new Error("no control room found")
    let at: string | undefined
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === controlRoom) at = cellAddress(grid, 0, r, c) ?? undefined
      })
    )
    if (!at) throw new Error("control room has no address")

    // No stored position: the gate stands open, matching S1's own authored initial state.
    expect(openDoorsFor(grid, 0, new Map())).toEqual(new Set([GATE_KEY]))
    // Thrown: S1's own `opens.thrown` names nothing, so the gate shuts.
    expect(openDoorsFor(grid, 0, new Map([[at, "thrown"]]))).toEqual(new Set())
  })

  // ORDINAL STABILITY, THE RULE THIS TASK MUST NOT BREAK: `pathIndex` is the save address
  // (`p${pathIndex}`, cellSlot.ts) and indexes `config.rewards[k]`/`encountersByIndex[k]`, so a puzzle
  // that keeps its node must keep its number whether or not the topology mod that owns `controls` is
  // even registered. Comparing the WHOLE SET of `pathIndex` values (main path and chain alike) against
  // the identical floor with the mod's `obstacles`/`controls` stripped — never a count, which would sit
  // green while every address slid by one — swept across seeds rather than pinned to one, so a
  // seed-dependent renumbering bug cannot hide behind a lucky carve.
  it("carries the identical set of pathIndex values, on the main path and the chain, whether the control is present or not", () => {
    const withoutMod: FloorConfig = {
      pathPuzzles: chamberConfig().pathPuzzles,
      difficulty: chamberConfig().difficulty,
      end: chamberConfig().end,
      exitOrStaircase: chamberConfig().exitOrStaircase,
      sideSections: chamberConfig().sideSections,
    }
    const chainInfo = (grid: FloorGrid, sectionAddress: string) =>
      grid.cells
        .flat()
        .filter(
          (c): c is RoomCell => c.type === "room" && c.sectionAddress === sectionAddress && c.pathIndex !== undefined
        )
        .map(c => ({ pathIndex: c.pathIndex, reward: c.reward }))
        .sort((a, b) => a.pathIndex! - b.pathIndex!)

    let compared = 0
    for (let seed = 0; seed < 60; seed++) {
      const on = assembleFloor("site-chamber-toggle", chamberConfig(), seed)
      const off = assembleFloor("site-chamber-toggle", withoutMod, seed)
      if (!on.success || !off.success) continue
      compared++
      expect(chainInfo(on.grid, "main")).toEqual(chainInfo(off.grid, "main"))
      expect(chainInfo(on.grid, "s0")).toEqual(chainInfo(off.grid, "s0"))
    }
    // A loop that skipped every seed would pass having compared nothing.
    expect(compared).toBeGreaterThan(0)
  })

  // WATCHED FAILING (see below): a control confined to a chain region that never has a free node —
  // `s1Chamber` is the LAST of four regions in a single-region-per-cell chain (`entrance`-`r1`-`r2`-
  // `r3`-`s1Chamber`), so `regionOfStep` never gives it the "extra" cell a shorter list's remainder
  // would (the remainder only ever falls on an EARLIER region — see regions.ts's own `regionOfStep`):
  // whatever length the carve grows the chain to, `s1Chamber`'s own share is always exactly its last
  // cell, the one every chain reserves unconditionally for its end room. No seed ever frees one, so
  // this refuses even after the whole attempt budget, not merely on the first try.
  it("still refuses by name when no chain node is ever free for the control", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "r1", appetite: "free" },
        { name: "r2", appetite: "free" },
        { name: "r3", appetite: "free" },
        { name: "s1Chamber", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "r1"],
        ["r1", "r2"],
        ["r2", "r3"],
        ["r3", "s1Chamber"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      controls: [
        {
          id: "S1",
          in: "s1Chamber",
          states: ["a", "b"],
          initial: "a",
          returnsToInitial: false,
          opens: { a: [], b: [] },
        },
      ],
    }
    const result = assembleFloor("site-chamber-unseatable", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toContainEqual({ type: "controlNotSeated", ids: ["S1"] })
  })

  // TWO OFF-ROUTE CONTROLS SHARING ONE CHAIN — a second control's displacement destination search
  // excluded `chainGateIndices` and `contentIndices` but not `takenByChainControl`, so a control
  // seated on a genuinely free node could be silently overwritten by a puzzle a LATER control's own
  // displacement lands on top of it. `C1`/`C2` seat on this chain's own two free nodes; `C3` finds
  // neither free and is forced to displace — a natural single-region packing only ever leaves its
  // ONE spare node at the FRONT of the content range (`spreadContentIndices`'s own collision
  // resolution always resolves a clash by pushing UP first — regions.ts is silent on this, it is a
  // property of THIS function alone, checked by hand across dozens of (count, length) pairs), which a
  // forward-only displacement search can never reach — so two controls sharing one chain can only
  // ever take the chain's own two separate free nodes, never collide. A third, forced to displace,
  // is what exercises the excluded case: its destination search walks onto `C2`'s own free node.
  it("keeps every off-route control's own room distinct when several share one chain", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "s1Chamber", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "s1Chamber"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [{ pathPuzzles: 2, difficulty: "starter", end: "treasure" }],
      controls: ["C1", "C2", "C3"].map(id => ({
        id,
        in: "s1Chamber",
        states: ["a", "b"],
        initial: "a",
        returnsToInitial: false,
        opens: { a: [], b: [] },
      })),
    }
    const result = assembleFloor("site-chamber-triple", config, 0)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const controlRooms = grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && c.mechanism !== undefined)
    // Every authored control got its own room — the whole set of ids, not a count that would sit
    // green with one silently replaced by a puzzle and another written twice.
    expect(controlRooms.map(c => c.mechanismId).sort()).toEqual(["C1", "C2", "C3"])
    // And each at a DISTINCT cell — three ids naming only two physical rooms is the exact shape of
    // this bug (one control's room silently became another's).
    const positions = new Set<string>()
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "room" && cell.mechanism !== undefined) positions.add(`${r},${c}`)
      })
    )
    expect(positions.size).toBe(3)
    // The chain's own authored puzzles survive intact alongside them — the whole set of pathIndex
    // values, not a count: a control overwriting a puzzle's cell would drop that ordinal from here.
    const puzzleIndices = grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && c.sectionAddress === "s0" && c.pathIndex !== undefined)
      .map(c => c.pathIndex)
      .sort()
    expect(puzzleIndices).toEqual([0, 1])
  })
})

describe("a gate on a connection off the threaded route", () => {
  // doubleBack's own shape (lockWalk.spec.ts's doubleBack fixture; docs/game-design/regions-and-containers.md):
  // the route runs entrance → leftLower → s2Chamber → wayOut, leaving rightLower → s1Chamber as a
  // two-deep chain off the route's own mouth (entrance). `greenLeft` stands ON the route (leftLower →
  // s2Chamber) — the control case, already answered before this task. `forkRight` stands at the
  // chain's own MOUTH (entrance → rightLower) and `greenRight` WITHIN it (rightLower → s1Chamber) —
  // the two shapes this task adds.
  const doubleBackLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "s2Chamber", appetite: "free" },
      { name: "wayOut", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "s2Chamber"],
      ["s2Chamber", "wayOut"],
    ],
    in: "entrance",
    out: "wayOut",
  })

  const doubleBackConfig = (): FloorConfig => ({
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: doubleBackLayout(),
    // The one off-route component (rightLower, s1Chamber) hangs off `entrance`; one side section is
    // what `offRouteChains` matches it to.
    sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
    obstacles: [
      { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] } },
      { id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } },
      { id: "greenLeft", kind: "gate", at: { on: "connection", between: ["leftLower", "s2Chamber"] } },
    ],
    controls: [
      {
        id: "Y",
        in: "entrance",
        states: ["unset", "open"],
        initial: "unset",
        returnsToInitial: false,
        opens: { unset: [], open: ["forkRight", "greenRight", "greenLeft"] },
      },
    ],
  })

  // Every gate room the carve wrote, keyed by which obstacle id its `requiredKeyId` names —
  // `gateKeyOf` mints `obstacle:<journey>#<level>#<floor>:<id>`, so `.includes(id)` is enough to tell
  // them apart without depending on that format here too.
  const gateRoomsOf = (grid: FloorGrid): Array<{ id: string; pos: [number, number]; region?: string }> => {
    const found: Array<{ id: string; pos: [number, number]; region?: string }> = []
    for (const id of ["forkRight", "greenRight", "greenLeft"]) {
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.type === "room" && cell.requiredKeyId?.includes(`:${id}`)) {
            found.push({ id, pos: [r, c], region: (cell as RoomCell).region })
          }
        })
      )
    }
    return found
  }

  it("carves with a gate on the chain's own mouth and on a boundary within it", () => {
    const result = assembleFloor("site-doubleback", doubleBackConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const gateRooms = gateRoomsOf(result.grid)
    const idsFound = gateRooms.map(g => g.id)
    for (const id of ["forkRight", "greenRight", "greenLeft"]) expect(idsFound).toContain(id)
  })

  // Each gate stands at the seam `seamIndexFor` names: the first cell of the FAR region — the region
  // the player has not yet earned when arriving from the near side.
  it("stands each gate room in the region past its own seam", () => {
    const result = assembleFloor("site-doubleback-boundary", doubleBackConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const byId = new Map(gateRoomsOf(result.grid).map(g => [g.id, g]))
    expect(byId.get("forkRight")?.region).toBe("rightLower")
    expect(byId.get("greenRight")?.region).toBe("s1Chamber")
    expect(byId.get("greenLeft")?.region).toBe("s2Chamber")
  })

  // THE PROPERTY THAT MATTERS: a gate's whole purpose is that it cannot be walked around. `greenRight`
  // stands between `rightLower` and `s1Chamber` — a boundary WITHIN the chain, not at its mouth — so
  // this proves no leftover maze edge lets a player reach `s1Chamber` without crossing that seam. A
  // test that only asserted the gate room exists would pass under that bug; excluding the gate room's
  // OWN cell (not the whole region) and finding `s1Chamber` unreachable is what proves it is the
  // choke point, not merely somewhere nearby it.
  it("cannot be bypassed: every path to the region behind a within-chain gate passes through its gate room", () => {
    const result = assembleFloor("site-doubleback-bypass", doubleBackConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const greenRightRoom = gateRoomsOf(grid).find(g => g.id === "greenRight")
    if (!greenRightRoom) throw new Error("greenRight gate room not found")
    const [excludedR, excludedC] = greenRightRoom.pos

    const reachableExcluding = (exclude: [number, number] | undefined): Set<string> => {
      const key = (r: number, c: number) => `${r},${c}`
      const [er, ec] = grid.entrancePos
      const seen = new Set([key(er, ec)])
      const queue: Array<[number, number]> = [[er, ec]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r][c]
        if (cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE[dir]
          const nr = r + dr
          const nc = c + dc
          if (seen.has(key(nr, nc))) continue
          if (exclude && nr === exclude[0] && nc === exclude[1]) continue
          const next = grid.cells[nr]?.[nc]
          if (!next || next.type === "empty") continue
          seen.add(key(nr, nc))
          queue.push([nr, nc])
        }
      }
      return seen
    }

    // ROOM cells only, and not the gate room itself: the CONNECTOR immediately before the gate room
    // inherits `s1Chamber`'s region label too (a corridor answers to one of the two nodes it joins —
    // an arbitrary pick at a region's own boundary), so it is reachable from the near side without
    // needing the gate at all, same as standing right outside a locked door. That is not a bypass —
    // no *room* stands there — so this checks only cells the region actually holds content in.
    const s1Cells = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type === "room" && cell.region === "s1Chamber" && !(r === excludedR && c === excludedC)
          ? [`${r},${c}`]
          : []
      )
    )
    // Sanity: s1Chamber cells genuinely exist and are reachable at all, so the exclusion check below
    // fails for the right reason rather than because nothing was ever reachable.
    expect(s1Cells.length).toBeGreaterThan(0)
    const reachedFreely = reachableExcluding(undefined)
    for (const cellKey of s1Cells) expect(reachedFreely.has(cellKey)).toBe(true)

    // The real check: with only the gate room itself taken away — not the whole region — no
    // s1Chamber cell is still reachable.
    const reachedWithoutGateRoom = reachableExcluding([excludedR, excludedC])
    for (const cellKey of s1Cells) expect(reachedWithoutGateRoom.has(cellKey)).toBe(false)
  })

  // Watched failing against the pre-fix carve/obstacles.ts: `obstacleOffRoute` refused `forkRight`
  // and `greenRight` outright, before a single wall was carved.
  it("still refuses an obstacle on a connection the carve produces no seam for", () => {
    // `s1Chamber` touches the route a second time here (in addition to hanging off `entrance` via
    // `rightLower`) — the same "genuinely absent" shape obstacles.spec.ts's own unit test names.
    // `offRouteChains` still takes `entrance` as the chain's mouth (declared first), so this second
    // touch is a real graph connection the carve never turns into a physical adjacency.
    const layout = doubleBackLayout()
    const config: FloorConfig = {
      ...doubleBackConfig(),
      regionLayout: { ...layout, connections: [...layout.connections, ["s1Chamber", "s2Chamber"]] },
      obstacles: [{ id: "nowhere", kind: "gate", at: { on: "connection", between: ["s1Chamber", "s2Chamber"] } }],
      controls: [{ ...(doubleBackConfig().controls![0] as StatefulControl), opens: { unset: [], open: ["nowhere"] } }],
    }
    const result = assembleFloor("site-doubleback-nowhere", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([
      { type: "obstacleOffRoute", id: "nowhere" },
      { type: "gateBypassed", id: "nowhere", between: ["s1Chamber", "s2Chamber"] },
    ])
  })

  // A gate is owned by the control that opens it and has no interaction of its own, so one no control
  // opens can never be passed: a wall the player is shown as a door. Each gate in turn is left out of
  // every control's `opens`, and the floor is refused naming that gate.
  it("refuses every gate that no control opens, naming it", () => {
    const base = doubleBackConfig()
    for (const orphan of base.obstacles!.map(o => o.id)) {
      const config: FloorConfig = {
        ...base,
        controls: (base.controls as StatefulControl[]).map(control => ({
          ...control,
          opens: Object.fromEntries(
            Object.entries(control.opens).map(([state, ids]) => [state, ids.filter(id => id !== orphan)])
          ),
        })),
      }
      const result = assembleFloor(`site-doubleback-orphan-${orphan}`, config, 42)

      expect(result.success).toBe(false)
      expect(result.success === false && result.reasons).toEqual([{ type: "obstacleUnowned", id: orphan }])
    }
  })

  // A gate a control owns carries no family: nothing stands in it to enter, so the interaction is at
  // the control alone.
  it("writes every obstacle gate without a family", () => {
    const result = assembleFloor("site-doubleback-familyless", doubleBackConfig(), 42)
    if (!result.success) throw new Error("doubleBack did not assemble")

    const gates = gateRoomsOf(result.grid)
    expect(gates.map(g => g.id).sort()).toEqual(["forkRight", "greenLeft", "greenRight"])
    for (const { pos } of gates) {
      const cell = result.grid.cells[pos[0]][pos[1]]
      expect(cell.type === "room" && cell.family).toBeUndefined()
      expect(cell.type === "room" && cell.tags).toContain("gate")
    }
  })

  // `forkRight` stands on the chain's own MOUTH (entrance → rightLower), which always resolves to
  // `cells[0]` (regionOfStep always seats the first-declared hosted region from the front) — the same
  // cell a floor-key/tomb-key gate always claims. Watched failing before this refusal existed: the
  // floor-key write silently overwrote `forkRight`'s room, and `forkRight`'s own control was left
  // opening a door no cell carried any more, with nothing said.
  it("refuses a side section that hosts a mouth-gated chain and also authors its own gate", () => {
    const config: FloorConfig = {
      ...doubleBackConfig(),
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-doubleback-collision", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([
      { type: "chainGateCollidesWithSectionGate", address: "s0", obstacleId: "forkRight" },
    ])
  })

  // The other shape stays fine: a gate WITHIN the chain (not at its mouth) never lands on `cells[0]`,
  // so it never collides with a floor-key gate there — the two vocabularies really are independent
  // once the mouth case is the only one refused.
  it("does not refuse a within-chain gate alongside the section's own mouth gate", () => {
    const config: FloorConfig = {
      ...doubleBackConfig(),
      obstacles: doubleBackConfig().obstacles!.filter(o => o.id !== "forkRight"),
      controls: [
        {
          ...(doubleBackConfig().controls![0] as StatefulControl),
          opens: { unset: [], open: ["greenRight", "greenLeft"] },
        },
      ],
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-doubleback-no-collision", config, 42)

    expect(result.success).toBe(true)
  })

  // A SUB-CHAIN'S OWN `idx` NUMBERS ITS POSITION AMONG ITS PARENT'S SUB-SECTIONS, starting from 0 the
  // same as a top-level chain's own `idx` does — so a gate belonging to top-level chain `idx: 0`
  // (`s0`) must not also land on an unrelated sub-chain that happens to share that same number
  // (`s1.0`, the first sub-section of a SECOND, unrelated top-level section). `s0` here hosts an
  // off-route pocket with a mouth gate; `s1` is an ordinary section whose own sub-section (`s1.0`)
  // shares `idx: 0` purely by coincidence of position.
  it("does not let a top-level chain's gate land on an unrelated sub-chain sharing its idx", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "pocket", appetite: "free" },
        { name: "out", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "pocket"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [
        // s0: matched to the "pocket" chain (offRouteChains' only component) — its mouth gate always
        // resolves to `cells[0]`.
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        // s1: an ordinary, unrelated section whose own sub-section (s1.0) shares `idx: 0` with s0.
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
        },
      ],
      obstacles: [{ id: "mouthGate", kind: "gate", at: { on: "connection", between: ["entrance", "pocket"] } }],
      controls: [
        {
          id: "Y",
          in: "entrance",
          states: ["unset", "open"],
          initial: "unset",
          returnsToInitial: false,
          opens: { unset: [], open: ["mouthGate"] },
        },
      ],
    }
    const result = assembleFloor("site-idx-collision", config, 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    // Every room on the grid, so a stray write anywhere (not just where it was expected) is caught.
    const rooms = result.grid.cells.flat().filter((cell): cell is RoomCell => cell.type === "room")
    const mouthGateRooms = rooms.filter(cell => cell.requiredKeyId?.includes(":mouthGate"))
    // Exactly one room carries the gate — s0's own mouth cell — never a second one on s1.0.
    expect(mouthGateRooms).toHaveLength(1)
    expect(mouthGateRooms[0].sectionAddress).toBe("s0")
  })
})

describe("a one-way drop between two regions", () => {
  // doubleBack's own full shape (lockWalk.spec.ts's doubleBack fixture) — the same six regions and
  // three gates the describe block above proves seat, plus the two drops the design needs to stay
  // sound (lockWalk.spec.ts's "strands the player who drops early" test): s1Chamber → leftLower and
  // leftLower → entrance. Neither is a connection `doubleBackLayout` declares — a drop joins two
  // regions the layout does NOT otherwise join; that is the whole of what one is for
  // (docs/game-design/regions-and-containers.md; obstacles.ts's `OneWayObstacle`).
  const doubleBackLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "s2Chamber", appetite: "free" },
      { name: "wayOut", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "s2Chamber"],
      ["s2Chamber", "wayOut"],
    ],
    in: "entrance",
    out: "wayOut",
  })

  const doubleBackConfig = (): FloorConfig => ({
    pathPuzzles: 1,
    // Two drops of 2 + x cells each on six regions: a roomy packing is what lets the sweep find a carve.
    packing: 7,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: doubleBackLayout(),
    sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
    obstacles: [
      { id: "forkRight", kind: "gate", at: { on: "connection", between: ["entrance", "rightLower"] } },
      { id: "greenRight", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } },
      { id: "greenLeft", kind: "gate", at: { on: "connection", between: ["leftLower", "s2Chamber"] } },
      // The two region-addressed drops this task adds — neither owned by a control, same as
      // doubleBack's own (lockWalk.spec.ts): a one-way's direction is fixed at whatever it was
      // authored with, permanently, until a control can reverse one (see Control.opens).
      { id: "dropToLeft", kind: "oneWay", at: { on: "connection", between: ["s1Chamber", "leftLower"] } },
      { id: "dropToEntrance", kind: "oneWay", at: { on: "connection", between: ["leftLower", "entrance"] } },
    ],
    controls: [
      {
        id: "Y",
        in: "entrance",
        states: ["unset", "open"],
        initial: "unset",
        returnsToInitial: false,
        opens: { unset: [], open: ["forkRight", "greenRight", "greenLeft"] },
      },
    ],
  })

  const regionAt = (grid: FloorGrid, [r, c]: [number, number]): string | undefined => {
    const cell = grid.cells[r][c]
    return cell.type !== "empty" ? cell.region : undefined
  }

  // Every drop on the grid as the region its launch stands in and the region its landing stands in,
  // read off the cells carrying the obstacle marker: the cell before the first marked cell is the
  // launch, the cell after the last is the landing. Asking the carve's own bookkeeping would check the
  // code against itself, so the grid is what is read.
  const dropRegions = (grid: FloorGrid): { from?: string; to?: string }[] => {
    const marked = (r: number, c: number) => {
      const cell = grid.cells[r]?.[c]
      return cell?.type === "corridor" ? cell.obstacle : undefined
    }
    const drops: { from?: string; to?: string }[] = []
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        const marker = marked(r, c)
        if (!marker) continue
        const [dr, dc] = DIR_MOVE[marker.dir]
        if (marked(r - dr, c - dc)?.dir === marker.dir) continue
        let [er, ec] = [r, c]
        while (marked(er, ec)?.dir === marker.dir) [er, ec] = [er + dr, ec + dc]
        drops.push({ from: regionAt(grid, [r - dr, c - dc]), to: regionAt(grid, [er, ec]) })
      }
    return drops
  }

  // A carve is a seed's own choice, so seeds are swept until one satisfies both authored drops at
  // once — the same style oneWayCarve.spec.ts's own sweeps use, and the reach into LockSpec.oneWays
  // below is checked against that same carve rather than any carve that happens to succeed.
  const carvedWithBothDrops = (): FloorGrid => {
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("site-oneway-region", doubleBackConfig(), seed)
      if (!result.success) continue
      const drops = dropRegions(result.grid)
      const crosses = (from: string, to: string) => drops.some(d => d.from === from && d.to === to)
      if (crosses("s1Chamber", "leftLower") && crosses("leftLower", "entrance")) return result.grid
    }
    throw new Error("no seed carved both region-addressed drops")
  }

  it("carves a drop between the two regions each drop names", () => {
    // carvedWithBothDrops throws if no seed satisfies both — reaching the assertion below is itself
    // the proof; the assertions restate what "carves a drop" means for a reader.
    const grid = carvedWithBothDrops()
    const drops = dropRegions(grid)
    expect(drops.some(d => d.from === "s1Chamber" && d.to === "leftLower")).toBe(true)
    expect(drops.some(d => d.from === "leftLower" && d.to === "entrance")).toBe(true)
  })

  it("reaches LockSpec.oneWays, which floorLock derives from the assembled grid unchanged", () => {
    const grid = carvedWithBothDrops()
    const spec = floorLock(grid)
    if (!spec) throw new Error("floorLock found no mechanism on a floor that authors one")
    expect(spec.oneWays ?? []).not.toEqual([])
  })

  // Watched failing (see the task report): the carve constraint this test names — a pair of adjacent
  // cells spanning the two regions is never guaranteed by the authoring, only searched for — has to
  // be refused by name after the whole attempt budget, not silently placed somewhere else. A hidden
  // side section makes the "to" region's every cell ineligible (the same spoiler rule a gate's own
  // landing already respects, oneWayCarve.spec.ts's "refuses a drop into a hidden section"), so no
  // attempt at any seed ever finds a candidate — a genuine, deterministic shortfall rather than an
  // unlucky one.
  it("refuses by name when no attempt finds two adjacent cells spanning the drop's two regions", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "vault", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "vault"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", hidden: true }],
      obstacles: [{ id: "drop1", kind: "oneWay", at: { on: "connection", between: ["entrance", "vault"] } }],
    }
    // Every seed, not the first that refuses: the refusal is a property of the authoring (nothing
    // hidden can ever host a visible drop's landing), so no seed is entitled to satisfy it.
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("site-oneway-region-hidden", config, seed)
      if (result.success) throw new Error(`seed ${seed} carved a drop into a hidden region`)
      expect(result.reasons).toContainEqual({ type: "oneWayUnsatisfied", from: "entrance", to: "vault" })
    }
  })
})

describe(encounterFromMeta, () => {
  const meta = { id: "sumplete", ownerMod: "puzzle", tags: ["puzzle"], icon: "?", color: "gray", rewardPriority: 60 }

  it("carries the resolved family's id, tags and owning mod", () => {
    expect(encounterFromMeta(meta, "puzzle")).toEqual({ familyId: "sumplete", tags: ["puzzle"], ownerMod: "puzzle" })
  })

  it("sets reEnterable only when the meta claims it", () => {
    expect(encounterFromMeta({ ...meta, reEnterable: true }, "puzzle")).toEqual({
      familyId: "sumplete",
      tags: ["puzzle"],
      ownerMod: "puzzle",
      reEnterable: true,
    })
  })

  it("falls back to the query id/tag with no tags and no owning mod when no family matched", () => {
    expect(encounterFromMeta(undefined, "puzzle")).toEqual({ familyId: "puzzle", tags: [] })
  })

  it("joins an array fallback so an AND-query still resolves to one id", () => {
    expect(encounterFromMeta(undefined, ["sky", "light"])).toEqual({ familyId: "sky+light", tags: [] })
  })
})

describe("the designer's doubleBack, two arms off the entrance with drops between them", () => {
  it("carves on at least one of 40 consecutive seeds", () => {
    const outcomes: string[] = []
    for (let seed = 1; seed <= 40; seed++) {
      const result = assembleFloor("site-designer-doubleback", designerDoubleBack(), seed)
      if (result.success) {
        outcomes.push("carved")
        break
      }
      outcomes.push(JSON.stringify(result.reasons))
    }
    expect(outcomes.at(-1)).toBe("carved")
  })

  describe("a fork named by region", () => {
    const forked = (forks: FloorConfig["forks"]): FloorConfig => ({ ...designerDoubleBack(), forks })

    // The ways out of every junction standing in `region`, as the regions they lead into: a way out is
    // read one node on (nodes are two cells apart), where the neighbouring room names its own region.
    const sideExitRegions = (grid: FloorGrid, region: string): string[][] => {
      const step: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
      return grid.cells.flatMap((row, r) =>
        row.flatMap((cell, c) => {
          if (cell.type !== "room" || cell.roomType !== "fork" || cell.region !== region) return []
          const sides = (cell.exits ?? []).filter(exit => exit.kind === "side")
          return [
            sides
              .map(({ dir }) => {
                const next = grid.cells[r + step[dir][0] * 2]?.[c + step[dir][1] * 2]
                return next && next.type !== "empty" ? (next.region ?? "?") : "?"
              })
              .sort(),
          ]
        })
      )
    }

    it("lays one junction in the region whose side exits lead into exactly the chains hanging off it, on every carved seed", () => {
      const wrong: string[] = []
      let carved = 0
      for (let seed = 1; seed <= 40; seed++) {
        const result = assembleFloor("site-fork-in", forked([{ in: "entrance" }]), seed)
        if (!result.success) continue
        carved++
        const junctions = sideExitRegions(result.grid, "entrance")
        if (JSON.stringify(junctions) !== JSON.stringify([["leftLower", "rightLower"]]))
          wrong.push(`seed ${seed}: ${JSON.stringify(junctions)}`)
      }
      expect(carved).toBeGreaterThan(0)
      expect(wrong).toEqual([])
    }, 60_000)

    it("refuses a region authored together with counts, rather than ignoring either", () => {
      const result = assembleFloor("site-fork-in-counts", forked([{ in: "entrance", exits: 2, count: 1 }]), 1)
      expect(result).toEqual({
        success: false,
        reasons: [{ type: "forkRegionRefused", region: "entrance", cause: "contradictsCounts" }],
      })
    })

    it("refuses a region the layout does not have", () => {
      const result = assembleFloor("site-fork-in-unknown", forked([{ in: "nowhere" }]), 1)
      expect(result).toEqual({
        success: false,
        reasons: [{ type: "forkRegionRefused", region: "nowhere", cause: "notInLayout" }],
      })
    })

    it("refuses a region the main route never threads", () => {
      const result = assembleFloor("site-fork-in-offroute", forked([{ in: "leftLower" }]), 1)
      expect(result).toEqual({
        success: false,
        reasons: [{ type: "forkRegionRefused", region: "leftLower", cause: "offRoute" }],
      })
    })

    it("refuses a region with fewer than two chains hanging off it, since one exit is no fork", () => {
      const result = assembleFloor("site-fork-in-one-seam", forked([{ in: "wayOut" }]), 1)
      expect(result).toEqual({
        success: false,
        reasons: [{ type: "forkRegionRefused", region: "wayOut", cause: "fewerThanTwoSeams" }],
      })
    })

    it("refuses one region named twice", () => {
      const result = assembleFloor("site-fork-in-twice", forked([{ in: "entrance" }, { in: "entrance" }]), 1)
      expect(result).toEqual({
        success: false,
        reasons: [{ type: "forkRegionRefused", region: "entrance", cause: "repeated" }],
      })
    })

    it("names the region and its seams when the floor authors fewer side sections than chains, never placing the junction elsewhere", () => {
      const config = { ...forked([{ in: "entrance" }]), sideSections: designerDoubleBack().sideSections.slice(0, 1) }
      for (let seed = 1; seed <= 5; seed++) {
        expect(assembleFloor("site-fork-in-unlaid", config, seed)).toEqual({
          success: false,
          reasons: [
            {
              type: "forkSeamsNotLaid",
              region: "entrance",
              seams: [
                ["entrance", "rightLower"],
                ["entrance", "leftLower"],
              ],
            },
            { type: "layoutNotFound" },
          ],
        })
      }
    })
  })

  describe("a fork-switch standing in a fork named by region", () => {
    const SITE = "site-fork-switch"
    const keyOf = (gateId: string) => `obstacle:${SITE}#0#0:${gateId}`
    const AT_REST = MECHANISM_AT_REST

    // Every seed that carves, with the junction the fork-switch stands in. Asserted non-empty by each
    // test, never skipped: a floor that stopped carving would otherwise pass them all.
    const carves = (() => {
      let cached: { seed: number; grid: FloorGrid; at: [number, number]; junction: RoomCell }[] | undefined
      return () => {
        if (cached) return cached
        cached = []
        for (let seed = 1; seed <= 120; seed++) {
          const result = assembleFloor(SITE, forkSwitched(), seed, resolveEncounter)
          if (!result.success) continue
          const { cells } = result.grid
          for (let r = 0; r < cells.length; r++)
            for (let c = 0; c < cells[r].length; c++) {
              const cell = cells[r][c]
              if (cell.type === "room" && cell.mechanismId === "Y")
                cached.push({ seed, grid: result.grid, at: [r, c], junction: cell })
            }
        }
        return cached
      }
    })()

    beforeAll(() => {
      carves()
    }, 120_000)

    const REGION_BEYOND: Record<string, string> = {
      [keyOf("forkLeft")]: "leftLower",
      [keyOf("forkRight")]: "rightLower",
    }

    it("gives its mechanism the states rest plus one per seam, on every carved seed", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, junction } of carves()) {
        const { states, positions } = junction.mechanism!
        expect([states[0], [...states.slice(1)].sort()], `seed ${seed}`).toEqual([
          AT_REST,
          [keyOf("forkLeft"), keyOf("forkRight")].sort(),
        ])
        expect(positions.map(p => p.gateKeyId).sort(), `seed ${seed}`).toEqual(states.slice(1).sort())
        expect(
          positions.every(p => p.state === p.gateKeyId),
          `seed ${seed}`
        ).toBe(true)
      }
    })

    it("stands the encounter in the junction under the control's id, on a board that does not move with the carve", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, junction } of carves()) {
        expect(junction.roomType, `seed ${seed}`).toBe("fork")
        expect(junction.family, `seed ${seed}`).toBe("lightbeamSwitch")
        expect(junction.mechanismId, `seed ${seed}`).toBe("Y")
      }
      expect(new Set(carves().map(({ junction }) => junction.boardIndex)).size).toBe(1)
    })

    it("serves the board the world deals its control, where a dealer is given", () => {
      const { seed } = carves()[0]
      const result = assembleFloor(SITE, forkSwitched(), seed, resolveEncounter, {
        resolveBoardIndex: (_familyId, address) => (address.section === "mechanism:Y" ? 3 : undefined),
      })
      if (!result.success) throw new Error(`seed ${seed} carved before`)
      const junction = result.grid.cells.flat().find(cell => cell.type === "room" && cell.mechanismId === "Y")
      expect(junction?.type === "room" && junction.boardIndex).toBe(3)
    })

    it("opens no exit of the junction in rest, and each state opens only its own, on every carved seed", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, grid, at, junction } of carves()) {
        expect(junction.mechanism!.initial, `seed ${seed}`).toBe(AT_REST)
        const seams = [keyOf("forkLeft"), keyOf("forkRight")]
        const atRest = openDoorsFor(grid, 0, new Map())
        expect(
          seams.filter(key => atRest.has(key)),
          `seed ${seed} at rest`
        ).toEqual([])
        const address = cellAddress(grid, 0, at[0], at[1])!
        for (const state of junction.mechanism!.states.slice(1)) {
          const open = openDoorsFor(grid, 0, new Map([[address, state]]))
          expect(
            seams.filter(key => open.has(key)),
            `seed ${seed} in ${state}`
          ).toEqual([state])
        }
      }
    })

    it("closes only the seams: every exit naming a gate leads into that gate's room, and the main path onward names none", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, grid, at, junction } of carves()) {
        const gated = (junction.exits ?? []).filter(exit => exit.gateKeyId !== undefined)
        expect(gated.map(exit => exit.gateKeyId).sort(), `seed ${seed}`).toEqual(
          [keyOf("forkLeft"), keyOf("forkRight")].sort()
        )
        for (const exit of gated) {
          const [dr, dc] = DIR_MOVE[exit.dir]
          const beside = grid.cells[at[0] + dr * 2]?.[at[1] + dc * 2]
          expect(beside?.type, `seed ${seed} ${exit.dir}`).toBe("room")
          const door = beside as RoomCell
          expect(door.requiredKeyId, `seed ${seed} ${exit.dir}`).toBe(exit.gateKeyId)
          expect(door.region, `seed ${seed} ${exit.dir}`).toBe(REGION_BEYOND[exit.gateKeyId!])
        }
        expect(
          (junction.exits ?? []).filter(exit => exit.kind === "main" && exit.gateKeyId !== undefined),
          `seed ${seed}`
        ).toEqual([])
      }
    })

    // Its one-shot S1 seals the chamber it stands in, so the walk refuses a lost region and nothing before it.
    it("reads as a lock that strands nobody, its one-shot lever's chamber lost, on every carved seed", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, grid } of carves()) {
        const result = walkLock(floorLock(grid)!)
        expect(result.sound ? "sound" : result.failure.type, `seed ${seed}`).toBe("regionLost")
      }
    })

    it("seats no separate control room for the fork-switch: the junction is its only cell", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, grid } of carves()) {
        const rooms = grid.cells.flat().filter(cell => cell.type === "room" && cell.mechanismId === "Y")
        expect(rooms, `seed ${seed}`).toHaveLength(1)
      }
    })

    it("has the junction and both its gates wear one mark, and each exit carries the mark of its own gate", () => {
      expect(carves().length).toBeGreaterThan(0)
      for (const { seed, grid, at, junction } of carves()) {
        expect(junction.mark, `seed ${seed}`).toBeDefined()
        for (const exit of (junction.exits ?? []).filter(exit => exit.gateKeyId !== undefined)) {
          const [dr, dc] = DIR_MOVE[exit.dir]
          const door = grid.cells[at[0] + dr * 2][at[1] + dc * 2] as RoomCell
          expect(door.mark, `seed ${seed} ${exit.dir}`).toEqual(junction.mark)
          expect(exit.mark, `seed ${seed} ${exit.dir}`).toEqual(door.mark)
        }
      }
    })

    // The whole refusal list, asserted for each: a fault that also dragged another one in would be a
    // second thing the author has to read before finding what they wrote.
    const refusedWith = (config: FloorConfig) => {
      const result = assembleFloor("site-fork-switch-refused", config, 1, resolveEncounter)
      return result.success ? "carved" : result.reasons
    }

    it("refuses a fork-switch whose region has no fork naming it, by the fork-switch's id", () => {
      expect(refusedWith({ ...forkSwitched(), forks: undefined })).toEqual([
        { type: "forkSwitchNoFork", id: "Y", region: "entrance" },
      ])
    })

    it("refuses a fork-switch authored without an encounter", () => {
      const config = forkSwitched()
      config.controls = [{ id: "Y", in: "entrance", control: "fork-switch" } as never, ...config.controls!.slice(1)]
      expect(refusedWith(config)).toEqual([{ type: "forkSwitchNoEncounter", id: "Y" }])
    })

    it("refuses a gate a fork-switch owns that is not a seam leaving its region, by the gate's id", () => {
      const config = forkSwitched()
      config.obstacles = config.obstacles!.map(o =>
        o.kind === "gate" && o.id === "greenRight" ? { ...o, owners: ["Y"] } : o
      )
      config.controls = config.controls!.map(control =>
        control.control === undefined && control.id === "S1"
          ? { ...control, opens: { start: [], thrown: ["greenLeft"] } }
          : control
      )
      expect(refusedWith(config)).toEqual([{ type: "gateOwnedOffSeam", id: "greenRight", owner: "Y" }])
    })

    it("refuses a seam of the fork that carries no gate the fork-switch owns", () => {
      const config = forkSwitched()
      config.obstacles = config.obstacles!.filter(o => o.id !== "forkRight")
      expect(refusedWith(config)).toEqual([
        { type: "forkSwitchSeamUngated", id: "Y", between: ["entrance", "rightLower"] },
      ])
    })

    it("refuses a seam carrying two gates the fork-switch owns, since its exit would have no one key", () => {
      const config = forkSwitched()
      config.obstacles = [
        ...config.obstacles!,
        {
          id: "forkLeftAgain",
          kind: "gate",
          at: { on: "connection", between: ["leftLower", "entrance"] },
          owners: ["Y"],
        },
      ]
      expect(refusedWith(config)).toEqual([
        { type: "forkSwitchSeamGatedTwice", id: "Y", between: ["entrance", "leftLower"] },
      ])
    })

    it("refuses an owner that is not a fork-switch, or not a control at all, naming the gate and the owner", () => {
      const config = forkSwitched()
      config.obstacles = config.obstacles!.map(o =>
        o.kind === "gate" && o.id === "forkLeft" ? { ...o, owners: ["Y", "S1", "ghost"] } : o
      )
      expect(refusedWith(config)).toEqual([
        { type: "gateOwnerNotForkSwitch", id: "forkLeft", owner: "S1" },
        { type: "gateOwnerNotForkSwitch", id: "forkLeft", owner: "ghost" },
      ])
    })

    it("refuses a gate both a fork-switch owns and a control opens, since mixed ownership is not carved", () => {
      const config = forkSwitched()
      config.controls = config.controls!.map(control =>
        control.control === undefined && control.id === "S1"
          ? { ...control, opens: { start: ["greenRight", "forkLeft"], thrown: ["greenLeft"] } }
          : control
      )
      expect(refusedWith(config)).toEqual([{ type: "gateOwnedTwice", id: "forkLeft", owner: "Y" }])
    })
  })
})
