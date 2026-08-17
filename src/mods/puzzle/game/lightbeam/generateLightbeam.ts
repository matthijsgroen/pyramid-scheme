import { mulberry32, shuffle } from "@/game/random"
import {
  cellKey,
  eachConfig,
  insideGrid,
  isLit,
  pieceStateCount,
  reflect,
  segmentKey,
  stepCell,
  traceBeam,
  type CellRef,
  type Direction,
  type FixedPiece,
  type LightbeamPuzzleData,
  type MirrorFace,
  type MovablePiece,
} from "./beam"
import { solveLightbeamByTechniques, type TechniqueId } from "./techniques"

export type LightbeamPuzzle = LightbeamPuzzleData & {
  /** The state each piece opens in — every movable one deliberately wrong, so the board opens dark. */
  initial: number[]
  /** A configuration that lights the shrine. Carried for tests and for the mistake check, not for hints. */
  solution: number[]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: TechniqueId
}

export type LightbeamOptions = {
  /** The strongest deduction a board may demand (design doc §6). */
  techniqueCap?: TechniqueId
  /** How many times the route bends between sun-disc and shrine. */
  turns?: number
  /** How many of the route's mirrors are givens rather than movable. */
  setMirrors?: number
  /** How many movable route mirrors slide to a stop instead of turning in place. */
  slidingMirrors?: number
  /** Sliding walls parked across the route, there to be moved out of the way. */
  slidingWalls?: number
  /** Pieces the light can never reach, there to be reasoned irrelevant (technique T4). */
  decoys?: number
  /**
   * Decoys placed in the stretch a wrong setting would light, so that setting cannot be ruled out by
   * watching the light die. This is what pushes a board past `deadEnd` into the exhaustive rungs.
   */
  shadows?: number
}

// Generation is route-then-obstruct, per docs/game-design/puzzles/lightbeam.md §5: lay a beam from disc
// to shrine, turn some of its mirrors into pieces the player must set, then wall off the ways they could
// be set wrong. The gates at the end are what make it a puzzle rather than a maze — the route must be
// the only route, and the ladder must be able to find it.
const MAX_ATTEMPTS = 600

// Thinning reaches a fixpoint in two sweeps on every tier measured; the rest is the guard, not the plan.
const MAX_PRUNE_SWEEPS = 4

const FACES: MirrorFace[] = ["/", "\\"]

const faceFor = (enter: Direction, exit: Direction): MirrorFace | undefined =>
  FACES.find(face => reflect(face, enter) === exit)

const perpendicular = (direction: Direction): Direction[] =>
  direction === "up" || direction === "down" ? ["left", "right"] : ["up", "down"]

/** Steps from a cell to the last one still on the grid, travelling in a direction. */
const stepsToEdge = (size: number, at: CellRef, direction: Direction): number => {
  switch (direction) {
    case "up":
      return at.row
    case "down":
      return size - 1 - at.row
    case "left":
      return at.col
    case "right":
      return size - 1 - at.col
  }
}

type RouteCell = { at: CellRef; enter: Direction; exit?: Direction }

type Route = {
  sun: { at: CellRef; facing: Direction }
  shrine: CellRef
  /** Every cell the beam crosses, first after the disc through to the shrine. */
  cells: RouteCell[]
  /** The bends, in beam order — one mirror each. */
  bends: { at: CellRef; enter: Direction; exit: Direction; face: MirrorFace }[]
}

/**
 * The disc sits on an edge facing inward, never in a corner: a corner disc gives the first leg only one
 * way to go, which is a turn the player can read off the frame instead of the board.
 */
const pickSun = (size: number, random: () => number): { at: CellRef; facing: Direction } => {
  const along = 1 + Math.floor(random() * (size - 2))
  const side = Math.floor(random() * 4)
  if (side === 0) return { at: { row: 0, col: along }, facing: "down" }
  if (side === 1) return { at: { row: size - 1, col: along }, facing: "up" }
  if (side === 2) return { at: { row: along, col: 0 }, facing: "right" }
  return { at: { row: along, col: size - 1 }, facing: "left" }
}

/**
 * Lays the winning beam. Legs never revisit a cell, so the route never crosses itself — a crossing would
 * be legal to trace but would put two reasons on one square, and every technique in the ladder points at
 * a square.
 *
 * The final leg runs all the way to the frame, which sets the shrine in the wall. That is worth the
 * constraint: a shrine on an edge can only be lit from three sides at most, and the frame kills most of
 * those outright, which is what lets the `exitRun` deduction fire at all.
 */
const buildRoute = (size: number, turns: number, random: () => number): Route | undefined => {
  const sun = pickSun(size, random)
  const used = new Set([cellKey(sun.at)])
  const cells: RouteCell[] = []
  const bends: Route["bends"] = []
  let at = sun.at
  let direction = sun.facing

  for (let leg = 0; leg <= turns; leg++) {
    const last = leg === turns
    const length = last ? stepsToEdge(size, at, direction) : 1 + Math.floor(random() * Math.max(1, size - 2))
    if (length < 1) return undefined
    for (let step = 0; step < length; step++) {
      at = stepCell(at, direction)
      if (!insideGrid(size, at) || used.has(cellKey(at))) return undefined
      used.add(cellKey(at))
      cells.push({ at, enter: direction, exit: direction })
    }
    if (last) {
      cells[cells.length - 1].exit = undefined
      return { sun, shrine: at, cells, bends }
    }
    const exit = shuffle(perpendicular(direction), random)[0]
    const face = faceFor(direction, exit)
    if (!face) return undefined
    cells[cells.length - 1].exit = exit
    bends.push({ at, enter: direction, exit, face })
    direction = exit
  }
  return undefined
}

type Draft = {
  fixed: FixedPiece[]
  movable: MovablePiece[]
  /** The winning state of each movable piece, in the same order. */
  solution: number[]
  /** Cells nothing else may be put on. */
  taken: Set<string>
  /** Cells some movable piece can stand in — what a wrong setting may run into instead of a wall. */
  movableCells: Set<string>
  /** Cells a wrong setting sends light across — kept clear of decoys, which must never be reachable. */
  rays: Set<string>
}

/** Cells in the same row or column as `at`, one or two steps away, across the beam's line of travel. */
const trackStops = (at: CellRef, across: Direction): CellRef[] =>
  perpendicular(across).flatMap(direction =>
    [1, 2].map(distance => {
      let stop = at
      for (let step = 0; step < distance; step++) stop = stepCell(stop, direction)
      return stop
    })
  )

type Ray = { from: CellRef; direction: Direction }

/**
 * Shadow pieces: decoys dropped into the very stretch a wrong setting would light.
 *
 * This is the dial that makes the technique cap mean something. Built plainly, every board is a chain of
 * `deadEnd` eliminations — turn the mirror the wrong way and the light visibly dies — so a wizard board
 * solves exactly like a starter one, only longer. A shadow breaks that: with something movable standing
 * in the wrong setting's way, the light does not visibly die, it disappears into a piece nobody has
 * settled yet. `deadEnd` has nothing to say, and ruling that setting out takes the exhaustive rungs.
 *
 * The shadow is still a genuine decoy — no winning beam ever touches it — so `neverReached` still frees
 * it, and it is still the player's job to work out that it never mattered.
 */
const placeShadows = (size: number, draft: Draft, rays: Ray[], count: number, random: () => number) => {
  for (const ray of shuffle(rays, random).slice(0, count)) {
    let at = stepCell(ray.from, ray.direction)
    for (let step = 0; step < 2 && insideGrid(size, at); step++) {
      if (!draft.taken.has(cellKey(at))) {
        draft.taken.add(cellKey(at))
        draft.movableCells.add(cellKey(at))
        draft.movable.push({ kind: "turnMirror", at, faces: FACES })
        draft.solution.push(Math.floor(random() * FACES.length))
        break
      }
      at = stepCell(at, ray.direction)
    }
  }
}

/**
 * Walls off the ways a piece could be set wrong.
 *
 * This is what makes the family deducible rather than fiddled with: for each movable piece, the light
 * under its wrong setting has to run out — off the frame, or into a wall — before it meets anything else
 * the player controls. Then `deadEnd` can rule that setting out with a reason the player can see, and
 * the piece it settles lets the entry run reach the next one. That chain is the whole starter board.
 *
 * A ray that runs into something movable is left alone: that is a shadow doing its job, and walling it
 * off would undo it.
 */
const hasWall = (draft: Draft, at: CellRef): boolean =>
  draft.fixed.some(piece => piece.kind === "wall" && cellKey(piece.at) === cellKey(at))

const blockWrongSettings = (size: number, draft: Draft, rays: Ray[]): boolean => {
  for (const ray of rays) {
    // Only the first cell the wrong setting reaches is ever considered: a wall right there is the most
    // legible dead end there is, and anything further along is a longer story for the same conclusion.
    const first = stepCell(ray.from, ray.direction)
    const key = cellKey(first)
    // Off the frame, already walled, or facing a shadow that was put there on purpose: nothing to do.
    const settled = !insideGrid(size, first) || hasWall(draft, first) || draft.movableCells.has(key)
    if (!settled) {
      if (draft.taken.has(key)) return false // reaches the route with nowhere to wall it off
      draft.fixed.push({ kind: "wall", at: first })
      draft.taken.add(key)
      draft.rays.add(key)
    }
    // Everything the wrong setting lights up stays clear of decoys, whose whole point is unreachability.
    let scan = stepCell(ray.from, ray.direction)
    while (insideGrid(size, scan)) {
      draft.rays.add(cellKey(scan))
      if (hasWall(draft, scan)) break
      scan = stepCell(scan, ray.direction)
    }
  }
  return true
}

const buildPieces = (
  size: number,
  route: Route,
  options: Required<LightbeamOptions>,
  random: () => number
): Draft | undefined => {
  const draft: Draft = {
    fixed: [],
    movable: [],
    solution: [],
    taken: new Set(),
    movableCells: new Set(),
    rays: new Set(),
  }
  draft.taken.add(cellKey(route.sun.at))
  for (const cell of route.cells) draft.taken.add(cellKey(cell.at))

  const bends = shuffle(
    route.bends.map((bend, index) => ({ bend, index })),
    random
  )
  const setCount = Math.min(options.setMirrors, Math.max(0, route.bends.length - 1))
  const given = new Set(bends.slice(0, setCount).map(entry => entry.index))
  const movableBends = route.bends.filter((_, index) => !given.has(index))
  const slidingCount = Math.min(options.slidingMirrors, movableBends.length - 1 < 0 ? 0 : movableBends.length)
  const sliding = new Set(
    shuffle(
      movableBends.map(bend => cellKey(bend.at)),
      random
    ).slice(0, slidingCount)
  )

  const wrongRays: Ray[] = []

  route.bends.forEach((bend, index) => {
    if (given.has(index)) {
      draft.fixed.push({ kind: "mirror", at: bend.at, face: bend.face })
      return
    }
    if (sliding.has(cellKey(bend.at))) {
      // The track runs across the beam, so the far stop takes the mirror clean out of its way and the
      // light sails past — a different sentence from a mirror turned the wrong way, and a clearer one.
      const stop = shuffle(trackStops(bend.at, bend.enter), random).find(
        candidate => insideGrid(size, candidate) && !draft.taken.has(cellKey(candidate))
      )
      if (!stop) return
      draft.taken.add(cellKey(stop))
      for (const cell of [bend.at, stop]) draft.movableCells.add(cellKey(cell))
      const stops = shuffle([bend.at, stop], random)
      draft.movable.push({ kind: "slidingMirror", face: bend.face, stops })
      draft.solution.push(stops.findIndex(candidate => cellKey(candidate) === cellKey(bend.at)))
      wrongRays.push({ from: bend.at, direction: bend.enter })
      return
    }
    draft.movableCells.add(cellKey(bend.at))
    draft.movable.push({ kind: "turnMirror", at: bend.at, faces: FACES })
    draft.solution.push(FACES.indexOf(bend.face))
    wrongRays.push({ from: bend.at, direction: reflect(bend.face === "/" ? "\\" : "/", bend.enter) })
  })
  if (draft.movable.length + given.size !== route.bends.length) return undefined

  // Sliding walls sit on a straight stretch of the route, and the player's move is to clear the path
  // rather than bend it — the one piece in the family whose question is "does the light get through".
  const straights = shuffle(
    route.cells.filter(
      cell => cell.exit === cell.enter && !route.bends.some(bend => cellKey(bend.at) === cellKey(cell.at))
    ),
    random
  )
  for (const cell of straights.slice(0, options.slidingWalls)) {
    const stop = shuffle(trackStops(cell.at, cell.enter), random).find(
      candidate => insideGrid(size, candidate) && !draft.taken.has(cellKey(candidate))
    )
    if (!stop) continue
    draft.taken.add(cellKey(stop))
    for (const at of [cell.at, stop]) draft.movableCells.add(cellKey(at))
    const stops = shuffle([cell.at, stop], random)
    draft.movable.push({ kind: "slidingWall", stops })
    draft.solution.push(stops.findIndex(candidate => cellKey(candidate) !== cellKey(cell.at)))
  }

  if (!draft.movable.length) return undefined
  placeShadows(size, draft, wrongRays, options.shadows, random)
  if (!blockWrongSettings(size, draft, wrongRays)) return undefined

  // Decoys last, on cells no wrong setting can light either — a decoy the light can reach is not a decoy,
  // and the gates below would throw the board out for it.
  const open: CellRef[] = []
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const at = { row, col }
      if (draft.taken.has(cellKey(at)) || draft.rays.has(cellKey(at))) continue
      open.push(at)
    }
  for (const at of shuffle(open, random).slice(0, options.decoys)) {
    draft.taken.add(cellKey(at))
    draft.movableCells.add(cellKey(at))
    draft.movable.push({ kind: "turnMirror", at, faces: FACES })
    draft.solution.push(Math.floor(random() * FACES.length))
  }
  return draft
}

const pathSignature = (puzzle: LightbeamPuzzleData, config: readonly number[]): string =>
  traceBeam(puzzle, config)
    .path.map(segment => segmentKey(segment.at, segment.enter))
    .join(" ")

/**
 * Gate 4 — the route is the only route.
 *
 * "Exactly one winning configuration" would be the wrong test for this family: a decoy has a free
 * setting by definition, so a board with decoys has many winning configurations and only one winning
 * *path*. That is the property the player actually solves for, so that is the one checked.
 */
const routeIsUnique = (puzzle: LightbeamPuzzleData, states: number[][]): boolean => {
  const paths = new Set<string>()
  const ran = eachConfig(states, config => {
    if (isLit(puzzle, config)) paths.add(pathSignature(puzzle, config))
  })
  return ran && paths.size === 1
}

/**
 * Takes away every wall the board turns out not to need, to a fixpoint.
 *
 * This is where the technique cap stops being a label and starts being difficulty. Built as it is, a
 * board is a chain of `deadEnd` eliminations and nothing more — every wrong setting has a wall waiting
 * for it, so the strongest rungs of the ladder never have to fire and every tier solves the same way.
 * Thinning under the cap fixes that from the other end: at a low cap the walls are exactly what the
 * deduction spends, so they stay; at a high cap the board can be reasoned without them, so they go, and
 * what is left demands the reasoning the tier was set to demand.
 *
 * A wall the player cannot spend is worse than no wall, for the same reason a redundant sign is worse
 * than none in Futoshiki: it hides which obstacles the deduction actually turns on.
 */
const thinWalls = (
  puzzle: LightbeamPuzzleData,
  states: number[][],
  cap: TechniqueId,
  random: () => number
): FixedPiece[] => {
  let fixed = puzzle.fixed
  for (let sweep = 0; sweep < MAX_PRUNE_SWEEPS; sweep++) {
    const before = fixed.length
    for (const wall of shuffle(
      fixed.filter(piece => piece.kind === "wall"),
      random
    )) {
      const trial = fixed.filter(piece => piece !== wall)
      if (trial.length === fixed.length) continue
      const candidate = { ...puzzle, fixed: trial }
      // Both gates again: taking a wall away can open a second route as easily as it can open a
      // deduction, and a board with two routes is not a puzzle whatever the ladder makes of it.
      if (!routeIsUnique(candidate, states)) continue
      if (solveLightbeamByTechniques(candidate, cap).settled) fixed = trial
    }
    if (fixed.length === before) break
  }
  return fixed
}

const DEFAULTS: Required<LightbeamOptions> = {
  techniqueCap: "deadEnd",
  turns: 2,
  setMirrors: 0,
  slidingMirrors: 0,
  slidingWalls: 0,
  decoys: 0,
  shadows: 0,
}

export const generateLightbeam = (size: number, seed: number, options: LightbeamOptions = {}): LightbeamPuzzle => {
  const settings = { ...DEFAULTS, ...options }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const route = buildRoute(size, settings.turns, random)
    if (!route) continue
    const draft = buildPieces(size, route, settings, random)
    if (!draft) continue

    const puzzle: LightbeamPuzzleData = {
      size,
      sun: route.sun,
      shrine: route.shrine,
      fixed: draft.fixed,
      movable: draft.movable,
    }
    if (!isLit(puzzle, draft.solution)) continue

    const states = draft.movable.map(piece => Array.from({ length: pieceStateCount(piece) }, (_, i) => i))
    if (!routeIsUnique(puzzle, states)) continue
    if (!solveLightbeamByTechniques(puzzle, settings.techniqueCap).settled) continue

    const thinned = { ...puzzle, fixed: thinWalls(puzzle, states, settings.techniqueCap, random) }

    // The board opens dark, and never one tap from done: every movable piece starts on a setting the
    // deduction will have to rule out.
    const initial = draft.movable.map((piece, index) => (draft.solution[index] + 1) % pieceStateCount(piece))
    if (isLit(thinned, initial)) continue

    return { ...thinned, initial, solution: draft.solution, techniqueCap: settings.techniqueCap }
  }
  throw new Error(`generateLightbeam: no logically solvable board (size=${size}, seed=${seed})`)
}
