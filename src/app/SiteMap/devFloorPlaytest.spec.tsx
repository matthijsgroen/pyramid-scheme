// @vitest-environment jsdom
//
// THE DEVELOP-ONLY FLOORS A DESIGNER PLAYTESTS: the sluice (pyramid 4) and the procession (pyramid 10),
// built and assembled exactly as the bake builds them, never read back from the committed world.
import { cleanup, render, renderHook } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { refusal } from "@/worldGen/carveSeedSearch"
import { walkFloorLock } from "@/game/floorLockWalk"
import { cellAddress } from "@/game/cellAddress"
import { concealShutGround } from "@/game/concealment"
import { openDoorsFor } from "@/game/mechanismDoors"
import { oneWayRuns } from "@/game/gridNavigation"
import { spoiledState } from "@/game/sequence"
import { buildConfigs } from "@/worldGen/configBuilder"
import { DEV_JOURNEY_ID } from "@/worldGen/data"
import type { SiteConfig } from "@/worldGen/types"
import { sluiceLock } from "@/worldGen/spec/locks/sluice"
import { processionalLock } from "@/worldGen/spec/locks/processional"
import { ALL_CURRENCY_DISTRIBUTIONS } from "@/mods/allCurrencyDistributions"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  REGISTERED_MOD_IDS,
} from "@/mods/registeredMods"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "@/mods/allFamilyMeta"
import { useAssembledFloor } from "./useAssembledFloor"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

const SLUICE_LEVEL = 4
const PROCESSION_LEVEL = 10
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

let sluice: FloorConfig
let procession: FloorConfig

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  const world: Record<string, SiteConfig[]> = buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    0,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta
  )
  const dev = world[DEV_JOURNEY_ID] as unknown as FloorConfig[][]
  sluice = dev[SLUICE_LEVEL - 1][0]
  procession = dev[PROCESSION_LEVEL - 1][0]
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})
afterEach(cleanup)

const addressSeed = (levelNr: number) => floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), levelNr, 0)

const assembleAtPin = (floor: FloorConfig, levelNr: number) =>
  assembleFloor(DEV_JOURNEY_ID, floor, addressSeed(levelNr), resolveEncounterMeta, {
    resolveKeyRequirements,
    resolveOneWay: resolveOneWayRealisation,
    resolveRegionBarrier: resolveRegionBarrierRealisation,
    floorRef: { journeyId: DEV_JOURNEY_ID, levelIndex: levelNr - 1, floorIndex: 0 },
    maxAttempts: 1,
  })

const carvedAt = (floor: FloorConfig, levelNr: number): FloorGrid => {
  const result = assembleAtPin(floor, levelNr)
  if (!result.success) throw new Error(`level ${levelNr} did not carve: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

const roomsOf = (grid: FloorGrid): { cell: RoomCell; at: [number, number] }[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

const revealed = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

// The floor as the screen builds it, the mechanism standing in `state`.
const assembledWith = (floor: FloorConfig, levelNr: number, positions: ReadonlyMap<string, string>) =>
  renderHook(() =>
    useAssembledFloor(DEV_JOURNEY_ID, floor, addressSeed(levelNr), 0, {}, null, 0, undefined, levelNr - 1, positions)
  ).result.current

describe("the sluice on dev pyramid 4", { timeout: 120_000 }, () => {
  it("is authored as the production lock, bound to water and a handle at the pyramid, with a recorded pin", () => {
    expect(sluice.locks).toEqual([{ lock: sluiceLock() }])
    expect(sluice.realisations).toEqual({ toggle: "handle", "region-barrier": "water" })
    expect(sluice.seed).toBe(111235356889669)
    expect(sluice.packing).toBeUndefined()
  })

  it("carves at its pinned seed on attempt 0, walks sound and leaves no dead region", () => {
    const result = assembleAtPin(sluice, SLUICE_LEVEL)
    expect(refusal(result)).toBeNull()
    if (!result.success) throw new Error("unreachable: a refusal-free result carved")
    expect(walkFloorLock(result.grid)).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("stamps every door of both flooded regions with water", () => {
    const doors = roomsOf(carvedAt(sluice, SLUICE_LEVEL)).filter(({ cell }) => cell.regionBarrier)
    expect([...new Set(doors.map(({ cell }) => cell.regionBarrier!.region))].sort()).toEqual([
      "sluice.hall",
      "sluice.vault",
    ])
    expect(doors.map(({ cell }) => cell.regionBarrier!.realisation)).toEqual(doors.map(() => "water"))
  })

  // Every cell is lit so the cover and the concealment, not exploration, decide what the map shows.
  const floorWhen = (state: "dry" | "wet") => {
    const base = carvedAt(sluice, SLUICE_LEVEL)
    const lever = roomsOf(base).find(({ cell }) => cell.mechanism)!.at
    const positions = new Map([[cellAddress(base, 0, lever[0], lever[1])!, state]])
    const open = openDoorsFor(base, 0, positions)
    const shut = roomsOf(base).filter(({ cell }) => cell.regionBarrier && !open.has(cell.requiredKeyId!))
    const live = revealed(assembledWith(sluice, SLUICE_LEVEL, positions).grid!)
    const from = assembledWith(sluice, SLUICE_LEVEL, positions).explorerPos
    return { shut, grid: concealShutGround(live, from) }
  }

  it.each([
    ["dry", "sluice.hall"],
    ["wet", "sluice.vault"],
  ] as const)("drawn %s, covers the barred %s in water on the map and no other region", (state, region) => {
    const { grid, shut } = floorWhen(state)
    expect([...new Set(shut.map(({ cell }) => cell.regionBarrier!.region))]).toEqual([region])
    const { container } = render(<SiteMapView grid={grid} />)

    const layers = [...container.querySelectorAll("[data-region-cover]")]
    expect(layers.map(layer => layer.getAttribute("data-region-cover"))).toEqual([region])
    expect(layers[0].getAttribute("data-realisation")).toBe("water")
    expect(layers[0].querySelectorAll("[data-cover-cell]").length).toBeGreaterThan(0)
  })

  it("conceals the annex behind the flooded hall while it is flooded, and shows it once the lever drains the hall", () => {
    const annexFogged = (grid: FloorGrid) =>
      grid.cells
        .flat()
        .filter(cell => cell.type !== "empty" && cell.region === "sluice.annex" && cell.state === "fogged")
    const annexCells = (grid: FloorGrid) =>
      grid.cells.flat().filter(cell => cell.type !== "empty" && cell.region === "sluice.annex")

    const dry = floorWhen("dry").grid
    expect(annexCells(dry).length).toBeGreaterThan(0)
    expect(annexFogged(dry)).toHaveLength(annexCells(dry).length)
    expect(annexFogged(floorWhen("wet").grid)).toEqual([])
  })
})

describe("the procession on dev pyramid 10", { timeout: 120_000 }, () => {
  const tilesOf = (grid: FloorGrid) =>
    roomsOf(grid)
      .filter(({ cell }) => cell.sequenceTile)
      .sort((a, b) => a.cell.sequenceTile!.step - b.cell.sequenceTile!.step)

  it("is authored as the production lock, bound at the pyramid, with a recorded pin", () => {
    expect(procession.locks).toEqual([{ lock: processionalLock() }])
    expect(procession.realisations).toEqual({ sequence: "pressure-plate", "one-way": "zipline" })
    expect(procession.seed).toBe(4293857872)
    expect(procession.packing).toBeUndefined()
  })

  it("carves at its pinned seed on attempt 0, and the forced-step walk finds the order keepable and the reset in reach", () => {
    const result = assembleAtPin(procession, PROCESSION_LEVEL)
    expect(refusal(result)).toBeNull()
    if (!result.success) throw new Error("unreachable: a refusal-free result carved")
    expect(walkFloorLock(result.grid)).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("stands three tiles, one in each region its steps name, in the order cellar, east, west", () => {
    const tiles = tilesOf(carvedAt(procession, PROCESSION_LEVEL))
    expect(tiles.map(({ cell }) => cell.sequenceTile!.step)).toEqual([0, 1, 2])
    expect(tiles.map(({ cell }) => cell.region)).toEqual([
      "processional.cellar",
      "processional.east",
      "processional.west",
    ])
  })

  it("stands every tile where it cannot be walked round: nothing joins its two sides without it", () => {
    const grid = carvedAt(procession, PROCESSION_LEVEL)
    const drops = oneWayRuns(grid)
    const joined = (from: [number, number], without: string): Set<string> => {
      const seen = new Set<string>([without, `${from[0]},${from[1]}`])
      const queue = [from]
      const visit = (r: number, c: number) => {
        const next = grid.cells[r]?.[c]
        if (!next || next.type === "empty" || seen.has(`${r},${c}`)) return
        seen.add(`${r},${c}`)
        queue.push([r, c])
      }
      for (let at = 0; at < queue.length; at++) {
        const [r, c] = queue[at]
        const cell = grid.cells[r][c]
        if (cell.type === "empty") continue
        for (const dir of cell.dirs) visit(r + MOVES[dir][0], c + MOVES[dir][1])
        for (const run of drops) {
          if (run.launch[0] === r && run.launch[1] === c) visit(run.landing[0], run.landing[1])
        }
      }
      return seen
    }
    for (const { cell, at } of tilesOf(grid)) {
      const own = `${at[0]},${at[1]}`
      const [a, b] = [...cell.dirs].map(dir => [at[0] + MOVES[dir][0], at[1] + MOVES[dir][1]] as [number, number])
      expect(cell.dirs.size).toBe(2)
      expect(
        joined(a, own).has(`${b[0]},${b[1]}`) || joined(b, own).has(`${a[0]},${a[1]}`),
        `tile ${cell.sequenceTile!.step}`
      ).toBe(false)
    }
  })

  it("draws the order and the reset on its door: the glyphs in step order, and the way to start again once the run is spoiled", () => {
    const base = carvedAt(procession, PROCESSION_LEVEL)
    const tiles = tilesOf(base)
    const [home] = tiles
    const address = cellAddress(base, 0, home.at[0], home.at[1])!
    const faceAt = (state: string) => {
      const { grid } = assembledWith(procession, PROCESSION_LEVEL, new Map([[address, state]]))
      const door = roomsOf(grid!).find(({ cell }) => cell.gateFace)
      return door?.cell.gateFace?.sequences?.[0]
    }

    const rest = faceAt("0")
    expect(rest?.tiles.map(tile => tile.glyph)).toEqual(tiles.map(({ cell }) => cell.sequenceTile!.glyph))
    expect(rest?.reset).toBeUndefined()
    expect(faceAt(spoiledState(0, 1))?.reset).toBeDefined()
  })

  it("drops from the hall into the cellar as the zipline its pyramid binds, and by no other way", () => {
    const grid = carvedAt(procession, PROCESSION_LEVEL)
    expect(oneWayRuns(grid).map(run => run.kind)).toEqual(["zipline"])
    const cellar = (r: number, c: number) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.region
    }
    const [drop] = oneWayRuns(grid)
    expect([cellar(...drop.launch), cellar(...drop.landing)]).toEqual(["processional.hall", "processional.cellar"])
  })
})
