import { expect } from "vitest"
import { expandFloorLocks, FLOOR_EXIT } from "../floorLocks"
import type { LaidFloor } from "../laidFloor"
import { assembleFloor } from "../siteAssembler"
import type { AssembleFloorKeyRequirements, ResolveEncounter } from "../siteAssembler"
import { adjacencyFaults } from "../carveAgreement"
import { appetiteAccepts, regionRoute } from "../regions"
import type { ContentKind } from "../regions"
import { MECHANISM_AT_REST } from "../siteTypes"
import type { AssemblerReason, Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "../siteTypes"

export const CARVE_FAULT_TYPES = new Set<AssemblerReason["type"]>([
  "regionAttachedThrough",
  "regionsNotJoined",
  "gateDoorMisplaced",
  "dropLandsApart",
])

export type LaidCarve =
  { ok: true; seed: number; grid: FloorGrid; laid: LaidFloor } | { ok: false; seed: number; reasons: AssemblerReason[] }

/** One carve at one seed with a single attempt, so a carve fault shows as the floor's failure and is never retried away. */
export const carveOnce = (
  siteId: string,
  config: FloorConfig,
  seed: number,
  resolve: ResolveEncounter | undefined,
  more: AssembleFloorKeyRequirements = {}
): LaidCarve => {
  let laid: LaidFloor | undefined
  const result = assembleFloor(siteId, config, seed, resolve, {
    ...more,
    floorRef: { journeyId: siteId, floorIndex: 0 },
    maxAttempts: 1,
    onLaid: found => (laid = found),
  })
  return result.success
    ? { ok: true, seed, grid: result.grid, laid: laid! }
    : { ok: false, seed, reasons: result.reasons }
}

const DIRS: Record<Direction, [number, number]> = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] }
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }
const rc = (cell: string) => cell.split(",").map(Number) as [number, number]
const at = (grid: FloorGrid, key: string): GridCell => {
  const [r, c] = rc(key)
  return grid.cells[r]?.[c] ?? { type: "empty" }
}
const dirsOf = (cell: GridCell): ReadonlySet<Direction> =>
  cell.type === "room" || cell.type === "corridor" ? cell.dirs : new Set<Direction>()
const isNode = (r: number, c: number) => r % 2 === 0 && c % 2 === 0

/** Every node of the grid that belongs to the lock's own ground: the route and the stretches off it. */
const lockGround = (grid: FloorGrid): string[] => {
  const found: string[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (
        !isNode(r, c) ||
        (cell.type !== "room" && cell.type !== "corridor") ||
        (cell.type === "corridor" && cell.obstacle)
      )
        return
      if (cell.sectionAddress === "main" || cell.sectionAddress?.startsWith("lock:")) found.push(`${r},${c}`)
    })
  )
  return found.sort()
}

/**
 * THE CARVE IS THE LAID FLOOR: the lock's ground is exactly the laid nodes, each wearing the laid region, the
 * ways between them exactly the laid passages, the junction leaving by the route and its arms alone, and every
 * drop's run standing where it was laid.
 */
export const expectCarveReadsLaid = (grid: FloorGrid, laid: LaidFloor): void => {
  const routeKeys = laid.route.map(([r, c]) => `${r},${c}`)
  const laidNodes = new Set([...routeKeys, ...laid.chains.flatMap(chain => chain.cells.map(([r, c]) => `${r},${c}`))])
  expect(lockGround(grid)).toEqual([...laidNodes].sort())
  for (const node of laidNodes) expect((at(grid, node) as { region?: string }).region).toBe(laid.label.get(node))

  const passages = new Set(laid.passages)
  const pairKey = (a: string, b: string) => {
    const [ar, ac] = rc(a)
    const [br, bc] = rc(b)
    const x = ar * laid.n + ac
    const y = br * laid.n + bc
    return x < y ? `${x}-${y}` : `${y}-${x}`
  }
  for (const node of laidNodes) {
    const [r, c] = rc(node)
    for (const dir of ["e", "s"] as const) {
      const [dr, dc] = DIRS[dir]
      const beside = `${r + 2 * dr},${c + 2 * dc}`
      if (!laidNodes.has(beside)) continue
      const open = dirsOf(at(grid, node)).has(dir) && dirsOf(at(grid, beside)).has(OPPOSITE[dir])
      expect(open, `${node} to ${beside}`).toBe(passages.has(pairKey(node, beside)))
    }
  }

  for (const junction of laid.junctions) {
    const room = at(grid, junction.cell)
    if (room.type !== "room" || room.roomType !== "fork") throw new Error(`junction ${junction.cell} is no fork`)
    const wanted = [
      routeKeys[junction.step - 1],
      routeKeys[junction.step + 1],
      ...junction.arms.map(arm => arm.first),
    ].sort()
    const [r, c] = rc(junction.cell)
    const leaves = [...room.dirs].map(dir => `${r + 2 * DIRS[dir][0]},${c + 2 * DIRS[dir][1]}`).sort()
    expect(leaves).toEqual(wanted)
  }

  for (const drop of laid.drops)
    for (const cell of drop.run) {
      const run = at(grid, cell)
      expect(run.type === "corridor" && run.obstacle !== undefined, `drop ${drop.id} at ${cell}`).toBe(true)
    }
}

/** The main path runs the whole top-level route, in order, and ends at the exit in the floor's exit region. */
export const expectRouteIsWholeRoute = (grid: FloorGrid, config: FloorConfig, laid: LaidFloor): void => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) throw new Error("did not expand")
  const walked = grid.cells
    .flat()
    .flatMap(cell =>
      (cell.type === "room" || cell.type === "corridor") &&
      cell.sectionAddress === "main" &&
      /^\d+$/.test(cell.ordinal ?? "")
        ? [cell]
        : []
    )
    .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
  expect(walked.map(cell => cell.region)).toEqual(laid.routeLabels)
  const regionsAlong = laid.routeLabels.filter((region, i, all) => region !== all[i - 1])
  expect(regionsAlong).toEqual(regionRoute(expanded.config.regionLayout!))
  const [er, ec] = grid.exitPos
  expect([er, ec]).toEqual(laid.route[laid.route.length - 1])
  expect((grid.cells[er][ec] as { region?: string }).region).toBe(FLOOR_EXIT)
}

/** The carve agrees with the layout it was laid from: no two regions meet but across a connection, and every door shuts exactly two grounds. */
export const expectCarveAgrees = (grid: FloorGrid, config: FloorConfig): void => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) throw new Error("did not expand")
  expect(adjacencyFaults(grid.cells, expanded.config.regionLayout!)).toEqual([])
}

/**
 * NO WAY ROUND A DOOR: with one door shut and every other passable, what the way in reaches of the laid ground
 * is what the laid passages alone reach. A leftover maze edge, or a side path joined to two places, that let the
 * player step past the door would reach a node the laid floor keeps behind it. Read off the cells alone, over the
 * passages a player walks both ways.
 */
export const expectNoWayRoundADoor = (grid: FloorGrid, laid: LaidFloor): void => {
  const isDoor = (cell: GridCell) => cell.type === "room" && cell.requiredKeyId !== undefined
  const laidPairs = new Map<string, string[]>()
  for (const key of laid.passages) {
    const [x, y] = key.split("-").map(Number)
    const a = `${Math.floor(x / laid.n)},${x % laid.n}`
    const b = `${Math.floor(y / laid.n)},${y % laid.n}`
    laidPairs.set(a, [...(laidPairs.get(a) ?? []), b])
    laidPairs.set(b, [...(laidPairs.get(b) ?? []), a])
  }
  const start = `${laid.route[0][0]},${laid.route[0][1]}`
  const flood = (shut: string, next: (key: string) => string[]): Set<string> => {
    const seen = new Set<string>([start])
    const queue = [start]
    for (let i = 0; i < queue.length; i++)
      for (const beside of next(queue[i])) {
        if (seen.has(beside) || beside === shut) continue
        seen.add(beside)
        queue.push(beside)
      }
    return seen
  }
  const walked = (key: string): string[] => {
    const [r, c] = rc(key)
    return [...dirsOf(grid.cells[r][c])].flatMap(dir => {
      const [nr, nc] = [r + DIRS[dir][0], c + DIRS[dir][1]]
      const next = grid.cells[nr]?.[nc]
      return next && dirsOf(next).has(OPPOSITE[dir]) ? [`${nr},${nc}`] : []
    })
  }
  const laidNodes = new Set(laid.label.keys())
  for (const door of laid.doors) {
    const planned = flood(door, key => laidPairs.get(key) ?? [])
    const carved = [...flood(door, walked)].filter(key => laidNodes.has(key) && !isDoor(at(grid, key)))
    expect(
      carved.filter(key => !planned.has(key)),
      `past the door at ${door}`
    ).toEqual([])
  }
}

/** Every room holds only what its region's appetite takes: a puzzle, or a reward. */
export const expectContentFitsAppetite = (grid: FloorGrid, config: FloorConfig): void => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) throw new Error("did not expand")
  const appetite = new Map(expanded.config.regionLayout!.regions.map(region => [region.name, region.appetite]))
  for (const cell of grid.cells.flat()) {
    if (cell.type !== "room" || cell.region === undefined) continue
    const holds: ContentKind[] = []
    if (cell.roomType === "encounter" && cell.pathIndex !== undefined) holds.push("puzzle")
    if (cell.reward !== undefined || cell.stock !== undefined || cell.tags?.includes("treasure")) holds.push("reward")
    for (const kind of holds)
      expect(appetiteAccepts(appetite.get(cell.region) ?? "free", kind), `${cell.region} takes ${kind}`).toBe(true)
  }
}

/** A fork-switch's room stands the lightbeam family, with rest and one state for each way out it owns. */
export const expectForkSwitchRoom = (grid: FloorGrid, family: string): RoomCell => {
  const rooms = grid.cells
    .flat()
    .filter((cell): cell is RoomCell => cell.type === "room" && cell.exits?.some(exit => exit.gateKeyId) === true)
  expect(rooms).toHaveLength(1)
  const [junction] = rooms
  expect(junction.family).toBe(family)
  const seams = junction.exits!.filter(exit => exit.gateKeyId !== undefined)
  expect(junction.mechanism!.states[0]).toBe(MECHANISM_AT_REST)
  expect(junction.mechanism!.states.slice(1).sort()).toEqual(seams.map(exit => exit.gateKeyId).sort())
  return junction
}
