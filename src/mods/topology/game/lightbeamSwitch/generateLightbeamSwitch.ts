import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyGenerationCtx, Grade } from "@/game/families/familyMeta"
import type { ForkShape } from "@/game/forkShape"
import { mulberry32, shuffle } from "@/game/random"
import type { Direction as WayOut } from "@/game/siteTypes"
import {
  cellKey,
  DIR,
  MIN_LEG,
  opposite,
  perpendicular,
  SLASH,
  stepCell,
  stepsToEdge,
  type CellRef,
  type Direction,
} from "@/mods/core/game/beam/physics"
import {
  bendsFor,
  byReadingOrder,
  drawBranch,
  placementKey,
  settingFor,
  traceBeam,
  type Branch,
  type Occupied,
  type ShrineGrid,
} from "../shrineBeam/shrineBeam"

// One board per fork shape: routing the beam to a shrine is how the player opens that one of the fork's
// ways out, so the board owes each shrine exactly one route and never two.

/**
 * A board and the ways out its shrines stand for, as canonical compass directions rather than the fork's
 * real ones. A fork's real exits are whatever the carve gave it; there are only three shapes up to
 * rotation, so a board is generated against one canonical set per shape and turned to face a real fork
 * when it opens. That keeps one board per (shape, tier, seed) instead of one per rotation.
 */
export type LightbeamSwitchBoard = {
  grid: ShrineGrid
  shrines: { canonicalDir: WayOut; at: CellRef }[]
}

/** The gates a draft board can die at. */
export type LightbeamSwitchGate = "noRoute" | "notUnique" | "noHonestOpening"

/**
 * The ways out each shape is drawn for. North is up the board, east is across it and south is down it, so
 * a shrine stands on the edge its way out points at and the player sees the direction they are opening.
 *
 * The three sets nest — `three` is `adjacent` and `opposite` laid over each other — and every real fork
 * layout is one of them turned: rotating `n,e` reaches all four right-angled pairs, `n,s` both facing
 * pairs, and `n,e,s` all four triples. Fixed for good, because an offline seed list is built against it.
 */
export const CANONICAL_WAYS_OUT: Record<ForkShape, readonly WayOut[]> = {
  adjacent: ["n", "e"],
  opposite: ["n", "s"],
  three: ["n", "e", "s"],
}

/** A branch runs to the edge its way out points at, arriving travelling that way. */
const FINAL_DIRECTION: Record<WayOut, Direction> = {
  n: DIR.up,
  e: DIR.right,
  s: DIR.down,
  w: DIR.left,
}

/**
 * Which way the beam leaves the disc, per shape. Every way out has to lie ahead of the beam or across it —
 * a shrine behind the disc can only be reached by a branch that doubles back past it — and that single
 * rule settles each shape: with `n,e` the beam may run up the board or across it, with `n,s` it must run
 * across (either way), and with `n,e,s` only rightward leaves all three edges reachable.
 */
const SUN_FACINGS: Record<ForkShape, readonly Direction[]> = {
  adjacent: [DIR.up, DIR.right],
  opposite: [DIR.right, DIR.left],
  three: [DIR.right],
}

/** The disc sits on the edge it faces away from, never a corner: a corner leaves the first leg one way to go. */
const drawSun = (size: number, facing: Direction, random: () => number): { at: CellRef; facing: Direction } => {
  const along = 1 + Math.floor(random() * (size - 2))
  const at =
    facing === DIR.up
      ? { row: size - 1, col: along }
      : facing === DIR.down
        ? { row: 0, col: along }
        : facing === DIR.right
          ? { row: along, col: 0 }
          : { row: along, col: size - 1 }
  return { at, facing }
}

/** Where a branch starts, and the way it leaves — one per way out, all fed by the same beam. */
type Leaf = { from: CellRef; leaving: Direction }

/**
 * How big a board is and how far past the fork each branch runs, per tier and per how many ways out the
 * board carries. Never fewer than two bends: a branch that turns once pins only two mirrors, and a
 * two-mirror answer has no opening that survives the anti-fiddle check — turning every mirror of it lands
 * on the answer.
 *
 * A three-way board gets a wider board and shorter branches than a two-way one at the same tier. It carries
 * a third branch and a second fork mirror, so it needs the room and already asks the player for as long an
 * answer; the shorter branches also keep the sweep over settings small enough to throw a draft away cheaply.
 * Below eight squares a surviving three-way draft is rare enough to be a cost, which is the floor those
 * boards start at.
 */
const SWITCH_CONFIG: Record<"two" | "three", Record<Difficulty, { size: number; bends: number }>> = {
  two: {
    starter: { size: 6, bends: 2 },
    junior: { size: 7, bends: 2 },
    expert: { size: 8, bends: 2 },
    master: { size: 9, bends: 3 },
    wizard: { size: 9, bends: 5 },
  },
  three: {
    starter: { size: 8, bends: 2 },
    junior: { size: 8, bends: 2 },
    expert: { size: 9, bends: 2 },
    master: { size: 9, bends: 3 },
    wizard: { size: 10, bends: 3 },
  },
}

const MAX_ATTEMPTS = 2000

/**
 * What every setting of the mirrors does, in one sweep: how many distinct routes reach each shrine, and
 * which settings the board may open in. Both questions read the same walk, and a board has up to 2^mirrors
 * settings, so asking them together is what keeps a draft cheap enough to throw away.
 */
const analyse = (grid: ShrineGrid, shrines: readonly CellRef[]): { routes: number[]; openings: number[] } => {
  const count = grid.mirrors.length
  const routes = shrines.map(() => new Set<string>())
  const lit: boolean[] = []
  for (let n = 0; n < 2 ** count; n++) {
    const walk = traceBeam(grid, shrines, settingFor(count, n))
    lit.push(walk.shrine !== undefined)
    if (walk.shrine !== undefined) routes[walk.shrine].add(placementKey(walk.met))
  }
  const every = 2 ** count - 1
  const openings = lit.flatMap((isLit, setting) =>
    isLit ||
    lit[setting ^ every] ||
    Array.from({ length: count }, (_, mirror) => setting ^ (1 << mirror)).some(one => lit[one])
      ? []
      : [setting]
  )
  return { routes: routes.map(set => set.size), openings }
}

/**
 * The mirrors at the fork and the ways the beam can leave them. One mirror is one bit, so two ways out is
 * one mirror with the branches on its two sides; a third needs a second mirror down one of those sides,
 * whose own two sides carry the remaining two branches. Every leaf is then a distinct set of fork mirror
 * angles, which is what makes the shrines decide a door rather than offer a choice of routes to one.
 */
const drawGadget = (
  size: number,
  sun: { at: CellRef; facing: Direction },
  ways: number,
  random: () => number
): { forks: CellRef[]; crossed: CellRef[]; leaves: Leaf[] } | undefined => {
  const forkDistance = MIN_LEG + Math.floor(random() * (size - 1 - MIN_LEG))
  const prefix: CellRef[] = []
  for (let at = stepCell(sun.at, sun.facing); prefix.length < forkDistance; at = stepCell(at, sun.facing))
    prefix.push(at)
  const first = prefix[prefix.length - 1]
  const [side, other] = shuffle(perpendicular(sun.facing), random)

  if (ways === 2)
    return {
      forks: [first],
      crossed: prefix,
      leaves: [
        { from: first, leaving: side },
        { from: first, leaving: other },
      ],
    }

  // The spine needs room for its own leg and to stop short of the edge, so the second mirror has board on
  // both of its sides.
  const spineDir = [side, other].find(dir => stepsToEdge(size, first, dir) > MIN_LEG)
  if (spineDir === undefined) return undefined
  const reach = stepsToEdge(size, first, spineDir)
  const spine: CellRef[] = []
  const spineLength = MIN_LEG + Math.floor(random() * (reach - MIN_LEG))
  for (let at = stepCell(first, spineDir); spine.length < spineLength; at = stepCell(at, spineDir)) spine.push(at)
  const second = spine[spine.length - 1]
  const [ahead, behind] = shuffle(perpendicular(spineDir), random)
  return {
    forks: [first, second],
    crossed: [...prefix, ...spine],
    leaves: [
      { from: first, leaving: opposite(spineDir) },
      { from: second, leaving: ahead },
      { from: second, leaving: behind },
    ],
  }
}

const attemptBoard = (
  config: { size: number; bends: number },
  ways: readonly WayOut[],
  facings: readonly Direction[],
  random: () => number,
  reject?: (gate: LightbeamSwitchGate) => void
): LightbeamSwitchBoard | undefined => {
  const { size, bends } = config
  const sun = drawSun(size, facings[Math.floor(random() * facings.length)], random)

  const gadget = drawGadget(size, sun, ways.length, random)
  if (!gadget) {
    reject?.("noRoute")
    return undefined
  }

  // Which way out each leaf of the gadget carries is drawn, so no shape always sends the same way out down
  // the same side of the first mirror.
  const carried = shuffle([...ways], random)

  const taken: Occupied = {
    mirrors: new Set(gadget.forks.map(cellKey)),
    crossed: new Set(gadget.crossed.map(cellKey)),
    terminal: new Set([cellKey(sun.at)]),
  }
  const branches = new Map<WayOut, Branch>()
  // Drawn one after the other, in a drawn order so no way out is always the one with the free board.
  for (const index of shuffle(
    Array.from({ length: ways.length }, (_, at) => at),
    random
  )) {
    const way = carried[index]
    const leaf = gadget.leaves[index]
    const branch = drawBranch(
      size,
      leaf.from,
      leaf.leaving,
      bendsFor(bends, leaf.leaving, FINAL_DIRECTION[way]),
      FINAL_DIRECTION[way],
      taken,
      random
    )
    if (!branch) {
      reject?.("noRoute")
      return undefined
    }
    branches.set(way, branch)
    for (const mirror of branch.bends) taken.mirrors.add(cellKey(mirror.at))
    for (const cell of branch.path) taken.crossed.add(cellKey(cell))
    taken.terminal.add(cellKey(branch.shrine))
  }

  const mirrors = [...gadget.forks, ...ways.flatMap(way => branches.get(way)!.bends.map(bend => bend.at))].sort(
    byReadingOrder
  )
  // Shrines stand in the shape's own order, so the same seed names the same door whatever order it drew in.
  const shrines = ways.map(way => ({ canonicalDir: way, at: branches.get(way)!.shrine }))
  const grid: ShrineGrid = { size, sun, mirrors, initial: mirrors.map(() => SLASH) }

  // The construction gives each way out a route; only enumeration can say it gives it no second one.
  const { routes, openings } = analyse(
    grid,
    shrines.map(shrine => shrine.at)
  )
  if (routes.some(count => count !== 1)) {
    reject?.("notUnique")
    return undefined
  }
  if (!openings.length) {
    reject?.("noHonestOpening")
    return undefined
  }
  const opening = openings[Math.floor(random() * openings.length)]
  return { grid: { ...grid, initial: settingFor(mirrors.length, opening) }, shrines }
}

/**
 * Builds the board a switch fork stands on. Deterministic in `(seed, difficulty, shape)`, and throws rather
 * than ship a board that owes a way out more than one route — an ambiguous shrine would open a way the
 * player did not choose.
 *
 * `attempts` is how many drafts one seed may spend. A listed seed was proven to land on its first, so
 * play time asks for one and pays no search; a seed nothing proved gets the full budget.
 */
export const generateLightbeamSwitch = (
  seed: number,
  difficulty: Difficulty,
  shape: ForkShape,
  attempts: number = MAX_ATTEMPTS,
  /** Diagnostics: the gate that threw a draft away, once per rejected attempt. */
  reject?: (gate: LightbeamSwitchGate) => void
): LightbeamSwitchBoard => {
  const ways = CANONICAL_WAYS_OUT[shape]
  const config = SWITCH_CONFIG[ways.length > 2 ? "three" : "two"][difficulty]
  for (let attempt = 0; attempt < attempts; attempt++) {
    const board = attemptBoard(config, ways, SUN_FACINGS[shape], mulberry32(seed * 7919 + attempt), reject)
    if (board) return board
  }
  throw new Error(`generateLightbeamSwitch: no board (seed=${seed}, difficulty=${difficulty}, shape=${shape})`)
}

/** The tier a board is built at when the room names none — the family's own debut, which meta.ts reads
 * back as `minTier`, since a switch is never authored below it. */
export const DEFAULT_SWITCH_TIER: Difficulty = "junior"

/** The shape a board is built for where there is no fork to read one off: the playtesting bench, a story. */
export const DEFAULT_FORK_SHAPE: ForkShape = "adjacent"

/**
 * The dials one switch board is built from, and so the key its seed list is filed under.
 *
 * The fork's SHAPE and nothing about its bearings: a board is generated canonical and turned at open time
 * (rotateBoard.ts), so a bucket per compass layout would hold four copies of one board and put four times
 * the offline search behind them for nothing.
 */
export const resolveLightbeamSwitchOptions = ({ difficulty, forkShape }: FamilyGenerationCtx) => ({
  difficulty: difficulty ?? DEFAULT_SWITCH_TIER,
  shape: forkShape ?? DEFAULT_FORK_SHAPE,
})

/**
 * What an admitted board asks of the player: one angle per mirror.
 *
 * The generator keeps no near-miss draft — a board that owes a way out two routes, or that opens already
 * lit, is thrown away — so its acceptance gate is the throw above, and re-running the routing sweep here
 * would be a second copy of that gate rather than a check on it. What this states instead is the
 * postcondition the throw cannot: a board owes its shape one shrine per way out.
 */
export const gradeLightbeamSwitch = (board: LightbeamSwitchBoard, { shape }: { shape: ForkShape }): Grade | null =>
  board.shrines.length === CANONICAL_WAYS_OUT[shape].length ? { steps: board.grid.mirrors.length } : null
