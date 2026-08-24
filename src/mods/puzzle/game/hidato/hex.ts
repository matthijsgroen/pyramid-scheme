// The comb's coordinate system, and the only place the six-neighbour rule is written down.
//
// Axial coordinates (q, r) over a pointy-top hex lattice: `q` runs east, `r` runs south-east, and the
// third cube axis is implied (-q-r). Two cells touch when they differ by one of the six steps below,
// which is what the whole family reduces to — consecutive numbers must occupy touching cells.
//
// This is the second layout engine the catalogue carries (PUZZLE_FAMILIES.md §10 open question 4 chose
// the hive over the square grid), so it stays small and self-contained: coordinates, neighbours,
// distance, and the shape a board is drawn inside. Nothing about pixels — the board component owns that.

export type Hex = { q: number; r: number }

/** A cell's identity in maps and sets: `"q,r"`, so a cell can key a Record and survive JSON. */
export const hexKey = ({ q, r }: Hex): string => `${q},${r}`

export const hexFromKey = (key: string): Hex => {
  const [q, r] = key.split(",").map(Number)
  return { q, r }
}

export const hexEquals = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r

// Clockwise from due east. The order is fixed rather than incidental: a generator walking neighbours
// shuffles them itself, and a stable order keeps every board reproducible from its seed.
const DIRECTIONS: Hex[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
]

export const hexNeighbours = ({ q, r }: Hex): Hex[] => DIRECTIONS.map(step => ({ q: q + step.q, r: r + step.r }))

/**
 * Steps from one cell to the other — the cube-coordinate distance, which on this lattice is exactly the
 * fewest touching cells a run has to pass through.
 *
 * This is what makes the distance rung possible: a cell 4 steps from the 7 cannot hold the 9, whatever
 * else is on the board, because no run of 2 covers 4 steps.
 */
export const hexDistance = (a: Hex, b: Hex): number => {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))
}

/** Every cell within `radius` steps of the origin — the hexagon a board is carved out of. */
export const hexagon = (radius: number): Hex[] => {
  const cells: Hex[] = []
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) cells.push({ q, r })
  return cells
}

/**
 * The cells exactly `radius` steps out, in a ring — walked round in order, so consecutive entries
 * touch and a slice of the list is a contiguous arc.
 *
 * That ordering is what the generator needs: a comb smaller than its hexagon is the full hexagon one
 * size down plus an ARC of the next ring, and an arc is a hive with a row half-built rather than a
 * hexagon with holes punched in it (design doc §3).
 */
export const hexRing = (radius: number): Hex[] => {
  if (radius === 0) return [{ q: 0, r: 0 }]
  const cells: Hex[] = []
  // Start on the corner due north-west and walk the six sides. Walking from a corner is what keeps
  // the sides the same length; starting mid-side would split one of them across the seam.
  let cell = { q: DIRECTIONS[4].q * radius, r: DIRECTIONS[4].r * radius }
  for (const step of DIRECTIONS)
    for (let along = 0; along < radius; along++) {
      cells.push(cell)
      cell = { q: cell.q + step.q, r: cell.r + step.r }
    }
  return cells
}
