import type { BlockAsk } from "../layLocks"
import type { LockPlan, PlanRegion } from "../lockPlan"
import { variantsOf } from "../prefabChecks"
import type { Prefab, SpecialPlace } from "../prefabTypes"
import { shuffle } from "../random"
import { claimsFloorAt } from "../roomFootprint"
import { inRect } from "../roomShape"
import type { CellRect, CorridorCell, Direction, FloorGrid, GridCell, SideSection } from "../siteTypes"
import { DIRS2, NODE_STEP, edgeNodes, makePkey, spreadContentIndices } from "./grid"
import { chainRoomCount, paddedChainLength } from "./ids"
import { meets, ringed, stampPrefab, type PrefabChoice } from "./placePrefabs"
import { pass } from "./state"
import type { Cell, FloorPrep, Refusal } from "./state"

/**
 * A DESIGNED ROOM'S BLOCK OF LATTICE NODES, claimed before the maze is dug: its prefab rect (ring included) laid on
 * the lattice, the node it stands on (`anchor`) and its ports, each a door place in its ring with the node the way
 * through it arrives at and the first node past the ring. A port's node is joined to the anchor through the room's own
 * floor, never by a lattice passage. `on` is where the floor's graph holds it: a step of the main path (`pin` naming
 * the main-path puzzle it is pinned to), a side path's end, or a lock's region.
 */
export type ReservedBlock = {
  room: string
  prefab: PrefabChoice
  /** Which of `variantsOf` the room is laid in. */
  variant: number
  mirrored: boolean
  rect: CellRect
  anchor: Cell
  ports: Port[]
  nodes: ReadonlySet<string>
  on: { main: number; pin?: number } | { section: number } | { region: string }
}

/** A side path walked to the block at its end: the node it hangs from, the door nodes of the room it leaves by
 * (where it hangs from one), and its cells up to and including the block's anchor. */
export type Spine = { attachedAt: Cell; via: Cell[]; cells: Cell[] }

/** The ways walked to and through the blocks before the maze is grown around them. `joins` are the hops of those
 * walks a room's own floor makes, from a port's node to its anchor: no passage of the lattice. */
export type ReservedWalk = {
  entrance: Cell
  mainPath: Cell[]
  spines: ReadonlyMap<number, Spine>
  passages: ReadonlySet<string>
  joins: ReadonlyArray<[Cell, Cell]>
}

/** A way into a room: its door place on the ring, the node the way arrives at (the door place itself where the ring
 * runs along a line of nodes, else the inside cell next to it) and the first node past the ring. */
export type Port = { node: Cell; door: Cell; out: Cell }

/** A variant at one parity of the lattice: its inside size, the anchor and its ports as offsets from the inside's
 * top-left, whether the anchor stands on bare floor, and how many nodes the rect and ring hold. */
type Shape = {
  variant: number
  layout: number
  mirrored: boolean
  h: number
  w: number
  pt: number
  pl: number
  anchor: Cell
  bare: boolean
  ports: Port[]
  nodes: number
}

const keyOf = ([r, c]: Cell) => `${r},${c}`
const cellOf = (key: string): Cell => key.split(",").map(Number) as Cell
const sameCell = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]

const lineNodes = (parity: number, size: number) => {
  let count = 0
  for (let k = -1; k <= size; k++) if ((parity + k) % 2 === 0) count++
  return count
}

const even = (k: number) => k % 2 === 0

const shapeCache = new WeakMap<Prefab, Shape[]>()

/** Every anchor and ports a prefab offers on the lattice, the most ports first. A port is a door place on a line of
 * nodes; the room's own floor joins every port to the anchor (prefabChecks proves it does), whatever stands between.
 * The anchor is an inside node on bare floor, or, where the parity leaves none, any inside node. */
export const shapesOf = (prefab: Prefab): Shape[] => {
  const cached = shapeCache.get(prefab)
  if (cached) return cached
  const shapes: Shape[] = []
  variantsOf(prefab).forEach((variant, index) => {
    const { cells } = variant
    const h = cells.length - 2
    const w = cells[0].length - 2
    const at = (i: number, j: number) => cells[i + 1][j + 1]
    for (const pt of [0, 1])
      for (const pl of [0, 1]) {
        const ports: Port[] = []
        for (let i = -1; i <= h; i++)
          for (let j = -1; j <= w; j++) {
            const across = i === -1 || i === h
            const along = j === -1 || j === w
            if (across === along || at(i, j) !== "d") continue
            const [dr, dc] = across ? [i === -1 ? -1 : 1, 0] : [0, j === -1 ? -1 : 1]
            if (!even(across ? pl + j : pt + i)) continue
            const onNode = even(across ? pt + i : pl + j)
            const node: Cell = onNode ? [i, j] : [i - dr, j - dc]
            ports.push({ node, door: [i, j], out: [node[0] + dr * NODE_STEP, node[1] + dc * NODE_STEP] })
          }
        if (ports.length === 0) continue
        const inside: Cell[] = []
        for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (even(pt + i) && even(pl + j)) inside.push([i, j])
        const bare = inside.filter(([i, j]) => at(i, j) === ".")
        const nodes = lineNodes(pt, h) * lineNodes(pl, w)
        for (const anchor of bare.length > 0 ? bare : inside)
          shapes.push({
            variant: index,
            layout: variant.layout,
            mirrored: variant.mirrored,
            h,
            w,
            pt,
            pl,
            anchor,
            bare: at(anchor[0], anchor[1]) === ".",
            ports,
            nodes,
          })
      }
  })
  const sorted = shapes.sort((a, b) => b.ports.length - a.ports.length)
  shapeCache.set(prefab, sorted)
  return sorted
}

/** The shape laid with its inside's top-left at top,left: its ports whose node past the ring stays on the grid and
 * every node it holds; undefined where its rect or ring leaves the grid. */
const placeShape = (n: number, shape: Shape, top: number, left: number) => {
  if (top - 1 < 0 || left - 1 < 0 || top + shape.h > n - 1 || left + shape.w > n - 1) return undefined
  const nodes = new Set<string>()
  for (let r = top - 1; r <= top + shape.h; r++)
    for (let c = left - 1; c <= left + shape.w; c++) if (r % 2 === 0 && c % 2 === 0) nodes.add(`${r},${c}`)
  const shift = ([i, j]: Cell): Cell => [top + i, left + j]
  const ports = shape.ports
    .map(({ node, door, out }) => ({ node: shift(node), door: shift(door), out: shift(out) }))
    .filter(({ out: [r, c] }) => r >= 0 && r < n && c >= 0 && c < n)
  const rect = { top, left, rows: shape.h, cols: shape.w }
  return { rect, anchor: shift(shape.anchor), ports, nodes }
}

const grownBy = (r: CellRect, by: number): CellRect => ({
  top: r.top - by,
  left: r.left - by,
  rows: r.rows + 2 * by,
  cols: r.cols + 2 * by,
})

/** Every node a block holds, and every node whose 3×3 would reach into a block's ring. */
export const blockZone = (blocks: readonly Pick<ReservedBlock, "rect">[]): ReadonlySet<string> => {
  const zone = new Set<string>()
  for (const { rect } of blocks) {
    const near = grownBy(rect, 2)
    for (let r = near.top; r < near.top + near.rows; r++)
      for (let c = near.left; c < near.left + near.cols; c++) if (r % 2 === 0 && c % 2 === 0) zone.add(`${r},${c}`)
  }
  return zone
}

/** Every hop a block's own floor makes, from its anchor to each of its ports' nodes, as pair keys on an `n`-wide grid:
 * a walk crosses them, the lattice joins them by no passage. */
export const roomJoins = (blocks: readonly ReservedBlock[], n: number): ReadonlySet<string> => {
  const pkey = makePkey(n)
  return new Set(blocks.flatMap(({ anchor: [ar, ac], ports }) => ports.map(({ node: [r, c] }) => pkey(ar, ac, r, c))))
}

/** Every node some block holds. */
export const blockNodes = (blocks: readonly ReservedBlock[] = []): ReadonlySet<string> =>
  new Set(blocks.flatMap(block => [...block.nodes]))

/** How central a step of a main path of `length` steps lies: 0 at its ends, 1 in its middle. */
export const centralityOf = (step: number, length: number): number =>
  length < 2 ? 0 : 1 - Math.abs((2 * step) / (length - 1) - 1)

type Heap = { cost: number; seq: number; key: string; steps: number; dir: number; prev?: string }[]
const push = (heap: Heap, entry: Heap[number]) => {
  heap.push(entry)
  for (let i = heap.length - 1; i > 0;) {
    const parent = (i - 1) >> 1
    if (before(heap[parent], heap[i])) break
    ;[heap[parent], heap[i]] = [heap[i], heap[parent]]
    i = parent
  }
}
const before = (a: Heap[number], b: Heap[number]) => a.cost < b.cost || (a.cost === b.cost && a.seq < b.seq)
const pop = (heap: Heap) => {
  const top = heap[0]
  const last = heap.pop()!
  if (heap.length > 0) {
    heap[0] = last
    for (let i = 0; ;) {
      const l = 2 * i + 1
      const r = l + 1
      let m = i
      if (l < heap.length && before(heap[l], heap[m])) m = l
      if (r < heap.length && before(heap[r], heap[m])) m = r
      if (m === i) break
      ;[heap[m], heap[i]] = [heap[i], heap[m]]
      i = m
    }
  }
  return top
}

const TURN = 4
const STRAIGHT = 10

/** The fewest-turn shortest walks from `from` over free nodes: each node's steps and the way back to `from`. */
const walkMap = (n: number, from: Cell, free: (key: string) => boolean) => {
  const best = new Map<string, { steps: number; prev?: string }>()
  const heap: Heap = []
  let seq = 0
  push(heap, { cost: 0, seq: seq++, key: keyOf(from), steps: 0, dir: -1 })
  while (heap.length > 0) {
    const cur = pop(heap)
    if (best.has(cur.key)) continue
    best.set(cur.key, { steps: cur.steps, prev: cur.prev })
    const [r, c] = cellOf(cur.key)
    DIRS2.forEach(([dr, dc], d) => {
      const nr = r + dr
      const nc = c + dc
      const key = `${nr},${nc}`
      if (nr < 0 || nr >= n || nc < 0 || nc >= n || best.has(key) || !free(key)) return
      const cost = cur.cost + STRAIGHT + (cur.dir >= 0 && cur.dir !== d ? TURN : 0)
      push(heap, { cost, seq: seq++, key, steps: cur.steps + 1, dir: d, prev: cur.key })
    })
  }
  const pathTo = (to: Cell): Cell[] => {
    const path: Cell[] = []
    for (let key: string | undefined = keyOf(to); key !== undefined; key = best.get(key)?.prev)
      path.unshift(cellOf(key))
    return path
  }
  return { best, pathTo }
}

type Place = "main" | "end"

/** One room the floor asks for and where its graph holds it: a main-path puzzle it is pinned to, a main-path hub
 * `central` deep, a side path's end, or a lock's region. `placement` is its index in `prefabPlacements`. */
export type RoomAsk = {
  room: string
  placement?: number
  at: { pin: number } | { central: number } | { section: number } | { region: string }
}

const endHolds = (section: SideSection): SpecialPlace => (section.end === "treasure" ? "chest" : "portal")

/**
 * WHETHER A DESIGNED ROOM MAY TAKE A LOCK'S REGION: the room has a door place for every way the region has and a
 * mechanism place for every control it seats. The region is a lock's own (not the floor's entrance or exit), its
 * ways are corridors (a drop needs its straight run, so a drop's end is never a room), and it seats nothing but its
 * controls and its doors (the doors stand on its corridors), at most one control: the room is one node.
 */
export const roomTakesRegion = (plan: LockPlan, region: PlanRegion, prefab: Prefab): boolean => {
  if (region.owner === undefined || region.answersTo !== undefined) return false
  if (plan.drops.some(drop => drop.launch === region.id || drop.landing === region.id)) return false
  if (plan.junctions.some(junction => junction.region === region.id)) return false
  if (region.seats.some(seat => seat.for !== "control" && seat.for !== "door")) return false
  const controls = region.seats.filter(seat => seat.for === "control").length
  const mechanisms = Object.values(prefab.specials).filter(place => place === "mechanism").length
  if (controls > Math.min(1, mechanisms)) return false
  const ways = plan.corridors.filter(corridor => corridor.from === region.id || corridor.to === region.id).length
  return ways > 0 && shapesOf(prefab).some(shape => shape.ports.length >= ways)
}

/** How central a lock's region lies along the lock's route: an off-route region by the route region it hangs off. */
const centralityAlongRoute = (plan: LockPlan, region: PlanRegion): number => {
  const at = plan.route.indexOf(region.onRoute ? region.id : (region.mouth ?? ""))
  return at < 0 ? 0 : centralityOf(at, plan.route.length)
}

/**
 * WHICH DESIGNED ROOMS A FLOOR ASKS TO RESERVE, from its config alone: every pinned room on its main-path puzzle,
 * then each placement up to `max` in the order the floor names them. A placement takes a side path's end whose
 * content it has a place for (a chest, a portal) where it leans to the floor's ends (`central` 0), else a hub on the
 * main path, else such an end. A hub is a fork the side paths branch off, so a floor holds no more hubs than it has
 * groups of side paths to hang from them. On a lock floor each placement takes, up to `max`, the lock's regions it
 * may take (`roomTakesRegion`), nearest its `central` along the lock's route first; the lay places those rooms.
 */
export const roomAsks = (prep: FloorPrep): RoomAsk[] => {
  const { config } = prep.config
  const plan = prep.sizing.layPlan
  if (plan) {
    const taken = new Set<string>()
    return (config.prefabPlacements ?? []).flatMap(({ room, max, central }, placement): RoomAsk[] => {
      const prefab = config.prefabs?.[room]
      if (!prefab) return []
      const regions = plan.regions
        .filter(region => !taken.has(region.id) && roomTakesRegion(plan, region, prefab))
        .map(region => ({ region, off: Math.abs(centralityAlongRoute(plan, region) - central) }))
        .sort((a, b) => a.off - b.off)
        .slice(0, max)
      return regions.map(({ region }) => {
        taken.add(region.id)
        return { room, placement, at: { region: region.id } }
      })
    })
  }
  const pins = Object.entries(config.prefabsByIndex ?? {})
    .filter(([, room]) => config.prefabs?.[room] !== undefined)
    .map(([k, room]): RoomAsk => ({ room, at: { pin: Number(k) } }))
    .sort((a, b) => ("pin" in a.at && "pin" in b.at ? a.at.pin - b.at.pin : 0))
  const placements = config.prefabPlacements ?? []
  if (pins.length === 0 && placements.length === 0) return []
  const { sideSections, branchSections, hubGroupSize } = prep.sections
  const grouped = new Set([...prep.forks.forkGroups, ...prep.forks.junctionGroups].flat())
  const loose = branchSections.filter(si => !grouped.has(si))
  const ends = loose.filter(si => !prep.layout.dropSeams.has(si) && !sideSections[si].hidden)
  const taken = new Set<number>()
  let hubs = 0
  const hubRoom = (ends: number) => Math.ceil((loose.length - ends) / hubGroupSize)
  const asks = [...pins]
  placements.forEach(({ room, max, central }, placement) => {
    const prefab = config.prefabs?.[room]
    if (!prefab) return
    const places = Object.values(prefab.specials)
    const hubDoors = shapesOf(prefab).some(shape => shape.ports.length >= 3)
    for (let k = 0; k < max; k++) {
      const end = ends.find(si => !taken.has(si) && places.includes(endHolds(sideSections[si])))
      const endFits = end !== undefined && hubs <= hubRoom(taken.size + 1)
      const hubFits = hubDoors && hubs < hubRoom(taken.size)
      const place: Place | undefined =
        endFits && (central === 0 || !hubFits) ? "end" : hubFits ? "main" : endFits ? "end" : undefined
      if (place === undefined) break
      if (place === "end") {
        taken.add(end!)
        asks.push({ room, placement, at: { section: end! } })
      } else {
        hubs++
        asks.push({ room, placement, at: { central } })
      }
    }
  })
  return asks
}

/** The nodes the floor's asked rooms hold at the least, which the ladder adds to the grid. */
export const reservedNodeCount = (prep: FloorPrep): number =>
  roomAsks(prep).reduce((sum, { room }) => {
    const prefab = prep.config.config.prefabs?.[room]
    const shapes = prefab ? shapesOf(prefab) : []
    return sum + (shapes.length ? Math.min(...shapes.map(shape => shape.nodes)) : 0)
  }, 0)

/** The smallest odd grid at least `n` wide whose nodes hold `extra` more than `n`'s. */
export const gridWith = (n: number, extra: number): number => {
  if (extra <= 0) return n
  const side = (n + 1) / 2
  return 2 * Math.ceil(Math.sqrt(side * side + extra)) - 1
}

const refused = (room: string, wanted: number, placed: number): Refusal => ({
  retry: [{ type: "prefabsNotPlaced", room, wanted, placed }],
})

// How many attempts a floor tries its rooms for before it leaves out one more of those it may do without.
const ATTEMPTS_PER_ROOM = 4

/** The asks an attempt tries: every pinned room and every placement up to its `min`, and of the rest as many as
 * the attempts so far have not given up, the last asked given up first. */
const keptAsks = (prep: FloorPrep, asks: RoomAsk[], attempt: number): RoomAsk[] => {
  const mins = (prep.config.config.prefabPlacements ?? []).map(({ min }) => min)
  const seen = new Map<number, number>()
  const optional = asks.filter(({ placement }) => {
    if (placement === undefined) return false
    seen.set(placement, (seen.get(placement) ?? 0) + 1)
    return seen.get(placement)! > mins[placement]
  })
  const dropped = new Set(optional.slice(Math.max(0, optional.length - Math.floor(attempt / ATTEMPTS_PER_ROOM))))
  return asks.filter(ask => !dropped.has(ask))
}

// How many placements of one room a walk tries before it gives the room up, and how many starts a side path tries.
const MAIN_OPTIONS = 40
// What one way out fewer weighs against a step off the length a hub's walk wants.
const HUB_WAY_WEIGHT = 3
const SIDE_OPTIONS = 10
const SIDE_STARTS = 8

/** The hops from a port's node past the ring to the anchor: one to the port's node, one more to the anchor beyond it. */
const hopsIn = (anchor: Cell, port: Port) => (sameCell(port.node, anchor) ? 1 : 2)

/** The nodes a walk steps on coming in by a port, from its node to the anchor. */
const portIn = (anchor: Cell, port: Port): Cell[] => (sameCell(port.node, anchor) ? [anchor] : [port.node, anchor])

type Laid = Omit<ReservedBlock, "on" | "room" | "prefab" | "variant" | "mirrored"> & { shape: Shape }

const blockFrom = (
  room: string,
  { shape, rect, anchor, ports, nodes }: Laid,
  on: ReservedBlock["on"]
): ReservedBlock => ({
  room,
  prefab: { cell: anchor, name: room, layout: shape.layout, mirrored: shape.mirrored, pick: {} },
  variant: shape.variant,
  mirrored: shape.mirrored,
  rect,
  anchor,
  ports,
  nodes,
  on,
})

/** The lock regions the floor's rooms ask the lay for on attempt `attempt`, each with the shapes its room may take. */
export const blockAsks = (prep: FloorPrep, attempt: number): BlockAsk[] => {
  const prefabs = prep.config.config.prefabs ?? {}
  return keptAsks(prep, roomAsks(prep), attempt).flatMap(({ room, at }) =>
    "region" in at ? [{ region: at.region, room, shapes: shapesOf(prefabs[room]) }] : []
  )
}

/**
 * THE DESIGNED ROOMS CLAIM THEIR BLOCKS BEFORE THE MAZE IS DUG (`roomAsks`), and the main path and the side paths
 * ending in one are walked to them first: from an edge entrance through each main block in turn, in by one port, over
 * its anchor and out by another, to an end the rung's distance along; then each side path from a hub's free port, or
 * else from a bare main-path node, to the block at its end. A walk crosses a room from a port's node to its anchor
 * over the room's own floor (`joins`), never by a passage. Each block is placed where its walk lands nearest the
 * length it wants, its ring clear of every other block's. A pinned room that finds no place refuses the attempt, as
 * does a placement whose `min` is not met; the others are left out. A floor that asks none draws nothing. On a lock
 * floor the lay places the rooms in their regions (`blockAsks`) and they are read off it here, drawing nothing.
 */
export const reserveRooms = pass(
  "reserveRooms",
  ["rung", "rand", "attempt", "lay"],
  ["blocks", "walks"],
  (prep, state) => {
    const asked = roomAsks(prep)
    // A placement the floor has no slot for, up to its `min`, refuses every attempt by name.
    for (const [placement, { room, min }] of (prep.config.config.prefabPlacements ?? []).entries()) {
      const slots = asked.filter(ask => ask.placement === placement).length
      if (slots < min) return refused(room, min, 0)
    }
    // On a lock floor the lay placed the rooms in their regions.
    const laid = state.lay?.laid
    if (laid) {
      const prefabs = prep.config.config.prefabs ?? {}
      state.blocks = laid.blocks.map(({ region, room, shape, top, left }) => {
        const chosen = shapesOf(prefabs[room])[shape]
        return blockFrom(room, { ...placeShape(laid.n, chosen, top, left)!, shape: chosen }, { region })
      })
      state.walks = null
      return
    }
    const asks = keptAsks(prep, asked, state.attempt)
    if (asks.length === 0) {
      state.blocks = []
      state.walks = null
      return
    }
    const { rand, rung } = state
    const n = rung.n
    const length = rung.targetDistance
    const { contentCount, leverOnMain } = prep.sizing
    const { sideSections } = prep.sections
    const prefabs = prep.config.config.prefabs ?? {}
    const edge = edgeNodes(n)
    const entrance = edge[Math.floor(rand() * edge.length)]

    const taken = new Set<string>([keyOf(entrance)])
    const blocks: ReservedBlock[] = []
    const free = (key: string) => !taken.has(key)
    const clearOf = (rect: CellRect) => blocks.every(other => !meets(grownBy(rect, 2), grownBy(other.rect, 1)))

    /** The `keep` best placements of `room` reachable from `from` over free nodes by one of its ports, best scored
     * first, each score jittered by a draw; `ways` is how many ports it needs. A score reads the steps to the port's
     * node past the ring, the hops from there to the anchor and how many ports the placement has. */
    const options = (
      room: string,
      from: Cell,
      score: (steps: number, hops: number, ports: number) => number,
      ways: number,
      keep: number
    ) => placements(room, from, ways, (steps, hops, ports) => score(steps, hops, ports) + rand() * 0.9, false, keep)
    /** Whether `room` still has a placement reachable from `from`, drawing nothing. */
    const canStand = (room: string, from: Cell, ways: number) => placements(room, from, ways, () => 0, true).length > 0
    const placements = (
      room: string,
      from: Cell,
      ways: number,
      score: (steps: number, hops: number, ports: number) => number,
      first = false,
      keep = Infinity
    ) => {
      const shapes = shapesOf(prefabs[room])
      const reach = walkMap(n, from, free)
      // The best `keep` so far, best first; a placement scored as an earlier one goes after it.
      const found: Array<{ laid: Laid; entry: number; score: number }> = []
      const consider = (laid: Omit<Laid, "shape">, shape: Shape, entry: number, scored: number) => {
        if (found.length >= keep && scored >= found[found.length - 1].score) return
        let at = found.length
        while (at > 0 && found[at - 1].score > scored) at--
        found.splice(at, 0, { laid: { ...laid, shape }, entry, score: scored })
        if (found.length > keep) found.pop()
      }
      // Shapes that differ only by their anchor lay the same rect, ports and nodes: each is laid and checked once.
      const fits = new Map<string, ReturnType<typeof placeShape> | null>()
      for (const shape of shapes) {
        if (shape.ports.length < ways) continue
        for (let top = 1; top + shape.h <= n - 1; top++) {
          if (top % 2 !== shape.pt) continue
          for (let left = 1; left + shape.w <= n - 1; left++) {
            if (left % 2 !== shape.pl) continue
            const at = `${shape.variant}|${shape.pt}|${shape.pl}|${top}|${left}`
            if (!fits.has(at)) {
              const laid = placeShape(n, shape, top, left)
              const ok =
                laid !== undefined &&
                laid.ports.length >= ways &&
                clearOf(laid.rect) &&
                [...laid.nodes].every(node => !taken.has(node))
              fits.set(at, ok ? laid : null)
            }
            const fit = fits.get(at)
            if (!fit) continue
            const placed = { ...fit, anchor: [top + shape.anchor[0], left + shape.anchor[1]] as Cell }
            placed.ports.forEach((port, entry) => {
              const out = keyOf(port.out)
              const walk = reach.best.get(out)
              if (!walk || taken.has(out)) return
              const hops = hopsIn(placed.anchor, port)
              consider(placed, shape, entry, score(walk.steps, hops, placed.ports.length))
            })
            if (first && found.length > 0) return found
          }
        }
      }
      return found
    }

    /** Walks `into` on from `from` to the node past the block's entry port and in by it to the anchor, claiming the
     * block. */
    const walkInto = (into: Cell[], from: Cell, laid: Laid, entry: number): boolean => {
      const port = laid.ports[entry]
      const out = port.out
      const reach = walkMap(n, from, key => free(key) && !laid.nodes.has(key))
      if (!reach.best.has(keyOf(out))) return false
      const walk = reach.pathTo(out).slice(1)
      for (const cell of walk) taken.add(keyOf(cell))
      for (const node of laid.nodes) taken.add(node)
      into.push(...walk, ...portIn(laid.anchor, port))
      return true
    }

    const blockOf = (ask: RoomAsk, laid: Laid, on: ReservedBlock["on"]): ReservedBlock => blockFrom(ask.room, laid, on)

    // THE MAIN PATH, through each main block in the order it lies along the walk.
    const spread = spreadContentIndices(contentCount, 1, length + 1)
    const mains = asks
      .flatMap((ask): Array<{ ask: RoomAsk; pin: number | undefined; depth: number }> => {
        if ("pin" in ask.at) {
          const at = spread[ask.at.pin + (leverOnMain ? 1 : 0)] ?? Math.round(length / 2)
          return [{ ask, pin: ask.at.pin, depth: at / length }]
        }
        if ("central" in ask.at) {
          const { central } = ask.at
          return [{ ask, pin: undefined, depth: rand() < 0.5 ? central / 2 : 1 - central / 2 }]
        }
        return []
      })
      .sort((a, b) => a.depth - b.depth)
    const sides = asks.filter(ask => "section" in ask.at)

    // A pinned room is passed through; a hub also needs a way out for a side path.
    const waysOf = (pin: number | undefined) => (pin === undefined ? 3 : 2)
    const path: Cell[] = [entrance]
    // The steps walked so far that a block's nodes leave free for the floor's content.
    const walked = () => path.filter(cell => !blocks.some(block => block.nodes.has(keyOf(cell)))).length - 1
    const laidOf = new Map<number, number>()
    for (const [m, { ask, pin, depth }] of mains.entries()) {
      const cur = path[path.length - 1]
      const want = Math.max(1, Math.round(depth * length) - walked())
      const later = [
        ...mains.slice(m + 1).map(main => ({ ask: main.ask, ways: waysOf(main.pin) })),
        ...sides.map(side => ({ ask: side, ways: 1 })),
      ]
      // A hub leans to the shapes with the most ways out: every one the main path leaves free is a side path's.
      const score = (steps: number, hops: number, ports: number) =>
        Math.abs(steps + hops - want) + (pin === undefined ? HUB_WAY_WEIGHT * (4 - Math.min(4, ports)) : 0)
      let laidHere = false
      for (const option of options(ask.room, cur, score, waysOf(pin), MAIN_OPTIONS)) {
        const pathBefore = path.length
        const takenBefore = new Set(taken)
        const undo = () => {
          path.length = pathBefore
          taken.clear()
          for (const key of takenBefore) taken.add(key)
        }
        if (!walkInto(path, cur, option.laid, option.entry)) {
          undo()
          continue
        }
        const anchorStep = path.length - 1
        const { anchor } = option.laid
        const onPath = new Set(path.map(keyOf))
        const exits = shuffle(
          option.laid.ports.filter(
            (port, i) =>
              i !== option.entry &&
              !taken.has(keyOf(port.out)) &&
              (sameCell(port.node, anchor) || !onPath.has(keyOf(port.node)))
          ),
          rand
        )
          .map(port => ({ port, room: walkMap(n, port.out, free).best.size }))
          .sort((a, b) => b.room - a.room)
        if (exits.length === 0 || exits[0].room < 2) {
          undo()
          continue
        }
        const out = [...portIn(anchor, exits[0].port)].reverse().slice(1)
        for (const cell of out) taken.add(keyOf(cell))
        path.push(...out)
        const end = path[path.length - 1]
        blocks.push(blockOf(ask, option.laid, { main: anchorStep, ...(pin !== undefined ? { pin } : {}) }))
        if (!later.every(({ ask, ways }) => canStand(ask.room, end, ways))) {
          blocks.pop()
          undo()
          continue
        }
        laidHere = true
        if (ask.placement !== undefined) laidOf.set(ask.placement, (laidOf.get(ask.placement) ?? 0) + 1)
        break
      }
      if (!laidHere && pin !== undefined) return refused(ask.room, 1, 0)
    }

    // The rest of the main path, to an end the rung's distance along, clear of every block.
    {
      const cur = path[path.length - 1]
      const remaining = Math.max(1, length - walked())
      const near = blockZone(blocks)
      const reach = walkMap(n, cur, free)
      const ends = shuffle(
        [...reach.best.entries()].filter(([key]) => key !== keyOf(cur) && !near.has(key)),
        rand
      ).sort((a, b) => Math.abs(a[1].steps - remaining) - Math.abs(b[1].steps - remaining))
      if (ends.length === 0) return { retry: [] }
      const walk = reach.pathTo(cellOf(ends[0][0])).slice(1)
      for (const cell of walk) taken.add(keyOf(cell))
      path.push(...walk)
    }

    // THE SIDE PATHS ENDING IN A BLOCK, each from a hub's free port (the most central hub first) or a bare main node.
    const spines = new Map<number, Spine>()
    const spreadOnPath = spreadContentIndices(contentCount, 1, path.length)
    const goal = spreadOnPath[spreadOnPath.length - 1] ?? path.length - 1
    const doorsWalked = new Set(path.map(keyOf))
    for (const ask of sides) {
      if (!("section" in ask.at)) continue
      const si = ask.at.section
      const needed = paddedChainLength(
        rung.chainPacking,
        chainRoomCount(prep.mechanisms.leverAtPositional, sideSections[si], `s${si}`)
      )
      const near = blockZone(blocks)
      const hubStarts = blocks
        .filter(block => "main" in block.on)
        .map(block => ({ block, central: centralityOf((block.on as { main: number }).main, path.length) }))
        .sort((a, b) => b.central - a.central)
        .flatMap(({ block }) =>
          block.ports
            .filter(({ node }) => sameCell(node, block.anchor) || !doorsWalked.has(keyOf(node)))
            .filter(({ out }) => !doorsWalked.has(keyOf(out)) && !taken.has(keyOf(out)))
            .map(port => ({ attachedAt: block.anchor, via: portIn(block.anchor, port).slice(0, -1), from: port.out }))
        )
      const nodeStarts = shuffle(
        path.slice(1, Math.max(1, goal)).filter(cell => !near.has(keyOf(cell))),
        rand
      ).map(cell => ({ attachedAt: cell, via: [] as Cell[], from: cell }))
      let laidHere = false
      for (const start of [...hubStarts, ...nodeStarts.slice(0, SIDE_STARTS)]) {
        const fromHub = start.from !== start.attachedAt
        const wasFree = !taken.has(keyOf(start.from))
        if (fromHub) taken.add(keyOf(start.from))
        const score = (steps: number, hops: number) =>
          Math.abs((fromHub ? steps + 1 : steps) + hops - (needed + hops - 1))
        for (const option of options(ask.room, start.from, score, 1, SIDE_OPTIONS)) {
          const takenBefore = new Set(taken)
          const cells: Cell[] = fromHub ? [start.from] : []
          if (!walkInto(cells, start.from, option.laid, option.entry)) {
            taken.clear()
            for (const key of takenBefore) taken.add(key)
            continue
          }
          for (const cell of start.via) doorsWalked.add(keyOf(cell))
          blocks.push(blockOf(ask, option.laid, { section: si }))
          laidOf.set(ask.placement!, (laidOf.get(ask.placement!) ?? 0) + 1)
          spines.set(si, { attachedAt: start.attachedAt, via: start.via, cells })
          laidHere = true
          break
        }
        if (laidHere) break
        if (fromHub && wasFree) taken.delete(keyOf(start.from))
      }
    }

    // A placement short of its `min` refuses the attempt by name.
    for (const [placement, { room, min }] of (prep.config.config.prefabPlacements ?? []).entries()) {
      const placed = laidOf.get(placement) ?? 0
      if (placed < min) return refused(room, min, placed)
    }

    // A hop between two nodes of one block crosses its room's floor: a join, never a passage.
    const pkey = makePkey(n)
    const passages = new Set<string>()
    const joins: Array<[Cell, Cell]> = []
    const link = (cells: Cell[]) =>
      cells.slice(1).forEach((cell, i) => {
        const from = cells[i]
        if (blocks.some(({ nodes }) => nodes.has(keyOf(from)) && nodes.has(keyOf(cell)))) joins.push([from, cell])
        else passages.add(pkey(from[0], from[1], cell[0], cell[1]))
      })
    link(path)
    for (const { attachedAt, via, cells } of spines.values()) link([attachedAt, ...via, ...cells])
    state.blocks = blocks
    state.walks = { entrance, mainPath: path, spines, passages, joins }
  }
)

const SIDES: ReadonlyArray<[number, number, Direction]> = [
  [-1, 0, "n"],
  [0, 1, "e"],
  [1, 0, "s"],
  [0, -1, "w"],
]

/**
 * A ROOM'S OWN FLOOR, OPEN: every cell of its rect, and every door place a way crosses (one the carve drew), is floor
 * joined to its neighbours within the rect and to its door. The anchor keeps its type and contents and gains the
 * ways, and so does a door, a stop of the corridor it ends that a save files by its own name; every other cell is a
 * corridor of the anchor's section and region.
 */
export const openRoomFloor = (grid: FloorGrid, block: ReservedBlock): FloorGrid => {
  const { rect } = block
  const [ar, ac] = block.anchor
  const node = grid.cells[ar][ac]
  if (node.type === "empty") throw new Error(`[carve] room ${block.room} has no node at ${ar},${ac}`)
  const doors = new Set(
    block.ports.flatMap(({ door: [r, c] }) => (grid.cells[r]?.[c]?.type !== "empty" ? [`${r},${c}`] : []))
  )
  const floor = (r: number, c: number) => inRect(rect, r, c) || doors.has(`${r},${c}`)
  const ground: Omit<CorridorCell, "dirs"> = {
    type: "corridor",
    state: node.state,
    ...(node.difficulty ? { difficulty: node.difficulty } : {}),
    ...(node.tileset ? { tileset: node.tileset } : {}),
    ...(node.sectionAddress !== undefined ? { sectionAddress: node.sectionAddress } : {}),
    ...(node.region !== undefined ? { region: node.region } : {}),
    ...(node.sectionHash !== undefined ? { sectionHash: node.sectionHash } : {}),
    ...(node.legacySectionHash !== undefined ? { legacySectionHash: node.legacySectionHash } : {}),
    ...(node.hidden ? { hidden: true } : {}),
  }
  const cells = grid.cells.map(row => [...row])
  const ring = ringed(rect)
  for (let r = ring.top; r < ring.top + ring.rows; r++)
    for (let c = ring.left; c < ring.left + ring.cols; c++) {
      if (!floor(r, c)) continue
      const cell = cells[r][c]
      const dirs = new Set<Direction>(cell.type === "empty" ? [] : cell.dirs)
      for (const [dr, dc, d] of SIDES)
        if (floor(r + dr, c + dc) && (inRect(rect, r, c) || inRect(rect, r + dr, c + dc))) dirs.add(d)
      const keeps = cell.type !== "empty" && ((r === ar && c === ac) || !inRect(rect, r, c))
      cells[r][c] = keeps ? { ...cell, dirs } : { ...ground, dirs }
    }
  return { ...grid, cells }
}

/** Each block's room drawn over its anchor, at its rect, its floor open. */
export const stampBlocks = (prep: FloorPrep, blocks: readonly ReservedBlock[], grid: FloorGrid): FloorGrid =>
  blocks.reduce((working, block) => stampPrefab(openRoomFloor(working, block), block.prefab, block.rect, prep), grid)

const isDoorCell = (cell: GridCell): boolean =>
  cell.type === "corridor"
    ? cell.obstacle !== undefined || cell.openGate !== undefined
    : cell.type === "room" &&
      (cell.requiredKeyId !== undefined ||
        cell.gateVariant !== undefined ||
        cell.regionBarrier !== undefined ||
        cell.passage !== undefined ||
        cell.tags?.includes("gate") === true)

/**
 * A BLOCK'S RING IS ITS OWN: no room but its anchor's stands inside its rect or ring, no gate, no other room's 3×3
 * reaches into it, and no other block's ring meets it. Any of them refuses the attempt, naming the room. Every
 * `shut` cell counts as a gate whether or not a switch shuts it, so a mod being absent changes no refusal.
 */
export const ringFault = (
  grid: FloorGrid,
  blocks: readonly ReservedBlock[],
  shut: ReadonlySet<string> = new Set()
): Refusal | undefined => {
  const anchors = new Set(blocks.map(block => keyOf(block.anchor)))
  const fault = (block: ReservedBlock, why: string): Refusal => ({
    retry: [{ type: "prefabsNotPlaced", room: block.room, wanted: 1, placed: 0, why }],
  })
  for (const [i, block] of blocks.entries()) {
    const ring = ringed(block.rect)
    const other = blocks.find((next, j) => j !== i && meets(ring, ringed(next.rect)))
    if (other) return fault(block, `its ring meets room ${other.room}`)
    for (let r = ring.top; r < ring.top + ring.rows; r++)
      for (let c = ring.left; c < ring.left + ring.cols; c++) {
        const cell = grid.cells[r]?.[c]
        if (!cell || anchors.has(`${r},${c}`)) continue
        if (isDoorCell(cell) || shut.has(`${r},${c}`)) return fault(block, `a gate stands at ${r},${c} in its ring`)
        if (cell.type === "room") return fault(block, `a room stands at ${r},${c} in its ring`)
      }
    for (let r = ring.top - 1; r <= ring.top + ring.rows; r++)
      for (let c = ring.left - 1; c <= ring.left + ring.cols; c++) {
        if (anchors.has(`${r},${c}`) || !grid.cells[r]?.[c] || !claimsFloorAt(grid, r, c)) continue
        if (meets(ring, { top: r - 1, left: c - 1, rows: 3, cols: 3 }))
          return fault(block, `the room at ${r},${c} reaches into its ring`)
      }
  }
  return undefined
}

/**
 * THE FLOOR CUT TO ITS BOX: every row and column outside the cells it carved and the rooms it drew is dropped, by an
 * even count so every node stays on a node. Every position the grid holds moves with it.
 */
export const croppedToBox = (grid: FloorGrid): FloorGrid => {
  let [top, left, bottom, right] = [Infinity, Infinity, -Infinity, -Infinity]
  const take = (r: number, c: number) => {
    top = Math.min(top, r)
    left = Math.min(left, c)
    bottom = Math.max(bottom, r)
    right = Math.max(right, c)
  }
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty") return
      take(r, c)
      if (cell.prefabRoom) {
        const ring = ringed(cell.prefabRoom.rect)
        take(ring.top, ring.left)
        take(ring.top + ring.rows - 1, ring.left + ring.cols - 1)
      }
    })
  )
  if (top === Infinity) return grid
  const dr = top - (top % NODE_STEP)
  const dc = left - (left % NODE_STEP)
  const rows = bottom - dr + 1 + ((bottom - dr) % 2)
  const cols = right - dc + 1 + ((right - dc) % 2)
  if (dr === 0 && dc === 0 && rows === grid.rows && cols === grid.cols) return grid
  const at = ([r, c]: readonly [number, number]): [number, number] => [r - dr, c - dc]
  const atKey = (key: string) => at(cellOf(key)).join(",")
  const moved = (cell: GridCell): GridCell => {
    if (cell.type === "empty") return cell
    const room = cell.prefabRoom
    const prefabRoom = room && {
      ...room,
      rect: { ...room.rect, top: room.rect.top - dr, left: room.rect.left - dc },
      stop: at(room.stop),
      ...(room.actor ? { actor: at(room.actor) } : {}),
      ...(room.nodeArt ? { nodeArt: at(room.nodeArt) } : {}),
      objects: room.objects.map(object => ({ ...object, top: object.top - dr, left: object.left - dc })),
      blocked: room.blocked.map(atKey),
      doors: room.doors.map(at),
    }
    if (cell.type === "corridor") return prefabRoom ? { ...cell, prefabRoom } : cell
    const mechanism = cell.mechanism && {
      ...cell.mechanism,
      ...(cell.mechanism.transitions
        ? { transitions: cell.mechanism.transitions.map(move => ({ ...move, at: at(move.at) })) }
        : {}),
      ...(cell.mechanism.underfoot
        ? { underfoot: cell.mechanism.underfoot.map(foot => ({ ...foot, at: at(foot.at) })) }
        : {}),
    }
    return { ...cell, ...(prefabRoom ? { prefabRoom } : {}), ...(mechanism ? { mechanism } : {}) }
  }
  return {
    ...grid,
    rows,
    cols,
    cells: Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => moved(grid.cells[r + dr]?.[c + dc] ?? { type: "empty" }))
    ),
    entrancePos: at(grid.entrancePos),
    exitPos: at(grid.exitPos),
    staircases: Object.fromEntries(Object.entries(grid.staircases).map(([id, pos]) => [id, at(pos)])),
  }
}
