import { expandFloorLocks } from "../floorLocks"
import { planLockFloor } from "../lockPlan"
import { mulberry32 } from "../random"
import { carveFloor } from "./carveFloor"
import { firstRung } from "./ladder"
import { LATTICE_ENGINE } from "./engines"
import { prepareFloor } from "./prepareFloor"
import { assembleFloor } from "./assembleFloor"
import { defaultResolveEncounter } from "../siteAssembler"
import type { FloorConfig, FloorGrid, Direction, RoomCell } from "../siteTypes"
import type { StatefulControl } from "../obstacles"
import type { PlacedContainer, RegionGraph } from "../regions"
import type { CarveState, Cell, CellLabels, FloorPrep } from "./state"
import type { AssembleFloorKeyRequirements, ResolveEncounter } from "../siteAssembler"
/** A plain floor's config, with what a test sets on it. */
export const plainFloor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

/** The prep of a floor, its locks expanded and planned as `assembleFloor` does; throws where it refuses. */
export const prepOf = (config: FloorConfig, seed = 1, requirements: AssembleFloorKeyRequirements = {}): FloorPrep => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
  const result = prepareFloor("site", expanded.config, seed, requirements, planLockFloor(expanded))
  if (!result.ok) throw new Error(JSON.stringify(result.reasons))
  return result.prep
}

/** Attempt `attempt`'s state before any pass has run, on the first rung. */
export const freshState = (prep: FloorPrep, attempt = 0): CarveState => ({
  attempt,
  rung: firstRung(prep),
  rand: mulberry32(prep.input.seed + attempt * 7919),
})

/** hall → mid → vault along the route. */
export const hallMidVault: PlacedContainer = {
  regions: [
    { name: "hall", appetite: "free" },
    { name: "mid", appetite: "free" },
    { name: "vault", appetite: "free" },
  ],
  connections: [
    ["hall", "mid"],
    ["mid", "vault"],
  ],
  in: "hall",
  out: "vault",
}

/** A lever standing in `in` that opens every one of `opens`. */
export const leverOpening = (opens: string[], id = "lever", inRegion = "hall"): StatefulControl => ({
  id,
  in: inRegion,
  states: ["shut", "open"],
  initial: "shut",
  returnsToInitial: false,
  opens: { shut: [], open: opens },
})

/** A main path of `steps` nodes in a straight row, with no passage between them. */
export const straightWalk = (steps: number) => {
  const mainPath = Array.from({ length: steps }, (_, i): Cell => [0, i * 2])
  return { n: steps * 2 + 1, entrance: mainPath[0], exit: mainPath[steps - 1], mainPath, passages: new Set<string>() }
}

/** The state of the first attempt, climbing the ladder as the loop does, whose every pass holds. */
export const firstCarved = (prep: FloorPrep): CarveState => {
  let carved: CarveState | undefined
  carveFloor(prep, {
    ...LATTICE_ENGINE,
    finish: (_, state) => {
      carved ??= state
      return { rows: 0, cols: 0 } as unknown as FloorGrid
    },
  })
  if (!carved) throw new Error("no attempt got through every pass")
  return carved
}

/** The route runs entrance → leftLower → out; rightLower and s1Chamber hang off it as one chain. */
export const diamond: PlacedContainer = {
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
}

/** Labels with nothing filed yet, for a test to fill what its pass reads. */
export const noLabels = (): CellLabels => ({
  sectionHash: new Map(),
  legacySectionHash: new Map(),
  address: new Map(),
  ordinal: new Map(),
  hidden: new Set(),
  dressing: new Map(),
  difficulty: new Map(),
  tileset: new Map(),
  region: new Map(),
  absorbedHash: new Map(),
})

export const DIR_MOVE: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Pure structural BFS distance, ignoring exploration state — assembleFloor's output is a
// freshly-generated, unexplored grid, so findPath's real (state-aware) pathing has nothing
// to work with here; this measures the maze's actual graph shape instead.
export const graphDistance = (
  grid: FloorGrid,
  from: readonly [number, number],
  to: readonly [number, number]
): number => {
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

export const basicConfig = (): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
})

/** A long main path with room between its puzzles for pass-through chambers, dressed from a made-up pool. */
export const chamberFloor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 3,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  packing: 3,
  decorations: ["scale", "weightsTable", "pillar"],
  ...overrides,
})

export const firstPyramid = (): FloorConfig => ({
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
export const isPuzzleRoom = (c: RoomCell) =>
  c.roomType === "encounter" && ["sumplete", "tableau", "crocodile"].includes(c.family ?? "")
export const isTrapRoom = (c: RoomCell) => c.roomType === "encounter" && c.family === "arithmetic-reflex"
export const isTreasureRoom = (c: RoomCell) =>
  c.roomType === "encounter" && ["treasure-chest", "fez-shop"].includes(c.family ?? "")
export const isGateRoom = (c: RoomCell) => c.roomType === "encounter" && !!c.tags?.includes("gate")
export const isStairheadRoom = (c: RoomCell) => c.roomType === "portal" && !!c.stairId

export const findRoom = (grid: FloorGrid, predicate: (cell: RoomCell) => boolean) => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && predicate(cell)) return { r, c, cell }
    }
  return null
}

// Every gate key is derived from where the floor was authored, so a spec that wants to name one
// fixes the address and derives the stem the same way — never off the builder's own output.
export const FLOOR_REF = { journeyId: "switch-spec", levelIndex: 0, floorIndex: 0 }
export const SWITCH_KEY = `switch:${FLOOR_REF.journeyId}#0#0#0`
export const ONE_SWITCH = { encounter: "sumplete", min: 1, max: 1 }
// Whether a finished room is walked back into is the registry's answer, off FamilyMeta.reEnterable,
// and these specs assemble without the registry. A switch needs a family that offers the walk back,
// so the stub grants it and each spec below stays about the one thing it names.
export const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})
export const assembleAt = (siteId: string, config: FloorConfig, seed: number, resolve = reEnterableFamilies) =>
  assembleFloor(siteId, config, seed, resolve, { floorRef: FLOOR_REF })

export const switchConfig = (switches?: FloorConfig["switches"]): FloorConfig => ({
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

export const assembleWithSwitch = (switches?: FloorConfig["switches"]) => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleAt(`site-switch-${seed}`, switchConfig(switches), seed)
    if (!result.success) continue
    const fork = findRoom(result.grid, cell => cell.roomType === "fork")
    if (fork) return { ...fork, grid: result.grid }
  }
  throw new Error("no seed produced a fork room")
}

// doubleBack's own shape (lockWalk.spec.ts's doubleBack fixture; docs/game-design/regions-and-containers.md):
// the route runs entrance → leftLower → s2Chamber → wayOut, leaving rightLower → s1Chamber as a
// two-deep chain off the route's own mouth (entrance). `greenLeft` stands ON the route (leftLower →
// s2Chamber) — the control case, already answered before this task. `forkRight` stands at the
// chain's own MOUTH (entrance → rightLower) and `greenRight` WITHIN it (rightLower → s1Chamber) —
// the two shapes this task adds.
export const offRouteDoubleBackLayout = (): RegionGraph => ({
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

export const offRouteDoubleBackConfig = (): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  regionLayout: offRouteDoubleBackLayout(),
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
