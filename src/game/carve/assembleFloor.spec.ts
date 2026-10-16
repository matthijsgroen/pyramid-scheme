import "@/mods/registerModApps"
import { assembleFloor } from "./assembleFloor"
import { MECHANISM_AT_REST } from "../siteTypes"
import { validateSite } from "../siteValidator"
import { openDoorsFor } from "../mechanismDoors"
import { designerDoubleBack, forkSwitchFloorConfig as forkSwitched } from "../testSupport/forkSwitchFixtures"
import { cellAddress } from "../cellAddress"
import { floorLock } from "../floorLock"
import { walkLock } from "../lockWalk"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { beforeAll, describe, expect, it } from "vitest"
import {
  DIR_MOVE,
  graphDistance,
  basicConfig,
  firstPyramid,
  isGateRoom,
  isStairheadRoom,
  findRoom,
} from "./carveFixtures"
import type { Direction, FloorConfig, FloorGrid, RoomCell } from "../siteTypes"

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

  it("is deterministic: same seed produces same grid", () => {
    const a = assembleFloor("site-1", basicConfig(), 12345)
    const b = assembleFloor("site-1", basicConfig(), 12345)
    expect(a).toEqual(b)
  })

  it("succeeds for the first pyramid config (0 main puzzles, 2 sections)", () => {
    const result = assembleFloor("site-1", firstPyramid(), 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, isStairheadRoom)).not.toBeNull()
      expect(findRoom(result.grid, isGateRoom)).not.toBeNull()
    }
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
})

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
