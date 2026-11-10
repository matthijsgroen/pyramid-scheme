import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorGrid } from "@/game/siteTypes"
import { boardIndexesForFloor } from "./boardIndexes"
import { cellAddress, cellSlot } from "./cellIdentity"
import "@/mods/registerModApps"

const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

const gridFor = (journeyId: string, levelNr: number, floorIndex: number): FloorGrid => {
  const journey = journeys.find(j => j.id === journeyId)!
  const site = journey.siteConfigs![levelNr - 1] ?? journey.siteConfigs![0]
  const floor = site[floorIndex]
  const seed = floor.seed ?? floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const result = assembleFloor(journeyId, { ...floor, seed }, seed, resolveEncounter, {
    resolveKeyRequirements,
    floorRef: { journeyId, floorIndex },
    resolveBoardIndex: boardIndexesForFloor(journeyId, levelNr - 1, floorIndex),
  })
  if (!result.success) throw new Error(`${journeyId} L${levelNr} F${floorIndex} did not assemble`)
  return result.grid
}

const positions = (grid: FloorGrid) => grid.cells.flatMap((row, r) => row.map((_cell, c) => [r, c] as [number, number]))

const sectionOf = (grid: FloorGrid, [r, c]: [number, number]) => {
  const cell = grid.cells[r][c]
  return cell.type === "empty" ? "" : (cell.sectionAddress ?? "")
}

// A lock region may be corridors, one room or several rooms: what it holds is the lock's, not the room list's.
const isLockRegion = (section: string): boolean => section.startsWith("lock:")

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

describe("the room slot, across the whole authored world", () => {
  it("names every room exactly once per floor; every authored section holds one, a lock region may hold none", () => {
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
      for (const section of sections)
        if (!withRoom.has(section) && !isLockRegion(section)) roomless.push(`${journeyId} L${levelNr} ${section}`)
    }

    expect(slots).toBeGreaterThan(3500)
    expect(collisions).toEqual([])
    expect(roomless).toEqual([])
  })
})
