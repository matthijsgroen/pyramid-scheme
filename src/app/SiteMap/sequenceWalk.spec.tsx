// @vitest-environment jsdom
import { cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { cellAddress } from "@/game/cellAddress"
import { findPath } from "@/game/gridNavigation"
import { progressState, sequenceStates, spoiledState, tileStatus, type TileStatus } from "@/game/sequence"
import {
  hallAnnexSequenceFloor,
  offRouteSequenceFloor,
  oneRegionSequenceFloor,
} from "@/game/testSupport/sequenceFixtures"
import { useAssembledFloor } from "./useAssembledFloor"
import { SiteMapView } from "./SiteMapView"
import { plateLook } from "./plateLook"
import {
  JOURNEY,
  carveSequence,
  homeOf,
  routesAreClean,
  revealed,
  roomsOf,
  sequenceHarness,
  tilesOf,
  type Place,
} from "./sequenceHarness.testing"
import "@/mods/registerModApps"

const FLOORS: { name: string; make: () => FloorConfig }[] = [
  { name: "tiles in the hall, an annex and the hall again", make: hallAnnexSequenceFloor },
  { name: "all tiles in one region", make: oneRegionSequenceFloor },
  { name: "tiles spread across off-route regions", make: offRouteSequenceFloor },
]

const carved = new Map<string, { seed: number; grid: FloorGrid; config: FloorConfig }>()
beforeAll(() => {
  for (const { name, make } of FLOORS) {
    const config = make()
    carved.set(name, { ...carveSequence(config, routesAreClean), config })
  }
}, 120_000)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const isTile =
  (grid: FloorGrid) =>
  ([r, c]: Place) =>
    tilesOf(grid).some(({ at }) => at[0] === r && at[1] === c)

// A tile whose route from the entrance runs over no tile at all, so stepping on it first is a wrong step.
const spoilingTile = (grid: FloorGrid) =>
  tilesOf(grid).find(
    ({ at, cell }) =>
      cell.sequenceTile!.step > 0 &&
      findPath(revealed(grid), grid.entrancePos as Place, at)
        .slice(1, -1)
        .every(p => !isTile(grid)(p))
  )

const spoiled = new Map<string, { seed: number; grid: FloorGrid; config: FloorConfig }>()
beforeAll(() => {
  for (const { name, make } of FLOORS) {
    const config = make()
    spoiled.set(name, { ...carveSequence(config, g => spoilingTile(g) !== undefined), config })
  }
}, 120_000)

const stateOf = (h: ReturnType<typeof sequenceHarness>, grid: FloorGrid) => {
  const home = homeOf(grid)
  return h
    .current()
    .journeys.getMechanismStates(JOURNEY)
    .get(cellAddress(grid, 0, home.at[0], home.at[1])!)
}

const start = (name: string) => {
  vi.useFakeTimers()
  const { seed, grid, config } = carved.get(name)!
  return { h: sequenceHarness(seed, config), grid, seed, config }
}

describe.each(FLOORS)("walking a sequence of $name", ({ name }) => {
  it("each tile walked in order advances the run one step, with no prompt and no encounter opened", () => {
    const { h, grid } = start(name)
    const tiles = tilesOf(grid)
    tiles.forEach(({ at }, k) => {
      h.walkTo(at)
      expect(h.current().explorerPos, `standing on tile ${k}`).toEqual(at)
      expect(stateOf(h, grid), `after tile ${k}`).toBe(progressState(k + 1))
      expect(h.current().prompt, `a prompt on tile ${k}`).toBeNull()
      expect(h.encountered.filter(isTile(grid)), `an encounter opened on a tile by tile ${k}`).toEqual([])
    })
  }, 60_000)

  it("a tile walked in order a second time does nothing", () => {
    const { h, grid } = start(name)
    const [first] = tilesOf(grid)
    h.walkTo(first.at)
    expect(stateOf(h, grid)).toBe(progressState(1))
    h.walkTo(grid.entrancePos as Place)
    h.walkTo(first.at)
    expect(stateOf(h, grid)).toBe(progressState(1))
  }, 60_000)

  it("a tile stepped on out of order spoils the run, and every tile after that does nothing", () => {
    vi.useFakeTimers()
    const { seed, config, grid } = spoiled.get(name)!
    const h = sequenceHarness(seed, config)
    const wrong = spoilingTile(grid)!
    h.walkTo(wrong.at)
    const state = spoiledState(0, wrong.cell.sequenceTile!.step)
    expect(stateOf(h, grid)).toBe(state)
    for (const { at } of tilesOf(grid)) {
      h.walkTo(at)
      expect(stateOf(h, grid)).toBe(state)
    }
  }, 60_000)

  it("once the order is done it stays done: walking any tile again changes nothing", () => {
    const { h, grid } = start(name)
    const tiles = tilesOf(grid)
    for (const { at } of tiles) h.walkTo(at)
    const done = progressState(tiles.length)
    expect(stateOf(h, grid)).toBe(done)
    for (const { at } of [...tiles].reverse()) {
      h.walkTo(at)
      expect(stateOf(h, grid)).toBe(done)
    }
  }, 60_000)

  it("finishing the order opens the door: the gate it opens stops being a gate and its face is gone", () => {
    const { h, grid } = start(name)
    const door = roomsOf(grid).find(({ cell }) => cell.worksMechanism && !cell.sequenceTile)!
    const key = door.cell.requiredKeyId!
    expect(h.current().openGateKeys.has(key)).toBe(false)
    expect(h.current().grid!.cells[door.at[0]][door.at[1]].type).toBe("room")
    for (const { at } of tilesOf(grid)) h.walkTo(at)
    expect(h.current().openGateKeys.has(key)).toBe(true)
    const now = h.current().grid!.cells[door.at[0]][door.at[1]]
    expect(now.type).toBe("corridor")
    expect(now.type === "corridor" && now.openGate?.requiredKeyId).toBe(key)
  }, 60_000)

  it("progress survives leaving: unmounted and mounted again from the store, the run and the floor read the same", () => {
    const { h, grid } = start(name)
    const [first, second] = tilesOf(grid)
    h.walkTo(first.at)
    h.walkTo(second.at)
    const faceOf = () => roomsOf(h.current().grid!).find(({ cell }) => cell.gateFace)!.cell.gateFace
    const faceBefore = faceOf()
    const liveStates = h.current().mechanismStates
    const plates = (container: HTMLElement) =>
      Array.from(container.querySelectorAll("[data-plate]")).map(el => [
        el.getAttribute("data-plate"),
        el.getAttribute("data-status"),
      ])
    const before = render(
      <SiteMapView grid={revealed(h.current().grid!)} currentFloor={0} mechanismStates={liveStates} />
    )
    const drawnBefore = plates(before.container)
    before.unmount()
    h.remount()
    expect(stateOf(h, grid)).toBe(progressState(2))
    expect(faceOf()).toEqual(faceBefore)
    expect(h.current().explorerPos).toEqual(second.at)
    const again = render(
      <SiteMapView grid={revealed(h.current().grid!)} currentFloor={0} mechanismStates={h.current().mechanismStates} />
    )
    expect(plates(again.container)).toEqual(drawnBefore)
    expect(drawnBefore.map(([, status]) => status).sort()).toEqual(
      ["inOrder", "inOrder", ...Array(drawnBefore.length - 2).fill("unwalked")].sort()
    )
  }, 60_000)
})

describe("a tile still in fog", () => {
  it("is not worked by a tap on it: the run stays where it was and the explorer stays put", () => {
    const { h, grid } = start(FLOORS[0].name)
    const fogged = tilesOf(h.current().grid!).filter(({ cell }) => cell.state === "fogged")
    expect(fogged.length, "a tile is fogged when the floor is first entered").toBeGreaterThan(0)
    const before = h.current().explorerPos
    for (const { at } of fogged) h.tap(at[0], at[1])
    expect(stateOf(h, grid)).toBeUndefined()
    expect(h.current().explorerPos).toEqual(before)
  }, 60_000)

  it("works once it has been revealed and is walked onto", () => {
    const { h, grid } = start(FLOORS[0].name)
    const [first] = tilesOf(grid)
    const foggedAtStart =
      tilesOf(h.current().grid!).find(({ cell }) => cell.sequenceTile!.step === 0)!.cell.state === "fogged"
    h.walkTo(first.at)
    expect(foggedAtStart).toBe(true)
    expect(
      roomsOf(h.current().grid!).find(({ at }) => at[0] === first.at[0] && at[1] === first.at[1])!.cell.state
    ).not.toBe("fogged")
    expect(stateOf(h, grid)).toBe(progressState(1))
  }, 60_000)
})

describe("every tile shows its own state", () => {
  const lookOf = (grid: FloorGrid, state: string) => {
    const home = homeOf(grid)
    const positions = new Map([[cellAddress(grid, 0, home.at[0], home.at[1])!, state]])
    return positions
  }

  const drawn = (container: HTMLElement) =>
    new Map(
      Array.from(container.querySelectorAll<SVGGElement>("[data-plate]")).map(el => [
        Number(el.getAttribute("data-plate")),
        {
          status: el.getAttribute("data-status"),
          fill: el.querySelector("rect")?.getAttribute("fill"),
          stroke: el.querySelector("rect")?.getAttribute("stroke"),
        },
      ])
    )

  for (const { name } of FLOORS) {
    it(`${name}: in every state of the run, each tile wears exactly the look of its status`, () => {
      const { seed, config, grid } = carved.get(name)!
      const tiles = tilesOf(grid)
      const looksSeen = new Set<TileStatus>()
      for (const state of sequenceStates(tiles.length)) {
        const positions = lookOf(grid, state)
        const { result } = renderHook(() =>
          useAssembledFloor(JOURNEY, config, seed, 0, {}, null, 0, undefined, undefined, positions)
        )
        const { container, unmount } = render(
          <SiteMapView grid={revealed(result.current.grid!)} currentFloor={0} mechanismStates={positions} />
        )
        const plates = drawn(container)
        expect(plates.size, `${state}: every tile is drawn`).toBe(tiles.length)
        for (const { cell } of tiles) {
          const { glyph, step } = cell.sequenceTile!
          const want = tileStatus(state, step)
          looksSeen.add(want)
          const got = plates.get(glyph)
          expect(got, `${state} / tile ${step}`).toEqual({
            status: want,
            fill: plateLook[want].fill,
            stroke: plateLook[want].stroke,
          })
        }
        unmount()
      }
      expect([...looksSeen].sort()).toEqual(["inOrder", "outOfOrder", "unwalked"])
    })
  }

  it("the three looks differ from one another in fill and in stroke colour", () => {
    const looks = Object.values(plateLook)
    expect(new Set(looks.map(l => l.fill)).size).toBe(3)
    expect(new Set(looks.map(l => l.stroke)).size).toBe(3)
  })

  it("a tile is never drawn as a finished room, in any state, once the ground is walked", () => {
    const { seed, config, grid } = carved.get(FLOORS[0].name)!
    const n = tilesOf(grid).length
    for (const state of [progressState(0), progressState(n), spoiledState(0, n - 1)]) {
      const positions = lookOf(grid, state)
      const { result } = renderHook(() =>
        useAssembledFloor(JOURNEY, config, seed, 0, {}, null, 0, undefined, undefined, positions)
      )
      const walked = {
        ...result.current.grid!,
        cells: result.current.grid!.cells.map(row =>
          row.map(cell => (cell.type === "empty" ? cell : { ...cell, state: "completed" as const }))
        ),
      }
      const { container, unmount } = render(<SiteMapView grid={walked} currentFloor={0} mechanismStates={positions} />)
      const plates = container.querySelectorAll("[data-plate]")
      expect(plates.length, state).toBe(n)
      for (const plate of plates) {
        const marker = plate.closest("[data-marker-cell]")
        expect(marker?.textContent, state).not.toContain("✓")
        expect(marker?.querySelector("g[opacity]")?.getAttribute("opacity"), state).toBe("1")
      }
      unmount()
    }
  })
})
