import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorGrid } from "@/game/siteTypes"
import { boardIndexesForFloor } from "./boardIndexes"
import { cellAddress, cellSlot, findByAddress, floorOfAddress } from "./cellIdentity"
import "@/mods/registerModApps"

const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

const gridFor = (journeyId: string, levelNr: number, floorIndex: number, seedOffset = 0): FloorGrid => {
  const journey = journeys.find(j => j.id === journeyId)!
  const site = journey.siteConfigs![levelNr - 1] ?? journey.siteConfigs![0]
  const result = assembleFloor(
    journeyId,
    site[floorIndex],
    floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex) + seedOffset,
    resolveEncounter,
    {
      resolveKeyRequirements,
      floorRef: { journeyId, floorIndex },
      resolveBoardIndex: boardIndexesForFloor(journeyId, levelNr - 1, floorIndex),
    }
  )
  if (!result.success) throw new Error(`${journeyId} L${levelNr} F${floorIndex} did not assemble`)
  return result.grid
}

const positions = (grid: FloorGrid) => grid.cells.flatMap((row, r) => row.map((_cell, c) => [r, c] as [number, number]))

const sectionOf = (grid: FloorGrid, [r, c]: [number, number]) => {
  const cell = grid.cells[r][c]
  return cell.type === "empty" ? "" : (cell.sectionAddress ?? "")
}

const JOURNEY = "expert_1"
const LEVEL = 3

describe("a save survives the floor being carved somewhere else", () => {
  const before = gridFor(JOURNEY, LEVEL, 0)
  // A seed one step along: the corridors land elsewhere AND the walk comes out a different length,
  // which is the move compaction will make on all 74 floors. Nothing authored changes.
  const after = gridFor(JOURNEY, LEVEL, 0, 1)

  it("really did re-carve, and re-LENGTH — otherwise nothing below proves anything", () => {
    const drawn = (grid: FloorGrid) => grid.cells.flat().filter(cell => cell.type !== "empty").length
    expect(drawn(before)).not.toBe(drawn(after))

    const moved = positions(before).filter(([r, c]) => after.cells[r]?.[c]?.type !== before.cells[r][c].type)
    expect(moved.length).toBeGreaterThan(50)
  })

  /**
   * Exploration, and with it looting and puzzle completion: a solved room is remembered by nothing but
   * its explored entry (`applyExplored`), so a room that comes back unnamed hands its chest out twice
   * and a room named by mistake swallows one.
   */
  it("brings every room back as the same room, wherever the carve put it", () => {
    const slots = positions(before).filter(at => cellSlot(before, at[0], at[1]))
    expect(slots.length).toBeGreaterThan(20)

    for (const [r, c] of slots) {
      const address = cellAddress(before, 0, r, c)!
      const at = findByAddress(after, 0, address)
      expect(at, `nothing answers to ${address} after the re-carve`).not.toBeNull()

      const was = before.cells[r][c]
      const now = after.cells[at![0]][at![1]]
      expect(now.type).toBe(was.type)
      // The same room: same family, same board, same reward — drawn somewhere else entirely.
      if (now.type === "room" && was.type === "room") {
        expect(now.family).toBe(was.family)
        expect(now.boardIndex).toBe(was.boardIndex)
        expect(now.reward).toEqual(was.reward)
      }
    }

    // And they really did move, or the addresses were never tested.
    const stayedPut = slots.filter(([r, c]) => {
      const at = findByAddress(after, 0, cellAddress(before, 0, r, c)!)
      return at?.[0] === r && at?.[1] === c
    })
    expect(stayedPut.length).toBeLessThan(slots.length)
  })

  // Disarmed traps, bought stock and skipped consumables all store one address each, level-prefixed by
  // useJourneys. One round trip covers all three, because what they store is the same string.
  it("finds a disarmed trap, a bought shop slot and a skipped consumable where they now stand", () => {
    const [r, c] = positions(before).find(at => {
      const cell = before.cells[at[0]][at[1]]
      return cell.type === "room" && cell.roomType === "encounter"
    })!
    const address = cellAddress(before, 0, r, c)!

    const disabledTraps = new Set([`${LEVEL}:${address}`])
    const purchasedStock = new Set([`${LEVEL}:${address}!2`])
    const skippedConsumables = new Set([`${LEVEL}:${address}`])

    const at = findByAddress(after, 0, address)!
    const reKeyed = cellAddress(after, 0, at[0], at[1])!

    expect(disabledTraps.has(`${LEVEL}:${reKeyed}`)).toBe(true)
    expect(purchasedStock.has(`${LEVEL}:${reKeyed}!2`)).toBe(true)
    expect(skippedConsumables.has(`${LEVEL}:${reKeyed}`)).toBe(true)
  })

  it("puts the player back on a real cell, on the floor the address names", () => {
    const [r, c] = positions(before).filter(at => cellSlot(before, at[0], at[1]))[3]
    const positionKey = cellAddress(before, 0, r, c)!

    expect(floorOfAddress(positionKey)).toBe(0)
    const at = findByAddress(after, 0, positionKey)
    expect(at).not.toBeNull()
    expect(after.cells[at![0]][at![1]].type).not.toBe("empty")
    // Restoring the coordinate instead would have been the bug: it no longer holds this room.
    expect(cellAddress(after, 0, r, c)).not.toBe(positionKey)
  })

  /**
   * A corridor has no authored identity — how many corridor cells there are IS the carve — so its
   * address is deliberately carve-bound and resolves to nothing afterwards. The fog over it comes back
   * from the high-water mark instead; what must never happen is it resolving to some OTHER cell.
   */
  it("resolves a corridor's address to nothing rather than to the wrong cell", () => {
    const corridors = positions(before).filter(([r, c]) => before.cells[r][c].type === "corridor")
    const stale = corridors.map(([r, c]) => cellAddress(before, 0, r, c)!).filter(address => address.includes("/~"))
    expect(stale.length).toBeGreaterThan(50)

    for (const address of stale) {
      const at = findByAddress(after, 0, address)
      if (!at) continue
      // If something does still answer to it, it is another cell with no authored identity — a
      // corridor or a fork — in the same section. Never a room: a room is named by its slot, so no
      // room can ever wear a `~ordinal` address, and no stale corridor can be mistaken for one.
      expect(cellSlot(after, at[0], at[1])).toBeNull()
      expect(sectionOf(after, at)).toBe(address.split("#")[0])
    }
  })

  it("never lets two cells of one floor answer to the same address", () => {
    const seen = new Map<string, number>()
    for (const [r, c] of positions(before)) {
      const address = cellSlot(before, r, c) && cellAddress(before, 0, r, c)
      if (!address) continue
      seen.set(address, (seen.get(address) ?? 0) + 1)
    }
    expect([...seen].filter(([, n]) => n > 1)).toEqual([])
  })

  /**
   * A section hash carries no floor, and floors authored to the same shape hash identically — every
   * floor of every tomb does. Without the floor in the address, walking a tomb's ground floor would
   * loot the floors above it.
   */
  it("keeps two floors that share a section hash apart", () => {
    const tomb = "starter_treasure_tomb"
    const ground = gridFor(tomb, 1, 0)
    const upstairs = gridFor(tomb, 1, 1)

    const [r, c] = positions(ground).find(at => cellSlot(ground, at[0], at[1]))!
    const shared = sectionOf(ground, [r, c])
    // The premise: the two floors really do share this hash.
    expect(positions(upstairs).some(at => sectionOf(upstairs, at) === shared)).toBe(true)

    const address = cellAddress(ground, 0, r, c)!
    expect(positions(upstairs).every(at => cellAddress(upstairs, 1, at[0], at[1]) !== address)).toBe(true)
  })
})

describe("the room slot, across the whole authored world", () => {
  const everyFloor = () =>
    journeys.flatMap(journey =>
      journey.siteConfigs?.length
        ? Array.from({ length: journey.levelCount }, (_x, i) => i + 1).flatMap(levelNr =>
            (journey.siteConfigs![levelNr - 1] ?? journey.siteConfigs![0]).map((_config, floorIndex) => ({
              journeyId: journey.id,
              levelNr,
              floorIndex,
            }))
          )
        : []
    )

  it("names every room exactly once per floor, and every section holds at least one", () => {
    let slots = 0
    const collisions: string[] = []
    const roomless: string[] = []

    for (const { journeyId, levelNr, floorIndex } of everyFloor()) {
      const grid = gridFor(journeyId, levelNr, floorIndex)
      const seen = new Map<string, number>()
      const sections = new Set<string>()
      const withRoom = new Set<string>()
      for (const [r, c] of positions(grid)) {
        if (grid.cells[r][c].type === "empty") continue
        sections.add(sectionOf(grid, [r, c]))
        if (!cellSlot(grid, r, c)) continue
        slots++
        withRoom.add(sectionOf(grid, [r, c]))
        const address = cellAddress(grid, floorIndex, r, c)!
        seen.set(address, (seen.get(address) ?? 0) + 1)
      }
      for (const [address, n] of seen) if (n > 1) collisions.push(`${journeyId} L${levelNr} ${address} x${n}`)
      // A section with no room has nothing to hang a high-water mark on, so its corridors could never
      // come back after a re-carve.
      for (const section of sections) if (!withRoom.has(section)) roomless.push(`${journeyId} L${levelNr} ${section}`)
    }

    expect(slots).toBeGreaterThan(3500)
    expect(collisions).toEqual([])
    expect(roomless).toEqual([])
  }, 120_000)
})
