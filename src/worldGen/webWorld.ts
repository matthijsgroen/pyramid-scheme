// THE WIZARD TIER AS A WEB READS IT (docs/instructions/sand-pyramid.md, "The line"): each pyramid's main floors read off
// their carve for the main-path rooms, the lock regions they stand in, where each side section hangs, the floor's own
// drops, and which cell and reward slot stands for each place of the web's graph. Pure: the carve is handed in.
import type { Lock } from "../game/lockAuthoring"
import { childSectionsOf, MAIN_SECTION_ADDRESS, sectionAddresses } from "../game/carve/sections"
import { oneWayRuns } from "../game/gridNavigation"
import type { FloorConfig, FloorGrid, GridCell, SubSection, TreasureReward } from "../game/siteTypes"
import { lineRooms, walkWithin } from "../game/webDoors"
import type { WebFloor, WebPyramid, WebSection, WebSpot, WebWorld } from "../game/webLine"
import { isLockRegion, instanceOf, pyramidName, regionNode, roomNode, sectionNode } from "../game/webLine"

type Pos = readonly [number, number]

/** Where a reward of a floor's authoring is held: a main or section room's `rewards[index]`, or its end reward. */
export type RewardSlot = { floor: number; section: string; index: number | "end" }

/** What one floor of the read gives besides the web's floor: the cell each node of the graph stands for, and the
 * reward slot a node's room holds. */
export type FloorSeat = { cells: Map<string, Pos>; slots: Map<string, RewardSlot> }

/** One pyramid as the bake hands it in: every floor's authoring and carve, main floors and wings alike. */
export type CarvedPyramid = { configs: readonly FloorConfig[]; grids: readonly FloorGrid[] }

export type ReadWorld = { world: WebWorld; seats: Map<string, FloorSeat[]> }

const ordinalOf = (cell: GridCell | undefined): number => {
  if (!cell || cell.type === "empty" || cell.ordinal === undefined) return NaN
  const [a, b] = cell.ordinal.split("|").map(Number)
  return b === undefined ? a : (a + b) / 2
}

const lockRegionOf = (cell: GridCell | undefined): string | undefined =>
  cell && cell.type !== "empty" && isLockRegion(cell.region) ? cell.region : undefined

/** The floors a pyramid's main path climbs, from its arrival to the floor it leaves by: a wing (a floor reached by a
 * side section's stairs) is no part of the line. */
export const mainFloors = (configs: readonly FloorConfig[]): number => {
  const last = configs.findIndex(config => config.exitOrStaircase === "exit")
  return last < 0 ? configs.length : last + 1
}

/** Every section of a floor's authoring, by the address a save files it under, with its pathPuzzles. */
const sectionsByAddress = (config: FloorConfig): Map<string, SubSection> => {
  const addresses = sectionAddresses(config)
  if (!addresses.ok) throw new Error(`section ${addresses.duplicate} is named twice`)
  const found = new Map<string, SubSection>()
  const walk = (sections: readonly SubSection[], prefix: string) =>
    sections.forEach((section, i) => {
      const positional = `${prefix}${i}`
      found.set(addresses.of.get(positional) ?? positional, section)
      walk(childSectionsOf(section), `${positional}.`)
    })
  walk(config.sideSections, "s")
  return found
}

/** One main floor read off its carve. */
const readFloor = (
  grid: FloorGrid,
  config: FloorConfig,
  f: number,
  where: string
): { floor: WebFloor; seat: FloorSeat } => {
  const cell = (at: Pos) => grid.cells[at[0]]?.[at[1]]
  const sections = sectionsByAddress(config)
  const counted = (address: string, puzzles: number): Pos[] => {
    const rooms = lineRooms(grid, address)
    if (rooms.length !== puzzles + 1)
      throw new Error(`${where} ${address}: ${rooms.length} rooms counted, ${puzzles + 1} authored`)
    return rooms
  }
  const main = counted(MAIN_SECTION_ADDRESS, config.pathPuzzles)
  const seat: FloorSeat = { cells: new Map(), slots: new Map() }
  main.forEach((at, i) => {
    seat.cells.set(roomNode(f, i), at)
    seat.slots.set(roomNode(f, i), {
      floor: f,
      section: MAIN_SECTION_ADDRESS,
      index: i < config.pathPuzzles ? i : "end",
    })
  })

  // The regions the main path stands in between two of its rooms, along the walk between them.
  const via: Record<number, string[]> = {}
  for (let i = 0; i + 1 < main.length; i++) {
    const path = walkWithin(grid, MAIN_SECTION_ADDRESS, main[i], main[i + 1])
    if (!path) throw new Error(`${where}: no walk joins main rooms ${i} and ${i + 1}`)
    const between = path
      .slice(1, -1)
      .flatMap(at => lockRegionOf(cell(at)) ?? [])
      .filter((region, k, list) => k === 0 || list[k - 1] !== region)
    if (between.length > 0) via[i] = between
  }

  /** Where a section's mouth meets its parent: the parent's cell beside one of its own. */
  const mouthOf = (address: string): Pos | undefined => {
    const own: Pos[] = []
    grid.cells.forEach((row, r) =>
      row.forEach((c, k) => {
        if (c.type !== "empty" && c.sectionAddress === address) own.push([r, k])
      })
    )
    for (const at of own) {
      const here = cell(at)
      if (!here || here.type === "empty") continue
      for (const dir of here.dirs) {
        const step = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[dir] as [number, number]
        const next: Pos = [at[0] + step[0], at[1] + step[1]]
        const beside = cell(next)
        if (!beside || beside.type === "empty" || beside.sectionAddress === address) continue
        if (!beside.dirs.has({ n: "s", s: "n", e: "w", w: "e" }[dir] as never)) continue
        return next
      }
    }
    return undefined
  }

  const roomsOf = new Map<string, Pos[]>([[MAIN_SECTION_ADDRESS, main]])
  const read = (list: readonly SubSection[], prefix: string, parent: string): WebSection[] =>
    list.flatMap((section, i) => {
      const positional = `${prefix}${i}`
      const address = [...sections.entries()].find(([, s]) => s === section)?.[0] ?? positional
      const carved = grid.cells.some(row => row.some(c => c.type !== "empty" && c.sectionAddress === address))
      if (!carved) return []
      const mouth = mouthOf(address)
      if (!mouth) throw new Error(`${where}: ${address} meets ${parent} nowhere`)
      const rooms = counted(address, section.pathPuzzles)
      roomsOf.set(address, rooms)
      rooms.forEach((at, j) => {
        seat.cells.set(sectionNode(f, address, j), at)
        seat.slots.set(sectionNode(f, address, j), {
          floor: f,
          section: address,
          index: j < section.pathPuzzles ? j : "end",
        })
      })
      // A section hanging at a room hangs off that room; one hanging between two hangs off the earlier.
      const parentRooms = roomsOf.get(parent) ?? []
      const after = parentRooms.filter(at => ordinalOf(cell(at)) <= ordinalOf(cell(mouth))).length
      const region = lockRegionOf(cell(mouth))
      const ward = section.gate?.type === "tomb-key" ? section.gate.wardKeyId : undefined
      return [
        {
          address,
          after,
          rooms: rooms.length,
          ...(region ? { region } : {}),
          ...(section.hidden ? { hidden: true } : {}),
          ...(ward ? { ward } : {}),
          sections: read(childSectionsOf(section), `${positional}.`, address),
        },
      ]
    })
  const webSections = read(config.sideSections, "s", MAIN_SECTION_ADDRESS)

  // A lock region stands for the first reward room standing in it.
  const locks: Record<string, Lock> = Object.fromEntries((config.locks ?? []).map(p => [p.as ?? p.lock.name, p.lock]))
  for (const [address, rooms] of roomsOf)
    rooms.forEach((at, j) => {
      const region = lockRegionOf(cell(at))
      if (!region || seat.cells.has(regionNode(f, region))) return
      const node = address === MAIN_SECTION_ADDRESS ? roomNode(f, j) : sectionNode(f, address, j)
      seat.cells.set(regionNode(f, region), at)
      seat.slots.set(regionNode(f, region), seat.slots.get(node)!)
    })

  // The floor's own drops: a lock's drops are its own, so only one leaving or landing off the lock is read.
  const spotOf = (at: Pos): WebSpot | undefined => {
    const here = cell(at)
    if (!here || here.type === "empty") return undefined
    const region = lockRegionOf(here)
    if (region) return { region }
    const address = here.sectionAddress ?? MAIN_SECTION_ADDRESS
    const rooms = roomsOf.get(address)
    if (!rooms) return undefined
    const index = Math.max(0, rooms.filter(room => ordinalOf(cell(room)) <= ordinalOf(here)).length - 1)
    return address === MAIN_SECTION_ADDRESS ? { room: index } : { section: address, room: index }
  }
  const drops = oneWayRuns(grid).flatMap(run => {
    const [from, to] = [lockRegionOf(cell(run.launch)), lockRegionOf(cell(run.landing))]
    if (from && to && instanceOf(from) === instanceOf(to)) return []
    const [a, b] = [spotOf(run.launch), spotOf(run.landing)]
    return a && b ? [{ from: a, to: b }] : []
  })

  const nesting = Object.fromEntries(
    (config.locks ?? []).flatMap(p => (p.inside ? [[p.as ?? p.lock.name, p.inside.instance]] : []))
  )
  return {
    floor: {
      rooms: main.map(at => (lockRegionOf(cell(at)) ? { region: lockRegionOf(cell(at)) } : {})),
      ...(Object.keys(via).length > 0 ? { via } : {}),
      sections: webSections,
      ...(Object.keys(locks).length > 0 ? { locks } : {}),
      ...(Object.keys(nesting).length > 0 ? { nesting } : {}),
      ...(drops.length > 0 ? { drops } : {}),
    },
    seat,
  }
}

/** The tier as the web reads it: `journeys[N]` is wizard_N's pyramids in levelNr order. */
export const readWebWorld = (journeys: Readonly<Record<number, readonly CarvedPyramid[]>>): ReadWorld => {
  const world: Record<number, WebPyramid[]> = {}
  const seats = new Map<string, FloorSeat[]>()
  for (const [n, pyramids] of Object.entries(journeys))
    world[Number(n)] = pyramids.map((pyramid, p) => {
      const name = pyramidName({ journey: Number(n), pyramid: p + 1 })
      const read = pyramid.configs
        .slice(0, mainFloors(pyramid.configs))
        .map((config, f) => readFloor(pyramid.grids[f], config, f, `${name} floor ${f}`))
      seats.set(
        name,
        read.map(r => r.seat)
      )
      return { floors: read.map(r => r.floor) }
    })
  return { world: { journeys: world }, seats }
}

/** The reward a slot holds on a floor's authoring, and a way to set it. */
export const slotOf = (
  config: FloorConfig,
  slot: RewardSlot
): { get: () => TreasureReward | undefined; set: (reward: TreasureReward) => void } => {
  const holder: {
    rewards?: (TreasureReward | undefined)[]
    endReward?: TreasureReward
    mainEndReward?: TreasureReward
  } = slot.section === MAIN_SECTION_ADDRESS ? config : (sectionsByAddress(config).get(slot.section) as SubSection)
  if (!holder) throw new Error(`no section ${slot.section}`)
  const endField = slot.section === MAIN_SECTION_ADDRESS ? "mainEndReward" : "endReward"
  if (slot.index === "end") return { get: () => holder[endField], set: reward => void (holder[endField] = reward) }
  const index = slot.index
  return {
    get: () => holder.rewards?.[index],
    set: reward => {
      holder.rewards ??= []
      holder.rewards[index] = reward
    },
  }
}

export const describeSlot = (slot: RewardSlot) =>
  `f${slot.floor} ${slot.section} ${slot.index === "end" ? "end" : `room ${slot.index}`}`
