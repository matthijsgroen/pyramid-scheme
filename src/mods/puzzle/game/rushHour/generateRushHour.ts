import { mulberry32 } from "@/game/random"
import type { Grade } from "@/game/families/familyMeta"
import { cellsOf, type Piece, type RushHourPuzzle } from "./rushHour"
import { distancesToGoal, optimalPath } from "./solveRushHour"

export type RushHourOptions = {
  /** Cells to a side. One size at every tier — see the family doc §3.2 for why it is not the knob. */
  size: number
  /** How many pieces stand on the board, the player's own included. */
  pieces: number
  /**
   * How many pieces must CROSS the player's lane on the way out, before the rest are scattered.
   *
   * **The knob that makes a board deep rather than merely full.** A set drawn at random tops out around
   * nine moves however many pieces it holds (§3.1, measured): most of them are nowhere near the way out,
   * so the player drives past them. Demanding that three pieces stand across the lane is what forces the
   * chain of "and to move that one, first move this one" the long boards are made of.
   */
  blockers: number
  /**
   * How many cells are walled off — immovable, never in the player's own lane.
   *
   * **The knob that buys depth without another piece.** A wall pins its neighbours like a piece and can
   * never be shoved aside, so routes past it get longer; the enumeration of the whole space puts the
   * hardest wall-less 6×6 at 51 moves against 60 with one wall. It also costs nothing in reading: a walled
   * cell is a hole in the floor, not a thing to plan with.
   */
  walls: number
  /** The band a board's shortest solution must fall in, in moves. THIS is the tier (§3). */
  minMoves: number
  maxMoves: number
}

/**
 * How many piece sets are drawn before the search gives up and hands back its nearest miss.
 *
 * A set is cheap to draw and expensive to measure, so the loop is short by design: the offline pass
 * (`docs/instructions/puzzle-screens.md` §6.1) walks seeds, and a seed that misses is skipped rather than
 * hammered.
 */
const MAX_ATTEMPTS = 60

/**
 * How many positions of one set are re-measured before the set is abandoned.
 *
 * **One.** Re-measuring costs a search of its own — the same search `grade` runs — and the offline pass
 * grades every board it is handed anyway, so a second candidate here is work the pass would repeat. A set
 * whose first candidate misses is a set whose truncated distances are off, and the next draw is cheaper
 * than arguing with this one.
 */
const CANDIDATES = 1

/**
 * How many single-piece nudges one attempt may try before it starts over with a fresh set.
 *
 * **This number IS the per-board cost on the player's device, which is why it is small.** A listed seed
 * replays the same draw and the same climb when the room opens (`generatePuzzle`), and every nudge costs a
 * bounded search of about a tenth of a second — so a budget of thirty made a wizard room think for three
 * seconds before it drew anything. Eight keeps a board under a second and moves the cost where it belongs:
 * the offline pass scans more seeds to find the ones that climb fast, and the build machine pays for that.
 */
const CLIMB = 8

/** A few of them, in a random order, without shuffling a list that can hold thousands. */
const pick = (keys: string[], count: number, random: () => number): string[] => {
  const rest = [...keys]
  const out: string[] = []
  while (out.length < count && rest.length > 0) out.push(...rest.splice(Math.floor(random() * rest.length), 1))
  return out
}

/** A piece set: the lanes and lengths, which the search never changes — only the offsets move. */
const drawPieces = (random: () => number, options: RushHourOptions): Piece[] | undefined => {
  const { size } = options
  const grid = new Array<boolean>(size ** 2).fill(false)
  const claim = (piece: Piece) => {
    const cells = cellsOf(size, piece, piece.offset)
    if (cells.some(cell => grid[cell])) return false
    for (const cell of cells) grid[cell] = true
    return true
  }

  const pieces: Piece[] = []
  const take = (piece: Piece) => {
    if (!claim(piece)) return false
    pieces.push(piece)
    return true
  }

  // The player's piece: two cells, horizontal, and near the far side from the way out — a piece that
  // starts halfway there has half a board to be blocked in.
  const lane = Math.floor(random() * size)
  take({ lane, offset: Math.floor(random() * 2), len: 2, horizontal: true })

  // The blockers, standing ACROSS the player's lane somewhere to the right of it.
  let blocking = 0
  for (let tries = 0; blocking < options.blockers && tries < 300; tries++) {
    const len = random() < 0.5 ? 3 : 2
    const across = Math.max(0, Math.min(size - len, lane - Math.floor(random() * len)))
    // Only a piece whose own span covers the player's lane is a blocker; the draw keeps trying rather
    // than clamping, so a blocker is never quietly placed somewhere it blocks nothing.
    if (across > lane || across + len - 1 < lane) continue
    if (take({ lane: 2 + Math.floor(random() * (size - 2)), offset: across, len, horizontal: false })) blocking++
  }

  // The rest, scattered. A draw that will not fit is dropped rather than restarting the set: a board one
  // piece short of the tier's count is still that tier's board, and the expensive part is what comes after.
  for (let tries = 0; pieces.length < options.pieces && tries < 400; tries++) {
    const horizontal = random() < 0.45
    const where = Math.floor(random() * size)
    // **No second horizontal piece in the player's own lane.** It could only ever slide along that lane,
    // so one standing between the player and the edge can never be got out of the way — the board would
    // be drawn dead, and the search would spend its whole budget proving it.
    if (horizontal && where === lane) continue
    const len = random() < 0.4 ? 3 : 2
    take({ lane: where, offset: Math.floor(random() * (size - len + 1)), len, horizontal })
  }
  return blocking === options.blockers && pieces.length >= options.pieces - 1 ? pieces : undefined
}

/** Cells to wall off: free ones, never in the player's lane (see `RushHourPuzzle.walls`). */
const drawWalls = (random: () => number, size: number, pieces: Piece[], count: number): number[] => {
  const taken = new Set(pieces.flatMap(piece => cellsOf(size, piece, piece.offset)))
  const lane = pieces[0].lane
  const walls: number[] = []
  for (let tries = 0; walls.length < count && tries < 200; tries++) {
    const cell = Math.floor(random() * size ** 2)
    if (taken.has(cell) || Math.floor(cell / size) === lane) continue
    taken.add(cell)
    walls.push(cell)
  }
  return walls
}

/**
 * One re-rolled piece (or one moved wall), which is the step the climb below takes.
 *
 * The player's piece is never touched: its lane is the lane the way out is cut into, so re-rolling it
 * re-rolls the whole board rather than perturbing it.
 */
const perturb = (board: RushHourPuzzle, random: () => number, options: RushHourOptions): RushHourPuzzle | undefined => {
  const { size } = options
  // Drawn ONCE: a predicate that rolls per element drops a random NUMBER of pieces rather than one, and the
  // set drifts off its tier as the climb runs.
  const dropped = 1 + Math.floor(random() * (board.pieces.length - 1))
  const keep = board.pieces.filter((_, index) => index !== dropped)
  const walls = options.walls > 0 && random() < 0.25 ? board.walls!.slice(1) : (board.walls ?? [])
  const lane = board.pieces[0].lane

  // **Moving a wall keeps every piece, so the cell it lands on has to be free of EVERY piece** — including
  // the one the piece branch below would have dropped. Walling a cell a piece stands on leaves a board whose
  // start position is illegal: `occupancy` lets the piece hide the wall, so it can slide off and then not
  // slide back.
  if (walls.length < options.walls) {
    const standing = new Set([...board.pieces.flatMap(piece => cellsOf(size, piece, piece.offset)), ...walls])
    for (let tries = 0; tries < 60; tries++) {
      const cell = Math.floor(random() * size ** 2)
      if (standing.has(cell) || Math.floor(cell / size) === lane) continue
      return { size, pieces: board.pieces, walls: [...walls, cell] }
    }
    return undefined
  }

  const taken = new Set([...keep.flatMap(piece => cellsOf(size, piece, piece.offset)), ...walls])

  for (let tries = 0; tries < 60; tries++) {
    const horizontal = random() < 0.45
    const where = Math.floor(random() * size)
    if (horizontal && where === lane) continue
    const len = random() < 0.45 ? 3 : 2
    const piece: Piece = { lane: where, offset: Math.floor(random() * (size - len + 1)), len, horizontal }
    if (cellsOf(size, piece, piece.offset).some(cell => taken.has(cell))) continue
    return { size, pieces: [...keep, piece], walls }
  }
  return undefined
}

/** How deep this set's own positions go, and where they are. Capped at the band, like every search here. */
const measure = (board: RushHourPuzzle, within: number) => {
  const distance = distancesToGoal(board, within)
  let deepest = 0
  for (const moves of distance.values()) deepest = Math.max(deepest, moves)
  return { distance, deepest }
}

/**
 * A board whose shortest way out is as long as the tier asks for.
 *
 * **Drawn as a piece set, climbed, then chosen as a position** (§3.1), and the middle step is the one that
 * earns its keep. One set has one component of positions, and one bounded search labels all of them — so a
 * set can be scored by the deepest position in it, and a set that scores badly can be nudged rather than
 * thrown away. Random sets alone top out around nineteen moves however they are drawn (measured): the long
 * boards are rare enough that sampling will not find them, which is exactly what the published enumeration
 * of the whole 6×6 space shows — the commonest board is eleven moves and the hardest that exists is 51.
 *
 * So each attempt draws a set and then re-rolls one piece at a time, keeping every change that does not
 * make the deepest position shallower, until the band is reached or the climb runs out. The offsets a set
 * was drawn with only put it in its own component; the position handed over is picked from the band.
 */
export const generateRushHour = (seed: number, options: RushHourOptions, attempts = MAX_ATTEMPTS): RushHourPuzzle => {
  const random = mulberry32(seed)
  let nearest: { puzzle: RushHourPuzzle; miss: number } | undefined

  for (let attempt = 0; attempt < attempts; attempt++) {
    const pieces = drawPieces(random, options)
    if (!pieces) continue
    const walls = drawWalls(random, options.size, pieces, options.walls)
    if (walls.length < options.walls) continue

    let board: RushHourPuzzle = { size: options.size, pieces, walls }
    let { distance, deepest } = measure(board, options.maxMoves)

    // Stops at the band's FLOOR rather than climbing toward its ceiling. Aiming at the ceiling spread the
    // tiers out nicely and cost every board the full climb — see CLIMB, which is the same cost the player's
    // device pays. The ceiling still admits the lucky deep draw; nothing works for it.
    for (let step = 0; step < CLIMB && deepest < options.minMoves; step++) {
      const nudged = perturb(board, random, options)
      if (!nudged) continue
      const scored = measure(nudged, options.maxMoves)
      // Equal is kept as well as better: a plateau is what a climb has to cross to get anywhere, and the
      // sets here sit on wide ones.
      if (scored.deepest >= deepest) {
        board = nudged
        distance = scored.distance
        deepest = scored.deepest
      }
    }
    if (distance.size === 0) continue

    const inBand: string[] = []
    for (const [key, moves] of distance) {
      if (moves >= options.minMoves) inBand.push(key)
      else {
        const miss = options.minMoves - moves
        if (moves > 0 && (nearest === undefined || miss < nearest.miss))
          nearest = { puzzle: positionOf(board, key), miss }
      }
    }
    // **Re-measured, not trusted.** A truncated search labels a position with its distance to the nearest
    // solved one it FOUND, which can over-estimate (`distancesToGoal`), so the position handed over is one
    // whose own shortest solution really is in the band.
    for (const key of pick(inBand, CANDIDATES, random)) {
      const candidate = positionOf(board, key)
      if (gradeRushHour(candidate, options)) return candidate
    }
  }

  // Every family that searches keeps its nearest miss rather than throwing: a room that opens on a board
  // one move outside its band plays, and the offline pass reports the miss (`grade` returns null for it).
  if (nearest) return nearest.puzzle
  throw new Error("rush hour: no board found")
}

/** The same piece set, standing where that position says. */
const positionOf = (puzzle: RushHourPuzzle, key: string): RushHourPuzzle => {
  const offsets = key.split(",").map(Number)
  return { ...puzzle, pieces: puzzle.pieces.map((piece, index) => ({ ...piece, offset: offsets[index] })) }
}

/**
 * The generator's own gate, re-run on a finished board (`familyMeta.ts`'s `seedable`).
 *
 * One search rather than the component: a board's own shortest solution is all the gate is about.
 */
export const gradeRushHour = (puzzle: RushHourPuzzle, options: RushHourOptions): Grade | null => {
  // **A piece standing on a wall is refused here, not just avoided upstream.** `occupancy` lets the piece
  // hide the wall, so such a board plays: the piece slides off and then cannot come back, and nothing on
  // screen says why. The gate is the one place both the offline pass and a live search go through.
  const walls = new Set(puzzle.walls ?? [])
  const standing = puzzle.pieces.flatMap(piece => cellsOf(puzzle.size, piece, piece.offset))
  if (standing.some(cell => walls.has(cell))) return null
  const path = optimalPath(puzzle, { offsets: puzzle.pieces.map(piece => piece.offset) })
  if (!path || path.length < options.minMoves || path.length > options.maxMoves) return null
  return { steps: path.length }
}
