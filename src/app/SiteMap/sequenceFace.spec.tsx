// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { cellAddress } from "@/game/cellAddress"
import { findPath } from "@/game/gridNavigation"
import { progressState, sequenceStates, spoiledState, tileStatus } from "@/game/sequence"
import { hallAnnexSequenceFloor, oneRegionSequenceFloor } from "@/game/testSupport/sequenceFixtures"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useEncounter } from "./useEncounter"
import { SiteMapView } from "./SiteMapView"
import {
  JOURNEY,
  carveSequence,
  homeOf,
  revealed,
  roomsOf,
  routesAreClean,
  sequenceHarness,
  tilesOf,
  type Place,
} from "./sequenceHarness.testing"
import "@/mods/registerModApps"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}))

const FLOORS: { name: string; make: () => FloorConfig }[] = [
  { name: "tiles in the hall, an annex and the hall again", make: hallAnnexSequenceFloor },
  { name: "all tiles in one region", make: oneRegionSequenceFloor },
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

/** The sequence floor as a player stands on it, its run set to `state`, the door's face opened over it. */
const faceAt = (name: string, state: string) => {
  vi.useFakeTimers()
  const { seed, config, grid } = carved.get(name)!
  const h = sequenceHarness(seed, config)
  const home = homeOf(grid)
  act(() => h.current().journeys.setMechanismState(cellAddress(grid, 0, home.at[0], home.at[1])!, state))
  h.holder.hook.rerender()
  const door = roomsOf(h.current().grid!).find(({ cell }) => cell.gateFace)!
  const writes = vi.fn()
  const journeys = new Proxy(h.current().journeys, {
    get: (target, prop) =>
      prop === "setMechanismState"
        ? (address: string, next: string) => {
            writes(address, next)
            target.setMechanismState(address, next)
          }
        : target[prop as keyof JourneyAPI],
  })
  const encounterHook = renderHook(() =>
    useEncounter({
      journeys,
      journeyId: JOURNEY,
      levelNr: 1,
      currentFloor: 0,
      difficulty: "expert",
      grid: h.current().grid,
      ownedKeys: h.current().openGateKeys,
      onReward: vi.fn(),
    })
  )
  act(() => encounterHook.result.current.open(door.at, true))
  const { family, ctx, puzzle } = encounterHook.result.current
  const onCancel = vi.fn()
  const Component = family!.Component
  render(
    <Component
      puzzle={puzzle}
      ctx={ctx!}
      progression={{} as never}
      journeys={journeys as never}
      inventory={{} as never}
      applyReward={vi.fn()}
      onSolved={vi.fn()}
      onCancel={onCancel}
    />
  )
  return { h, grid, door, writes, onCancel, home }
}

const stateOf = (h: ReturnType<typeof sequenceHarness>, grid: FloorGrid) => {
  const home = homeOf(grid)
  return h
    .current()
    .journeys.getMechanismStates(JOURNEY)
    .get(cellAddress(grid, 0, home.at[0], home.at[1])!)
}

const listed = () => screen.getAllByRole("listitem")

describe.each(FLOORS)("the door of a sequence over $name", ({ name }) => {
  it("lists the tiles in step order with the glyph each wears, as the run stands, in every state, while shut", () => {
    const { grid } = carved.get(name)!
    const tiles = tilesOf(grid)
    for (const state of sequenceStates(tiles.length).filter(s => s !== progressState(tiles.length))) {
      const { door } = faceAt(name, state)
      expect(door.cell.requiredKeyId, "the door is still shut").toBeDefined()
      expect(
        listed().map(li => li.textContent),
        state
      ).toEqual(tiles.map(({ cell }) => String.fromCodePoint(cell.sequenceTile!.glyph)))
      expect(
        listed().map(li => li.getAttribute("data-status")),
        state
      ).toEqual(tiles.map(({ cell }) => tileStatus(state, cell.sequenceTile!.step)))
      expect(
        listed().map(li => li.getAttribute("aria-label")),
        state
      ).toEqual(tiles.map(({ cell }, k) => `gateFace.tile.${tileStatus(state, cell.sequenceTile!.step)}|${k + 1}`))
      cleanup()
    }
  })

  it("reading it writes nothing: turning away leaves the run, and the door, as they were", () => {
    const { h, grid, writes, onCancel } = faceAt(name, progressState(1))
    fireEvent.click(screen.getByRole("button", { name: "gate.turnAround" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(writes).not.toHaveBeenCalled()
    expect(stateOf(h, grid)).toBe(progressState(1))
    expect(h.current().openGateKeys.size).toBe(0)
  })

  it("offers no start again while nothing has been walked", () => {
    faceAt(name, progressState(0))
    expect(screen.queryByRole("button", { name: "gateFace.reset" })).toBeNull()
  })

  it("offers start again once the run is under way", () => {
    faceAt(name, progressState(1))
    expect(screen.getByRole("button", { name: "gateFace.reset" })).toBeDefined()
  })

  it("shows a spoiled run: the tile that went wrong, the tiles walked before it, and a note", () => {
    const { grid } = carved.get(name)!
    const tiles = tilesOf(grid)
    const wrong = tiles.length - 1
    faceAt(name, spoiledState(1, wrong))
    const status = listed().map(li => li.getAttribute("data-status"))
    expect(status[0]).toBe("inOrder")
    expect(status[wrong]).toBe("outOfOrder")
    expect(status.filter(s => s === "outOfOrder")).toHaveLength(1)
    expect(screen.getByText("gateFace.spoiled")).toBeDefined()
  })

  it("starting again from a spoiled run sends the run to its start and every tile back to unwalked", () => {
    const { grid } = carved.get(name)!
    const wrong = tilesOf(grid).length - 1
    const { h, writes, home } = faceAt(name, spoiledState(1, wrong))
    fireEvent.click(screen.getByRole("button", { name: "gateFace.reset" }))
    expect(writes).toHaveBeenCalledTimes(1)
    expect(writes).toHaveBeenCalledWith(cellAddress(grid, 0, home.at[0], home.at[1]), progressState(0))
    h.holder.hook.rerender()
    expect(stateOf(h, grid)).toBe(progressState(0))
    const { container } = render(
      <SiteMapView grid={revealed(h.current().grid!)} currentFloor={0} mechanismStates={h.current().mechanismStates} />
    )
    const looks = Array.from(container.querySelectorAll("[data-plate]")).map(el => el.getAttribute("data-status"))
    expect(looks).toHaveLength(tilesOf(grid).length)
    expect(new Set(looks)).toEqual(new Set(["unwalked"]))
  })

  it("starting again from a run under way clears the progress, and the first tile works the run afresh", () => {
    const { grid } = carved.get(name)!
    const { h } = faceAt(name, progressState(2))
    fireEvent.click(screen.getByRole("button", { name: "gateFace.reset" }))
    h.holder.hook.rerender()
    expect(stateOf(h, grid)).toBe(progressState(0))
    const [first] = tilesOf(grid)
    const route = findPath(revealed(grid), grid.entrancePos as Place, first.at)
    expect(route.length).toBeGreaterThan(0)
    h.walkTo(first.at)
    expect(stateOf(h, grid)).toBe(progressState(1))
  })
})
