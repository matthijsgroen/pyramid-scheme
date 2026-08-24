import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { validateSite } from "./siteValidator"

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
      // 0 main-path puzzles, so every "puzzle" room found below unambiguously belongs to
      // the sealed side section rather than the main path.
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
      13,
      13,
      [0, 2],
      [2, 4],
    ])
    expect([pyramid.grid.rows, pyramid.grid.cols, pyramid.grid.entrancePos, pyramid.grid.exitPos]).toEqual([
      15,
      15,
      [12, 0],
      [8, 8],
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
