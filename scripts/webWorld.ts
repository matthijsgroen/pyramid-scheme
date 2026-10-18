/**
 * The wizard tier as a web reads it, off the last bake: each floor carved from `generatedWorld.ts` as the game
 * carves it, and read for its main-path rooms, the lock regions they stand in and where each side section hangs.
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { assembleFloor } from "../src/game/siteAssembler"
import { resolveOneWayRealisation } from "../src/mods/allOneWayRealisations"
import { resolvePassageRealisation } from "../src/mods/allPassageRealisations"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import { resolveKeyRequirements, resolveEncounterMeta } from "../src/mods/allFamilyMeta"
import { sectionAddresses, childSectionsOf, MAIN_SECTION_ADDRESS } from "../src/game/carve/sections"
import type { Direction, FloorConfig, FloorGrid, GridCell, SubSection } from "../src/game/siteTypes"
import type { Lock } from "../src/game/lockAuthoring"
import type { WebFloor, WebSection, WebWorld } from "../src/game/webLine"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const BACK: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

const ordinalOf = (cell: GridCell): number => {
  const ordinal = cell.type === "room" || cell.type === "corridor" ? cell.ordinal : undefined
  if (ordinal === undefined) return NaN
  const [a, b] = ordinal.split("|").map(Number)
  return b === undefined ? a : (a + b) / 2
}
const lockRegion = (cell: GridCell): string | undefined =>
  (cell.type === "room" || cell.type === "corridor") && cell.region?.includes(".") ? cell.region : undefined

type Placed = { r: number; c: number; cell: GridCell; ordinal: number }

const carve = (journeyId: string, levelNr: number, floorIndex: number, config: FloorConfig): FloorGrid => {
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const result = assembleFloor(journeyId, config, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId, floorIndex },
    resolveOneWay: resolveOneWayRealisation,
    resolvePassage: resolvePassageRealisation,
  })
  if (!result.success) throw new Error(`${journeyId} pyramid ${levelNr} floor ${floorIndex} will not carve`)
  return result.grid
}

const floorOf = (grid: FloorGrid, config: FloorConfig, where: string): WebFloor => {
  const bySection = new Map<string, Placed[]>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" && cell.type !== "corridor") return
      if (cell.sectionAddress === undefined) return
      const list = bySection.get(cell.sectionAddress) ?? []
      list.push({ r, c, cell, ordinal: ordinalOf(cell) })
      bySection.set(cell.sectionAddress, list)
    })
  )
  for (const list of bySection.values()) list.sort((a, b) => a.ordinal - b.ordinal)
  /** The rooms a line counts: its puzzle rooms in order, then its end room, the last encounter. */
  const countedOf = (address: string, puzzles: number): Placed[] => {
    const rooms = (bySection.get(address) ?? []).filter(p => p.cell.type === "room")
    const numbered = rooms
      .filter(p => p.cell.type === "room" && p.cell.pathIndex !== undefined)
      .sort((a, b) => (a.cell as { pathIndex: number }).pathIndex - (b.cell as { pathIndex: number }).pathIndex)
    // The main path ends in its treasure room before the way out; a section in its last room, a stair or a treasure.
    const end = (
      address === MAIN_SECTION_ADDRESS
        ? rooms.filter(p => p.cell.type === "room" && p.cell.roomType === "encounter")
        : rooms
    ).at(-1)
    const counted = end && !numbered.includes(end) ? [...numbered, end] : numbered
    if (counted.length !== puzzles + 1)
      throw new Error(`${where} ${address}: ${counted.length} rooms counted, ${puzzles + 1} authored`)
    return counted
  }

  const main = countedOf(MAIN_SECTION_ADDRESS, config.pathPuzzles)
  const mainCells = bySection.get(MAIN_SECTION_ADDRESS) ?? []
  const via: Record<number, string[]> = {}
  for (let i = 0; i + 1 < main.length; i++) {
    const between = mainCells
      .filter(p => p.ordinal > main[i].ordinal && p.ordinal < main[i + 1].ordinal)
      .flatMap(p => lockRegion(p.cell) ?? [])
      .filter((region, k, list) => k === 0 || list[k - 1] !== region)
    if (between.length > 0) via[i] = between
  }

  const addresses = sectionAddresses(config)
  if (!addresses.ok) throw new Error(`${where}: section ${addresses.duplicate} is named twice`)
  /** Where a section's mouth meets its parent: the parent cell beside one of its own. */
  const mouthOf = (address: string, parent: string): Placed | undefined => {
    for (const { r, c, cell } of bySection.get(address) ?? []) {
      if (cell.type !== "room" && cell.type !== "corridor") continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir]
        const next = grid.cells[r + dr]?.[c + dc]
        if (!next || (next.type !== "room" && next.type !== "corridor")) continue
        if (next.sectionAddress !== parent || !next.dirs.has(BACK[dir])) continue
        return { r: r + dr, c: c + dc, cell: next, ordinal: ordinalOf(next) }
      }
    }
    return undefined
  }
  const sectionsOf = (sections: SubSection[], prefix: string, parent: string, parentRooms: Placed[]): WebSection[] =>
    sections.flatMap((section, i) => {
      const positional = `${prefix}${i}`
      const address = addresses.of.get(positional) ?? positional
      if (!bySection.has(address)) return []
      const mouth = mouthOf(address, parent)
      if (!mouth) throw new Error(`${where}: ${address} meets ${parent} nowhere`)
      const rooms = countedOf(address, section.pathPuzzles)
      const ward = section.gate?.type === "tomb-key" ? section.gate.wardKeyId : undefined
      const region = lockRegion(mouth.cell)
      return [
        {
          address,
          after: parentRooms.filter(p => p.ordinal < mouth.ordinal).length,
          rooms: rooms.length,
          ...(region ? { region } : {}),
          ...(section.hidden ? { hidden: true } : {}),
          ...(ward ? { ward } : {}),
          sections: sectionsOf(childSectionsOf(section), `${positional}.`, address, rooms),
        },
      ]
    })

  const locks: Record<string, Lock> = Object.fromEntries((config.locks ?? []).map(p => [p.as ?? p.lock.name, p.lock]))
  return {
    rooms: main.map(p => (lockRegion(p.cell) ? { region: lockRegion(p.cell) } : {})),
    ...(Object.keys(via).length > 0 ? { via } : {}),
    sections: sectionsOf(config.sideSections, "s", MAIN_SECTION_ADDRESS, main),
    ...(Object.keys(locks).length > 0 ? { locks } : {}),
  }
}

/** The wizard journeys of the baked world, read as a web reads them, with their carved floors. */
export const bakedWebWorld = (): { world: WebWorld; grids: Record<string, FloorGrid[][]> } => {
  const journeys: Record<number, WebWorld["journeys"][number]> = {}
  const grids: Record<string, FloorGrid[][]> = {}
  for (const [journeyId, sites] of Object.entries(generatedWorldConfigs)) {
    const m = /^wizard_(\d+)$/.exec(journeyId)
    if (!m) continue
    grids[journeyId] = sites.map((site, p) => site.map((config, f) => carve(journeyId, p + 1, f, config)))
    journeys[Number(m[1])] = sites.map((site, p) => ({
      floors: site.map((config, f) =>
        floorOf(grids[journeyId][p][f], config, `${journeyId} pyramid ${p + 1} floor ${f}`)
      ),
    }))
  }
  return { world: { journeys }, grids }
}
