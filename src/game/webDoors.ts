// THE WEB'S DOORS ON A CARVED FLOOR (docs/instructions/sand-pyramid.md, "One mechanism"): laid on the finished carve and
// never carved, so a web door moves no wall. A door on ground no lock owns stands on one corridor cell the player has to
// walk through; a door a lock's input owns stands where the lock's own gate does, or on every crossing between the two
// regions, or round the region it buries. The web model (webWalk.ts) lays its doors in the same places.
import { OPPOSITE } from "./carve/grid"
import { doorKeysOf, isWebKey } from "./floorLock"
import type { Lock } from "./lockAuthoring"
import { isOutsideInput, isRegionGate } from "./lockAuthoring"
import { mechanismGatesOf } from "./mechanismDoors"
import { reachableFrom } from "./siteValidator"
import { webMarkFor } from "./mark"
import { REGION_BARRIER_KIND } from "./regionBarrierRealisation"
import type { AssemblerReason, Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "./siteTypes"
import { MAIN_SECTION_ADDRESS } from "./carve/sections"
import { addFrontOwner } from "./webLine"

/** Where a web door stands on ground no lock owns: on the main path before its counted room `seam + 1`, at a side
 * section's mouth, or before room `seam + 1` of a side section. Rooms are counted as the line counts them (webLine.ts):
 * the numbered puzzle rooms, then the end room. */
export type WebDoorSpot = { seam: number } | { mouth: string } | { section: string; seam: number }

/** A web door on a floor's authoring, laid by `layWebDoors`. */
export type WebDoorPlacement = { key: string; at: WebDoorSpot }

/** An outside owner a web's stop added to a placed lock: on the corridors between two regions, or burying a region. */
export type WebFront = { input: string; corridor: readonly [string, string] } | { input: string; region: string }

/** A placed lock's inputs bound to the web keys they wait for, and the owners its stops added (`W1`, …). */
export type PlacedLockWeb = {
  inputs: Readonly<Record<string, string>>
  fronts?: readonly WebFront[]
  /** No mod realises the web: every input is open ground, its gates the lock's floor owners' alone. */
  open?: true
}

/** One gate of a placed lock a web key has a say in, under its floor names. `obstacle`: the compiled gate whose doors
 * the carve stood, where floor owners keep it; absent, the carve left the corridor or the region open and the web
 * lays its own doors. */
export type WebLockGate = { keys: string[]; mode?: "any"; obstacle?: string } & (
  { kind: "edge"; between: readonly [string, string] } | { kind: "region"; region: string }
)

/** The sand a web door stands as, and the seal an activator's door stands as: realisations the topology mod declares,
 * apart from the floor's own sand so one site holds one kind of each (`webSandKindRefusals`). Where no mod answers to
 * web sand the web's doors are left off the carve. */
export const WEB_SAND_REALISATION = "webSand"
export const WEB_SEAL_REALISATION = "webSeal"

/** The floor's own sand, which a site with web sand binds no lock's barriers to. */
const FLOOR_SAND_REALISATION = "sand"

/** How a web door is drawn: a stop of a pot (`web:moon#2`) is web sand, a door an activator opens (`web:ankh`) a seal. */
export const webDoorRealisation = (keyId: string): string =>
  keyId.includes("#") ? WEB_SAND_REALISATION : WEB_SEAL_REALISATION

/** A floor with web sand: a stop of a pot laid as a door, or a lock whose inputs or fronts the web bound (a region
 * they bury is web sand). */
const holdsWebSand = (floor: FloorConfig): boolean =>
  (floor.webDoors ?? []).some(door => webDoorRealisation(door.key) === WEB_SAND_REALISATION) ||
  (floor.locks ?? []).some(
    placed =>
      placed.web && !placed.web.open && (Object.keys(placed.web.inputs).length > 0 || !!placed.web.fronts?.length)
  )

/**
 * ONE SAND KIND PER SITE: a site with web sand whose lock binds its region barriers to the floor's sand is refused,
 * naming the floor, so the two never share a drift the player cannot tell apart. Bind them to water there.
 */
export const webSandKindRefusals = (site: readonly FloorConfig[]): AssemblerReason[] =>
  site.some(holdsWebSand)
    ? site.flatMap((floor, index): AssemblerReason[] => {
        const bound = floor.realisations?.[REGION_BARRIER_KIND] ?? floor.regionBarrierRealisation
        return bound === FLOOR_SAND_REALISATION ? [{ type: "webSandKindMixed", floor: index, realisation: bound }] : []
      })
    : []

/** The lock as the web lays it: its stops' owners added. Undefined when one cannot be added (a corridor gated with |). */
export const laidLockOf = (lock: Lock, web: PlacedLockWeb | undefined): Lock | undefined => {
  let laid: Lock | undefined = lock
  for (const front of web?.fronts ?? []) {
    if (!laid) return undefined
    laid =
      "region" in front
        ? addFrontOwner(laid, { kind: "region", floor: 0, seam: 0, lock: "", region: front.region }, front.input)
        : addFrontOwner(
            laid,
            { kind: "corridor", floor: 0, seam: 0, lock: "", from: front.corridor[0], to: front.corridor[1] },
            front.input
          )
  }
  return laid
}

/** Every gate of a laid lock an input owns, the input named by the web key it is bound to. */
export const webLockGates = (lock: Lock, web: PlacedLockWeb, instance: string): WebLockGate[] =>
  Object.entries(lock.gates).flatMap(([id, gate]): WebLockGate[] => {
    const inputs = gate.owners.filter(owner => isOutsideInput(lock, owner))
    if (inputs.length === 0) return []
    const keys = inputs.map(input => web.inputs[input])
    const floorOwned = gate.owners.length > inputs.length
    const common = {
      keys,
      ...(gate.mode === "any" ? { mode: "any" as const } : {}),
      ...(floorOwned ? { obstacle: `${instance}.${id}` } : {}),
    }
    return isRegionGate(gate)
      ? [{ ...common, kind: "region", region: `${instance}.${gate.region}` }]
      : [{ ...common, kind: "edge", between: [`${instance}.${gate.from}`, `${instance}.${gate.to}`] }]
  })

type Pos = readonly [number, number]
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const key = ([r, c]: Pos) => `${r},${c}`

type Ground = Extract<GridCell, { type: "room" | "corridor" }>
const groundAt = (grid: FloorGrid, [r, c]: Pos): Ground | undefined => {
  const cell = grid.cells[r]?.[c]
  return cell && cell.type !== "empty" ? cell : undefined
}

/** The neighbours a cell is joined to both ways. */
export const joinedTo = (grid: FloorGrid, at: Pos): Pos[] => {
  const cell = groundAt(grid, at)
  if (!cell) return []
  return [...cell.dirs].flatMap(dir => {
    const next: Pos = [at[0] + MOVES[dir][0], at[1] + MOVES[dir][1]]
    return groundAt(grid, next)?.dirs.has(OPPOSITE[dir]) ? [next] : []
  })
}

const ordinalOf = (cell: Ground): number => {
  if (cell.ordinal === undefined) return NaN
  const [a, b] = cell.ordinal.split("|").map(Number)
  return b === undefined ? a : (a + b) / 2
}

/** A door the web laid: one of its keys is a web key. */
export const isWebDoorCell = (cell: GridCell | undefined): boolean =>
  cell !== undefined && cell.type === "room" && doorKeysOf(cell).some(isWebKey)

/** The cells of one section of the authoring, by the address a save files them under. */
const sectionCells = (grid: FloorGrid, address: string): Pos[] => {
  const found: Pos[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "empty" && cell.sectionAddress === address) found.push([r, c])
    })
  )
  return found
}

/**
 * THE ROOMS A LINE COUNTS, in order: a section's numbered puzzle rooms, then its end room, the last encounter of the
 * main path (its treasure before the way out) or the last room of a side section. A door the web laid is never one.
 */
export const lineRooms = (grid: FloorGrid, address: string): Pos[] => {
  const rooms = sectionCells(grid, address).filter(at => {
    const cell = groundAt(grid, at)
    return cell?.type === "room" && !isWebDoorCell(cell)
  })
  const room = (at: Pos) => groundAt(grid, at) as RoomCell
  const numbered = rooms
    .filter(at => room(at).pathIndex !== undefined)
    .sort((a, b) => room(a).pathIndex! - room(b).pathIndex!)
  const ends = (address === MAIN_SECTION_ADDRESS ? rooms.filter(at => room(at).roomType === "encounter") : rooms).sort(
    (a, b) => ordinalOf(room(a)) - ordinalOf(room(b))
  )
  const end = ends.at(-1)
  return end && !numbered.some(at => key(at) === key(end)) ? [...numbered, end] : numbered
}

/** The cells of the shortest walk from one cell to another over a section's own cells, both ends included. */
export const walkWithin = (grid: FloorGrid, address: string, from: Pos, to: Pos): Pos[] | undefined => {
  const inSection = new Set(sectionCells(grid, address).map(key))
  const previous = new Map<string, Pos | null>([[key(from), null]])
  const queue: Pos[] = [from]
  for (let at = 0; at < queue.length; at++) {
    const here = queue[at]
    if (key(here) === key(to)) {
      const path: Pos[] = []
      for (let step: Pos | null = here; step; step = previous.get(key(step)) ?? null) path.unshift(step)
      return path
    }
    for (const next of joinedTo(grid, here))
      if (inSection.has(key(next)) && !previous.has(key(next))) {
        previous.set(key(next), here)
        queue.push(next)
      }
  }
  return undefined
}

/** A cell a door can stand in: a corridor joined to exactly two cells, nothing standing in it and nothing hanging off
 * it, so the door shuts the one way through and no other. */
const passable = (grid: FloorGrid, at: Pos): boolean => {
  const cell = groundAt(grid, at)
  return (
    cell?.type === "corridor" && !cell.hidden && !cell.obstacle && !cell.openGate && joinedTo(grid, at).length === 2
  )
}

export type WebDoorFault = { type: "webDoorUnseated"; where: string; why: string }

/** The cell a door on ground no lock owns stands in, or why there is none. */
export const webDoorCell = (grid: FloorGrid, at: WebDoorSpot): Pos | WebDoorFault => {
  const fault = (where: string, why: string): WebDoorFault => ({ type: "webDoorUnseated", where, why })
  if ("mouth" in at) {
    const cells = sectionCells(grid, at.mouth)
    const mouth = cells
      .filter(pos => joinedTo(grid, pos).some(next => groundAt(grid, next)?.sectionAddress !== at.mouth))
      .sort((a, b) => ordinalOf(groundAt(grid, a)!) - ordinalOf(groundAt(grid, b)!))[0]
    if (!mouth) return fault(`${at.mouth}'s mouth`, "the section meets no other ground")
    return passable(grid, mouth) ? mouth : fault(`${at.mouth}'s mouth`, "its first cell is no plain corridor")
  }
  const address = "section" in at ? at.section : MAIN_SECTION_ADDRESS
  const where = `${address} seam ${at.seam}|${at.seam + 1}`
  const rooms = lineRooms(grid, address)
  const [from, to] = [rooms[at.seam], rooms[at.seam + 1]]
  if (!from || !to) return fault(where, `the line has ${rooms.length} rooms`)
  const path = walkWithin(grid, address, from, to)
  if (!path || path.length < 3) return fault(where, "no corridor runs between the two rooms")
  const last = path[path.length - 2]
  return passable(grid, last) ? last : fault(where, "the step into the room is no plain corridor")
}

/** The two cells of every place where ground of one region meets ground of another, each pair once. */
const crossings = (grid: FloorGrid, inside: (cell: Ground) => boolean, outside: (cell: Ground) => boolean) => {
  const found: { inner: Pos; outer: Pos }[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty" || !inside(cell)) return
      for (const next of joinedTo(grid, [r, c])) {
        const beside = groundAt(grid, next)!
        if (!inside(beside) && outside(beside)) found.push({ inner: [r, c], outer: next })
      }
    })
  )
  return found
}

/**
 * EVERY WEB DOOR SHUTS SOMETHING: with every door asking for one web key taken out of the floor and every other door
 * open, no such door has ground on both of its sides in reach. A door the floor walks round is named by its key and
 * cell; the web model would bury what the carve leaves open.
 */
export const webDoorLeaks = (grid: FloorGrid): string[] => {
  const byKey = new Map<string, Pos[]>()
  const allKeys = new Set<string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      for (const id of doorKeysOf(cell.type === "empty" ? undefined : cell)) {
        allKeys.add(id)
        if (isWebKey(id)) byKey.set(id, [...(byKey.get(id) ?? []), [r, c]])
      }
    })
  )
  const leaks: string[] = []
  for (const [webKey, doors] of byKey) {
    const shut = new Set(doors.map(key))
    const without: FloorGrid = {
      ...grid,
      cells: grid.cells.map((row, r) => row.map((cell, c) => (shut.has(`${r},${c}`) ? { type: "empty" } : cell))),
    }
    const held = new Set([...allKeys].filter(id => id !== webKey))
    const reached = reachableFrom(without, grid.entrancePos, held, {
      authoredKeysHeld: true,
      mechanismGates: mechanismGatesOf(grid),
    })
    for (const door of doors) {
      const sides = joinedTo(grid, door).filter(side => !shut.has(key(side)) && reached.has(key(side)))
      if (sides.length > 1) leaks.push(`${webKey} at ${key(door)}: the floor walks round it`)
    }
  }
  return leaks
}

type Laid = { ok: true; grid: FloorGrid } | { ok: false; fault: WebDoorFault }

/**
 * THE FLOOR WITH ITS WEB DOORS: each door on ground no lock owns becomes a gate asking for its key, a lock gate an input
 * shares with floor owners asks for the input's key beside its own, and a gate only inputs own is laid on every crossing
 * it bars. A door that cannot be seated is a fault naming it: the bake moves the stop, never the wall.
 */
export const layWebDoors = (
  grid: FloorGrid,
  doors: readonly WebDoorPlacement[],
  lockGates: readonly WebLockGate[],
  gateTags: readonly string[],
  gateKeyOf: (obstacle: string) => string
): Laid => {
  if (doors.length === 0 && lockGates.length === 0) return { ok: true, grid }
  const cells = grid.cells.map(row => [...row])
  const at = ([r, c]: Pos) => cells[r][c]
  const fault = (where: string, why: string): Laid => ({ ok: false, fault: { type: "webDoorUnseated", where, why } })
  const shut = (pos: Pos, keys: readonly string[], extra: Partial<RoomCell> = {}) => {
    const cell = at(pos) as Ground
    cells[pos[0]][pos[1]] = {
      ...(cell as Omit<Ground, "type">),
      type: "room",
      roomType: "encounter",
      tags: [...gateTags, ...(extra.regionBarrier ? ["region-barrier"] : [])],
      requiredKeyId: keys[0],
      ...(keys.length > 1 ? { requiredKeyIds: keys.slice(1) } : {}),
      // A door one web key shuts wears that key's mark; with several owners its face lists each (gateFace.ts). A
      // region barrier's door is the cover itself.
      ...(extra.regionBarrier
        ? {}
        : {
            webDoor: { realisation: webDoorRealisation(keys[0]) },
            ...(keys.length === 1 ? { mark: webMarkFor(keys[0], grid.webMarks) } : {}),
          }),
      ...extra,
    } as RoomCell
  }
  const shutOnCrossing = (
    inner: Pos,
    outer: Pos,
    keys: readonly string[],
    extra: (outer: Ground) => Partial<RoomCell>
  ) => {
    const door = passable(grid, inner) ? inner : passable(grid, outer) ? outer : undefined
    if (!door) return false
    const there = at(door)
    if (there.type === "room") {
      // A cell another web door already stands in asks for this gate's keys too: both must be held.
      const asked = doorKeysOf(there)
      const more = keys.filter(id => !asked.includes(id))
      if (more.length > 0) {
        // Two owners: the door's face lists a mark for each, so the door itself wears none.
        const { mark: _single, ...both } = there
        cells[door[0]][door[1]] = { ...both, requiredKeyIds: [...(there.requiredKeyIds ?? []), ...more] }
      }
      return true
    }
    shut(door, keys, extra(at(outer) as Ground))
    return true
  }

  for (const door of doors) {
    const found = webDoorCell(grid, door.at)
    if (!Array.isArray(found)) return { ok: false, fault: found as WebDoorFault }
    const pos = found as Pos
    if (at(pos).type === "room") return fault(key(pos), "two web doors stand in one cell")
    shut(pos, [door.key])
  }

  for (const gate of lockGates) {
    const name = gate.kind === "edge" ? `${gate.between[0]}–${gate.between[1]}` : gate.region
    if (gate.obstacle !== undefined) {
      // The carve stood this gate's doors for its floor owners: each asks for the input's key beside its own.
      const stem = gateKeyOf(gate.obstacle)
      let found = 0
      cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.type !== "room" || cell.requiredKeyId !== stem) return
          found++
          cells[r][c] = { ...cell, requiredKeyIds: [...(cell.requiredKeyIds ?? []), ...gate.keys] }
        })
      )
      if (found === 0) return fault(name, `the carve stood no door for ${gate.obstacle}`)
      continue
    }
    // Inputs alone own it: the carve left the way open, and the web bars it where the regions meet.
    if (gate.mode === "any" && gate.keys.length > 1)
      return fault(name, "a gate only inputs own opens with all of them, never with any one")
    const pairs =
      gate.kind === "edge"
        ? crossings(
            grid,
            cell => cell.region === gate.between[1],
            cell => cell.region === gate.between[0]
          )
        : crossings(
            grid,
            cell => cell.region === gate.region,
            () => true
          )
    if (pairs.length === 0) return fault(name, "no ground of the two regions meets")
    // Buried ground the player arrives on has no crossing to bar: the floor's way in stands in it.
    const arrival = groundAt(grid, grid.entrancePos)
    if (gate.kind === "region" && arrival?.region === gate.region)
      return fault(name, "the floor's way in stands in the region it buries")
    for (const { inner, outer } of pairs)
      if (
        !shutOnCrossing(inner, outer, gate.keys, beside =>
          gate.kind === "region"
            ? {
                regionBarrier: {
                  region: gate.region,
                  entrance: beside.region ?? "",
                  realisation: WEB_SAND_REALISATION,
                },
              }
            : {}
        )
      )
        return fault(name, `the crossing at ${key(inner)} is no plain corridor on either side`)
  }
  return { ok: true, grid: { ...grid, cells } }
}
