// @vitest-environment jsdom
//
// THE SLUICE AND A PROCESSION, THE FLOORS A DESIGNER PLAYS FROM THE LOCK EDITOR: made-up locks carved the way
// the editor carves them, then drawn and walked as the map does.
import { cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { walkFloorLock } from "@/game/floorLockWalk"
import { cellAddress } from "@/game/cellAddress"
import { concealShutGround } from "@/game/concealment"
import { openDoorsFor } from "@/game/mechanismDoors"
import { oneWayRuns } from "@/game/gridNavigation"
import { spoiledState } from "@/game/sequence"
import type { SequenceRead } from "@/game/sequenceReads"
import type { Lock } from "@/game/lockAuthoring"
import { sluiceLock } from "@/worldGen/spec/locks/sluice"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import { resolveKeyRequirements, resolveEncounterMeta } from "@/mods/allFamilyMeta"
import { useAssembledFloor } from "./useAssembledFloor"
import { encodeEdge } from "./edgeId"
import { getFamilyPlugin, type FamilyContext } from "@/app/families/familyRegistry"
import { hashString } from "@/support/hashString"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

const JOURNEY_ID = "test"
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// Three tiles walked cellar, east, west. The cellar is entered by a drop from the hall and also lies behind the
// east tile; the door onward carries the reset and a procession board.
const procession = (): Lock => ({
  name: "processional",
  regions: {
    in: { takes: "free" },
    hall: { takes: "free" },
    west: { takes: "free" },
    east: { takes: "free" },
    cellar: { takes: "free" },
    out: { takes: "free" },
  },
  connections: [
    ["in", "hall"],
    ["hall", "west"],
    ["hall", "east"],
    ["east", "cellar"],
    { between: ["hall", "out"], barriers: ["vaultDoor"] },
  ],
  gates: { vaultDoor: { from: "hall", to: "out", owners: ["plates"] } },
  oneWays: { dropToCellar: { from: "hall", to: "cellar" } },
  mechanics: {
    plates: {
      control: "sequence",
      steps: [{ in: "cellar" }, { in: "east" }, { in: "west" }],
      resetAt: "vaultDoor",
      opens: { done: ["vaultDoor"] },
      procession: true,
    },
  },
  in: "in",
  out: "out",
})

const floorOf = (lock: Lock, realisations: FloorConfig["realisations"]): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock }],
  realisations,
})

const assembleAt = (floor: FloorConfig, seed: number) =>
  assembleFloor(JOURNEY_ID, floor, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    resolveOneWay: resolveOneWayRealisation,
    resolveRegionBarrier: resolveRegionBarrierRealisation,
    floorRef: { journeyId: JOURNEY_ID, levelIndex: 0, floorIndex: 0 },
    maxAttempts: 1,
  })

type Stand = { floor: FloorConfig; seed: number }

// The first seed the floor carves at on attempt 0, as the editor's Carve and play finds one.
const standing = (floor: FloorConfig): Stand => {
  for (let n = 1; n <= 60; n++) if (assembleAt(floor, n * 7919).success) return { floor, seed: n * 7919 }
  throw new Error(`${floor.locks?.[0]?.lock.name} carved at none of 60 seeds`)
}

let sluice: Stand
let proc: Stand

beforeAll(() => {
  sluice = standing(floorOf(sluiceLock(), { toggle: "handle", "region-barrier": "water" }))
  proc = standing(floorOf(procession(), { sequence: "pressure-plate", "one-way": "zipline" }))
}, 180_000)

afterEach(cleanup)

const carvedAt = ({ floor, seed }: Stand): FloorGrid => {
  const result = assembleAt(floor, seed)
  if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
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
const assembledWith = (
  { floor, seed }: Stand,
  positions: ReadonlyMap<string, string>,
  reads?: ReadonlyMap<string, SequenceRead>
) =>
  renderHook(() =>
    useAssembledFloor(JOURNEY_ID, floor, seed, 0, {}, null, 0, undefined, 0, positions, undefined, reads)
  ).result.current

describe("a sluice floor", { timeout: 120_000 }, () => {
  it("carves on attempt 0, walks sound and leaves no dead region", () => {
    const result = assembleAt(sluice.floor, sluice.seed)
    if (!result.success) throw new Error("did not carve")
    expect(walkFloorLock(result.grid)).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("stamps every door of both flooded regions with water", () => {
    const doors = roomsOf(carvedAt(sluice)).filter(({ cell }) => cell.regionBarrier)
    expect([...new Set(doors.map(({ cell }) => cell.regionBarrier!.region))].sort()).toEqual([
      "sluice.hall",
      "sluice.vault",
    ])
    expect(doors.map(({ cell }) => cell.regionBarrier!.realisation)).toEqual(doors.map(() => "water"))
  })

  // Every cell is lit so the cover and the concealment, not exploration, decide what the map shows.
  const floorWhen = (state: "dry" | "wet") => {
    const base = carvedAt(sluice)
    const lever = roomsOf(base).find(({ cell }) => cell.mechanism)!.at
    const positions = new Map([[cellAddress(base, 0, lever[0], lever[1])!, state]])
    const open = openDoorsFor(base, 0, positions)
    const shut = roomsOf(base).filter(({ cell }) => cell.regionBarrier && !open.has(cell.requiredKeyId!))
    const live = revealed(assembledWith(sluice, positions).grid!)
    const from = assembledWith(sluice, positions).explorerPos
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
    // The hall's door, wherever the carve put it, lies under the water rather than in the fog.
    const annexCells = (grid: FloorGrid) =>
      grid.cells
        .flat()
        .filter(
          cell =>
            cell.type !== "empty" && cell.region === "sluice.annex" && !(cell.type === "room" && cell.regionBarrier)
        )
    const annexFogged = (grid: FloorGrid) =>
      annexCells(grid).filter(cell => cell.type !== "empty" && cell.state === "fogged")

    const dry = floorWhen("dry").grid
    expect(annexCells(dry).length).toBeGreaterThan(0)
    expect(annexFogged(dry)).toHaveLength(annexCells(dry).length)
    expect(annexFogged(floorWhen("wet").grid)).toEqual([])
  })
})

describe("a procession floor", { timeout: 120_000 }, () => {
  const tilesOf = (grid: FloorGrid) =>
    roomsOf(grid)
      .filter(({ cell }) => cell.sequenceTile)
      .sort((a, b) => a.cell.sequenceTile!.step - b.cell.sequenceTile!.step)

  it("carves on attempt 0, and the forced-step walk finds the order keepable and the reset in reach", () => {
    const result = assembleAt(proc.floor, proc.seed)
    if (!result.success) throw new Error("did not carve")
    expect(walkFloorLock(result.grid)).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("stands the tiles of its three steps in the regions they name, in the order cellar, east, west", () => {
    const tiles = tilesOf(carvedAt(proc))
    expect([...new Set(tiles.map(({ cell }) => cell.sequenceTile!.step))]).toEqual([0, 1, 2])
    const regionOf = ["processional.cellar", "processional.east", "processional.west"]
    for (const { cell } of tiles) expect(cell.region).toBe(regionOf[cell.sequenceTile!.step])
  })

  it("stands a step's tile on every way into its region: no room of it is reached round them", () => {
    const grid = carvedAt(proc)
    const drops = oneWayRuns(grid)
    const entrance = `${grid.entrancePos[0]},${grid.entrancePos[1]}`
    for (const step of [0, 1, 2]) {
      const ofStep = tilesOf(grid).filter(({ cell }) => cell.sequenceTile!.step === step)
      const region = ofStep[0].cell.region
      const seen = new Set<string>([entrance, ...ofStep.map(({ at }) => `${at[0]},${at[1]}`)])
      const queue: [number, number][] = [grid.entrancePos as [number, number]]
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
        expect(cell.type === "room" && cell.region === region && !cell.sequenceTile, `step ${step} at ${r},${c}`).toBe(
          false
        )
        for (const dir of cell.dirs) visit(r + MOVES[dir][0], c + MOVES[dir][1])
        for (const run of drops) if (run.launch[0] === r && run.launch[1] === c) visit(run.landing[0], run.landing[1])
      }
    }
  })

  it("carries a procession board on its door: the steps' signs, and the way to start again only once it is read", () => {
    const base = carvedAt(proc)
    const tiles = tilesOf(base).filter(
      ({ cell }, n, all) => all.findIndex(other => other.cell.sequenceTile!.step === cell.sequenceTile!.step) === n
    )
    const home = tilesOf(base).find(({ cell }) => cell.mechanism)!
    const address = cellAddress(base, 0, home.at[0], home.at[1])!
    const doorAt = (state: string, read?: SequenceRead) => {
      const reads = new Map(read ? [[address, read]] : [])
      const { grid } = assembledWith(proc, new Map([[address, state]]), reads)
      return roomsOf(grid!).find(({ cell }) => cell.gateFace)?.cell
    }

    const rest = doorAt("0")
    expect(rest?.family).toBe("procession-door")
    expect(rest?.gateFace?.sequences?.[0].tiles.map(tile => tile.glyph)).toEqual(
      tiles.map(({ cell }) => cell.sequenceTile!.glyph)
    )
    expect(rest?.gateFace?.sequences?.[0].hidden?.read).toBe(false)
    expect(doorAt(spoiledState(0, 1), { walked: [1] })?.gateFace?.sequences?.[0].reset).toBeUndefined()
    const read: SequenceRead = { walked: [0, 1, 2], read: true }
    expect(doorAt(spoiledState(0, 1), read)?.gateFace?.sequences?.[0].reset).toBeDefined()
  })

  it("deals its door a board of three bars, built as the encounter builds it", () => {
    const { grid } = assembledWith(proc, new Map())
    const door = roomsOf(grid!).find(({ cell }) => cell.gateFace)!
    const plugin = getFamilyPlugin(door.cell.family!)!
    const ctx = {
      difficulty: door.cell.difficulty ?? proc.floor.difficulty,
      boardIndex: door.cell.boardIndex,
      gateFace: door.cell.gateFace,
    } as FamilyContext
    const board = plugin.generate(hashString(JOURNEY_ID + encodeEdge(0, ...door.at)), ctx) as { bars: unknown[] }
    expect(board.bars).toHaveLength(3)
  })

  it("drops from the hall into the cellar as the zipline its pyramid binds, and by no other way", () => {
    const grid = carvedAt(proc)
    expect(oneWayRuns(grid).map(run => run.kind)).toEqual(["zipline"])
    const cellar = (r: number, c: number) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.region
    }
    const [drop] = oneWayRuns(grid)
    expect([cellar(...drop.launch), cellar(...drop.landing)]).toEqual(["processional.hall", "processional.cellar"])
  })
})
