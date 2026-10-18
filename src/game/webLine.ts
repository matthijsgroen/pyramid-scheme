// A WEB READ AGAINST A WORLD: the line in authored rooms, stops landing on seams, places resolved by authored name,
// and the refusals that need no walk (docs/instructions/sand-pyramid.md). The world is a WebWorld: what the web
// needs of the carve, read off the bake (scripts/webWorld.ts) or made up by a test.
import type { EdgeGate, Lock, LockGate } from "./lockAuthoring"
import { MAX_OUTSIDE_INPUTS, barriersOf, isRegionGate, joinOf } from "./lockAuthoring"
import type { ActivatorPlace, DoorPlace, SandTarget, Web, WebLook } from "./webNotation"

/** A main-path room the line counts: a floor's puzzle rooms and its end room. `region` is `instance.region` of the
 * floor lock it stands in. */
export type WebRoom = { region?: string }

/** A side section, by the address a save files it under. `after`: how many of its parent line's rooms come before
 * its mouth. `region`: the lock region its mouth stands in. `ward`: the outside key its entrance asks for. */
export type WebSection = {
  address: string
  after: number
  rooms: number
  region?: string
  hidden?: boolean
  ward?: string
  sections?: WebSection[]
}

/** One floor as the web sees it. `via[i]`: the lock regions the main path crosses between rooms i and i+1, in
 * order, where it crosses any besides theirs. `locks`: the floor's lock instances by name. */
export type WebFloor = {
  rooms: WebRoom[]
  via?: Readonly<Record<number, readonly string[]>>
  sections: WebSection[]
  locks?: Readonly<Record<string, Lock>>
}

export type WebPyramid = { floors: WebFloor[] }

/** The tier a web is read against: `journeys[N]` is wizard_N's pyramids in levelNr order. */
export type WebWorld = { journeys: Readonly<Record<number, readonly WebPyramid[]>> }

export type PyramidRef = { journey: number; pyramid: number }
export const pyramidName = ({ journey, pyramid }: PyramidRef) => `w${journey}p${pyramid}`

/** Node ids of a pyramid's graph (webWalk.ts): a main room, a lock region, a section's room, a floor's arrival. */
export const roomNode = (floor: number, room: number) => `f${floor} m${room}`
export const regionNode = (floor: number, region: string) => `f${floor} ${region}`
export const sectionNode = (floor: number, address: string, room: number) => `f${floor} ${address}#${room}`
export const startNode = (floor: number) => `f${floor} start`

export type DoorWhere =
  | { kind: "seam"; floor: number; seam: number }
  | { kind: "corridor"; floor: number; seam: number; lock: string; from: string; to: string }
  | { kind: "region"; floor: number; seam: number; lock: string; region: string }
  | { kind: "mouth"; floor: number; section: string }
  | { kind: "sectionSeam"; floor: number; section: string; seam: number }

/** A door the web lays: shut until `key` is held. A pot's door k asks for `web:<pot>#<k+1>`. */
export type WebDoor = {
  id: string
  key: string
  n: number
  source: string
  at: PyramidRef
  where: DoorWhere
  /** The point on its line the door was asked for, and where it landed. */
  pct?: number
  landed?: number
}

export type WebActivator = { name: string; look: WebLook; at: PyramidRef; node: string; place: string; n: number }

export type WebPot = {
  name: string
  levers: string[]
  stops: number[]
  from?: number
  doors: WebDoor[]
  n: number
  source: string
  /** The line it covers, for the report. */
  span: string
  rooms: number
}

export type WebBinding = { at: PyramidRef; floor: number; lock: string; input: string; key: string; n: number }

export type WebRefusalType =
  | "placeNotInWorld"
  | "activatorTwice"
  | "unknownActivator"
  | "activatorUnused"
  | "placeTaken"
  | "stopsMalformed"
  | "stopNotAfterFrom"
  | "stopsShareSeam"
  | "potsOverlap"
  | "frontOnAnyGate"
  | "outsideTooMany"
  | "inputUnbound"
  | "bindingNamesNoInput"
  | "lockRefused"
  | "webTooLarge"
  | "frontLeaks"
  | "ownFront"
  | "deadlock"
  | "waitsBehind"

export type WebRefusal = { type: WebRefusalType; n?: number; message: string }

export type ResolvedWeb = {
  web: Web
  world: WebWorld
  activators: WebActivator[]
  pots: WebPot[]
  /** Every door, the pots' and the `opens` lines'. */
  doors: WebDoor[]
  bindings: WebBinding[]
  /** Each lock that took an owner or a buried region from a stop, as it is laid: `${pyramid} f${floor} ${instance}`. */
  laidLocks: Map<string, Lock>
  refusals: WebRefusal[]
}

/** A web carries at most this many activators: the walk visits up to 2ⁿ pull sets. */
export const MAX_WEB_ACTIVATORS = 16

export const webKey = (name: string) => `web:${name}`
export const potKey = (pot: string, count: number) => `web:${pot}#${count}`

type LineRoom = { at: PyramidRef; floor: number; room: number }
type LineSeam = { pos: number; at: PyramidRef; floor: number; seam: number }
type LineSection = { pos: number; at: PyramidRef; floor: number; section: WebSection }
/** A line: its rooms in order, a seam between each two of one floor, and the sections hanging off it. */
type Line = {
  rooms: LineRoom[]
  seams: LineSeam[]
  sections: LineSection[]
  section?: { floor: number; address: string }
}

const pyramidLine = (world: WebWorld, at: PyramidRef, offset: number): Line => {
  const line: Line = { rooms: [], seams: [], sections: [] }
  const floors = world.journeys[at.journey]?.[at.pyramid - 1]?.floors ?? []
  floors.forEach((floor, f) => {
    const start = offset + line.rooms.length
    floor.rooms.forEach((_, room) => {
      if (room > 0) line.seams.push({ pos: start + room - 0.5, at, floor: f, seam: room - 1 })
      line.rooms.push({ at, floor: f, room })
    })
    for (const section of floor.sections)
      if (!section.hidden) line.sections.push({ pos: start + section.after - 0.5, at, floor: f, section })
  })
  return line
}

const journeyLine = (world: WebWorld, journey: number): Line => {
  const line: Line = { rooms: [], seams: [], sections: [] }
  ;(world.journeys[journey] ?? []).forEach((_, i) => {
    const part = pyramidLine(world, { journey, pyramid: i + 1 }, line.rooms.length)
    line.rooms.push(...part.rooms)
    line.seams.push(...part.seams)
    line.sections.push(...part.sections)
  })
  return line
}

const sectionLine = (at: PyramidRef, floor: number, section: WebSection): Line => ({
  rooms: Array.from({ length: section.rooms }, (_, room) => ({ at, floor, room })),
  seams: Array.from({ length: Math.max(0, section.rooms - 1) }, (_, seam) => ({ pos: seam + 0.5, at, floor, seam })),
  sections: (section.sections ?? []).filter(s => !s.hidden).map(s => ({ pos: s.after - 0.5, at, floor, section: s })),
  section: { floor, address: section.address },
})

const pointOf = (line: Line, pct: number) => (pct / 100) * (line.rooms.length - 1)

/** The seam nearest a point of the line; a tie goes toward the arrival, burying more. */
const nearestSeam = (line: Line, pct: number): LineSeam | undefined => {
  const point = pointOf(line, pct)
  let best: LineSeam | undefined
  for (const seam of line.seams)
    if (!best || Math.abs(seam.pos - point) < Math.abs(best.pos - point) - 1e-9) best = seam
  return best
}

/** The room nearest a point of the line; a tie goes toward the arrival. */
const nearestRoom = (line: Line, pct: number): LineRoom | undefined => line.rooms[Math.ceil(pointOf(line, pct) - 0.5)]

/** The first section hanging off the line at or after a point. */
const sectionAfter = (line: Line, pct: number): LineSection | undefined => {
  const point = pointOf(line, pct)
  return [...line.sections].sort((a, b) => a.pos - b.pos).find(s => s.pos >= point - 1e-9)
}

export const findSection = (sections: readonly WebSection[], address: string): WebSection | undefined => {
  for (const section of sections) {
    if (section.address === address) return section
    const deeper = findSection(section.sections ?? [], address)
    if (deeper) return deeper
  }
  return undefined
}

export const isLockRegion = (region: string | undefined): region is string =>
  region !== undefined && region.includes(".")
export const instanceOf = (region: string) => region.slice(0, region.indexOf("."))
const bareOf = (region: string) => region.slice(region.indexOf(".") + 1)

/** The regions the main path stands in from room `seam` to the next, in order; undefined is floor ground. */
export const seamPath = (floor: WebFloor, seam: number): (string | undefined)[] => [
  floor.rooms[seam]?.region,
  ...(floor.via?.[seam] ?? []),
  floor.rooms[seam + 1]?.region,
]

/** What a main-path seam is: plain ground, a corridor between two regions of one lock (the first the path crosses,
 * toward the arrival), or the inside of one region. */
const landingOf = (floor: WebFloor, f: number, seam: number): DoorWhere => {
  const path = seamPath(floor, seam)
  for (let i = 0; i + 1 < path.length; i++) {
    const [a, b] = [path[i], path[i + 1]]
    if (a === b) continue
    if (isLockRegion(a) && isLockRegion(b) && instanceOf(a) === instanceOf(b))
      return { kind: "corridor", floor: f, seam, lock: instanceOf(a), from: bareOf(a), to: bareOf(b) }
    return { kind: "seam", floor: f, seam }
  }
  const only = path[0]
  return isLockRegion(only)
    ? { kind: "region", floor: f, seam, lock: instanceOf(only), region: bareOf(only) }
    : { kind: "seam", floor: f, seam }
}

const lineSeamWhere = (world: WebWorld, line: Line, seam: LineSeam): DoorWhere => {
  if (line.section) return { kind: "sectionSeam", floor: seam.floor, section: line.section.address, seam: seam.seam }
  const floor = world.journeys[seam.at.journey][seam.at.pyramid - 1].floors[seam.floor]
  return landingOf(floor, seam.floor, seam.seam)
}

/** The identity of where a door stands: two doors with one are two stops on one seam. */
const standingOf = (at: PyramidRef, where: DoorWhere): string => {
  const base = `${pyramidName(at)} f${where.floor}`
  switch (where.kind) {
    case "seam":
      return `${base} seam ${where.seam}|${where.seam + 1}`
    case "corridor":
      return `${base} ${where.lock} ${[where.from, where.to].sort().join("–")}`
    case "region":
      return `${base} ${where.lock}.${where.region}`
    case "mouth":
      return `${base} ${where.section}'s mouth`
    case "sectionSeam":
      return `${base} ${where.section} seam ${where.seam}|${where.seam + 1}`
  }
}

/** Where a door landed, for the report. */
export const describeWhere = (at: PyramidRef, where: DoorWhere): string => {
  const base = `${pyramidName(at)} f${where.floor}`
  switch (where.kind) {
    case "seam":
      return `${base} seam ${where.seam}|${where.seam + 1}`
    case "corridor":
      return `${base} ${where.lock} ${where.from}–${where.to}   lock corridor, owner added`
    case "region":
      return `${base} ${where.lock} ${where.region}   region buried whole`
    case "mouth":
      return `${base} ${where.section}'s mouth`
    case "sectionSeam":
      return `${base} ${where.section} seam ${where.seam}|${where.seam + 1}`
  }
}

const gatesOn = (lock: Lock, from: string, to: string): { id: string; gate: EdgeGate }[] =>
  lock.connections
    .filter(c => {
      const [a, b] = joinOf(c)
      return (a === from && b === to) || (a === to && b === from)
    })
    .slice(0, 1)
    .flatMap(c => barriersOf(c))
    .flatMap(id => {
      const gate = lock.gates[id]
      return gate && !isRegionGate(gate) ? [{ id, gate }] : []
    })

/** A name for an input the bake adds, unused by the lock. */
const addedInputName = (lock: Lock, used: Set<string>): string => {
  for (let i = 1; ; i++) {
    const name = `W${i}`
    if (!Object.hasOwn(lock.mechanics, name) && !(lock.inputs ?? []).includes(name) && !used.has(name)) return name
  }
}

/** The lock with an outside owner added where a front stops: under `+` on the corridor's gate, a gate of its own on
 * a plain corridor, or a barrier over the region. Undefined when the corridor's gates all answer to any owner. */
export const addFrontOwner = (
  lock: Lock,
  where: Extract<DoorWhere, { kind: "corridor" | "region" }>,
  input: string
): Lock | undefined => {
  const inputs = [...(lock.inputs ?? []), input]
  if (where.kind === "region") {
    const gate: LockGate = { region: where.region, owners: [input] }
    return { ...lock, inputs, gates: { ...lock.gates, [`${input}-bury`]: gate } }
  }
  const gates = gatesOn(lock, where.from, where.to)
  const every = gates.find(({ gate }) => gate.mode !== "any" || gate.owners.length < 2)
  if (gates.length > 0 && !every) return undefined
  if (every) {
    const gate: EdgeGate = { ...every.gate, owners: [...every.gate.owners, input] }
    return { ...lock, inputs, gates: { ...lock.gates, [every.id]: gate } }
  }
  const id = `${input}-front`
  const index = lock.connections.findIndex(c => {
    const [a, b] = joinOf(c)
    return (a === where.from && b === where.to) || (a === where.to && b === where.from)
  })
  const connection = lock.connections[index]
  const [a, b] = joinOf(connection)
  const connections = lock.connections.map((c, i) => (i === index ? { between: [a, b] as const, barriers: [id] } : c))
  return {
    ...lock,
    inputs,
    connections,
    gates: { ...lock.gates, [id]: { from: where.from, to: where.to, owners: [input] } },
  }
}

/** Resolves every line of a web against a world: places, lines, stops, doors, bindings, and the refusals that need
 * no walk. */
export const resolveWeb = (web: Web, world: WebWorld): ResolvedWeb => {
  const refusals: WebRefusal[] = []
  const refuse = (type: WebRefusalType, n: number | undefined, message: string) =>
    refusals.push({ type, ...(n !== undefined ? { n } : {}), message })
  const activators: WebActivator[] = []
  const pots: WebPot[] = []
  const doors: WebDoor[] = []
  const bindings: WebBinding[] = []
  const pyramidsOf = (journey: number) => world.journeys[journey] ?? []

  type Ctx = { journey: number; pyramid?: number; n: number }
  const pyramidAt = (ctx: Ctx, written: number | undefined): PyramidRef | undefined => {
    const pyramid = ctx.pyramid ?? written
    if (pyramid === undefined) return undefined
    if (!pyramidsOf(ctx.journey)[pyramid - 1]) {
      refuse("placeNotInWorld", ctx.n, `wizard_${ctx.journey} has no pyramid ${pyramid}`)
      return undefined
    }
    return { journey: ctx.journey, pyramid }
  }
  const lineAt = (ctx: Ctx, at: PyramidRef | undefined): Line =>
    at ? pyramidLine(world, at, 0) : journeyLine(world, ctx.journey)
  const floorOf = (at: PyramidRef, f: number): WebFloor | undefined =>
    world.journeys[at.journey][at.pyramid - 1].floors[f]
  /** A lock instance on a pyramid, on the floor named or the one floor carrying it. */
  const lockOn = (
    ctx: Ctx,
    at: PyramidRef,
    floor: number | undefined,
    name: string
  ): { floor: number; lock: Lock } | undefined => {
    const floors = world.journeys[at.journey][at.pyramid - 1].floors
    const found = floors.flatMap((fl, f) =>
      (floor === undefined || floor === f) && fl.locks?.[name] ? [{ floor: f, lock: fl.locks[name] }] : []
    )
    if (found.length === 1) return found[0]
    refuse(
      "placeNotInWorld",
      ctx.n,
      found.length === 0
        ? `${pyramidName(at)} has no lock ${name}${floor !== undefined ? ` on floor ${floor}` : ""}`
        : `${pyramidName(at)} carries ${name} on floors ${found.map(x => x.floor).join(", ")}: write f${found[0].floor}.${name}`
    )
    return undefined
  }

  // Blocks naming a journey the world lacks are refused once, by their heading.
  const blocks = web.blocks.filter(block => {
    if (!world.journeys[block.journey]) {
      refuse("placeNotInWorld", block.n, `the world has no journey wizard_${block.journey}`)
      return false
    }
    if (block.pyramid !== undefined && !pyramidsOf(block.journey)[block.pyramid - 1]) {
      refuse("placeNotInWorld", block.n, `wizard_${block.journey} has no pyramid ${block.pyramid}`)
      return false
    }
    return true
  })

  // ACTIVATORS
  const declared = new Map<string, WebActivator>()
  const taken = new Map<string, WebActivator>()
  const placeOf = (ctx: Ctx, place: ActivatorPlace): { at: PyramidRef; node: string; place: string } | undefined => {
    const at = pyramidAt(ctx, place.pyramid)
    if (place.kind === "region") {
      if (!at)
        return void refuse("placeNotInWorld", ctx.n, `${place.lock}.${place.region} names a lock: write pM before it`)
      const found = lockOn(ctx, at, place.floor, place.lock)
      if (!found) return undefined
      const region = found.lock.regions[place.region]
      if (!region) return void refuse("placeNotInWorld", ctx.n, `lock ${place.lock} has no region ${place.region}`)
      if (region.takes !== "reward" && region.takes !== "free")
        return void refuse("placeNotInWorld", ctx.n, `region ${place.lock}.${place.region} takes no reward`)
      return {
        at,
        node: regionNode(found.floor, `${place.lock}.${place.region}`),
        place: `f${found.floor}.${place.lock}.${place.region}`,
      }
    }
    if (place.pyramid !== undefined && !at) return undefined
    const line = lineAt(ctx, at)
    if (line.rooms.length === 0) return void refuse("placeNotInWorld", ctx.n, "the line has no rooms")
    if (place.kind === "end") {
      const last = line.rooms[line.rooms.length - 1]
      return { at: last.at, node: roomNode(last.floor, last.room), place: `f${last.floor} @end` }
    }
    if (place.kind === "room") {
      const room = nearestRoom(line, place.pct)!
      return { at: room.at, node: roomNode(room.floor, room.room), place: `f${room.floor} room ${room.room}` }
    }
    const hanging = sectionAfter(line, place.pct)
    if (!hanging) return void refuse("placeNotInWorld", ctx.n, `no side section hangs after ${place.pct}%`)
    const { section, floor } = hanging
    return {
      at: hanging.at,
      node: sectionNode(floor, section.address, section.rooms - 1),
      place: `f${floor}.${section.address}'s end`,
    }
  }
  for (const block of blocks)
    for (const line of block.lines) {
      if (line.type !== "activator") continue
      if (declared.has(line.name)) {
        refuse("activatorTwice", line.n, `${line.name} is declared twice (first on line ${declared.get(line.name)!.n})`)
        continue
      }
      const resolved = placeOf({ journey: block.journey, pyramid: block.pyramid, n: line.n }, line.place)
      if (!resolved) continue
      const activator: WebActivator = { name: line.name, look: line.look, n: line.n, ...resolved }
      const spot = `${pyramidName(resolved.at)} ${resolved.node}`
      const other = taken.get(spot)
      if (other)
        refuse(
          "placeTaken",
          line.n,
          `${line.name} stands where ${other.name} does (${pyramidName(resolved.at)} ${resolved.place})`
        )
      taken.set(spot, activator)
      declared.set(line.name, activator)
      activators.push(activator)
    }
  if (activators.length > MAX_WEB_ACTIVATORS)
    refuse("webTooLarge", undefined, `${activators.length} activators: a web carries at most ${MAX_WEB_ACTIVATORS}`)

  const used = new Set<string>()
  const known = (n: number, name: string): boolean => {
    used.add(name)
    if (declared.has(name)) return true
    refuse("unknownActivator", n, `${name} is no activator of this web`)
    return false
  }

  // DOORS AND POTS
  const standing = new Map<string, WebDoor>()
  const addDoor = (door: WebDoor) => {
    const spot = standingOf(door.at, door.where)
    const other = standing.get(spot)
    if (other)
      refuse("stopsShareSeam", door.n, `${door.source} and ${other.source} (line ${other.n}) both land on ${spot}`)
    else standing.set(spot, door)
    doors.push(door)
  }
  const potLines = new Map<string, number>()
  const journeyPots = new Set<number>()
  const pyramidPots: { at: PyramidRef; n: number }[] = []

  for (const block of blocks)
    for (const line of block.lines) {
      const ctx: Ctx = { journey: block.journey, pyramid: block.pyramid, n: line.n }
      if (line.type === "opens") {
        known(line.n, line.name)
        const place: DoorPlace = line.place
        const at = pyramidAt(ctx, place.pyramid)
        if (place.pyramid !== undefined && !at) continue
        const span = lineAt(ctx, at)
        const source = line.text
        if (place.kind === "seam") {
          const seam = nearestSeam(span, place.pct)
          if (!seam) {
            refuse("placeNotInWorld", line.n, "the line has no seam")
            continue
          }
          addDoor({
            id: `${line.n}`,
            key: webKey(line.name),
            n: line.n,
            source,
            at: seam.at,
            where: lineSeamWhere(world, span, seam),
            pct: place.pct,
            landed: seam.pos,
          })
        } else {
          const hanging = sectionAfter(span, place.pct)
          if (!hanging) {
            refuse("placeNotInWorld", line.n, `no side section hangs after ${place.pct}%`)
            continue
          }
          addDoor({
            id: `${line.n}`,
            key: webKey(line.name),
            n: line.n,
            source,
            at: hanging.at,
            where: { kind: "mouth", floor: hanging.floor, section: hanging.section.address },
            pct: place.pct,
          })
        }
        continue
      }
      if (line.type !== "sand") continue
      for (const lever of line.levers) known(line.n, lever)
      const target: SandTarget = line.target
      const at = pyramidAt(ctx, target.pyramid)
      if (target.pyramid !== undefined && !at) continue

      // A section named on a floor carrying a lock of that name is the lock's input.
      const inputTarget =
        target.kind === "input"
          ? { floor: undefined as number | undefined, lock: target.lock, input: target.input }
          : target.kind === "section" && at && target.address.includes(".")
            ? (() => {
                const [lock, input] = target.address.split(".")
                return floorOf(at, target.floor)?.locks?.[lock] ? { floor: target.floor, lock, input } : undefined
              })()
            : undefined
      if (inputTarget) {
        if (!at) {
          refuse("placeNotInWorld", line.n, `${inputTarget.lock}.${inputTarget.input} names a lock: write pM before it`)
          continue
        }
        if (line.levers.length !== 1 || line.stops || line.from !== undefined) {
          refuse("stopsMalformed", line.n, "a bound input names one activator and no stops: sand lock.A by moon")
          continue
        }
        const found = lockOn(ctx, at, inputTarget.floor, inputTarget.lock)
        if (!found) continue
        if (!(found.lock.inputs ?? []).includes(inputTarget.input)) {
          refuse("bindingNamesNoInput", line.n, `lock ${inputTarget.lock} declares no input ${inputTarget.input}`)
          continue
        }
        bindings.push({
          at,
          floor: found.floor,
          lock: inputTarget.lock,
          input: inputTarget.input,
          key: webKey(line.levers[0]),
          n: line.n,
        })
        continue
      }

      // A POT over a line.
      let span: Line
      let name: string
      let spanText: string
      if (target.kind === "section") {
        if (!at) {
          refuse("placeNotInWorld", line.n, `f${target.floor}.${target.address} names a section: write pM before it`)
          continue
        }
        const section = findSection(floorOf(at, target.floor)?.sections ?? [], target.address)
        if (!floorOf(at, target.floor) || !section) {
          refuse("placeNotInWorld", line.n, `${pyramidName(at)} has no section f${target.floor}.${target.address}`)
          continue
        }
        span = sectionLine(at, target.floor, section)
        name = `${pyramidName(at)}.f${target.floor}.${target.address}`
        spanText = name
      } else {
        span = lineAt(ctx, at)
        name = at ? pyramidName(at) : `w${ctx.journey}`
        const pyramids = pyramidsOf(ctx.journey).length
        spanText = at ? name : `w${ctx.journey}p1 → w${ctx.journey}p${pyramids}`
        if (at) pyramidPots.push({ at, n: line.n })
        else journeyPots.add(ctx.journey)
      }
      if (potLines.has(name)) {
        refuse("potsOverlap", line.n, `${name} already lies under the pot on line ${potLines.get(name)}`)
        continue
      }
      potLines.set(name, line.n)

      const levers = line.levers
      const from = line.from
      const stops =
        line.stops ??
        levers.map((_, k) => {
          const base = from ?? 0
          return base + ((100 - base) * (k + 1)) / levers.length
        })
      if (new Set(levers).size !== levers.length) {
        refuse("stopsMalformed", line.n, "a lever counts once in a pot")
        continue
      }
      if (stops.length !== levers.length) {
        refuse("stopsMalformed", line.n, `${stops.length} stops for ${levers.length} levers: one stop per lever`)
        continue
      }
      if (stops[stops.length - 1] !== 100 || stops.some((stop, k) => k > 0 && stop <= stops[k - 1])) {
        refuse("stopsMalformed", line.n, "the stops rise, and the last is 100%")
        continue
      }
      if (from !== undefined && stops[0] <= from) {
        refuse("stopNotAfterFrom", line.n, `the stop ${stops[0]}% is not past the sand's start, ${from}%`)
        continue
      }
      // Door k stands where the front lies after k pulls: the start, then each stop but the last.
      const points: (number | undefined)[] = [from, ...stops.slice(0, -1)]
      const potDoors: WebDoor[] = []
      points.forEach((pct, k) => {
        const seam = pct === undefined ? span.seams[0] : nearestSeam(span, pct)
        if (!seam) return
        const door: WebDoor = {
          id: `${line.n}#${k + 1}`,
          key: potKey(name, k + 1),
          n: line.n,
          source: line.text,
          at: seam.at,
          where: lineSeamWhere(world, span, seam),
          ...(pct !== undefined ? { pct } : {}),
          landed: seam.pos,
        }
        potDoors.push(door)
        addDoor(door)
      })
      if (potDoors.length === 0) refuse("placeNotInWorld", line.n, `${spanText} has no seam for the sand to stand at`)
      pots.push({
        name,
        levers,
        stops,
        ...(from !== undefined ? { from } : {}),
        doors: potDoors,
        n: line.n,
        source: line.text,
        span: spanText,
        rooms: span.rooms.length,
      })
    }
  for (const { at, n } of pyramidPots)
    if (journeyPots.has(at.journey))
      refuse("potsOverlap", n, `${pyramidName(at)} lies under its journey's pot, w${at.journey}`)

  for (const activator of activators)
    if (!used.has(activator.name))
      refuse("activatorUnused", activator.n, `${activator.name} counts in no pot and opens nothing`)

  // INPUTS: every declared input of every lock in the tier is bound once, and the stops landing in a lock add theirs.
  const boundKey = new Map<string, WebBinding>()
  for (const binding of bindings) {
    const id = `${pyramidName(binding.at)} f${binding.floor} ${binding.lock}.${binding.input}`
    const other = boundKey.get(id)
    if (other)
      refuse("bindingNamesNoInput", binding.n, `${binding.lock}.${binding.input} is bound twice (line ${other.n})`)
    else boundKey.set(id, binding)
  }
  const laidLocks = new Map<string, Lock>()
  const addedBy = new Map<string, WebDoor[]>()
  for (const door of doors)
    if (door.where.kind === "corridor" || door.where.kind === "region") {
      const id = `${pyramidName(door.at)} f${door.where.floor} ${door.where.lock}`
      addedBy.set(id, [...(addedBy.get(id) ?? []), door])
    }
  for (const [journey, pyramids] of Object.entries(world.journeys))
    pyramids.forEach((pyramid, p) =>
      pyramid.floors.forEach((floor, f) => {
        for (const [instance, lock] of Object.entries(floor.locks ?? {})) {
          const at = { journey: Number(journey), pyramid: p + 1 }
          const id = `${pyramidName(at)} f${f} ${instance}`
          for (const input of lock.inputs ?? [])
            if (!boundKey.has(`${id}.${input}`))
              refuse(
                "inputUnbound",
                undefined,
                `input ${input} of ${instance} on ${pyramidName(at)} f${f} is bound by no line`
              )
          const added = addedBy.get(id) ?? []
          if ((lock.inputs ?? []).length + added.length > MAX_OUTSIDE_INPUTS)
            refuse(
              "outsideTooMany",
              added[0]?.n,
              `${instance} on ${pyramidName(at)} f${f} would carry ${(lock.inputs ?? []).length + added.length} inputs, ` +
                `at most ${MAX_OUTSIDE_INPUTS}: ${added.map(d => d.key).join(", ")} added by stops`
            )
          let laid: Lock | undefined = lock
          const names = new Set<string>()
          for (const door of added) {
            const where = door.where as Extract<DoorWhere, { kind: "corridor" | "region" }>
            const input = addedInputName(laid!, names)
            names.add(input)
            const next = addFrontOwner(laid!, where, input)
            if (!next) {
              refuse(
                "frontOnAnyGate",
                door.n,
                `${door.key} lands on ${instance} ${where.kind === "corridor" ? `${where.from}–${where.to}` : where.region}, ` +
                  `a corridor gated with |: its other owner would open the sand`
              )
              laid = undefined
              break
            }
            laid = next
          }
          if (laid && added.length > 0) laidLocks.set(id, laid)
        }
      })
    )

  return { web, world, activators, pots, doors, bindings, laidLocks, refusals }
}
