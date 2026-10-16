import { describe, expect, it } from "vitest"
import { cellAddress } from "./cellAddress"
import { withGateFaces } from "./gateFace"
import { compileLock } from "./lockCompile"
import type { SequenceRead } from "./sequenceReads"
import { parseLock } from "./lockNotation"
import { MARK_GLYPHS } from "./mark"
import { PROCESSION_REALISATION } from "./mechanics/sequence"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid, RoomCell } from "./siteTypes"
import { dirsOf, gateKeysOwned, mechanicsLeft, resolveEncounterWithout, TOPOLOGY_ON } from "./testSupport/modOff"
import { lockFloor, PROCESSION_LOCK } from "./testSupport/processionFixtures"

const SEEDS = Array.from({ length: 40 }, (_, n) => n)
const PUZZLE_OFF = resolveEncounterWithout("puzzle")
const WATER_MARK = MARK_GLYPHS[5]

const rooms = (grid: FloorGrid): RoomCell[] => grid.cells.flat().flatMap(cell => (cell.type === "room" ? [cell] : []))
const tiles = (grid: FloorGrid) => rooms(grid).flatMap(cell => (cell.sequenceTile ? [cell.sequenceTile] : []))
const marks = (grid: FloorGrid) =>
  rooms(grid).flatMap(cell => [
    ...(cell.mark ? [cell.mark.glyph] : []),
    ...(cell.exits ?? []).flatMap(exit => (exit.mark ? [exit.mark.glyph] : [])),
  ])

/** A lock of `steps` steps, one annex each off the hall. */
const steps = (count: number, name = "P", door = "hall -[P]- out") => {
  const annexes = Array.from({ length: count }, (_, n) => `a${n}`)
  return [
    "in -- hall",
    ...annexes.map(annex => `hall -- ${annex}`),
    door,
    `${name} procession ${annexes.join(" ")} reset hall-out`,
    ...["in", "hall", "out", ...annexes].map(region => `${region} ?`),
  ].join("\n")
}

const carved = (floor: ReturnType<typeof lockFloor>, resolve = TOPOLOGY_ON.resolveEncounter) =>
  SEEDS.map(seed => ({ seed, result: assembleFloor("test", floor, seed, resolve) }))

describe("a sequence written procession", () => {
  it("binds the procession door itself, with no floor binding", () => {
    const compiled = compileLock(parseLock(PROCESSION_LOCK, "door").lock, {})
    expect(compiled.ok && compiled.fragment.controls).toEqual([
      expect.objectContaining({ id: "P", control: "sequence", encounter: PROCESSION_REALISATION, procession: true }),
    ])
  })

  it("is refused by a binding that names another realisation for it, and a plain sequence by one naming it", () => {
    expect(compileLock(parseLock(PROCESSION_LOCK, "door").lock, { procession: "pressure-plate" })).toEqual({
      ok: false,
      faults: [{ type: "processionRebound", kind: "procession", realisation: "pressure-plate", mechanics: ["P"] }],
    })
    const plain = PROCESSION_LOCK.replace("procession", "sequence")
    expect(compileLock(parseLock(plain, "door").lock, { sequence: PROCESSION_REALISATION })).toEqual({
      ok: false,
      faults: [{ type: "processionRebound", kind: "sequence", realisation: PROCESSION_REALISATION, mechanics: ["P"] }],
    })
    expect(compileLock(parseLock(PROCESSION_LOCK, "door").lock, { procession: PROCESSION_REALISATION }).ok).toBe(true)
  })

  it("stands tiles wearing distinct cast glyphs, none of them or the water mark among the floor's marks", () => {
    const cast = new Set(TOPOLOGY_ON.resolveEncounter(PROCESSION_REALISATION, "").sequence?.glyphs)
    expect(cast.size).toBe(6)
    const on = carved(lockFloor(PROCESSION_LOCK)).find(({ result }) => result.success)
    expect(on?.result.success).toBe(true)
    if (!on?.result.success) return
    const worn = [...new Map(tiles(on.result.grid).map(tile => [tile.step, tile.glyph])).values()]
    expect(worn).toHaveLength(3)
    expect(new Set(worn).size).toBe(3)
    expect(worn.every(glyph => cast.has(glyph))).toBe(true)
    expect(marks(on.result.grid).length).toBeGreaterThan(0)
    expect(marks(on.result.grid).filter(glyph => cast.has(glyph) || glyph === WATER_MARK)).toEqual([])
    const record = rooms(on.result.grid).find(cell => cell.mechanismId === "door.P")?.mechanism
    expect(record).toEqual(expect.objectContaining({ hidesOrder: true, orderReader: PROCESSION_REALISATION }))
    const door = rooms(on.result.grid).find(cell => cell.worksMechanism?.mechanismId === "door.P" && !cell.sequenceTile)
    expect(door?.boardIndex).toEqual(expect.any(Number))
  })

  it("leaves a pressure-plate sequence's record showing its order, its tiles wearing mark glyphs", () => {
    const plain = lockFloor(PROCESSION_LOCK.replace("procession", "sequence"), {
      realisations: { sequence: "pressure-plate" },
    })
    const on = carved(plain).find(({ result }) => result.success)
    if (!on?.result.success) throw new Error("no carve")
    const record = rooms(on.result.grid).find(cell => cell.mechanismId === "door.P")?.mechanism
    expect(record).toBeDefined()
    expect(record).not.toHaveProperty("hidesOrder")
    expect(record).not.toHaveProperty("orderReader")
    expect(tiles(on.result.grid).every(tile => MARK_GLYPHS.includes(tile.glyph))).toBe(true)
  })

  it("carves the walls the mod on carves with the puzzle mod off, its tiles ground and its door open", () => {
    let compared = 0
    const floor = lockFloor(PROCESSION_LOCK)
    for (const { seed, result: on } of carved(floor)) {
      if (!on.success) continue
      const off = assembleFloor("test", floor, seed, PUZZLE_OFF)
      expect(off.success, `seed ${seed}`).toBe(true)
      if (!off.success) continue
      expect(tiles(off.grid)).toEqual([])
      expect(dirsOf(off.grid)).toBe(dirsOf(on.grid))
      expect(mechanicsLeft(off.grid, gateKeysOwned(on.grid))).toEqual([])
      if (++compared >= 5) break
    }
    expect(compared).toBeGreaterThan(0)
  })

  it.each([2, 7])("is refused with %i steps, before a wall is carved", count => {
    const result = assembleFloor("test", lockFloor(steps(count)), 1, TOPOLOGY_ON.resolveEncounter)
    expect(result.success ? [] : result.reasons).toEqual([
      { type: "processionStepsOutOfRange", id: "door.P", steps: count },
    ])
  })

  it("is refused twice on one floor", () => {
    const two = lockFloor(steps(3), {
      locks: [...lockFloor(steps(3)).locks!, ...lockFloor(steps(3), {}, "other").locks!],
    })
    const result = assembleFloor("test", two, 1, TOPOLOGY_ON.resolveEncounter)
    expect(result.success ? [] : result.reasons).toEqual([expect.objectContaining({ type: "processionDoorsRepeated" })])
  })
})

describe("the face of a procession door", () => {
  const on = carved(lockFloor(PROCESSION_LOCK)).find(({ result }) => result.success)!.result
  if (!on.success) throw new Error("no carve")
  const grid = on.grid
  const homeAt = (g: FloorGrid) => {
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const cell = g.cells[r][c]
        if (cell.type === "room" && cell.mechanismId === "door.P" && cell.mechanism) return [r, c] as const
      }
    throw new Error("no home")
  }
  const [hr, hc] = homeAt(grid)
  const home = cellAddress(grid, 0, hr, hc)!
  const faceOf = (state: string, read?: SequenceRead) => {
    const faced = withGateFaces(
      grid,
      0,
      new Map([[home, state]]),
      new Set(),
      "gateFace",
      new Map(read ? [[home, read]] : [])
    )
    const door = rooms(faced).find(cell => cell.gateFace?.sequences?.length)!
    return { family: door.family, face: door.gateFace!.sequences![0] }
  }

  it("is drawn by the procession door, its tiles showing no order and each step's walked flag", () => {
    const { family, face } = faceOf("2", { walked: [0, 2] })
    expect(family).toBe(PROCESSION_REALISATION)
    expect(face.tiles.map(tile => tile.status)).toEqual(["unwalked", "unwalked", "unwalked"])
    expect(face.hidden).toEqual({ address: home, read: false, walked: [true, false, true] })
  })

  it("offers the reset only once the order is read", () => {
    expect(faceOf("2", { walked: [0, 1] }).face.reset).toBeUndefined()
    expect(faceOf("2", { walked: [0, 1, 2], read: true }).face.reset).toEqual({ address: home, state: "0" })
  })

  it("is faced by its board with the topology mod off, where no other door has a face", () => {
    const off = carved(lockFloor(PROCESSION_LOCK), resolveEncounterWithout("topology")).find(
      ({ result }) => result.success
    )!.result
    if (!off.success) throw new Error("no carve")
    expect(rooms(off.grid).find(cell => cell.gateFace)?.family).toBe(PROCESSION_REALISATION)
  })

  it("leaves a pressure-plate door's face showing its order", () => {
    const plain = carved(
      lockFloor(PROCESSION_LOCK.replace("procession", "sequence"), { realisations: { sequence: "pressure-plate" } })
    ).find(({ result }) => result.success)!.result
    if (!plain.success) throw new Error("no carve")
    const [r, c] = homeAt(plain.grid)
    const faced = withGateFaces(
      plain.grid,
      0,
      new Map([[cellAddress(plain.grid, 0, r, c)!, "2"]]),
      new Set(),
      "gateFace"
    )
    const door = rooms(faced).find(cell => cell.gateFace?.sequences?.length)!
    expect(door.family).toBe("gateFace")
    expect(door.gateFace!.sequences![0].hidden).toBeUndefined()
    expect(door.gateFace!.sequences![0].tiles.map(tile => tile.status)).toEqual(["inOrder", "inOrder", "unwalked"])
  })
})
