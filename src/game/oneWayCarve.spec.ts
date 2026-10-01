import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter, ONE_WAY_RUN_CELLS } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "./siteTypes"
import { nodeBeyond } from "./siteValidator"

const floorWithDrop = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
})

// Which cells a carve offers is the seed's choice, so seeds are tried until one satisfies the
// authored drop — and running out is a throw, never a silent skip.
const assembled = (config: FloorConfig): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config, seed, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success) return result.grid
  }
  throw new Error("no seed carved the authored drop")
}

const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<string, Direction> = { n: "s", s: "n", e: "w", w: "e" }

/** Every cell pair the grid joins in one direction and not the other. */
const oneWayEdges = (grid: FloorGrid) => {
  const found: { from: [number, number]; to: [number, number]; dir: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir as string]
        const target = grid.cells[r + dr]?.[c + dc]
        if (!target || target.type === "empty") continue
        if (!target.dirs.has(OPPOSITE[dir as string]))
          found.push({ from: [r, c], to: [r + dr, c + dc], dir: dir as string })
      }
    }
  return found
}

/** Every adjacent pair the grid joins in one direction — whether the far cell names the way back is
 * left to the caller, so an assertion about that is not this selection restated. */
const edgesOf = (grid: FloorGrid) => {
  const found: { from: [number, number]; to: [number, number]; dir: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir as string]
        const target = grid.cells[r + dr]?.[c + dc]
        if (!target || target.type === "empty") continue
        found.push({ from: [r, c], to: [r + dr, c + dc], dir: dir as string })
      }
    }
  return found
}

const addressAt = (grid: FloorGrid, [r, c]: [number, number]) => {
  const cell = grid.cells[r][c]
  return cell.type === "empty" ? undefined : cell.sectionAddress
}

const dirsAt = (grid: FloorGrid, [r, c]: [number, number]): ReadonlySet<Direction> => {
  const cell = grid.cells[r][c]
  if (cell.type === "empty") throw new Error(`nothing is carved at ${r},${c}`)
  return cell.dirs
}

// Whether a finished room is walked back into is the family registry's answer, and core assembles
// without the registry — a switch is refused outright unless its family offers the walk back, so the
// stub grants it. (The same stub src/game/floorLock.spec.ts uses, for the same reason.)
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const posKey = (r: number, c: number) => `${r},${c}`
const carved = (cell: GridCell | undefined) => !!cell && cell.type !== "empty"

/** Every door a reserved junction's switch closed: the room its gated way out leads to. */
const switchDoorsOf = (grid: FloorGrid): string[] => {
  const doors: string[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room") continue
      for (const exit of cell.exits ?? []) {
        if (exit.gateKeyId === undefined) continue
        const door = nodeBeyond(grid, [r, c], exit.dir)
        if (door) doors.push(posKey(door[0], door[1]))
      }
    }
  return doors
}

/** The cells the way in reaches across passages open BOTH ways, never stepping on `shut` — so what a
 * door shuts off is what drops out of this, and a drop is never counted as a way in. */
const twoWayReach = (grid: FloorGrid, shut: string): Set<string> => {
  const start = posKey(grid.entrancePos[0], grid.entrancePos[1])
  const seen = new Set<string>()
  if (start === shut) return seen
  seen.add(start)
  const queue = [start]
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at].split(",").map(Number)
    for (const dir of dirsAt(grid, [r, c])) {
      const [dr, dc] = MOVES[dir as string]
      const [nr, nc] = [r + dr, c + dc]
      if (!carved(grid.cells[nr]?.[nc]) || !dirsAt(grid, [nr, nc]).has(OPPOSITE[dir as string])) continue
      if (posKey(nr, nc) === shut || seen.has(posKey(nr, nc))) continue
      seen.add(posKey(nr, nc))
      queue.push(posKey(nr, nc))
    }
  }
  return seen
}

/** Every drop on the grid, read off the cells that carry the `obstacle` marker: the cells of its span in
 * order, the launch and landing cells either side, and the two nodes they hang off. */
type Drop = { source: string; launch: string; run: string[]; landingCell: string; landing: string; dir: Direction }
const dropPairs = (grid: FloorGrid): Drop[] => {
  const markerAt = (r: number, c: number) => {
    const cell = grid.cells[r]?.[c]
    return cell?.type === "corridor" ? cell.obstacle : undefined
  }
  const drops: Drop[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const marker = markerAt(r, c)
      if (!marker) continue
      const [dr, dc] = MOVES[marker.dir]
      if (markerAt(r - dr, c - dc)?.dir === marker.dir) continue
      const run: string[] = []
      let [er, ec] = [r, c]
      while (markerAt(er, ec)?.dir === marker.dir) {
        run.push(posKey(er, ec))
        ;[er, ec] = [er + dr, ec + dc]
      }
      drops.push({
        source: posKey(r - 2 * dr, c - 2 * dc),
        launch: posKey(r - dr, c - dc),
        run,
        landingCell: posKey(er, ec),
        landing: posKey(er + dr, ec + dc),
        dir: marker.dir,
      })
    }
  return drops
}

const addressOfKey = (grid: FloorGrid, key: string) => {
  const [r, c] = key.split(",").map(Number)
  return addressAt(grid, [r, c])
}

/** The drops whose launch stands in section `from` and whose landing stands in section `to`, read off
 * the addresses of the cells themselves. */
const dropsBetween = (grid: FloorGrid, from: string, to: string) =>
  dropPairs(grid).filter(
    drop => addressOfKey(grid, drop.launch) === from && addressOfKey(grid, drop.landingCell) === to
  )

describe("a floor that authors a one-way", () => {
  it("carves the drop between the two sections the author named, and leaves no cell one-way", () => {
    // Launch and landing are read off the addresses of the cells themselves, so a drop aimed into a
    // section nobody named fails here. Every passage on the floor is joined both ways: the obstacle is
    // a span of cells nothing names, never a corridor with a one-way direction.
    const grid = assembled(floorWithDrop())
    expect(dropsBetween(grid, "upper", "lower")).toHaveLength(1)
    expect(dropPairs(grid)).toHaveLength(1)
    expect(oneWayEdges(grid)).toEqual([])
  })

  it("declares five obstacle cells, the odd count nearest the art's measured 5.6", () => {
    expect(ONE_WAY_RUN_CELLS).toBe(5)
  })

  it("carves the launch, every obstacle cell and the landing, each as the design says", () => {
    // Asserted cell by cell, on every seed that carves: node, launch, each of the x obstacle cells,
    // landing, node — 2 + x cells between two nodes.
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", floorWithDrop(), seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      checked++
      const grid = result.grid
      const drops = dropPairs(grid)
      expect(drops).toHaveLength(1)
      const [drop] = drops
      const { dir } = drop
      const [dr, dc] = MOVES[dir]
      const [fr, fc] = drop.source.split(",").map(Number)
      const at = (steps: number): [number, number] => [fr + dr * steps, fc + dc * steps]

      // The far node stands 2 + x + 1 steps from the near one.
      expect(drop.landing).toBe(posKey(...at(ONE_WAY_RUN_CELLS + 3)))
      expect(drop.run).toHaveLength(ONE_WAY_RUN_CELLS)
      // The near node names the way to the launch; the far node names the way to the landing.
      expect(dirsAt(grid, at(0)).has(dir)).toBe(true)
      expect(dirsAt(grid, at(ONE_WAY_RUN_CELLS + 3)).has(OPPOSITE[dir])).toBe(true)

      // The launch: standable, reached from the near node, names nothing toward the obstacle.
      expect(drop.launch).toBe(posKey(...at(1)))
      expect(grid.cells[at(1)[0]][at(1)[1]].type).toBe("corridor")
      expect([...dirsAt(grid, at(1))]).toEqual([OPPOSITE[dir]])

      // Every obstacle cell: a corridor drawn on the grid, naming no direction at all, marked with the
      // way the drop runs.
      drop.run.forEach((cellKey, k) => {
        expect(cellKey).toBe(posKey(...at(k + 2)))
        const cell = grid.cells[at(k + 2)[0]][at(k + 2)[1]]
        expect(cell.type).toBe("corridor")
        if (cell.type !== "corridor") return
        expect([...cell.dirs]).toEqual([])
        expect(cell.obstacle).toEqual({ dir })
      })

      // The landing: standable, reached from the far node, names nothing back toward the obstacle.
      expect(drop.landingCell).toBe(posKey(...at(ONE_WAY_RUN_CELLS + 2)))
      expect(grid.cells[at(ONE_WAY_RUN_CELLS + 2)[0]][at(ONE_WAY_RUN_CELLS + 2)[1]].type).toBe("corridor")
      expect([...dirsAt(grid, at(ONE_WAY_RUN_CELLS + 2))]).toEqual([dir])
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("lets no cell on the floor name a way into an obstacle cell, so no walk can cross it", () => {
    // The whole set, not an absence of one cell's claim: every (cell, direction) pair on the floor
    // that leads onto an obstacle cell, which is none — and every obstacle cell names nothing itself.
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", floorWithDrop(), seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      checked++
      const grid = result.grid
      const obstacle = new Set(dropPairs(grid).flatMap(drop => drop.run))
      expect(obstacle.size).toBe(ONE_WAY_RUN_CELLS)
      expect(edgesOf(grid).filter(edge => obstacle.has(posKey(edge.to[0], edge.to[1])))).toEqual([])
      expect(edgesOf(grid).filter(edge => obstacle.has(posKey(edge.from[0], edge.from[1])))).toEqual([])
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("builds the drop's connector with the identity every other corridor carries", () => {
    // A corridor's explored state is filed under its section hash and its identity is its ordinal, so
    // a connector missing either is a stretch of floor no save can restore and no re-carve can find
    // again. The drop's is built by the same helper as every other, off the node it falls from.
    const grid = assembled(floorWithDrop())
    const [pair] = dropPairs(grid)
    const [fr, fc] = pair.source.split(",").map(Number)
    const source = grid.cells[fr][fc]
    if (source.type === "empty") throw new Error("the drop is not carved")
    expect(pair.run).toHaveLength(ONE_WAY_RUN_CELLS)
    for (const cellKey of [pair.launch, ...pair.run]) {
      const [r, c] = cellKey.split(",").map(Number)
      const connector = grid.cells[r][c]
      if (connector.type === "empty") throw new Error("the drop is not carved")
      expect(connector.sectionAddress).toBe(source.sectionAddress)
      expect(connector.sectionHash).toBe(source.sectionHash)
      expect(connector.legacySectionHash).toBe(source.legacySectionHash)
      expect(connector.ordinal).toBeDefined()
      expect(connector.difficulty).toBe("junior")
    }
    // The landing answers to the section it stands in, which is the far node's.
    const [lr, lc] = pair.landing.split(",").map(Number)
    const far = grid.cells[lr][lc]
    const [mr, mc] = pair.landingCell.split(",").map(Number)
    const landing = grid.cells[mr][mc]
    if (far.type === "empty" || landing.type === "empty") throw new Error("the drop is not carved")
    expect(landing.sectionAddress).toBe(far.sectionAddress)
    expect(landing.sectionHash).toBe(far.sectionHash)
    expect(landing.ordinal).toBeDefined()
  })

  it("never lets a cell of the drop share its (sectionAddress, ordinal) with another cell", () => {
    // (sectionAddress, ordinal) is the pair a save actually keys a corridor by once it has no room slot
    // (cellIdentity.ts's fallback `~ordinal`, filed under the cell's own sectionAddress) — so the drop's
    // connector claiming the same pair as any other cell is one save slot doing double duty. Checked
    // against every OTHER cell on the floor, not just the drop's own two nodes: the connector is filed
    // under its FROM section's address, and what it could collide with is that section's own ordinary
    // corridors. Which step of `to` the carve happens to land the drop on is the carve's own luck, so
    // this checks every seed that places the drop, not just the first.
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", floorWithDrop(), seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      checked++
      const grid = result.grid
      const [pair] = dropPairs(grid)
      // Every cell of the run against every cell of the floor, itself excepted: the run's cells must
      // not share an identity with each other either.
      const identityAt = (r: number, c: number) => {
        const cell = grid.cells[r][c]
        return cell.type === "empty" || cell.ordinal === undefined
          ? undefined
          : `${cell.sectionAddress}#${cell.ordinal}`
      }
      expect(pair.run).toHaveLength(ONE_WAY_RUN_CELLS)
      for (const runKey of [pair.launch, ...pair.run, pair.landingCell]) {
        const [mr, mc] = runKey.split(",").map(Number)
        const identity = identityAt(mr, mc)
        if (identity === undefined) throw new Error("the drop is not carved")
        for (let r = 0; r < grid.rows; r++)
          for (let c = 0; c < grid.cols; c++) {
            if (r === mr && c === mc) continue
            if (identityAt(r, c) === identity)
              throw new Error(`seed ${seed}: "${identity}" is claimed by both the drop's run and (${r},${c})`)
          }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("gives two authored drops two passages, never one connector written twice", () => {
    // Two demands that both fit the same cell pair would leave one connector holding the second and
    // the first gone with nothing reported — which is exactly what a structural field promises not to
    // do. So the second takes another pair, or the carve comes up short and says so.
    const twice: FloorConfig = {
      ...floorWithDrop(),
      oneWays: [
        { from: "upper", to: "lower" },
        { from: "upper", to: "lower" },
      ],
    }
    let checked = 0
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", twice, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) {
        expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
        continue
      }
      checked++
      expect(new Set(dropPairs(result.grid).map(pair => `${pair.source} to ${pair.landing}`)).size).toBe(2)
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("carves an ordinary floor with no one-way in it at all", () => {
    const plain = { ...floorWithDrop(), oneWays: undefined }
    expect(oneWayEdges(assembled(plain))).toEqual([])
  })

  it("fails by name when a drop names a section the floor does not have", () => {
    // A misnamed end is an authoring slip, not a seed problem: no attempt could ever satisfy it, so
    // it is refused once rather than re-carved sixty times.
    const misnamed: FloorConfig = { ...floorWithDrop(), oneWays: [{ from: "upper", to: "nowhere" }] }
    const result = assembleFloor("spec:1", misnamed, 1, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
  })

  it("fails by name when no attempt can place the drop", () => {
    // Both ends exist, but a floor with nothing on it gives the carve no two sections to hold two
    // cells apart — so every attempt is rejected and the floor says which drop it could not place.
    const cramped: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", label: "only" }],
      oneWays: [{ from: "only", to: "main" }],
    }
    const result = assembleFloor("spec:1", cramped, 1, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    // If this floor DOES carve, the drop was placeable after all — so the authored passage has to be
    // on it, which is the claim, rather than a shape (a cell with one way out) every carve has anyway.
    if (result.success) {
      expect(dropsBetween(result.grid, "only", "main")).not.toEqual([])
      return
    }
    expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
  })

  it("refuses, by name and on every seed, more runs than the floor has room to reserve", () => {
    // Never a shorter drop, never one placed somewhere else: where the next run does not fit, the floor
    // says which drop it could not place. Each drop reserves 2 + ONE_WAY_RUN_CELLS cells of its own, so a
    // small floor asked for far more drops than it has ground for runs out whatever the seed.
    const crowded: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", label: "only" }],
      oneWays: Array.from({ length: 40 }, () => ({ from: "only", to: "main" })),
    }
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", crowded, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (result.success) throw new Error(`seed ${seed} carved a drop on a floor with no room for its run`)
      expect(result.reasons).toContainEqual({ type: "oneWayUnsatisfied", from: "only", to: "main" })
    }
  })

  it("refuses, on every seed, drops whose 2 + x cells each will not fit though x alone would", () => {
    // Five drops fit on this floor when only the obstacle's own cells are reserved between two nodes
    // (three of forty seeds carve them); reserving a launch and a landing as well leaves no room for
    // the fifth on any seed, and the floor says which drop it could not place.
    const five: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", label: "only" }],
      oneWays: Array.from({ length: 5 }, () => ({ from: "only", to: "main" })),
    }
    for (let seed = 0; seed < 40; seed++) {
      const result = assembleFloor("spec:1", five, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (result.success) throw new Error(`seed ${seed} carved five drops of 2 + x cells where none fit`)
      expect(result.reasons).toContainEqual({ type: "oneWayUnsatisfied", from: "only", to: "main" })
    }
  })

  it("refuses a drop into a section a gate is meant to isolate", () => {
    // A gate exists to be earned; a drop landing past it hands over what it guards. So this is not a
    // seed problem — no attempt may ever satisfy it — and it is refused by name on every seed rather
    // than carved by whichever one happens to land past the door.
    const gated: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "vault", gate: { type: "floor-key" } },
      ],
      oneWays: [{ from: "main", to: "vault" }],
    }
    // Every seed, not the first that carves: the refusal is a property of the authoring, so no layout
    // is entitled to satisfy it.
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", gated, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (result.success) throw new Error(`seed ${seed} carved a drop into a gated section`)
      expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
    }
  })

  it("refuses a drop from one gated section into another", () => {
    // Being past one door is not permission to skip a different one: a player who earned vaultA's key
    // has earned nothing toward vaultB's, so this is refused by name the same way a drop into an
    // ungated section's own gate is.
    const twoVaults: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "vaultA", gate: { type: "floor-key" } },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "vaultB", gate: { type: "floor-key" } },
      ],
      oneWays: [{ from: "vaultA", to: "vaultB" }],
    }
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", twoVaults, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (result.success) throw new Error(`seed ${seed} carved a drop between two gated sections`)
      expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
    }
  })

  it("still allows a drop leaving a gated section for open ground", () => {
    // The ruling refuses crossing INTO ground shut by a door the player hasn't earned — it never
    // touches leaving one: a drop out of `vault` and into the (ungated) main path stays legal, because
    // nothing stands between the way in and where it lands.
    const leavingVault: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "vault", gate: { type: "floor-key" } },
      ],
      oneWays: [{ from: "vault", to: "main" }],
    }
    // Every seed that carves, not the first: carving proves a layout was found, never that the drop on
    // it runs the way the author asked for.
    let carved = 0
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", leavingVault, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      carved++
      expect(dropsBetween(result.grid, "vault", "main")).toHaveLength(1)
    }
    expect(carved).toBeGreaterThan(0)
  })

  it("allows a drop that runs inside one gated section, which earns the player nothing new", () => {
    // The permitted half of the same ruling: both ends stand behind the one door, so a player taking
    // the drop is somewhere they had already earned. A rule tightened to refuse any gated landing
    // would shut this shape out, and nothing else here would notice.
    const insideVault: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "junior", end: "treasure", label: "vault", gate: { type: "floor-key" } },
      ],
      oneWays: [{ from: "vault", to: "vault" }],
    }
    let carved = 0
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", insideVault, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      carved++
      expect(dropsBetween(result.grid, "vault", "vault")).not.toEqual([])
    }
    expect(carved).toBeGreaterThan(0)
  })

  it("refuses a drop into a hidden section, and still allows one out of it", () => {
    // A way the player can SEE is a statement that something is there, and a hidden section is the
    // statement that nothing is until they find otherwise — the same reasoning that keeps a fork's
    // gate out of one. Leaving a hidden section gives nothing away, so it stays legal.
    const secret = { pathPuzzles: 1, difficulty: "junior" as const, end: "treasure" as const, label: "secret" }
    const base: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ ...secret, hidden: true }],
      oneWays: [{ from: "main", to: "secret" }],
    }
    // Every seed: the refusal is a property of the authoring, so no layout is entitled to satisfy it.
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", base, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (result.success) throw new Error(`seed ${seed} carved a drop into a hidden section`)
      expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
    }
    const leaving: FloorConfig = { ...base, oneWays: [{ from: "secret", to: "main" }] }
    let carvedLeaving = 0
    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("spec:1", leaving, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      carvedLeaving++
      expect(dropsBetween(result.grid, "secret", "main")).toHaveLength(1)
    }
    expect(carvedLeaving).toBeGreaterThan(0)
  })

  it("never lands a drop behind a door the switch closes", () => {
    // A switch's doors are minted after the carve, not authored, so nothing in the floor config says
    // where they will stand. The claim is about the finished grid: whatever a reserved junction shut,
    // the drop does not hand the player the far side of it without the board being solved.
    const switchedFloor: FloorConfig = {
      ...floorWithDrop(),
      forks: [{ exits: 2, count: 1 }],
      switches: { encounter: "sumplete", min: 1, max: 1 },
    }
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", switchedFloor, seed, reEnterableFamilies, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      const grid = result.grid
      const doors = switchDoorsOf(grid)
      if (doors.length === 0) continue
      const pairs = dropPairs(grid)
      if (pairs.length === 0) continue
      checked++
      for (const door of doors) {
        const stillReached = twoWayReach(grid, door)
        for (const { source, landing } of pairs)
          expect(stillReached.has(source) && !stillReached.has(landing)).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("never hangs a drop off the exit, which has to stay a dead end", () => {
    // `floorWithDrop` (upper→lower) never gives a candidate a reason to touch the exit — neither end
    // is `main`, and the exit only ever carries `main`'s address. A one-way naming `main` does: the
    // exit is one of `main`'s own node cells, and without the guard this fixture lands a candidate on
    // it on roughly a quarter of seeds (checked while writing this test). So this checks every seed
    // that carves, not just the first, against a fixture the guard actually has something to refuse.
    const droppingIntoMain: FloorConfig = {
      pathPuzzles: 2,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" }],
      oneWays: [{ from: "upper", to: "main" }],
    }
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", droppingIntoMain, seed, undefined, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (!result.success) continue
      checked++
      const grid = result.grid
      const exitKey = `${grid.exitPos[0]},${grid.exitPos[1]}`
      expect(dropPairs(grid).length).toBeGreaterThan(0)
      for (const drop of dropPairs(grid))
        for (const key of [drop.source, drop.launch, ...drop.run, drop.landingCell, drop.landing])
          expect(key).not.toBe(exitKey)
    }
    expect(checked).toBeGreaterThan(0)
  })
})
