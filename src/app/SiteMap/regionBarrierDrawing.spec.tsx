// @vitest-environment jsdom
import { render, renderHook, act } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell, SiteConfig } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { openDoorsFor } from "@/game/mechanismDoors"
import { cellAddress } from "@/game/cellAddress"
import { findPath } from "@/game/gridNavigation"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { journeys as allKnownJourneys } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { offRouteSluiceFloor, onRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { useAssembledFloor } from "./useAssembledFloor"
import { useMechanismStates } from "./useMechanismStates"
import { useSiteNavigation } from "./useSiteNavigation"
import { SiteMapView } from "./SiteMapView"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { encodeEdge } from "./edgeId"
import { CELL, cellCenter } from "./mapScale"
import "@/mods/registerModApps"

const JOURNEY = allKnownJourneys[0].id
const floorRef = { journeyId: JOURNEY, floorIndex: 0 }

type Scenario = { name: string; config: FloorConfig }
const SCENARIOS: Scenario[] = [
  { name: "a hall on the route, barred from both entrances", config: onRouteSluiceFloor() },
  { name: "a hall and a vault off the route, each barred", config: offRouteSluiceFloor() },
]

const roomsOf = (grid: FloorGrid): { cell: RoomCell; at: [number, number] }[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

const carve = (config: FloorConfig): { seed: number; grid: FloorGrid } => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, { resolveKeyRequirements, floorRef })
    if (result.success) return { seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

const carved = new Map<string, { seed: number; grid: FloorGrid }>()
beforeAll(() => {
  for (const scenario of SCENARIOS) carved.set(scenario.name, carve(scenario.config))
}, 120_000)

const doorsIn = (grid: FloorGrid) => roomsOf(grid).filter(({ cell }) => cell.regionBarrier !== undefined)

const mechanismOf = (grid: FloorGrid) => {
  const found = roomsOf(grid).find(({ cell }) => cell.mechanism)
  if (!found) throw new Error("no mechanism on this floor")
  return { at: found.at, states: found.cell.mechanism!.states }
}

/** One position of the floor's control and the doors it leaves open and shut. */
const positionOf = (name: string, state: string) => {
  const { seed, grid: base } = carved.get(name)!
  const { at } = mechanismOf(base)
  const positions = new Map([[cellAddress(base, 0, at[0], at[1])!, state]])
  const open = openDoorsFor(base, 0, positions)
  const doors = doorsIn(base)
  return {
    seed,
    base,
    at,
    positions,
    open: doors.filter(({ cell }) => open.has(cell.requiredKeyId!)),
    shut: doors.filter(({ cell }) => !open.has(cell.requiredKeyId!)),
  }
}

const eachPosition = (run: (name: string, state: string) => void) => {
  for (const { name } of SCENARIOS) for (const state of ["dry", "wet"]) run(name, state)
}

const revealed = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

const liveGrid = (name: string, state: string) => {
  const { seed, positions } = positionOf(name, state)
  const config = SCENARIOS.find(s => s.name === name)!.config
  const { result } = renderHook(() =>
    useAssembledFloor(JOURNEY, config, seed, 0, {}, null, 0, undefined, undefined, positions)
  )
  return revealed(result.current.grid!)
}

const marksIn = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<SVGSVGElement>("svg"))
    .filter(svg => svg.getAttribute("viewBox") === "-12 -12 24 24")
    .map(svg => ({
      glyph: svg.querySelector("text")?.textContent,
      x: parseFloat(svg.style.left) + 11,
      y: parseFloat(svg.style.top) + 11,
    }))
// Where a mark rides on a blockage standing on a cell: the sprite's own seat (SiteMapView's NodeSprite mark).
const blockageMarkAt = (r: number, c: number) => {
  const { cx, cy } = cellCenter(r, c)
  return { x: cx, y: cy - CELL * 0.12 }
}
const markAt = (container: HTMLElement, r: number, c: number) => {
  const want = blockageMarkAt(r, c)
  return marksIn(container).find(m => Math.abs(m.x - want.x) < 0.01 && Math.abs(m.y - want.y) < 0.01)
}
const spritesAt = (container: HTMLElement, r: number, c: number) =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-node-sprite]")).filter(el =>
    el.getAttribute("data-node-sprite")!.endsWith(`:${r},${c}`)
  )

describe("a shut region barrier is drawn as a blockage", () => {
  eachPosition((name, state) => {
    it(`${name}: in ${state}, every shut barrier door is a bare cell wearing its owner's mark, never a barred door or a prop`, () => {
      const { shut } = positionOf(name, state)
      const grid = liveGrid(name, state)
      const { container } = render(<SiteMapView grid={grid} />)
      for (const {
        at: [r, c],
        cell,
      } of shut) {
        const where = `${name} / ${state} / ${r},${c}`
        expect(
          spritesAt(container, r, c).map(s => s.getAttribute("data-node-sprite")),
          `${where}: a prop stands on the blockage`
        ).toEqual([])
        expect(markAt(container, r, c), `${where}: the blockage wears no mark`).toBeDefined()
        expect(markAt(container, r, c)!.glyph).toBe(String.fromCodePoint(cell.mark!.glyph))
      }
      expect(container.querySelectorAll('[data-node-sprite^="gate:"],[data-node-sprite^="wall:"]')).toHaveLength(0)
    })
  })

  it("shuts at least one barrier in some position of every floor, so the cases above are not empty", () => {
    for (const { name } of SCENARIOS) {
      const counts = ["dry", "wet"].map(state => positionOf(name, state).shut.length)
      expect(Math.max(...counts), name).toBeGreaterThan(0)
    }
  })
})

describe("an open region barrier is ordinary ground", () => {
  eachPosition((name, state) => {
    it(`${name}: in ${state}, every open barrier door is a plain corridor with nothing drawn on it`, () => {
      const { open } = positionOf(name, state)
      const grid = liveGrid(name, state)
      const { container } = render(<SiteMapView grid={grid} />)
      for (const {
        at: [r, c],
      } of open) {
        const where = `${name} / ${state} / ${r},${c}`
        const now = grid.cells[r][c]
        expect(now.type, where).toBe("corridor")
        expect(now.type === "corridor" && now.openGate, `${where}: remembers a gate`).toBeFalsy()
        expect(
          spritesAt(container, r, c).map(s => s.getAttribute("data-node-sprite")),
          where
        ).toEqual([])
        expect(markAt(container, r, c), `${where}: wears a mark`).toBeUndefined()
      }
    })
  })

  it("opens at least one barrier in some position of every floor, so the cases above are not empty", () => {
    for (const { name } of SCENARIOS) {
      const counts = ["dry", "wet"].map(state => positionOf(name, state).open.length)
      expect(Math.max(...counts), name).toBeGreaterThan(0)
    }
  })
})

type Store = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  standingKey: string | null
  mechanismStates: Record<string, string>
}

const journeyData = {
  id: JOURNEY,
  exterior: "pyramid",
  difficulty: "starter",
  levelCount: 1,
  journeyLength: "short",
  name: JOURNEY,
  lengthLabel: "short",
} as TranslatedJourney

const harness = (name: string) => {
  const { seed, grid: base } = carved.get(name)!
  const config = SCENARIOS.find(s => s.name === name)!.config
  const store: Store = { exploredCells: {}, positionKey: null, standingKey: null, mechanismStates: {} }
  const encountered: [number, number][] = []
  const siteConfig: SiteConfig = [config]
  const doc = (): StoredJourneyStateV3 => ({
    journeyId: JOURNEY,
    levelNr: 1,
    completionCount: 0,
    active: true,
    exploredSections: {},
    exploredCells: store.exploredCells,
    position: null,
    positionKey: store.positionKey,
    standingKey: store.standingKey,
    interiorLevelNr: null,
    mechanismStates: store.mechanismStates,
  })
  const hook = renderHook(() => {
    const [, force] = useState(0)
    void force
    const journeys = {
      ...createJourneysV3Api({
        journeys: [doc()],
        setJourneys: updater => {
          const next =
            typeof updater === "function"
              ? (updater as (prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])([doc()])
              : updater
          store.exploredCells = next[0]?.exploredCells ?? {}
          store.positionKey = next[0]?.positionKey ?? null
          store.standingKey = next[0]?.standingKey ?? null
          store.mechanismStates = next[0]?.mechanismStates ?? {}
        },
        journeyData: [journeyData],
      }),
      getPurchasedShopSlots: () => new Set<string>(),
      getSkippedConsumables: () => new Set<string>(),
    } as unknown as JourneyAPI
    const assembled = useAssembledFloor(
      JOURNEY,
      config,
      seed,
      0,
      journeys.getExploredCells(JOURNEY),
      store.positionKey,
      0,
      undefined,
      undefined,
      useMechanismStates(journeys, JOURNEY),
      store.standingKey
    )
    const nav = useSiteNavigation({
      journeys,
      journeyId: JOURNEY,
      siteConfig,
      seed,
      currentFloor: 0,
      grid: assembled.grid,
      explorerPos: assembled.explorerPos,
      onEncounter: ([r, c]) => {
        encountered.push([r, c])
        const cell = assembled.grid?.cells[r]?.[c]
        const address = cell && cellAddress(assembled.grid!, 0, r, c)
        if (cell && cell.type !== "empty" && address)
          journeys.markCellExplored(cell.sectionHash ?? "", encodeEdge(0, r, c), address)
      },
      onSkippedConsumable: () => {},
      onExitReached: () => {},
    })
    return { ...assembled, ...nav, journeys }
  })
  const settle = () => {
    act(() => vi.advanceTimersByTime(5000))
    hook.rerender()
  }
  const dirsOf = (grid: FloorGrid, r: number, c: number): Direction[] => {
    const cell = grid.cells[r]?.[c]
    return cell && cell.type !== "empty" ? [...cell.dirs] : []
  }
  const walkTo = (goal: readonly [number, number]) => {
    const prompts: { kind: string; at: readonly [number, number] }[] = []
    const stood: [number, number][] = []
    const distance = (grid: FloorGrid, from: readonly [number, number]): number => {
      const seen = new Map<string, number>([[`${from[0]},${from[1]}`, 0]])
      const queue: [number, number][] = [[from[0], from[1]]]
      for (let i = 0; i < queue.length; i++) {
        const [r, c] = queue[i]
        for (const dir of dirsOf(grid, r, c)) {
          const [dr, dc] = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[dir]
          const key = `${r + dr},${c + dc}`
          if (seen.has(key)) continue
          seen.set(key, seen.get(`${r},${c}`)! + 1)
          queue.push([r + dr, c + dc])
        }
      }
      return seen.get(`${goal[0]},${goal[1]}`) ?? Infinity
    }
    for (let step = 0; step < 300; step++) {
      hook.rerender()
      const { grid, explorerPos } = hook.result.current
      if (!grid) break
      if (explorerPos[0] === goal[0] && explorerPos[1] === goal[1]) break
      const offers = offeredTargets(grid, buildRoomClaims(grid), explorerPos)
      let best: readonly [number, number] | undefined
      let bestDistance = distance(grid, explorerPos)
      for (const [, target] of offers) {
        const d = distance(grid, target)
        if (d < bestDistance) {
          best = target
          bestDistance = d
        }
      }
      if (!best) break
      act(() => hook.result.current.onCellClick(best![0], best![1]))
      settle()
      stood.push([hook.result.current.explorerPos[0], hook.result.current.explorerPos[1]])
      const prompt = hook.result.current.prompt
      if (prompt) prompts.push({ kind: prompt.kind, at: prompt.at })
    }
    return { prompts, stood }
  }
  return { hook, encountered, walkTo, base, config }
}

describe("walking through an open region barrier, on the real navigation hook", () => {
  afterEach(() => vi.useRealTimers())

  const MOVES = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const

  // The first cell of the far side of a door that is somewhere to stand, read off the carve itself.
  const farSide = (grid: FloorGrid, door: [number, number]): [number, number] => {
    const here = grid.cells[door[0]][door[1]]
    if (here.type === "empty") throw new Error("a door stands on void")
    const route = findPath(grid, grid.entrancePos, door)
    const first = [...here.dirs]
      .map(dir => [door[0] + MOVES[dir][0], door[1] + MOVES[dir][1]] as [number, number])
      .find(([r, c]) => !route.some(([pr, pc]) => pr === r && pc === c))!
    const step = [first[0] - door[0], first[1] - door[1]]
    let at = first
    for (;;) {
      const cell = grid.cells[at[0]][at[1]]
      const straight =
        cell.type === "corridor" &&
        cell.dirs.size === 2 &&
        [...cell.dirs].every(dir => (MOVES[dir][0] === 0) === (step[0] === 0))
      if (!straight) return at
      at = [at[0] + step[0], at[1] + step[1]]
    }
  }

  it("a hall on the route is crossed from the way in to its far side with no prompt, no stop and no room entered on a door", () => {
    vi.useFakeTimers()
    const name = SCENARIOS[0].name
    const state = ["dry", "wet"].find(
      s => positionOf(name, s).open.length > 0 && positionOf(name, s).shut.length === 0
    )!
    const h = harness(name)
    const { at } = mechanismOf(h.base)
    act(() => h.hook.result.current.journeys.setMechanismState(cellAddress(h.base, 0, at[0], at[1])!, state))
    h.hook.rerender()
    const doors = doorsIn(h.base).map(d => d.at)
    expect(doors.length, "the hall has an entrance each side").toBeGreaterThan(1)
    const goal = farSide(revealed(h.hook.result.current.grid!), doors[0])
    const { prompts, stood } = h.walkTo(goal)
    const { explorerPos } = h.hook.result.current
    expect([explorerPos[0], explorerPos[1]], "the explorer stands beyond the door").toEqual(goal)
    expect(stood.length).toBeGreaterThan(0)
    const onDoor = (cell: readonly [number, number]) => doors.some(([r, c]) => r === cell[0] && c === cell[1])
    expect(prompts.filter(p => onDoor(p.at))).toEqual([])
    expect(h.encountered.filter(onDoor)).toEqual([])
    expect(stood.filter(onDoor), "the explorer is never halted on a door").toEqual([])
  }, 60_000)
})
