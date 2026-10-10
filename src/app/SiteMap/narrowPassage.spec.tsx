// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findPath, revealAll, walkableFrom } from "@/game/gridNavigation"
import { passageSides } from "@/game/passages"
import type { FloorGrid } from "@/game/siteTypes"
import { CRACK, PASSAGE_BINDING, passageAt, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { PLAYGROUND_JOURNEY, carvePlayground } from "./playgroundCarve"
import { sequenceHarness } from "./sequenceHarness.testing"
import { useSiteNavigation } from "./useSiteNavigation"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const config = () => stoneFloor(CRACK, { realisations: PASSAGE_BINDING })

const carved = () => {
  const found = carvePlayground(config())
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return found
}

/** The passage, the side reached from the way in, and the side beyond it. */
const sidesOf = (grid: FloorGrid) => {
  const at = passageAt(grid)
  const [a, b] = passageSides(grid, at[0], at[1])!
  const near = findPath(revealAll(grid), grid.entrancePos, a).length > 0 ? a : b
  return { at, near, far: near === a ? b : a }
}

const play = () => {
  const { seed, grid } = carved()
  return { ...sequenceHarness(seed, config()), grid, ...sidesOf(grid) }
}

const cross = async (h: ReturnType<typeof play>) => {
  h.walkTo(h.near)
  h.tap(h.at[0], h.at[1])
  await act(async () => h.current().prompt!.take())
  h.settle()
}

describe("a narrow passage", () => {
  it("is offered as itself while a side of it is ground the explorer can walk to", () => {
    const h = play()
    h.walkTo(h.near)
    const { grid, explorerPos } = h.current()
    expect(offeredTargets(grid!, buildRoomClaims(grid!), explorerPos).get(`${h.at[0]},${h.at[1]}`)).toEqual(h.at)
  })

  it("is never ground: open with empty hands, it is still a door no walk enters", () => {
    const h = play()
    h.walkTo(h.near)
    const { grid, explorerPos, openGateKeys } = h.current()
    const door = grid!.cells[h.at[0]][h.at[1]]
    expect(door.type === "room" && door.passage).toEqual({ realisation: "narrowPassage" })
    expect(door.type === "room" && door.requiredKeyId !== undefined && openGateKeys.has(door.requiredKeyId)).toBe(true)
    const walkable = walkableFrom(grid!, explorerPos)
    expect(walkable.has(`${h.at[0]},${h.at[1]}`)).toBe(false)
    expect(walkable.has(`${h.far[0]},${h.far[1]}`)).toBe(false)
  })

  it("a tap on the wall walks the explorer to his side of it and offers the crossing there", () => {
    const h = play()
    h.walkTo(h.near)
    h.tap(h.at[0], h.at[1])
    expect(h.current().explorerPos).toEqual(h.near)
    expect(h.current().prompt).toMatchObject({
      kind: "obstacle",
      at: h.near,
      obstacleKind: "narrowPassage",
      invitation: "ui.prompt.squeeze",
    })
  })

  it("taking the crossing lands him on the far side", async () => {
    const h = play()
    await cross(h)
    expect(h.current().explorerPos).toEqual(h.far)
  })

  it("from the far side, a tap on the wall brings him back", async () => {
    const h = play()
    await cross(h)
    h.tap(h.at[0], h.at[1])
    expect(h.current().prompt).toMatchObject({ kind: "obstacle", at: h.far })
    await act(async () => h.current().prompt!.take())
    h.settle()
    expect(h.current().explorerPos).toEqual(h.near)
  })

  it("a reload keeps him on the far side", async () => {
    const h = play()
    await cross(h)
    h.remount()
    expect(h.current().explorerPos).toEqual(h.far)
  })

  it("stops a carrying walk beside the wall, with the line that says why", () => {
    const h = play()
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.tap(h.at[0], h.at[1])
    expect(h.current().explorerPos).toEqual(h.near)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: h.near })
  })
})

describe("a crossing under way", () => {
  const underWay = (playTraversal: () => Promise<void>) => {
    const { seed, grid: base } = carved()
    const grid = revealAll(base)
    const { at, near } = sidesOf(grid)
    const journeys = {
      markCellExplored: vi.fn(),
      updatePosition: vi.fn(),
      getPurchasedShopSlots: () => new Set<string>(),
      getSkippedConsumables: () => new Set<string>(),
      getMechanismStates: vi.fn(() => new Map<string, string>()),
      setMechanismState: vi.fn(),
    } as unknown as JourneyAPI
    const play = vi.fn(playTraversal)
    const hook = renderHook(() =>
      useSiteNavigation({
        journeys,
        journeyId: PLAYGROUND_JOURNEY,
        siteConfig: [config()],
        seed,
        currentFloor: 0,
        grid,
        explorerPos: near,
        onEncounter: () => {},
        onSkippedConsumable: () => {},
        onExitReached: () => {},
        playTraversal: play,
      })
    )
    act(() => hook.result.current.onCellClick(at[0], at[1]))
    act(() => void vi.advanceTimersByTime(5000))
    vi.mocked(journeys.updatePosition).mockClear()
    return { hook, journeys, play, at, near }
  }

  it("moves nobody on a tap until the crossing is over", async () => {
    const { hook, journeys, play, at, near } = underWay(() => new Promise<void>(() => {}))
    await act(async () => hook.result.current.prompt!.take())
    expect(play).toHaveBeenCalledWith(expect.objectContaining({ via: at }))
    act(() => hook.result.current.onCellClick(near[0], near[1]))
    act(() => void vi.advanceTimersByTime(5000))
    expect(journeys.updatePosition).not.toHaveBeenCalled()
    expect(hook.result.current.explorerHidden).toBe(true)
  })

  it("writes where he lands once, when the squeeze is over", async () => {
    let land = () => {}
    const { hook, journeys } = underWay(() => new Promise<void>(resolve => (land = resolve)))
    await act(async () => hook.result.current.prompt!.take())
    act(() => void vi.advanceTimersByTime(5000))
    expect(journeys.updatePosition).not.toHaveBeenCalled()
    await act(async () => land())
    act(() => void vi.advanceTimersByTime(5000))
    expect(journeys.updatePosition).toHaveBeenCalledTimes(1)
  })
})
