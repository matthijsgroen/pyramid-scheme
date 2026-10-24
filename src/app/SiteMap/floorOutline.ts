import type { Tileset } from "@/game/siteTypes"
import { hashUnit } from "@/support/hashString"
import { SIDE_W } from "./mapScale"
import { ALL_STATES, rectsToPath, type Rect, type TileRegions } from "./tileRegions"

// THE OUTLINE OF THE WALKABLE FLOOR, softened where the stone is natural rock.
//
// A floor is a union of axis-aligned rectangles, which is right for masonry and wrong for a cave: cut by
// hand, a passage has square corners; worn by water, it has none. So for a soft tileset the union's
// contour is traced and its corners rounded, and the edges seen from ABOVE — the side walls and the south
// edge — are given a small seeded wobble.
//
// The edge under a wall FACE is not touched (docs/game-design/tile-art-brief.md, "The camera"): a face is
// the one vertical plane in the picture, drawn as a straight band, and floor wandering under it would bend
// the wall. Only its ends round off, where the face meets a side wall. An inner corner against a face
// stays square for the same reason — its curve would have to climb into the band.
//
// Each fill stays ONE path: its rectangles plus a patch per change, drawn as "the new edge, then the old
// one back". Under the nonzero rule a patch that bulges past the rectangles adds floor and one that cuts
// into them makes a hole, so no polygon clipping is needed — only patches that stay inside one owner's
// cells or outside all floor, which the radius and wobble limits below guarantee.

/** One fill the renderer draws: a tier's room or corridor floor in one light state. */
export type FloorGroup = { id: string; rects: readonly Rect[]; soft: boolean }

/** The corner radius — a side wall's thickness, so a corner is worn about as far as a wall is thick. */
const RADIUS = SIDE_W * 1.5
/** How far a side or south edge wanders off its line, either way. Under a quarter of the thinnest gap (`SIDE_W`), so a
 * wobble never reaches across a wall to the floor on its other side. */
const WOBBLE = 3
/** The spacing of the wobble's points along an edge, in map units. */
const WOBBLE_STEP = 14
/** How close a wobble point may come to a corner's curve or to a seam between two fills. */
const WOBBLE_MARGIN = 5

/** Every floor fill the renderer draws, in its drawing order: per tier, rooms in each state, then corridors. */
export const floorGroups = (regions: TileRegions, soft: (tier: Tileset) => boolean): FloorGroup[] =>
  [...regions].flatMap(([tier, groups]) => [
    ...ALL_STATES.map(state => ({ id: `${tier}:room:${state}`, rects: groups.floorRoom[state], soft: soft(tier) })),
    ...ALL_STATES.map(state => ({
      id: `${tier}:corridor:${state}`,
      rects: groups.floorCorridor[state],
      soft: soft(tier),
    })),
  ])

type Point = readonly [number, number]
/** Clockwise on screen: the way a contour runs with the floor on its right. */
const DIRS: readonly Point[] = [
  [1, 0], // east: the top of a floor, under a face
  [0, 1], // south: an east side wall
  [-1, 0], // west: a south edge
  [0, -1], // north: a west side wall
]
const EAST = 0

type UnitEdge = { from: Point; to: Point; dir: number; owner: number; cell: Point }
/** A straight run of the contour, and which fill is inside it along each step. */
type Edge = { from: Point; to: Point; dir: number; units: UnitEdge[] }

const fmt = (n: number) => String(Math.round(n * 100) / 100)
const pt = ([x, y]: Point) => `${fmt(x)} ${fmt(y)}`

/**
 * The floor's outline, and each group's fill, softened where the group is.
 *
 * With nothing soft the answer is exactly `rectsToPath` of the rectangles, so every other tileset draws as
 * it always has.
 */
export const floorOutline = (
  groups: readonly FloorGroup[],
  seed: string
): { outline: string; fills: Map<string, string> } => {
  const all = groups.flatMap(g => g.rects)
  const fills = new Map(groups.map(g => [g.id, rectsToPath(g.rects)]))
  if (!groups.some(g => g.soft && g.rects.length > 0)) return { outline: rectsToPath(all), fills }

  // The rectangles share a few dozen x and y values, so the floor is a grid over those — each cell of it
  // owned by one group or by none — and its contour is walked on that grid.
  const xs = [...new Set(all.flatMap(([x, , w]) => [x, x + w]))].sort((a, b) => a - b)
  const ys = [...new Set(all.flatMap(([, y, , h]) => [y, y + h]))].sort((a, b) => a - b)
  const xIndex = new Map(xs.map((x, i) => [x, i]))
  const yIndex = new Map(ys.map((y, i) => [y, i]))
  const nx = xs.length - 1
  const ny = ys.length - 1
  const owners = new Int32Array(nx * ny).fill(-1)
  groups.forEach((g, gi) => {
    for (const [x, y, w, h] of g.rects)
      for (let j = yIndex.get(y)!; j < yIndex.get(y + h)!; j++)
        for (let i = xIndex.get(x)!; i < xIndex.get(x + w)!; i++) owners[j * nx + i] = gi
  })
  const ownerAt = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= ny ? -1 : owners[j * nx + i])
  const at = ([i, j]: Point): Point => [xs[i], ys[j]]

  // Every step of the boundary, floor on its right.
  const outgoing = new Map<string, UnitEdge[]>()
  const add = (from: Point, to: Point, dir: number, owner: number, cell: Point) => {
    const key = `${from[0]},${from[1]}`
    const list = outgoing.get(key) ?? []
    list.push({ from, to, dir, owner, cell })
    outgoing.set(key, list)
  }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = ownerAt(i, j)
      if (o < 0) continue
      if (ownerAt(i, j - 1) < 0) add([i, j], [i + 1, j], 0, o, [i, j])
      if (ownerAt(i + 1, j) < 0) add([i + 1, j], [i + 1, j + 1], 1, o, [i, j])
      if (ownerAt(i, j + 1) < 0) add([i + 1, j + 1], [i, j + 1], 2, o, [i, j])
      if (ownerAt(i - 1, j) < 0) add([i, j + 1], [i, j], 3, o, [i, j])
    }

  // Walked into loops. Where two floor cells touch only at a corner, turning right keeps each its own loop.
  const used = new Set<UnitEdge>()
  const loops: UnitEdge[][] = []
  for (const list of outgoing.values())
    for (const first of list) {
      if (used.has(first)) continue
      const loop: UnitEdge[] = []
      let step: UnitEdge | undefined = first
      while (step && !used.has(step)) {
        used.add(step)
        loop.push(step)
        const dir: number = step.dir
        const next: UnitEdge[] = (outgoing.get(`${step.to[0]},${step.to[1]}`) ?? []).filter(e => !used.has(e))
        step = [1, 0, 3].map(turn => next.find(e => e.dir === (dir + turn) % 4)).find(Boolean)
      }
      loops.push(loop)
    }

  const patches = new Map<number, string[]>()
  const patch = (owner: number, d: string) => {
    const list = patches.get(owner) ?? []
    list.push(d)
    patches.set(owner, list)
  }
  const outline: string[] = []

  for (const loop of loops) {
    // Start the loop on a corner, then merge its steps into straight edges.
    const start = loop.findIndex((e, k) => e.dir !== loop[(k + loop.length - 1) % loop.length].dir)
    const steps = [...loop.slice(start), ...loop.slice(0, start)]
    const edges: Edge[] = []
    for (const s of steps) {
      const last = edges[edges.length - 1]
      if (last && last.dir === s.dir) {
        last.to = s.to
        last.units.push(s)
      } else edges.push({ from: s.from, to: s.to, dir: s.dir, units: [s] })
    }
    const lengthOf = (e: Edge) => Math.abs(at(e.to)[0] - at(e.from)[0]) + Math.abs(at(e.to)[1] - at(e.from)[1])

    // The radius at each corner — the corner at the START of edge k. Zero where it stays square.
    const radii = edges.map((out, k) => {
      const into = edges[(k + edges.length - 1) % edges.length]
      const a = into.units[into.units.length - 1].owner
      const b = out.units[0].owner
      if (!groups[a].soft || !groups[b].soft) return 0
      const convex = out.dir === (into.dir + 1) % 4
      if (!convex && (into.dir === EAST || out.dir === EAST)) return 0
      // The curve stays inside one grid cell: the corner's own floor cell when convex, the empty one it
      // wraps when concave. That keeps a cut inside one fill and a fillet off every other floor.
      const [vi, vj] = out.from
      const quadrants: Point[] = [
        [vi - 1, vj - 1],
        [vi, vj - 1],
        [vi - 1, vj],
        [vi, vj],
      ]
      const [ci, cj] = convex ? into.units[into.units.length - 1].cell : quadrants.find(([i, j]) => ownerAt(i, j) < 0)!
      return Math.min(RADIUS, xs[ci + 1] - xs[ci], ys[cj + 1] - ys[cj], lengthOf(into) / 2, lengthOf(out) / 2)
    })

    const along = (p: Point, dir: number, s: number): Point => [p[0] + DIRS[dir][0] * s, p[1] + DIRS[dir][1] * s]
    const cornerOut = (k: number) => along(at(edges[k].from), edges[k].dir, radii[k])
    const curveAt = (k: number) => {
      const into = edges[(k + edges.length - 1) % edges.length]
      const v = at(edges[k].from)
      const r = radii[k]
      // A quarter circle as one cubic: the controls stand 0.55 of the radius out from each end.
      const t1 = along(v, into.dir, -r)
      const t2 = cornerOut(k)
      const c1 = along(t1, into.dir, r * 0.55)
      const c2 = along(t2, edges[k].dir, -r * 0.55)
      return { t1, t2, v, d: `C${pt(c1)} ${pt(c2)} ${pt(t2)}`, owner: into.units[into.units.length - 1].owner }
    }

    outline.push(`M${pt(cornerOut(0))}`)
    edges.forEach((edge, k) => {
      const next = (k + 1) % edges.length
      const p0 = at(edge.from)
      const len = lengthOf(edge)
      const sStart = radii[k]
      const sEnd = len - radii[next]
      // Seams: where the fill inside the edge changes. The edge is pinned to its line there so the two
      // fills either side of the seam still meet.
      const seams: number[] = []
      edge.units.forEach((u, n) => {
        if (n > 0 && u.owner !== edge.units[n - 1].owner)
          seams.push(Math.abs(at(u.from)[0] - p0[0]) + Math.abs(at(u.from)[1] - p0[1]))
      })
      const anchors = [sStart, ...seams.filter(s => s > sStart && s < sEnd), sEnd]
      const ownerAtS = (s: number) =>
        edge.units.find(u => {
          const a = Math.abs(at(u.from)[0] - p0[0]) + Math.abs(at(u.from)[1] - p0[1])
          return s >= a && s <= a + Math.abs(at(u.to)[0] - at(u.from)[0]) + Math.abs(at(u.to)[1] - at(u.from)[1])
        })!.owner
      const normal: Point = [DIRS[(edge.dir + 3) % 4][0], DIRS[(edge.dir + 3) % 4][1]]

      for (let a = 0; a < anchors.length - 1; a++) {
        const from = anchors[a]
        const to = anchors[a + 1]
        const owner = ownerAtS((from + to) / 2)
        const wobbly = edge.dir !== EAST && groups[owner].soft
        const points: Point[] = []
        if (wobbly) {
          // Points on a fixed lattice of the map, so a point is the same point whichever loop or fill asks.
          const axis = edge.dir % 2 === 0 ? 0 : 1
          const lo = Math.min(p0[axis] + DIRS[edge.dir][axis] * from, p0[axis] + DIRS[edge.dir][axis] * to)
          const hi = Math.max(p0[axis] + DIRS[edge.dir][axis] * from, p0[axis] + DIRS[edge.dir][axis] * to)
          const lattice: number[] = []
          for (
            let c = Math.ceil((lo + WOBBLE_MARGIN) / WOBBLE_STEP) * WOBBLE_STEP;
            c <= hi - WOBBLE_MARGIN;
            c += WOBBLE_STEP
          )
            lattice.push(c)
          if (DIRS[edge.dir][axis] < 0) lattice.reverse()
          for (const c of lattice) {
            const base: Point = axis === 0 ? [c, p0[1]] : [p0[0], c]
            const shift = (hashUnit(seed, `cave-edge:${base[0]},${base[1]}`, 0) * 2 - 1) * WOBBLE
            points.push([base[0] + normal[0] * shift, base[1] + normal[1] * shift])
          }
        }
        const end = along(p0, edge.dir, to)
        if (points.length === 0) outline.push(`L${pt(end)}`)
        else {
          // Each wobble point pulls the edge toward it rather than kinking it, so rock reads worn, not
          // chipped: the curve passes the midpoints between them and ends back on the edge's own line.
          const wobble = points
            .map((p, n) => {
              const q = points[n + 1] ?? end
              return `Q${pt(p)} ${pt(n + 1 < points.length ? [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] : end)}`
            })
            .join("")
          outline.push(wobble)
          patch(owner, `M${pt(along(p0, edge.dir, from))}${wobble}Z`)
        }
      }

      if (radii[next] > 0) {
        const curve = curveAt(next)
        outline.push(curve.d)
        patch(curve.owner, `M${pt(curve.t1)}${curve.d}L${pt(curve.v)}Z`)
      }
    })
    outline.push("Z")
  }

  for (const [owner, list] of patches) fills.set(groups[owner].id, fills.get(groups[owner].id)! + list.join(""))
  return { outline: outline.join(""), fills }
}
