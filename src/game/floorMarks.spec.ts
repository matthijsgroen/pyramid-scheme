import { beforeAll, describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import { MARK_GLYPHS } from "./mark"
import type { Mark } from "./mark"
import type { FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { designerDoubleBack } from "./testSupport/forkSwitchFixtures"
import { handleFloorConfig } from "./testSupport/handleFixtures"
import { LEVERS, MARK_FLOORS, carveMarkFloor, reEnterable, withSwitch } from "./testSupport/markFloors"

const roomsOf = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flat().filter((cell): cell is RoomCell => cell.type === "room")

// A mechanism is named by its authored id; a plain switch has none, so by where its junction stands.
const mechanismRooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.mechanism ? [{ id: cell.mechanismId ?? `switch@${r},${c}`, room: cell }] : []
    )
  )

const marksByMechanism = (grid: FloorGrid): Record<string, Mark | undefined> =>
  Object.fromEntries(mechanismRooms(grid).map(({ id, room }) => [id, room.mark]))

type Carve = { seed: number; grid: FloorGrid }

// Each floor is carved at the seeds its search found (floorMarks.verify.ts holds that the search still finds them).
const floors: { name: string; mechanics: number; carves: () => Carve[] }[] = MARK_FLOORS.map(floor => {
  let carves: Carve[] | undefined
  return {
    name: floor.name,
    mechanics: floor.mechanics,
    carves: () =>
      (carves ??= floor.carvingSeeds.map(seed => {
        const grid = carveMarkFloor(floor, seed)
        if (!grid) throw new Error(`${floor.name} no longer carves at seed ${seed}`)
        return { seed, grid }
      })),
  }
})

beforeAll(() => {
  for (const floor of floors) floor.carves()
}, 300_000)

describe("the marks on a carved floor", () => {
  it.each(floors)("$name: no two mechanisms wear the same glyph, on every carved seed", ({ mechanics, carves }) => {
    expect(carves().length).toBeGreaterThan(0)
    for (const { seed, grid } of carves()) {
      const marks = marksByMechanism(grid)
      expect(Object.keys(marks), `seed ${seed}`).toHaveLength(mechanics)
      expect(
        Object.values(marks).every(mark => mark !== undefined),
        `seed ${seed}: ${JSON.stringify(marks)}`
      ).toBe(true)
      const glyphs = Object.values(marks).map(mark => mark!.glyph)
      expect(new Set(glyphs).size, `seed ${seed}: ${JSON.stringify(marks)}`).toBe(glyphs.length)
    }
  })

  it.each(floors)("$name: every gate wears the mark of the mechanism that opens it", ({ carves }) => {
    expect(carves().length).toBeGreaterThan(0)
    for (const { seed, grid } of carves()) {
      const ownerOfKey = new Map<string, Mark | undefined>()
      for (const { room } of mechanismRooms(grid))
        for (const { gateKeyId } of room.mechanism!.positions) ownerOfKey.set(gateKeyId, room.mark)
      const gates = roomsOf(grid).filter(room => room.requiredKeyId !== undefined && ownerOfKey.has(room.requiredKeyId))
      expect(gates.length, `seed ${seed}`).toBeGreaterThan(0)
      for (const gate of gates) {
        expect(gate.mark, `seed ${seed} ${gate.requiredKeyId}`).toBeDefined()
        expect(gate.mark, `seed ${seed} ${gate.requiredKeyId}`).toEqual(ownerOfKey.get(gate.requiredKeyId!))
      }
    }
  })

  // The switch's preferred glyph depends on the floor's own address, so several floors are asked: some
  // of them have it prefer a lever's glyph, which is the case that would move a lever if it could.
  it("keeps every mechanism's mark when one more mechanic is authored after the others", () => {
    const base = handleFloorConfig(...LEVERS)
    const extended = withSwitch(base)
    let compared = 0
    for (const site of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      for (let seed = 1; seed <= 40; seed++) {
        const without = assembleFloor(`site-marks-insert-${site}`, base, seed, reEnterable)
        const withExtra = assembleFloor(`site-marks-insert-${site}`, extended, seed, reEnterable)
        if (!without.success || !withExtra.success) continue
        compared++
        const kept = marksByMechanism(without.grid)
        const now = marksByMechanism(withExtra.grid)
        expect(Object.keys(kept), `${site} seed ${seed}`).toHaveLength(2)
        for (const id of Object.keys(kept)) expect(now[id], `${site} seed ${seed} ${id}`).toEqual(kept[id])
        expect(Object.keys(now), `${site} seed ${seed}`).toHaveLength(3)
        break
      }
    }
    expect(compared).toBe(8)
  }, 120_000)

  describe("a floor needing more distinct glyphs than exist", () => {
    const withSwitches = (count: number): FloorConfig => ({
      ...designerDoubleBack(),
      forks: [{ exits: 2, count }],
      switches: { encounter: "sumplete", min: count, max: count },
    })

    // designerDoubleBack's own three mechanics take three glyphs before any switch.
    const switchesFitting = MARK_GLYPHS.length - 3

    it("is refused by the mechanics left without a mark, never given a repeated one", () => {
      const result = assembleFloor("site-marks-exhausted", withSwitches(switchesFitting + 1), 1, reEnterable)
      expect(result).toEqual({
        success: false,
        reasons: [{ type: "marksExhausted", ids: [`switch:${switchesFitting}`] }],
      })
    })

    it("names every mechanic past the last glyph", () => {
      const result = assembleFloor("site-marks-exhausted", withSwitches(switchesFitting + 3), 1, reEnterable)
      expect(result).toEqual({
        success: false,
        reasons: [
          {
            type: "marksExhausted",
            ids: [0, 1, 2].map(n => `switch:${switchesFitting + n}`),
          },
        ],
      })
    })

    it("is not refused for marks at exactly as many as there are glyphs", () => {
      const result = assembleFloor("site-marks-exhausted", withSwitches(switchesFitting), 1, reEnterable)
      expect(result.success ? [] : result.reasons.filter(reason => reason.type === "marksExhausted")).toEqual([])
    })
  })
})
