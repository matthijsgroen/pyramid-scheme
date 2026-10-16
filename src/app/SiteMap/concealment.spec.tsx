// @vitest-environment jsdom
import { render, renderHook, cleanup } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { FloorConfig, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { openDoorsFor, openWaysOut } from "@/game/mechanismDoors"
import { cellAddress } from "@/game/cellAddress"
import { isSealedWayOut, oneWayRuns, walkableFrom } from "@/game/gridNavigation"
import { concealShutGround, concealedBehindBarriers } from "@/game/concealment"
import { journeys as allKnownJourneys } from "@/data/journeys"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import { dropOutOfSluiceFloor, offRouteSluiceFloor, onRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { soloLeverDoorFloor } from "@/game/testSupport/gateFaceFixtures"
import { sealWaysOut, useAssembledFloor } from "./useAssembledFloor"
import { cellKey } from "./cellIdentity"
import { SiteMapView } from "./SiteMapView"
import { cellCenter } from "./mapScale"
import "@/mods/registerModApps"

const JOURNEY = allKnownJourneys[0].id
const floorRef = { journeyId: JOURNEY, floorIndex: 0 }

const carve = (config: FloorConfig): { seed: number; grid: FloorGrid } => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      resolveOneWay: resolveOneWayRealisation,
      floorRef,
    })
    if (result.success) return { seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

type Scenario = { name: string; config: FloorConfig; mechanismId?: string }
const REGION_SCENARIOS: Scenario[] = [
  { name: "a sluice flooding one of two side regions", config: offRouteSluiceFloor(), mechanismId: "sluice" },
  { name: "a sluice flooding a hall on the route", config: onRouteSluiceFloor(), mechanismId: "sluice" },
  { name: "a sluice flooding a hall that drops into a wing", config: dropOutOfSluiceFloor(), mechanismId: "sluice" },
]
const EDGE_SCENARIOS: Scenario[] = [
  { name: "a lever barring the vault door", config: soloLeverDoorFloor(), mechanismId: "beam" },
  { name: "a fork-switch shutting the ways out of its fork", config: forkSwitchFloorConfig(), mechanismId: "Y" },
]
const SCENARIOS: Scenario[] = [...REGION_SCENARIOS, ...EDGE_SCENARIOS]

const carved = new Map<string, { seed: number; grid: FloorGrid }>()
beforeAll(() => {
  for (const scenario of SCENARIOS) carved.set(scenario.name, carve(scenario.config))
}, 240_000)

const DROP_OUT = REGION_SCENARIOS[2].name

const roomsOf = (grid: FloorGrid): { cell: RoomCell; at: [number, number] }[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

const mechanismKeys = (grid: FloorGrid): string[] => [
  ...new Set(roomsOf(grid).flatMap(({ cell }) => cell.mechanism?.positions.map(p => p.gateKeyId) ?? [])),
]

const mechanismOf = (name: string) => {
  const { grid } = carved.get(name)!
  const id = SCENARIOS.find(s => s.name === name)?.mechanismId ?? "L"
  const found = roomsOf(grid).find(({ cell }) => cell.mechanismId === id)
  if (!found) throw new Error(`no mechanism ${id} on ${name}`)
  return { at: found.at, states: found.cell.mechanism!.states }
}

const positionsAt = (name: string, state: string): ReadonlyMap<string, string> => {
  const { grid } = carved.get(name)!
  const { at } = mechanismOf(name)
  return new Map([[cellAddress(grid, 0, at[0], at[1])!, state]])
}

const revealed = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

/** The floor as the screen builds it, for one position of the floor's control. */
const floorFor = (name: string, positions: ReadonlyMap<string, string>, explored: Record<string, string[]> = {}) => {
  const { seed } = carved.get(name)!
  const config = SCENARIOS.find(s => s.name === name)!.config
  return renderHook(({ p, e }) => useAssembledFloor(JOURNEY, config, seed, 0, e, null, 0, undefined, undefined, p), {
    initialProps: { p: positions, e: explored },
  })
}

const withState = (name: string, state: string) => {
  const hook = floorFor(name, positionsAt(name, state))
  return { grid: revealed(hook.result.current.grid!), from: hook.result.current.explorerPos }
}

/** Where a walker can get to from `from`, written apart from the code under test: `walkableFrom` for the
 * ground, plus a drop taken in its own direction only, and a drop's span seen from either foot. */
const reachable = (grid: FloorGrid, from: readonly [number, number]): Set<string> => {
  const reach = new Set<string>()
  const queue: (readonly [number, number])[] = [from]
  const runs = oneWayRuns(grid)
  while (queue.length > 0) {
    const start = queue.shift()!
    for (const key of walkableFrom(grid, start)) {
      if (reach.has(key)) continue
      reach.add(key)
      const [r, c] = key.split(",").map(Number)
      for (const run of runs) if (run.launch[0] === r && run.launch[1] === c) queue.push(run.landing)
    }
  }
  for (const run of runs)
    if ([run.launch, run.landing].some(end => reach.has(`${end[0]},${end[1]}`)))
      for (const [r, c] of run.cells) reach.add(`${r},${c}`)
  return reach
}

/** Cut off only by a shut barrier: reachable with every mechanism's door open, not reachable now. */
const independentlyCutOff = (name: string, state: string): Set<string> => {
  const { grid: base } = carved.get(name)!
  const open = openDoorsFor(base, 0, positionsAt(name, state))
  const live = revealed(sealWaysOut(openWaysOut(base, open)))
  const everything = revealed(sealWaysOut(openWaysOut(base, new Set(mechanismKeys(base)))))
  const { from } = withState(name, state)
  const now = reachable(live, from)
  // A shut barrier stays in view when the ground the player can stand on touches it.
  const visibleShut = (key: string): boolean => {
    const [r, c] = key.split(",").map(Number)
    const cell = live.cells[r][c]
    return (
      isSealedWayOut(cell) &&
      cell.type === "room" &&
      [...cell.dirs].some(dir =>
        now.has(`${r + { n: -1, s: 1, e: 0, w: 0 }[dir]},${c + { n: 0, s: 0, e: 1, w: -1 }[dir]}`)
      )
    )
  }
  return new Set([...reachable(everything, from)].filter(key => !now.has(key) && !visibleShut(key)))
}

const statesOf = (name: string): string[] => mechanismOf(name).states

/** Seen ground the water of a shut barrier lies on, which stays in view under it: a door, or a cell of a region
 * one still bars. Read off the cells. */
const underWater = (grid: FloorGrid, key: string): boolean => {
  const [r, c] = key.split(",").map(Number)
  const cell = grid.cells[r][c]
  if (cell.type === "empty" || cell.state === "fogged") return false
  const flooded = new Set(
    grid.cells
      .flat()
      .flatMap(other => (other.type === "room" && other.regionBarrier ? [other.regionBarrier.region] : []))
  )
  return (cell.type === "room" && cell.regionBarrier !== undefined) || flooded.has(cell.region ?? "")
}

const cellsOf = (container: HTMLElement) => {
  const at = new Map<string, string>()
  for (let r = 0; r < 90; r++)
    for (let c = 0; c < 90; c++) at.set(`${cellCenter(r, c).cx},${cellCenter(r, c).cy}`, `${r},${c}`)
  const drawn = new Set<string>()
  for (const el of container.querySelectorAll<HTMLElement>("[data-marker-cell]")) {
    const key = at.get(`${parseFloat(el.style.left) + 28},${parseFloat(el.style.top) + 28}`)
    if (key) drawn.add(key)
  }
  for (const el of container.querySelectorAll<HTMLElement>("[data-node-sprite]")) {
    const key = el.getAttribute("data-node-sprite")!.split(":").pop()!
    if (/^\d+,\d+$/.test(key)) drawn.add(key)
  }
  return drawn
}

afterEach(cleanup)

describe(
  "ground a shut region barrier cuts off is hidden, explored or not, unless it is seen ground under its water",
  { timeout: 30_000 },
  () => {
    for (const { name } of REGION_SCENARIOS)
      it(`${name}: in every position the hidden set is exactly what the shut barriers cut off`, () => {
        let hiddenSomewhere = false
        for (const state of statesOf(name)) {
          const { grid, from } = withState(name, state)
          const expected = independentlyCutOff(name, state)
          const hidden = concealedBehindBarriers(grid, from)
          expect([...hidden].sort(), `${name} / ${state}`).toEqual([...expected].sort())
          if (hidden.size > 0) hiddenSomewhere = true
        }
        expect(hiddenSomewhere, "some position shuts something off, so the equality above is not empty").toBe(true)
      })

    for (const { name } of REGION_SCENARIOS)
      it(`${name}: whether the ground was explored makes no difference to what is hidden`, () => {
        for (const state of statesOf(name)) {
          const hook = floorFor(name, positionsAt(name, state))
          const unexplored = hook.result.current.grid!
          const { grid } = withState(name, state)
          const from = hook.result.current.explorerPos
          expect([...concealedBehindBarriers(unexplored, from)].sort(), `${name} / ${state}`).toEqual(
            [...concealedBehindBarriers(grid, from)].sort()
          )
        }
      })

    for (const { name } of REGION_SCENARIOS)
      it(`${name}: every hidden cell not under water is drawn as fog and every other drawn cell stays as it was`, () => {
        let drawnBeforeHidden = 0
        let keptUnderWater = 0
        for (const state of statesOf(name)) {
          const { grid, from } = withState(name, state)
          const hidden = new Set([...concealedBehindBarriers(grid, from)].filter(key => !underWater(grid, key)))
          const plain = cellsOf(render(<SiteMapView grid={grid} />).container)
          cleanup()
          const concealed = cellsOf(render(<SiteMapView grid={concealShutGround(grid, from)} />).container)
          cleanup()
          for (const key of hidden) {
            if (plain.has(key)) drawnBeforeHidden++
            expect(concealed.has(key), `${name} / ${state} / ${key} is still drawn`).toBe(false)
          }
          for (const key of concealedBehindBarriers(grid, from))
            if (underWater(grid, key) && plain.has(key)) {
              keptUnderWater++
              expect(concealed.has(key), `${name} / ${state} / ${key} is drawn under water`).toBe(true)
            }
          expect([...concealed].sort(), `${name} / ${state}`).toEqual([...plain].filter(key => !hidden.has(key)).sort())
        }
        expect(
          drawnBeforeHidden + keptUnderWater,
          "something cut off was drawn when open, so the checks above are not empty"
        ).toBeGreaterThan(0)
      })
  }
)

const stateOf = (grid: FloorGrid): string[] =>
  grid.cells.flatMap((row, r) =>
    row.map((cell, c) =>
      cell.type === "empty" ? `${r},${c}:empty` : `${r},${c}:${cell.type}:${cell.state}:${[...cell.dirs].sort()}`
    )
  )

const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const inner of Object.values(value as object)) deepFreeze(inner)
  }
  return value
}

const exploredEverywhere = (grid: FloorGrid): Record<string, string[]> => {
  const explored: Record<string, string[]> = {}
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const key = cellKey(grid, 0, r, c)
      if (cell.type === "empty" || !key || isSealedWayOut(cell)) return
      const section = cell.sectionAddress ?? ""
      ;(explored[section] ??= []).push(key)
    })
  )
  return explored
}

describe("a shut edge gate conceals nothing", { timeout: 30_000 }, () => {
  for (const { name } of EDGE_SCENARIOS)
    it(`${name}: in every position the whole floor is drawn as it would be with nothing concealed`, () => {
      let shutSomewhere = false
      for (const state of statesOf(name)) {
        const { grid, from } = withState(name, state)
        const sealed = grid.cells.flat().some(cell => isSealedWayOut(cell))
        if (sealed) shutSomewhere = true
        expect([...concealedBehindBarriers(grid, from)], `${name} / ${state}`).toEqual([])
        expect(concealShutGround(grid, from), `${name} / ${state}`).toEqual(grid)
        const plain = cellsOf(render(<SiteMapView grid={grid} />).container)
        cleanup()
        const concealed = cellsOf(render(<SiteMapView grid={concealShutGround(grid, from)} />).container)
        cleanup()
        expect([...concealed].sort(), `${name} / ${state}`).toEqual([...plain].sort())
      }
      expect(shutSomewhere, "some position leaves an edge gate shut, so the equality above is not empty").toBe(true)
    })
})

describe("hidden ground is kept, not erased, and opens again as it was left", { timeout: 30_000 }, () => {
  for (const { name } of REGION_SCENARIOS)
    it(`${name}: shutting and reopening a barrier draws every cell of the floor as before, and writes nothing`, () => {
      const states = statesOf(name)
      const { grid: base } = carved.get(name)!
      const explored = exploredEverywhere(base)
      const snapshot = structuredClone(explored)
      const openState = states.find(state => {
        const { grid, from } = withState(name, state)
        return concealedBehindBarriers(grid, from).size === 0
      })
      const shutStates = states.filter(state => state !== openState)
      let keptWhileShut = 0
      const hook = floorFor(name, positionsAt(name, openState ?? states[0]), explored)
      const draw = () => {
        const { grid, explorerPos } = hook.result.current
        deepFreeze(grid!)
        return { grid: grid!, drawn: concealShutGround(grid!, explorerPos), from: explorerPos }
      }
      const before = stateOf(draw().drawn)
      for (const state of shutStates) {
        hook.rerender({ p: positionsAt(name, state), e: explored })
        const { grid, drawn, from } = draw()
        for (const key of concealedBehindBarriers(grid, from)) {
          const [r, c] = key.split(",").map(Number)
          const here = grid.cells[r][c]
          if (here.type !== "empty" && here.state !== "fogged") keptWhileShut++
          const shown = underWater(grid, key) ? (here as { state: string }).state : "fogged"
          expect((drawn.cells[r][c] as { state: string }).state, `${name} / ${state} / ${key}`).toBe(shown)
        }
        hook.rerender({ p: positionsAt(name, openState ?? states[0]), e: explored })
        expect(stateOf(draw().drawn), `${name} / ${state}, reopened`).toEqual(before)
      }
      expect(explored, "the exploration record").toEqual(snapshot)
      expect(
        keptWhileShut,
        "explored ground sat behind a shut barrier, so there was something to keep"
      ).toBeGreaterThan(0)
    })
})

describe("what is cut off is reckoned from where the player stands", () => {
  const floodedFloor = () => {
    const { grid, from } = withState(DROP_OUT, "dry")
    return { grid, from }
  }
  const regionOf = (grid: FloorGrid, key: string): string | undefined => {
    const [r, c] = key.split(",").map(Number)
    const cell = grid.cells[r][c]
    return cell.type === "empty" ? undefined : cell.region
  }
  const cellsInRegion = (grid: FloorGrid, name: string): string[] =>
    grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type !== "empty" &&
        cell.region === name &&
        !isSealedWayOut(cell) &&
        !(cell.type === "corridor" && cell.obstacle)
          ? [`${r},${c}`]
          : []
      )
    )

  it("standing at the landing of a drop, the hall it dropped from is hidden behind the shut barrier, not reachable back up", () => {
    const { grid } = floodedFloor()
    const run = oneWayRuns(grid).find(r => regionOf(grid, `${r.launch[0]},${r.launch[1]}`) === "hall")!
    const hidden = concealedBehindBarriers(grid, run.landing)
    const hall = cellsInRegion(grid, "hall")
    const standable = reachable(grid, run.landing)
    expect(hall.length).toBeGreaterThan(0)
    expect(hidden.has(`${run.launch[0]},${run.launch[1]}`), "the launch it fell from").toBe(true)
    expect(hall.filter(key => !hidden.has(key) && !standable.has(key))).toEqual([])
  })

  it("standing at the launch of a drop, the ground it lands on is not hidden though the barrier around it is shut", () => {
    const { grid } = floodedFloor()
    const run = oneWayRuns(grid).find(r => regionOf(grid, `${r.launch[0]},${r.launch[1]}`) === "hall")!
    const hidden = concealedBehindBarriers(grid, run.launch)
    const landing = regionOf(grid, `${run.landing[0]},${run.landing[1]}`)
    const there = cellsInRegion(grid, landing!)
    expect(landing).toBe("wing")
    expect(there.length).toBeGreaterThan(0)
    expect(there.filter(key => hidden.has(key))).toEqual([])
  })
})
