import { describe, expect, it } from "vitest"
import { withGateFaces } from "./gateFace"
import { webMarkFor } from "./mark"
import { parseLock } from "./lockNotation"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid } from "./siteTypes"
import { BINDING } from "./testSupport/lockFixtures"
import { resolveEncounterMeta } from "@/mods/allFamilyMeta"
import { webSandKindRefusals, WEB_SAND_REALISATION, WEB_SEAL_REALISATION } from "./webDoors"
import type { PlacedLockWeb } from "./webDoors"
import { potKey, webKey } from "./webLine"

const floorOf = (extra: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 3,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 1, difficulty: "expert", end: "treasure" }],
  ...extra,
})

const lockFloor = (lines: string[], web?: PlacedLockWeb): FloorConfig =>
  floorOf({
    pathPuzzles: 1,
    locks: [{ lock: parseLock(lines.join("\n"), "L").lock, ...(web ? { web } : {}) }],
    realisations: BINDING,
  })

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)

const carve = (config: FloorConfig): FloorGrid => {
  for (const seed of SEEDS) {
    const result = assembleFloor("web", config, seed, resolveEncounterMeta, {
      floorRef: { journeyId: "web", floorIndex: 0 },
    })
    if (result.success) return result.grid
  }
  throw new Error("no seed carves the floor")
}

const cellsAsking = (grid: FloorGrid, key: string) =>
  grid.cells.flatMap(row =>
    row.flatMap(cell =>
      cell.type === "room" && (cell.requiredKeyId === key || cell.requiredKeyIds?.includes(key)) ? [cell] : []
    )
  )

const BURIED = ["A outside", "in -- hall", "hall -- out", "hall -[A]", "in ?", "hall ?", "out ?"]
const onSand = (config: FloorConfig): FloorConfig => ({
  ...config,
  realisations: { ...BINDING, "region-barrier": "sand" },
})

describe("one sand kind per site", () => {
  it("refuses a floor with web sand whose lock binds its region barriers to sand", () => {
    const config = onSand(lockFloor(BURIED, { inputs: { A: potKey("w1", 1) } }))
    const result = assembleFloor("web", config, SEEDS[0], resolveEncounterMeta, {
      floorRef: { journeyId: "web", floorIndex: 0 },
    })
    expect(result).toEqual({ success: false, reasons: [{ type: "webSandKindMixed", floor: 0, realisation: "sand" }] })
  })

  it("refuses a site whose web sand stands on one floor and whose lock binds sand on another", () => {
    const sand = floorOf({ webDoors: [{ key: potKey("w1", 1), at: { seam: 0 } }] })
    expect(webSandKindRefusals([sand, onSand(lockFloor(BURIED))])).toEqual([
      { type: "webSandKindMixed", floor: 1, realisation: "sand" },
    ])
  })

  it("accepts the same web beside barriers bound to water, and sand where the site has no web sand", () => {
    const sand = floorOf({ webDoors: [{ key: potKey("w1", 1), at: { seam: 0 } }] })
    const seal = floorOf({ webDoors: [{ key: webKey("ankh"), at: { seam: 0 } }] })
    expect(webSandKindRefusals([sand, lockFloor(BURIED)])).toEqual([])
    expect(webSandKindRefusals([onSand(lockFloor(BURIED))])).toEqual([])
    expect(webSandKindRefusals([seal, onSand(lockFloor(BURIED))])).toEqual([])
  })

  it("lays the web's region barriers as web sand, a realisation of its own", () => {
    const grid = carve(lockFloor(BURIED, { inputs: { A: potKey("w1", 1) } }))
    const doors = cellsAsking(grid, potKey("w1", 1))
    expect(doors.length).toBeGreaterThan(0)
    expect(new Set(doors.map(cell => cell.regionBarrier?.realisation))).toEqual(new Set([WEB_SAND_REALISATION]))
    expect(WEB_SAND_REALISATION).not.toBe("sand")
  })
})

describe("the marks of a web door", () => {
  it("shows a door with an input and a lever two markers, the lever's floor mark and the input's web mark", () => {
    const grid = carve(
      lockFloor(["A outside", "in -[K+A]- hall", "hall -- out", "K toggle @in", "in ?", "hall ?", "out ?"], {
        inputs: { A: potKey("w1", 2) },
      })
    )
    const door = cellsAsking(withGateFaces(grid, 0, new Map()), potKey("w1", 2))[0]
    if (door.type !== "room") throw new Error("a door is a room")
    const markers = door.gateFace!.markers
    expect(markers).toHaveLength(2)
    const web = markers.find(marker => marker.icon.kind === "web")!
    const lever = markers.find(marker => marker.icon.kind === "mechanism")!
    expect(web.mark).toEqual(webMarkFor(potKey("w1", 2)))
    expect(lever.mark?.web).toBeUndefined()
    expect(web.mark).not.toEqual(lever.mark)
  })

  it("marks a door one web key shuts with that key's web mark, a stop as sand and an opens door as a seal", () => {
    const grid = carve(
      floorOf({
        webDoors: [
          { key: potKey("w1", 1), at: { seam: 0 } },
          { key: webKey("ankh"), at: { mouth: "s0" } },
        ],
      })
    )
    const sand = cellsAsking(grid, potKey("w1", 1))[0]
    const seal = cellsAsking(grid, webKey("ankh"))[0]
    if (sand.type !== "room" || seal.type !== "room") throw new Error("a door is a room")
    expect(sand.mark).toEqual(webMarkFor(potKey("w1", 1)))
    expect([sand.webDoor?.realisation, seal.webDoor?.realisation]).toEqual([WEB_SAND_REALISATION, WEB_SEAL_REALISATION])
  })
})
