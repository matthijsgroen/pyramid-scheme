import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { boardIndexesForFloor } from "./boardIndexes"
import {
  cellAddress,
  cellSlot,
  migrateExploredToCells,
  migrateJourneyToCarveIndependent,
  cellKeysForFloor,
  walkPosition,
} from "./cellIdentity"
import "@/mods/registerModApps"

const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

const floorOf = (levelNr: number, floorIndex: number) => {
  const journey = journeys.find(j => j.id === "expert_1")!
  const config = journey.siteConfigs![levelNr - 1][floorIndex]
  const result = assembleFloor(
    journey.id,
    config,
    floorAssemblySeed(persistentInteriorSeed(journey.id), levelNr, floorIndex),
    resolveEncounter,
    {
      resolveKeyRequirements,
      floorRef: { journeyId: journey.id, floorIndex },
      resolveBoardIndex: boardIndexesForFloor(journey.id, levelNr - 1, floorIndex),
    }
  )
  if (!result.success) throw new Error("assembly failed")
  return result.grid
}

/** A room on the floor, with everything needed to talk about it both ways. */
const someRoom = (grid: ReturnType<typeof floorOf>, floor = 0, nth = 0) => {
  const found = grid.cells.flatMap((row, r) =>
    row.flatMap((_cell, c) => (cellSlot(grid, r, c) ? [[r, c] as [number, number]] : []))
  )[nth]
  const [r, c] = found
  const cell = grid.cells[r][c]
  return {
    row: r,
    col: c,
    slot: cellSlot(grid, r, c)!,
    address: cellAddress(grid, floor, r, c)!,
    // What the save files it under, and what the coordinate archive it is translated FROM was keyed by.
    section: cell.type === "empty" ? "" : (cell.sectionAddress ?? ""),
    sectionHash: cell.type === "empty" ? "" : (cell.sectionHash ?? ""),
  }
}

describe("naming a cell", () => {
  const grid = floorOf(3, 0)

  it("gives every room a slot and every drawn cell an address", () => {
    const drawn = grid.cells.flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "empty" ? [] : [[r, c]])))
    const addressed = drawn.filter(([r, c]) => cellAddress(grid, 0, r, c) !== null)

    expect(drawn.length).toBeGreaterThan(100)
    expect(addressed.length).toBe(drawn.length)
  })

  it("gives corridors and forks no slot, because the carve is all they are", () => {
    const unslotted = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type !== "empty" && !cellSlot(grid, r, c) ? [cell] : []))
    )

    expect(unslotted.length).toBeGreaterThan(50)
    expect(
      unslotted.every(cell => cell.type === "corridor" || (cell.type === "room" && cell.roomType === "fork"))
    ).toBe(true)
  })

  // Built by hand: no authored floor carries a switch yet, and the point is the rule, not the world.
  const junction = (family?: string): FloorGrid => ({
    cells: [
      [
        {
          type: "room",
          roomType: "fork",
          dirs: new Set<Direction>(["n", "s"]),
          state: "fogged",
          sectionAddress: "main",
          ordinal: "4",
          ...(family ? { family } : {}),
        },
      ],
    ],
    rows: 1,
    cols: 1,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    siteId: "hand-built",
    staircases: {},
  })

  it("leaves a bare junction to the carve-bound key, since the carve is all it is", () => {
    expect(cellSlot(junction(), 0, 0)).toBeNull()
    expect(cellAddress(junction(), 0, 0, 0)).toBe("main#0/~4")
  })

  // A switch's puzzle is authored onto the floor, so its progress has to outlive the junction landing
  // on another cell — which a `~ordinal` deliberately does not.
  it("names a junction that carries an encounter by what fills it", () => {
    expect(cellSlot(junction("sumplete"), 0, 0)).toBe("xsumplete")
  })

  it("puts the floor in the address, so two floors of one section never answer to each other", () => {
    const { row, col } = someRoom(grid)
    expect(cellAddress(grid, 0, row, col)).not.toBe(cellAddress(grid, 1, row, col))
  })
})

describe("how far along the walk a cell sits", () => {
  it("reads a node's own step", () => {
    expect(walkPosition("7")).toBe(7)
  })

  // A connector is named by the pair it joins, sorted as TEXT, so "10|9" is the pair 9 and 10 — the
  // order of the two says nothing and the larger is not the second.
  it("puts a connector just short of the far end of the pair, whichever way round it is written", () => {
    expect(walkPosition("3|4")).toBe(3.5)
    expect(walkPosition("10|9")).toBe(9.5)
  })

  it("reveals a connector only once the step past it is reached", () => {
    expect(walkPosition("3|4") <= 3).toBe(false)
    expect(walkPosition("3|4") <= 4).toBe(true)
  })
})

describe("translating a save written in coordinates", () => {
  it("keeps the room by its slot and the corridor by its carve-bound key", () => {
    const grid = floorOf(3, 0)
    const room = someRoom(grid)
    const corridor = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "corridor" ? [{ r, c, hash: cell.sectionHash ?? "" }] : []))
    )[0]

    const translated = cellKeysForFloor(grid, 0, {
      ...(corridor.hash === room.sectionHash ? {} : { [corridor.hash]: [`0:${corridor.r},${corridor.c}`] }),
      [room.sectionHash]: [`0:${room.row},${room.col}`, `0:${corridor.r},${corridor.c}`],
    })

    // Both came across: the room under its authored slot, the corridor under `~ordinal`, which holds
    // until the floor is re-carved and the high-water mark takes over. Matched by the archive's hash,
    // filed under the authoring address.
    expect(translated[room.section]).toContain(`0/${room.slot}`)
    expect(
      Object.values(translated)
        .flat()
        .filter(key => key.includes("/~"))
    ).toHaveLength(1)
  })

  it("drops a coordinate whose section has been restructured since", () => {
    const grid = floorOf(3, 0)
    const room = someRoom(grid)

    const translated = cellKeysForFloor(grid, 0, { "gone-section": [`0:${room.row},${room.col}`] })

    expect(translated["gone-section"]).toBeUndefined()
  })

  it("assembles only the floors the save actually covers", () => {
    const asked: string[] = []
    const grid = floorOf(3, 0)
    const room = someRoom(grid)

    const migrated = migrateExploredToCells({ [`3:${room.sectionHash}`]: [`0:${room.row},${room.col}`] }, (l, f) => {
      asked.push(`${l}:${f}`)
      return l === 3 && f === 0 ? grid : null
    })

    expect(asked).toEqual(["3:0"])
    expect(migrated[`3:${room.section}`]).toEqual([`0/${room.slot}`])
  })

  it("keeps the level in the key, so two levels of one journey do not bleed into each other", () => {
    const grid = floorOf(3, 0)
    const room = someRoom(grid)
    const stored = `0:${room.row},${room.col}`

    const migrated = migrateExploredToCells(
      { [`3:${room.sectionHash}`]: [stored], [`4:${room.sectionHash}`]: [stored] },
      (l, f) => (f === 0 && l === 3 ? grid : null)
    )

    expect(Object.keys(migrated)).toEqual([`3:${room.section}`])
  })

  it("re-keys a save written before the coordinate archive existed, instead of crashing the launch", () => {
    // Every save with an old cellKeyVersion comes through here, including ones from before
    // exploredSections was written at all. Nothing to translate is not the same as nothing to do.
    const migrated = migrateJourneyToCarveIndependent({ levelNr: 1 }, () => null)

    expect(migrated.exploredCells).toEqual({})
    expect(migrated.positionKey).toBeNull()
    expect(migrated.disabledTraps).toEqual([])
  })

  it("re-keys a whole save — position, traps, stock and consumables along with the rooms", () => {
    const grid = floorOf(3, 0)
    const room = someRoom(grid)
    const other = someRoom(grid, 0, 1)
    const at = (cell: { row: number; col: number }) => `0:${cell.row},${cell.col}`

    const migrated = migrateJourneyToCarveIndependent(
      {
        levelNr: 3,
        exploredSections: { [`3:${room.sectionHash}`]: [at(room)] },
        position: at(other),
        disabledTraps: [at(room)],
        skippedConsumables: [at(other)],
        purchasedStock: [`${at(room)}#2`],
      },
      (l, f) => (l === 3 && f === 0 ? grid : null)
    )

    expect(migrated.exploredCells).toEqual({ [`3:${room.section}`]: [`0/${room.slot}`] })
    expect(migrated.positionKey).toBe(other.address)
    // The level goes on here, where exploration carries it in its own key.
    expect(migrated.disabledTraps).toEqual([`3:${room.address}`])
    expect(migrated.skippedConsumables).toEqual([`3:${other.address}`])
    expect(migrated.purchasedStock).toEqual([`3:${room.address}!2`])
  })

  it("translates nothing it cannot assemble, rather than guessing", () => {
    const grid = floorOf(3, 0)
    const room = someRoom(grid)

    const migrated = migrateJourneyToCarveIndependent(
      {
        levelNr: 3,
        exploredSections: { [`3:${room.sectionHash}`]: [`0:${room.row},${room.col}`] },
        position: `0:${room.row},${room.col}`,
        disabledTraps: [`0:${room.row},${room.col}`],
      },
      () => null
    )

    expect(migrated.exploredCells).toEqual({})
    expect(migrated.positionKey).toBeNull()
    expect(migrated.disabledTraps).toEqual([])
  })
})

describe("the authoring address is the identity, not the structural hash", () => {
  const grid = floorOf(3, 0)

  it("names sections the way the author steers them", () => {
    const addresses = new Set(
      grid.cells.flatMap(row => row.flatMap(cell => (cell.type === "empty" ? [] : [cell.sectionAddress])))
    )

    expect(addresses.has("main")).toBe(true)
    // The same vocabulary boardIndex.ts deals boards by: `s0` is the first sidepath of the main path.
    expect([...addresses].every(a => a === "main" || /^s\d+(\.\d+)?$/.test(a ?? ""))).toBe(true)
  })

  /**
   * The reason for the whole change. `packing` and `corridorStraightness` are in the structural hash,
   * and they are exactly the knobs corridor compaction turns — so every hash in the world would move
   * and every run would reset, at the one moment the slots were meant to carry it.
   */
  it("does not move when the floor's carve knobs are retuned, though the hash does", () => {
    const journey = journeys.find(j => j.id === "expert_1")!
    const authored = journey.siteConfigs![2][0]
    // Whatever a compaction pass settles on, it moves these two. Take the first retune that carves.
    const retuned = [0.9, 0.7, 0.5, 0.3, 0.1]
      .flatMap(packing => [0.9, 0.5, 0.1].map(corridorStraightness => ({ packing, corridorStraightness })))
      .filter(
        knobs => knobs.packing !== authored.packing || knobs.corridorStraightness !== authored.corridorStraightness
      )
      .map(knobs =>
        assembleFloor(
          journey.id,
          { ...authored, ...knobs },
          floorAssemblySeed(persistentInteriorSeed(journey.id), 3, 0),
          resolveEncounter,
          {
            resolveKeyRequirements,
            floorRef: { journeyId: journey.id, floorIndex: 0 },
            resolveBoardIndex: boardIndexesForFloor(journey.id, 2, 0),
          }
        )
      )
      .find(r => r.success)
    if (!retuned?.success) throw new Error("no retune of the carve knobs assembles")
    const result = retuned

    const sections = (g: typeof grid, pick: (cell: { sectionAddress?: string; sectionHash?: string }) => string) =>
      new Set(g.cells.flatMap(row => row.flatMap(cell => (cell.type === "empty" ? [] : [pick(cell)]))))

    const addressesBefore = sections(grid, c => c.sectionAddress ?? "")
    const addressesAfter = sections(result.grid, c => c.sectionAddress ?? "")
    const hashesBefore = sections(grid, c => c.sectionHash ?? "")
    const hashesAfter = sections(result.grid, c => c.sectionHash ?? "")

    // Every hash moved — which is what used to throw the run away.
    expect([...hashesBefore].some(h => hashesAfter.has(h))).toBe(false)
    // Not one address did.
    expect([...addressesBefore].sort()).toEqual([...addressesAfter].sort())
  })

  // The archive is keyed by the hash the save was written under — including the pre-0.39 one — and the
  // re-keying is the only thing that has to understand both. This is what the old-hash fallback in
  // useAssembledFloor used to do at read time, moved to the one place that reads the archive.
  it("re-keys a save filed under a superseded hash onto the section's address", () => {
    const withMovedHash = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type !== "empty" &&
        cell.legacySectionHash &&
        cell.legacySectionHash !== cell.sectionHash &&
        cellSlot(grid, r, c)
          ? [{ r, c, legacy: cell.legacySectionHash, address: cell.sectionAddress!, slot: cellSlot(grid, r, c)! }]
          : []
      )
    )[0]
    expect(withMovedHash, "no room whose hash actually moved").toBeTruthy()

    const migrated = migrateExploredToCells(
      { [`3:${withMovedHash.legacy}`]: [`0:${withMovedHash.r},${withMovedHash.c}`] },
      (l, f) => (l === 3 && f === 0 ? grid : null)
    )

    expect(migrated[`3:${withMovedHash.address}`]).toEqual([`0/${withMovedHash.slot}`])
  })
})
