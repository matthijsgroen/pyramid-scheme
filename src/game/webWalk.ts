// THE WEB WALK: which pull sets a player can reach, whether every one closes on the whole tier, and what the
// designer reads off it (docs/instructions/sand-pyramid.md, "Why any pull order works"). A pyramid is a graph of its
// main rooms, lock regions and side sections; the floor's own controls are taken as workable, so the floor walk
// (floorLockWalk.ts) stays the soundness gate of each floor and a `visit` override can stand in for it.
import type { Lock } from "./lockAuthoring"
import { barriersOf, isOutsideInput, isRegionGate, joinOf, nestSpotOf } from "./lockAuthoring"
import { lockChecks } from "./lockChecks"
import { MAX_LOCK_STATES } from "./lockWalk"
import { describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import type { FloorGrid } from "./siteTypes"
import type { Web } from "./webNotation"
import type { PyramidRef, ResolvedWeb, WebDoor, WebFloor, WebRefusal, WebSection, WebSpot } from "./webLine"
import { webHeldKeys } from "./webKeys"
import {
  instanceOf,
  isLockRegion,
  joins,
  MAX_WEB_ACTIVATORS,
  potKey,
  pyramidName,
  regionNode,
  roomNode,
  sectionNode,
  seamPath,
  startNode,
} from "./webLine"

type Held = ReadonlySet<string>

/** A condition on a passage: every listed key held, and each lock gate open (floor owners always can be). */
type Gate = { owners: ({ key: string; face: string } | { floor: string })[]; mode: "every" | "any" }
type Passage = { doors: { key: string; face: string }[]; gates: Gate[] }
type Edge = Passage & { a: string; b: string; oneWay?: boolean; label: string }
type Graph = {
  edges: Map<string, Edge[]>
  /** What a node asks of whoever enters it: a buried region, or a lock's own region barrier. */
  nodes: Map<string, Passage>
  /** A room standing in a lock region is buried with it. */
  regionOf: Map<string, string>
  start: string
  exit: string
  /** Each floor's main rooms and section rooms, for what lies past a front. */
  floorRooms: string[][]
  sectionRooms: Map<string, string[]>
  /** The keys any door or face of this pyramid asks for. */
  keys: Set<string>
  /** Ward keys asked on the way: assumed held, and listed. */
  assumed: Set<string>
}

const gateOpen = (gate: Gate, held: Held) => {
  const ok = (owner: Gate["owners"][number]) => !("key" in owner) || held.has(owner.key)
  return gate.mode === "any" ? gate.owners.some(ok) : gate.owners.every(ok)
}
const passable = (passage: Passage | undefined, held: Held) =>
  !passage || (passage.doors.every(d => held.has(d.key)) && passage.gates.every(g => gateOpen(g, held)))
/** The faces of a passage that stand shut under `held`: what a player standing beside it sees. */
const shutFaces = (passage: Passage | undefined, held: Held): { key: string; face: string }[] =>
  passage
    ? [
        ...passage.doors.filter(d => !held.has(d.key)),
        ...passage.gates
          .filter(g => !gateOpen(g, held))
          .flatMap(g => g.owners.flatMap(o => ("key" in o && !held.has(o.key) ? [o] : []))),
      ]
    : []

/** The id a binding's faces are seen under. */
export const bindingFace = (binding: { at: PyramidRef; floor: number; lock: string; input: string }) =>
  `${pyramidName(binding.at)} f${binding.floor} ${binding.lock}.${binding.input}`

const graphOf = (resolved: ResolvedWeb, at: PyramidRef): Graph => {
  const floors = resolved.world.journeys[at.journey][at.pyramid - 1].floors
  const edges = new Map<string, Edge[]>()
  const nodes = new Map<string, Passage>()
  const regionOf = new Map<string, string>()
  const keys = new Set<string>()
  const assumed = new Set<string>()
  const node = (id: string): Passage => {
    if (!nodes.has(id)) nodes.set(id, { doors: [], gates: [] })
    return nodes.get(id)!
  }
  const join = (a: string, b: string, label: string, extra: Partial<Edge> = {}): Edge => {
    const edge: Edge = { a, b, label, doors: [], gates: [], ...extra }
    node(a)
    node(b)
    edges.set(a, [...(edges.get(a) ?? []), edge])
    if (!edge.oneWay) edges.set(b, [...(edges.get(b) ?? []), edge])
    return edge
  }
  const here = resolved.doors.filter(d => d.at.journey === at.journey && d.at.pyramid === at.pyramid)
  const bindings = resolved.bindings.filter(b => b.at.journey === at.journey && b.at.pyramid === at.pyramid)
  const doorOn = (passage: Passage, door: WebDoor) => {
    passage.doors.push({ key: door.key, face: door.id })
    keys.add(door.key)
  }
  const floorRooms: string[][] = []
  const sectionRooms = new Map<string, string[]>()

  floors.forEach((floor: WebFloor, f) => {
    floorRooms.push(floor.rooms.map((_, i) => roomNode(f, i)))
    if (f > 0) join(roomNode(f - 1, floors[f - 1].rooms.length - 1), startNode(f), `the stairs to f${f}`)
    join(startNode(f), roomNode(f, 0), `f${f}'s arrival`)
    floor.rooms.forEach((room, i) => {
      node(roomNode(f, i))
      if (isLockRegion(room.region)) {
        regionOf.set(roomNode(f, i), regionNode(f, room.region))
        join(roomNode(f, i), regionNode(f, room.region), `f${f} room ${i} in ${room.region}`)
      }
    })

    // Each seam, one step per change of region: lock corridors carry the steps between two regions of one lock, every
    // other step is ground. A seam's door stands on its last step, the one into room `seam + 1`, which is where the
    // bake lays it (webDoors.ts): every side section hanging on the seam hangs before it.
    for (let seam = 0; seam + 1 < floor.rooms.length; seam++) {
      const path = seamPath(floor, seam)
      const last = path.length - 1
      const seamDoors = here.filter(d => d.where.kind === "seam" && d.where.floor === f && d.where.seam === seam)
      const label = `f${f} seam ${seam}|${seam + 1}`
      if (last === 0) {
        if (isLockRegion(path[0])) continue
        const edge = join(roomNode(f, seam), roomNode(f, seam + 1), label)
        seamDoors.forEach(door => doorOn(edge, door))
        continue
      }
      for (let k = 1; k <= last; k++) {
        const [x, y] = [path[k - 1], path[k]]
        if (isLockRegion(x) && isLockRegion(y) && instanceOf(x) === instanceOf(y)) continue
        // A room joins the step through its region where it stands in one; between the rooms the path stands in regions.
        const from = isLockRegion(x) ? regionNode(f, x) : roomNode(f, seam)
        const to = isLockRegion(y) ? regionNode(f, y) : roomNode(f, seam + 1)
        const edge = join(from, to, label)
        if (k === last) seamDoors.forEach(door => doorOn(edge, door))
      }
    }

    // A lock in another's nest spot: the spot's corridor gives way to two, through the nested lock.
    const nestedIn = new Map<string, { instance: string; lock: Lock }>()
    for (const [instance, host] of Object.entries(floor.nesting ?? {})) {
      const lock = floor.locks?.[instance]
      if (lock) nestedIn.set(host, { instance, lock })
    }

    // Lock corridors and region barriers, with the web's owners: bound inputs, added fronts.
    for (const [instance, lock] of Object.entries(floor.locks ?? {})) {
      const ownerOf = (owner: string): Gate["owners"][number] => {
        if (!isOutsideInput(lock, owner)) return { floor: owner }
        const bound = bindings.find(b => b.floor === f && b.lock === instance && b.input === owner)
        const face = bound ? bindingFace(bound) : `${pyramidName(at)} f${f} ${instance}.${owner}`
        const key = bound?.key ?? `unbound:${face}`
        keys.add(key)
        return { key, face }
      }
      const gateOf = (gate: Lock["gates"][string]): Gate => ({
        owners: gate.owners.map(ownerOf),
        mode: gate.mode === "any" ? "any" : "every",
      })
      const spot = nestSpotOf(lock)
      const nested = spot ? nestedIn.get(instance) : undefined
      lock.connections.forEach(connection => {
        const [a, b] = joinOf(connection)
        const barriers = barriersOf(connection)
        if (nested && spot && barriers.length === 0 && joins(connection, spot.from, spot.to)) {
          const inner = (region: string) => regionNode(f, `${nested.instance}.${region}`)
          join(
            regionNode(f, `${instance}.${spot.from}`),
            inner(nested.lock.in),
            `${instance} ${spot.from}–${nested.instance}`
          )
          join(
            inner(nested.lock.out),
            regionNode(f, `${instance}.${spot.to}`),
            `${nested.instance}–${instance} ${spot.to}`
          )
          return
        }
        const drop = barriers.map(id => lock.oneWays?.[id]).find(Boolean)
        const [from, to] = drop ? [drop.from, drop.to] : [a, b]
        const edge = join(
          regionNode(f, `${instance}.${from}`),
          regionNode(f, `${instance}.${to}`),
          `${instance} ${a}–${b}`,
          {
            ...(drop ? { oneWay: true } : {}),
          }
        )
        for (const id of barriers) {
          const gate = lock.gates[id]
          if (gate && !isRegionGate(gate)) edge.gates.push(gateOf(gate))
        }
        // A front stands on every corridor between its two regions, as the bake lays it (addFrontOwner).
        for (const door of here)
          if (
            door.where.kind === "corridor" &&
            door.where.floor === f &&
            door.where.lock === instance &&
            joins(connection, door.where.from, door.where.to)
          )
            doorOn(edge, door)
      })
      for (const gate of Object.values(lock.gates))
        if (isRegionGate(gate)) node(regionNode(f, `${instance}.${gate.region}`)).gates.push(gateOf(gate))
      for (const region of Object.keys(lock.regions)) node(regionNode(f, `${instance}.${region}`))
      for (const door of here)
        if (door.where.kind === "region" && door.where.floor === f && door.where.lock === instance)
          doorOn(node(regionNode(f, `${instance}.${door.where.region}`)), door)
    }

    // Side sections: a line of rooms off its mouth, buried with whatever its mouth stands in.
    const hang = (section: WebSection, parent: (k: number) => string) => {
      const rooms = Array.from({ length: Math.max(1, section.rooms) }, (_, j) => sectionNode(f, section.address, j))
      sectionRooms.set(`f${f} ${section.address}`, rooms)
      const mouthFrom = isLockRegion(section.region) ? regionNode(f, section.region) : parent(section.after)
      const mouth = join(mouthFrom, rooms[0], `f${f} ${section.address}'s mouth`)
      // A ward key on the way to something the web placed is taken as held, and listed.
      const holdsWeb =
        resolved.activators.some(a => rooms.includes(a.node) && pyramidName(a.at) === pyramidName(at)) ||
        here.some(
          d => (d.where.kind === "mouth" || d.where.kind === "sectionSeam") && d.where.section === section.address
        )
      if (section.ward && holdsWeb)
        assumed.add(`the ward key ${section.ward} on ${pyramidName(at)} f${f}.${section.address}`)
      for (const door of here)
        if (door.where.kind === "mouth" && door.where.floor === f && door.where.section === section.address)
          doorOn(mouth, door)
      for (let j = 0; j + 1 < rooms.length; j++) {
        const edge = join(rooms[j], rooms[j + 1], `f${f} ${section.address} ${j}|${j + 1}`)
        for (const door of here)
          if (
            door.where.kind === "sectionSeam" &&
            door.where.floor === f &&
            door.where.section === section.address &&
            door.where.seam === j
          )
            doorOn(edge, door)
      }
      for (const sub of section.sections ?? []) hang(sub, k => rooms[Math.max(0, k - 1)])
    }
    for (const section of floor.sections) hang(section, k => (k === 0 ? startNode(f) : roomNode(f, k - 1)))

    // The floor's own drops: one way, from where the launch stands to where the landing does.
    const spotNode = (spot: WebSpot): string =>
      "region" in spot
        ? regionNode(f, spot.region)
        : "section" in spot
          ? sectionNode(f, spot.section, spot.room)
          : roomNode(f, spot.room)
    for (const { from, to } of floor.drops ?? [])
      join(spotNode(from), spotNode(to), `f${f} drop ${spotNode(from)} → ${spotNode(to)}`, { oneWay: true })
  })

  const lastFloor = floors.length - 1
  return {
    edges,
    nodes,
    regionOf,
    start: startNode(0),
    exit: roomNode(lastFloor, floors[lastFloor].rooms.length - 1),
    floorRooms,
    sectionRooms,
    keys,
    assumed,
  }
}

type Flood = { reached: Set<string>; seen: Map<string, string>; via: Map<string, Edge> }

/** Every node reachable from the arrival under `held`, the shut faces seen on the way (face → key), and the edge each
 * node was first reached by. */
const flood = (graph: Graph, held: Held): Flood => {
  const reached = new Set<string>([graph.start])
  const seen = new Map<string, string>()
  const via = new Map<string, Edge>()
  const queue = [graph.start]
  const enterable = (id: string) => {
    const own = graph.nodes.get(id)
    const region = graph.regionOf.get(id)
    return passable(own, held) && (!region || passable(graph.nodes.get(region), held))
  }
  for (let at = 0; at < queue.length; at++) {
    const here = queue[at]
    for (const edge of graph.edges.get(here) ?? []) {
      const next = edge.a === here ? edge.b : edge.a
      if (reached.has(next)) continue
      for (const face of shutFaces(edge, held)) seen.set(face.face, face.key)
      const region = graph.regionOf.get(next)
      for (const face of [
        ...shutFaces(graph.nodes.get(next), held),
        ...shutFaces(region ? graph.nodes.get(region) : undefined, held),
      ])
        seen.set(face.face, face.key)
      if (!passable(edge, held) || !enterable(next)) continue
      reached.add(next)
      via.set(next, edge)
      queue.push(next)
    }
  }
  return { reached, seen, via }
}

/** What one visit to a pyramid can do under held keys: whether its exit is reachable, the nodes in reach, the shut
 * faces seen, and the keys a reachable state waits on. A floor walk with arrivals stands in through `WebWalkOptions.visit`. */
export type Visit = {
  exit: boolean
  reach: ReadonlySet<string>
  seen: ReadonlyMap<string, string>
  waitsOn: ReadonlySet<string>
}

export type WebWalkOptions = {
  /** Answers a visit in place of the graph, for a pyramid it knows; undefined falls back to the graph. */
  visit?: (at: PyramidRef, held: Held) => Visit | undefined
  /** The ceiling on the states the cheapest count explores. */
  maxStates?: number
}

export type CheapestRoute = { visits: number; returns: number; route: string[] } | "none" | "tooLarge"

export type WebWalk = {
  refusals: WebRefusal[]
  warnings: string[]
  /** The pull sets a player can reach, the empty one included. */
  sets: number
  /** The activators the closure from no pulls takes, whether every journey finishes in it, and the pyramids it finishes. */
  closure: { activators: string[]; finished: boolean; pyramids: string[] }
  /** Ward keys the walk takes as held where they stand on the way to a web door or activator. */
  assumed: string[]
  cheapest: CheapestRoute
  cheapestSeeing: CheapestRoute
  /** A pyramid's visit under the held keys of a pull set, for the report. */
  heldOf: (pulled: Iterable<string>) => Set<string>
}

/** Walks a resolved web: the closure, every reachable pull set, the per-pyramid wait check, the leak and own-front
 * refusals, the sightings and the cheapest routes. */
export const walkWeb = (resolved: ResolvedWeb, options: WebWalkOptions = {}): WebWalk => {
  const refusals: WebRefusal[] = []
  const warnings: string[] = []
  const { world, activators, pots, doors } = resolved
  const names = activators.map(a => a.name)
  const bit = new Map(names.map((name, i) => [name, i]))
  const pyramids: PyramidRef[] = Object.entries(world.journeys).flatMap(([journey, list]) =>
    list.map((_, i) => ({ journey: Number(journey), pyramid: i + 1 }))
  )
  const graphs = new Map(pyramids.map(at => [pyramidName(at), graphOf(resolved, at)]))
  const activatorsIn = new Map<string, typeof activators>()
  for (const a of activators) activatorsIn.set(pyramidName(a.at), [...(activatorsIn.get(pyramidName(a.at)) ?? []), a])

  // The keys a pulled set holds, derived as play derives them.
  const shipped = names.map(name => ({
    name,
    pots: pots.filter(pot => pot.levers.includes(name)).map(pot => pot.name),
  }))
  const heldOf = (pulled: Iterable<string>): Set<string> =>
    webHeldKeys(Object.fromEntries([...pulled].map(name => [name, true as const])), shipped)

  const memo = new Map<string, Visit>()
  const visit = (at: PyramidRef, held: Held): Visit => {
    const name = pyramidName(at)
    const graph = graphs.get(name)!
    const relevant = [...held].filter(k => graph.keys.has(k)).sort()
    const id = `${name}|${relevant.join(",")}`
    const known = memo.get(id)
    if (known) return known
    const answered = options.visit?.(at, held)
    const result = answered ?? visitGraph(graph, held, doors)
    memo.set(id, result)
    return result
  }

  type Reach = { taken: Set<string>; finished: Set<string>; entered: string[]; seen: Map<string, string> }
  /** Everything in reach under `held`, journey by journey in levelNr order; `cut` never finishes. */
  const reachUnder = (held: Held, cut?: string): Reach => {
    const taken = new Set<string>()
    const finished = new Set<string>()
    const entered: string[] = []
    const seen = new Map<string, string>()
    for (const [journey, list] of Object.entries(world.journeys))
      for (let p = 1; p <= list.length; p++) {
        const at = { journey: Number(journey), pyramid: p }
        const name = pyramidName(at)
        entered.push(name)
        const result = visit(at, held)
        for (const [face, key] of result.seen) seen.set(face, key)
        for (const a of activatorsIn.get(name) ?? []) if (result.reach.has(a.node)) taken.add(a.name)
        if (!result.exit || name === cut) break
        finished.add(name)
      }
    return { taken, finished, entered, seen }
  }
  const closureOf = (start: Iterable<string>, cut?: string) => {
    const pulled = new Set(start)
    for (;;) {
      const reach = reachUnder(heldOf(pulled), cut)
      const more = [...reach.taken].filter(a => !pulled.has(a))
      if (more.length === 0) return { pulled, reach }
      more.forEach(a => pulled.add(a))
    }
  }

  // THE CLOSURE FROM NO PULLS: what every order climbs to.
  const closure = closureOf([])
  const finishedAll = pyramids.every(at => closure.reach.finished.has(pyramidName(at)))
  if (closure.pulled.size < names.length || !finishedAll)
    refusals.push(deadlock(resolved, closure.pulled, closure.reach.finished, heldOf, graphs))

  // EVERY REACHABLE PULL SET: the sightings and the waits.
  const seenFaces = new Map<string, string>()
  const cutClosures = new Map<string, Set<string>>()
  const waitsReported = new Set<string>()
  let sets = 0
  if (names.length <= MAX_WEB_ACTIVATORS) {
    const seenSets = new Set<number>([0])
    const queue = [0]
    for (let at = 0; at < queue.length; at++) {
      const mask = queue[at]
      const pulled = names.filter((_, i) => mask & (1 << i))
      const held = heldOf(pulled)
      const reach = reachUnder(held)
      for (const [face, key] of reach.seen) if (!held.has(key)) seenFaces.set(face, key)
      // Why any pull order works, point 3: a key a floor can wait on arrives without finishing that pyramid.
      for (const name of reach.entered) {
        const [, j, p] = /^w(\d+)p(\d+)$/.exec(name)!
        const ref = { journey: Number(j), pyramid: Number(p) }
        const result = visit(ref, held)
        if (result.waitsOn.size === 0) continue
        if (!cutClosures.has(name)) cutClosures.set(name, heldOf(closureOf([], name).pulled))
        const cut = cutClosures.get(name)!
        // A way out shut only by keys that arrive without finishing the pyramid is a wait the player comes back from,
        // whatever other shut doors the stuck visit saw on the way.
        if (!result.exit && visit(ref, new Set([...held, ...cut])).exit) continue
        for (const key of result.waitsOn) {
          const id = `${name}|${key}`
          if (waitsReported.has(id)) continue
          if (cut.has(key)) continue
          waitsReported.add(id)
          const door = doors.find(d => d.key === key && pyramidName(d.at) === name)
          refusals.push({
            type: "waitsBehind",
            ...(door ? { n: door.n } : {}),
            message: `${name}${door ? ` f${door.where.floor}` : ""} can be left waiting on ${key}, which is held only once ${name} is finished`,
          })
        }
      }
      for (const a of reach.taken) {
        const next = mask | (1 << bit.get(a)!)
        if (next === mask || seenSets.has(next)) continue
        seenSets.add(next)
        queue.push(next)
      }
    }
    sets = seenSets.size
  }

  // SEEN BEFORE PULLED: each door, and each face of a bound input, stands shut in front of the player in some set.
  for (const door of doors)
    if (!seenFaces.has(door.id))
      warnings.push(`⚠ ${door.source} (line ${door.n}): its door is reached only once ${door.key} is held`)
  for (const binding of resolved.bindings)
    if (!seenFaces.has(bindingFace(binding)))
      warnings.push(
        `⚠ ${bindingFace(binding)} (line ${binding.n}): its door is reached only once ${binding.key} is held`
      )

  // EVERYTHING PAST A FRONT STAYS BEHIND IT, with every other door open.
  const allKeys = new Set([...graphs.values()].flatMap(g => [...g.keys]))
  for (const door of doors) {
    const graph = graphs.get(pyramidName(door.at))!
    const held = new Set([...allKeys].filter(k => k !== door.key))
    const past = pastOf(graph, door)
    const { reached, via } = flood(graph, held)
    const leaked = past.find(id => reached.has(id))
    if (leaked)
      refusals.push({
        type: "frontLeaks",
        n: door.n,
        message: `${door.source}: ${pyramidName(door.at)} ${leaked} lies past the front and is reached round it, by ${wayRound(via, leaked, new Set(past))}`,
      })
  }

  // A LEVER NOT UNDER ITS OWN FRONT: the pot's other levers clear its place.
  const everything = heldOf(names)
  for (const pot of pots) {
    const last = potKey(pot.name, pot.levers.length)
    const without = new Set([...everything].filter(k => k !== last))
    const reach = reachUnder(without)
    for (const lever of pot.levers) {
      const a = activators.find(x => x.name === lever)
      if (!a) continue
      const result = visit(a.at, without)
      const entered = reach.entered.includes(pyramidName(a.at))
      if (!entered || !result.reach.has(a.node))
        refusals.push({
          type: "ownFront",
          n: a.n,
          message: `${lever} stands under ${pot.name}'s sand where only its own pull clears it`,
        })
    }
  }

  const assumed = [...new Set([...graphs.values()].flatMap(g => [...g.assumed]))].sort()
  const maxStates = options.maxStates ?? MAX_LOCK_STATES
  const goalDoors = [...seenFaces.keys()]
  return {
    refusals,
    warnings,
    sets,
    closure: { activators: [...closure.pulled], finished: finishedAll, pyramids: [...closure.reach.finished] },
    assumed,
    cheapest: cheapest(pyramids, names, activatorsIn, heldOf, visit, maxStates, []),
    cheapestSeeing: cheapest(pyramids, names, activatorsIn, heldOf, visit, maxStates, goalDoors),
    heldOf,
  }
}

/** The nodes that lie past a door: later rooms of its line and floors, or the section behind it. */
const pastOf = (graph: Graph, door: WebDoor): string[] => {
  const { where } = door
  if (where.kind === "mouth") return graph.sectionRooms.get(`f${where.floor} ${where.section}`) ?? []
  if (where.kind === "sectionSeam")
    return (graph.sectionRooms.get(`f${where.floor} ${where.section}`) ?? []).slice(where.seam + 1)
  const rooms = graph.floorRooms.flatMap((list, f) =>
    f < where.floor ? [] : f === where.floor ? list.slice(where.seam + 1) : list
  )
  // A lock region every room of which lies past the front lies past it too.
  const before = new Set(graph.floorRooms.flat().filter(room => !rooms.includes(room)))
  const regions = new Set(rooms.flatMap(room => graph.regionOf.get(room) ?? []))
  for (const [room, region] of graph.regionOf) if (before.has(room)) regions.delete(region)
  return [...rooms, ...regions]
}

/** The passage by which the flood first stepped into the ground past a front. */
const wayRound = (via: Map<string, Edge>, leaked: string, past: Set<string>): string => {
  let at = leaked
  let edge = via.get(at)
  while (edge) {
    const from = edge.a === at ? edge.b : edge.a
    if (!past.has(from)) return edge.label
    at = from
    edge = via.get(at)
  }
  return "another way"
}

/** The chain of waits behind what the closure from no pulls never takes. */
const deadlock = (
  resolved: ResolvedWeb,
  pulled: Set<string>,
  finished: Set<string>,
  heldOf: (pulled: Iterable<string>) => Set<string>,
  graphs: Map<string, Graph>
): WebRefusal => {
  const held = heldOf(pulled)
  const lines: string[] = []
  const explained = new Set<string>()
  const activatorText = (name: string) => {
    const a = resolved.activators.find(x => x.name === name)!
    return `${name} (${pyramidName(a.at)} ${a.place})`
  }
  /** What stands shut on the way to a node of a pyramid, nearest the arrival. */
  const blockerOn = (at: PyramidRef, target: string): string | undefined => {
    const graph = graphs.get(pyramidName(at))!
    const all = new Set(graph.keys)
    const { via } = flood(graph, all)
    let node = target
    let shut: string | undefined
    for (let edge = via.get(node); edge; edge = via.get(node)) {
      const faces = [
        ...shutFaces(edge, held),
        ...shutFaces(graph.nodes.get(node), held),
        ...shutFaces(graph.regionOf.get(node) ? graph.nodes.get(graph.regionOf.get(node)!) : undefined, held),
      ]
      if (faces.length > 0) shut = faces[0].key
      node = edge.a === node ? edge.b : edge.a
    }
    return shut
  }
  const doorText = (key: string) => {
    const door = resolved.doors.find(d => d.key === key)
    if (door) return `${door.source} [${pyramidName(door.at)}]`
    const binding = resolved.bindings.find(b => b.key === key)
    return binding ? `${bindingFace(binding)} by ${key.slice(4)}` : key
  }
  const missingFor = (key: string): string[] => {
    const pot = resolved.pots.find(p => key.startsWith(`web:${p.name}#`))
    if (pot) return pot.levers.filter(l => !pulled.has(l))
    return [key.slice(4)].filter(name => resolved.activators.some(a => a.name === name) && !pulled.has(name))
  }
  const explain = (item: { kind: "activator"; name: string } | { kind: "finished"; at: PyramidRef }): void => {
    const id = item.kind === "activator" ? item.name : `${pyramidName(item.at)} finished`
    if (explained.has(id)) return
    explained.add(id)
    const activator = item.kind === "activator" ? resolved.activators.find(a => a.name === item.name)! : undefined
    const subject = activator ? activatorText(activator.name) : id
    const at = activator?.at ?? (item as { at: PyramidRef }).at
    const before = { journey: at.journey, pyramid: at.pyramid - 1 }
    if (at.pyramid > 1 && !finished.has(pyramidName(before))) {
      lines.push(`${subject} waits on ${pyramidName(before)} finished, the journey's order`)
      return explain({ kind: "finished", at: before })
    }
    const key = blockerOn(at, activator?.node ?? graphs.get(pyramidName(at))!.exit)
    if (!key) return void lines.push(`${subject} waits on nothing the web lays`)
    lines.push(`${subject} waits on ${doorText(key)}`)
    for (const name of missingFor(key)) explain({ kind: "activator", name })
  }
  const missing = resolved.activators.filter(a => !pulled.has(a.name))
  if (missing.length > 0) explain({ kind: "activator", name: missing[0].name })
  else {
    const stuck = Object.entries(resolved.world.journeys)
      .flatMap(([journey, list]) => list.map((_, i) => ({ journey: Number(journey), pyramid: i + 1 })))
      .find(at => !finished.has(pyramidName(at)))
    if (stuck) explain({ kind: "finished", at: stuck })
  }
  return { type: "deadlock", message: ["deadlock", ...lines.map(line => `  ${line}`)].join("\n") }
}

/** The fewest visits to finish every journey, taking all in reach on each visit; with `doors`, also standing at each
 * of those faces while it is shut. A return is a visit beyond the first to a pyramid. */
const cheapest = (
  pyramids: PyramidRef[],
  names: string[],
  activatorsIn: Map<string, ResolvedWeb["activators"]>,
  heldOf: (pulled: Iterable<string>) => Set<string>,
  visit: (at: PyramidRef, held: Held) => Visit,
  maxStates: number,
  doors: string[]
): CheapestRoute => {
  const journeys = [...new Set(pyramids.map(p => p.journey))]
  const counts = new Map(journeys.map(j => [j, pyramids.filter(p => p.journey === j).length]))
  type State = { pulled: string[]; progress: number[]; seen: string[] }
  const keyOf = (s: State) => `${s.pulled.join(",")}|${s.progress.join(",")}|${s.seen.join(",")}`
  const start: State = { pulled: [], progress: journeys.map(() => 0), seen: [] }
  const parents = new Map<string, { from: string; label: string } | null>([[keyOf(start), null]])
  const states = new Map([[keyOf(start), start]])
  const queue = [keyOf(start)]
  const done = (s: State) =>
    s.progress.every((p, i) => p === counts.get(journeys[i])) && doors.every(d => s.seen.includes(d))
  for (let at = 0; at < queue.length; at++) {
    const id = queue[at]
    const state = states.get(id)!
    if (done(state)) {
      const route: string[] = []
      for (let k: string | undefined = id; parents.get(k!); k = parents.get(k!)!.from)
        route.unshift(parents.get(k!)!.label)
      return { visits: route.length, returns: route.length - pyramids.length, route }
    }
    journeys.forEach((journey, j) => {
      for (let p = 1; p <= Math.min(state.progress[j] + 1, counts.get(journey)!); p++) {
        const ref = { journey, pyramid: p }
        const standing = (activatorsIn.get(pyramidName(ref)) ?? []).filter(a => !state.pulled.includes(a.name))
        // Seeing a door first may mean leaving a lever in reach where it stands; plain counting takes all.
        const choices = doors.length === 0 ? 1 : 1 << standing.length
        for (let choice = 0; choice < choices; choice++) {
          const allowed = doors.length === 0 ? standing : standing.filter((_, i) => choice & (1 << i))
          const pulled = new Set(state.pulled)
          const seen = new Set(state.seen)
          const got: string[] = []
          let exit: boolean
          for (;;) {
            const held = heldOf(pulled)
            const result = visit(ref, held)
            for (const [face, key] of result.seen) if (!held.has(key) && doors.includes(face)) seen.add(face)
            exit = result.exit
            const more = allowed.filter(a => result.reach.has(a.node) && !pulled.has(a.name))
            if (more.length === 0) break
            for (const a of more) {
              pulled.add(a.name)
              got.push(a.name)
            }
          }
          const progress = [...state.progress]
          if (exit && p > progress[j]) progress[j] = p
          const next: State = {
            pulled: names.filter(n => pulled.has(n)),
            progress,
            seen: doors.filter(d => seen.has(d)),
          }
          const nextId = keyOf(next)
          if (states.has(nextId)) continue
          states.set(nextId, next)
          parents.set(nextId, { from: id, label: [pyramidName(ref), ...got].join(" ") })
          queue.push(nextId)
        }
      }
    })
    if (states.size > maxStates) return "tooLarge"
  }
  return "none"
}

/** Every laid lock walked again with the owners the stops added, as `yarn lock` would. */
export const laidLockRefusals = (resolved: ResolvedWeb): WebRefusal[] =>
  [...resolved.laidLocks].flatMap(([id, lock]) => {
    const { checks, sound } = lockChecks({ lock, drafts: [], refused: [] })
    return sound
      ? []
      : [
          {
            type: "lockRefused" as const,
            message: `${id}, with the sand laid: ${checks.find(c => c.startsWith("✗")) ?? "unsound"}`,
          },
        ]
  })

/** One visit to a pyramid under held keys, read off its graph: what `WebWalkOptions.visit` falls back to. */
export const visitPyramid = (resolved: ResolvedWeb, at: PyramidRef, held: Held): Visit =>
  visitGraph(graphOf(resolved, at), held, resolved.doors)

/** A visit read off a graph: a pyramid whose exit is out of reach waits on the shut faces on its way, a side
 * section's door never being one. */
const visitGraph = (graph: Graph, held: Held, doors: readonly WebDoor[]): Visit => {
  const { reached, seen } = flood(graph, held)
  const exit = reached.has(graph.exit)
  const aside = new Set(doors.filter(d => d.where.kind === "mouth" || d.where.kind === "sectionSeam").map(d => d.id))
  const onWay = [...seen].filter(([face]) => !aside.has(face))
  return { exit, reach: reached, seen, waitsOn: exit ? new Set() : new Set(onWay.map(([, key]) => key)) }
}

/** The journeys a web names: the floors of these are walked with their web keys arriving. */
export const webJourneys = (web: Web): string[] =>
  [...new Set(web.blocks.map(block => `wizard_${block.journey}`))].sort()

/**
 * EVERY FLOOR OF A WEB JOURNEY WALKS SOUND WITH ITS WEB KEYS ARRIVING: a key freed elsewhere is collected by coming
 * back where the player stood, which the save remembers per pyramid, so the walk needs no re-entry. `floors` is each
 * journey's pyramids' carved floors; a floor with nothing to walk is skipped.
 */
export const walkWebFloors = (
  web: Web,
  floors: Readonly<Record<string, readonly (readonly FloorGrid[])[]>>,
  walk: typeof walkFloorLock = walkFloorLock
): { walked: number; failures: string[] } => {
  let walked = 0
  const failures: string[] = []
  for (const journey of webJourneys(web))
    (floors[journey] ?? []).forEach((pyramid, p) =>
      pyramid.forEach((grid, f) => {
        const result = walk(grid)
        if (!result) return
        walked++
        if (!result.sound)
          failures.push(`${journey} pyramid ${p + 1} floor ${f}: ${describeFloorWalkFailure(result.failure)}`)
      })
    )
  return { walked, failures }
}
