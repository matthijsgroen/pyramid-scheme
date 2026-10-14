import { describe, expect, it } from "vitest"
import { firstCarved, plainFloor, prepOf, DIR_MOVE, graphDistance, isPuzzleRoom, findRoom } from "./carveFixtures"
import { makePkey } from "./grid"
import { chainRooms, paddedChainLength } from "./ids"
import { assembleFloor } from "./assembleFloor"
import { validateSite } from "../siteValidator"
import type { SideSection, FloorConfig } from "../siteTypes"
import type { Chain, SectionGroup } from "./state"
const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

describe("hangBranches", () => {
  const prep = prepOf(
    plainFloor({
      pathPuzzles: 2,
      packing: 1,
      sideSections: [section(), section({ sideSections: [section(), section({ pathPuzzles: 0 })] }), section()],
    })
  )
  const state = firstCarved(prep)
  const { groups, subChains, used, carved } = state.branches!
  const { n, passages } = state.maze!
  const pkey = makePkey(n)
  const joined = ([r1, c1]: [number, number], [r2, c2]: [number, number]) =>
    passages.has(pkey(r1, c1, r2, c2)) || carved.has(pkey(r1, c1, r2, c2))
  const walks = (chain: SectionGroup | Chain) =>
    [chain.attachedAt, ...chain.cells].every((cell, i, all) => i === 0 || joined(all[i - 1], cell))

  it("hangs every authored section a chain as long as its packing asks, walkable from where it attaches", () => {
    expect(groups.map(g => g.sectionIdx).sort()).toEqual([0, 1, 2])
    for (const group of groups) {
      const positional = `s${group.sectionIdx}`
      const rooms = chainRooms(
        prep.mechanisms.leverAtPositional,
        prep.sections.sideSections[group.sectionIdx],
        positional
      )
      expect(group.cells).toHaveLength(paddedChainLength(state.rung.chainPacking, rooms))
      expect(walks(group)).toBe(true)
    }
  })

  it("hangs each sub-section off a cell of its parent's chain", () => {
    const parent = groups.find(g => g.sectionIdx === 1)!
    expect(subChains.map(c => c.positional)).toEqual(["s1.0", "s1.1"])
    for (const sub of subChains) {
      expect(parent.cells.slice(0, -1)).toContainEqual(sub.attachedAt)
      expect(walks(sub)).toBe(true)
    }
  })

  it("never lets two chains share a cell, and claims every cell it hung", () => {
    const cells = [...groups, ...subChains].flatMap(chain => chain.cells.map(([r, c]) => `${r},${c}`))
    expect(new Set(cells).size).toBe(cells.length)
    for (const cell of cells) expect(used.has(cell)).toBe(true)
  })
})

describe("carved through assembleFloor", () => {
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
})
