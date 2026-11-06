import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { boardIndexesForFloor } from "./boardIndexes"
import { cellAddress, cellSlot, isPlaceAddress, walkPosition } from "./cellIdentity"
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
      floorRef: { journeyId: journey.id, levelIndex: levelNr - 1, floorIndex },
      resolveBoardIndex: boardIndexesForFloor(journey.id, levelNr - 1, floorIndex),
    }
  )
  if (!result.success) throw new Error("assembly failed")
  return result.grid
}

/** A room on the floor: where it stands and what it is called. */
const someRoom = (grid: ReturnType<typeof floorOf>, floor = 0, nth = 0) => {
  const found = grid.cells.flatMap((row, r) =>
    row.flatMap((_cell, c) => (cellSlot(grid, r, c) ? [[r, c] as [number, number]] : []))
  )[nth]
  const [r, c] = found
  return {
    row: r,
    col: c,
    slot: cellSlot(grid, r, c)!,
    address: cellAddress(grid, floor, r, c)!,
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

  it("gives corridors, forks and chambers no slot, because the carve is all they are", () => {
    const unslotted = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type !== "empty" && !cellSlot(grid, r, c) ? [cell] : []))
    )

    expect(unslotted.length).toBeGreaterThan(50)
    expect(
      unslotted.every(
        cell => cell.type === "corridor" || (cell.type === "room" && ["fork", "chamber"].includes(cell.roomType))
      )
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

describe("isPlaceAddress: whether an address names a place or a bend", () => {
  const grid = floorOf(3, 0)

  it("is true for a room's address", () => {
    const room = someRoom(grid)
    expect(isPlaceAddress(room.address)).toBe(true)
  })

  it("is false for a bare junction's carve-bound address", () => {
    expect(isPlaceAddress("main#0/~4")).toBe(false)
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

describe("the authoring address is the identity, not the structural hash", () => {
  // A wing floor, which no lock stands on: a laid lock's own sections are addressed by the lock, not by a side path.
  const grid = floorOf(3, 1)

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
    const authored = journey.siteConfigs![2][1]
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
          floorAssemblySeed(persistentInteriorSeed(journey.id), 3, 1),
          resolveEncounter,
          {
            resolveKeyRequirements,
            floorRef: { journeyId: journey.id, floorIndex: 1 },
            resolveBoardIndex: boardIndexesForFloor(journey.id, 2, 1),
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

    // Every hash moved, so a save keyed by the hash would lose the run.
    expect([...hashesBefore].some(h => hashesAfter.has(h))).toBe(false)
    // Not one address did.
    expect([...addressesBefore].sort()).toEqual([...addressesAfter].sort())
  })
})
