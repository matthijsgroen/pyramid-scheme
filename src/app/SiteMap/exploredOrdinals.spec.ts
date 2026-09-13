import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { boardIndexesForFloor } from "./boardIndexes"
import { cellOrdinalKey, migrateExploredToOrdinals, ordinalsForFloor } from "./exploredOrdinals"
import "@/mods/registerModApps"

const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

/** A different but perfectly legal sort. The assembler shuffles with `sort(() => rand() - 0.5)`, so
 * this is what a carve looks like on another engine — which is the move the ordinal has to survive. */
const mergeSort = function <T>(this: T[], compare?: (a: T, b: T) => number): T[] {
  const cmp = compare ?? ((a: T, b: T) => (String(a) < String(b) ? -1 : 1))
  const sorted = (items: T[]): T[] => {
    if (items.length < 2) return items
    const mid = items.length >> 1
    const left = sorted(items.slice(0, mid))
    const right = sorted(items.slice(mid))
    const out: T[] = []
    let i = 0
    let j = 0
    while (i < left.length && j < right.length) out.push(cmp(left[i], right[j]) <= 0 ? left[i++] : right[j++])
    return out.concat(left.slice(i), right.slice(j))
  }
  const r = sorted([...this])
  for (let i = 0; i < r.length; i++) this[i] = r[i]
  return this
}

const underAnotherCarve = <T>(run: () => T): T => {
  const original = Array.prototype.sort
  Array.prototype.sort = mergeSort as typeof Array.prototype.sort
  try {
    return run()
  } finally {
    Array.prototype.sort = original
  }
}

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

describe("remembering a cell by its ordinal", () => {
  it("gives every drawn cell a key", () => {
    const grid = floorOf(3, 0)
    const drawn = grid.cells.flat().filter(cell => cell.type !== "empty")
    const keyed = drawn.filter(cell => cellOrdinalKey(cell) !== null)

    expect(drawn.length).toBeGreaterThan(100)
    expect(keyed.length).toBe(drawn.length)
  })

  /**
   * THE INVARIANT THE MIGRATION RESTS ON. A save written before a re-carve is translated to ordinals
   * while the OLD carve is still there to read; the new build then restores those ordinals against a
   * floor that has moved. If a key named a different cell on the other side of the move, the restore
   * would mark rooms explored that were never opened — which is the bug this replaces.
   */
  it("names the same cell after the floor is carved somewhere else", () => {
    const before = floorOf(3, 0)
    const after = underAnotherCarve(() => floorOf(3, 0))

    const describeCells = (grid: typeof before) => {
      const map = new Map<string, string>()
      grid.cells.forEach(row =>
        row.forEach(cell => {
          const key = cellOrdinalKey(cell)
          if (!key || cell.type === "empty") return
          map.set(`${cell.sectionHash}#${key}`, cell.type === "room" ? `room:${cell.roomType}` : "corridor")
        })
      )
      return map
    }

    const a = describeCells(before)
    const b = describeCells(after)
    const shared = [...a.keys()].filter(key => b.has(key))

    // The floor really did move — otherwise this proves nothing.
    const movedCoordinates = before.cells.flat().filter((cell, i) => cell.type !== after.cells.flat()[i].type)
    expect(movedCoordinates.length).toBeGreaterThan(0)
    expect(shared.length).toBeGreaterThan(100)
    // And every key that survives the move still describes the cell it described before it.
    expect(shared.filter(key => a.get(key) !== b.get(key))).toEqual([])
  })

  it("migrates a whole save, assembling only the floors it actually covers", () => {
    const asked: string[] = []
    const grid = floorOf(3, 0)
    const [r, c] = grid.entrancePos
    const entrance = grid.cells[r][c]
    const hash = entrance.type === "empty" ? "" : (entrance.sectionHash ?? "")

    const migrated = migrateExploredToOrdinals({ [`3:${hash}`]: [`0:${r},${c}`] }, (levelNr, floor) => {
      asked.push(`${levelNr}:${floor}`)
      return levelNr === 3 && floor === 0 ? grid : null
    })

    expect(asked).toEqual(["3:0"])
    expect(migrated[`3:${hash}`]).toEqual([cellOrdinalKey(entrance)])
  })

  it("keeps the level in the key, so two levels of one journey do not bleed into each other", () => {
    const grid = floorOf(3, 0)
    const [r, c] = grid.entrancePos
    const entrance = grid.cells[r][c]
    const hash = entrance.type === "empty" ? "" : (entrance.sectionHash ?? "")

    const migrated = migrateExploredToOrdinals(
      { [`3:${hash}`]: [`0:${r},${c}`], [`4:${hash}`]: [`0:${r},${c}`] },
      (levelNr, floor) => (floor === 0 && levelNr === 3 ? grid : null)
    )

    expect(Object.keys(migrated)).toEqual([`3:${hash}`])
  })

  it("translates a stored floor, and drops coordinates whose section has been restructured", () => {
    const grid = floorOf(3, 0)
    const [r, c] = grid.entrancePos
    const entrance = grid.cells[r][c]
    const hash = entrance.type === "empty" ? "" : (entrance.sectionHash ?? "")

    const translated = ordinalsForFloor(grid, 0, { [hash]: [`0:${r},${c}`], "gone-section": [`0:${r},${c}`] })

    expect(translated[hash]).toEqual([cellOrdinalKey(entrance)])
    expect(translated["gone-section"]).toBeUndefined()
  })
})
