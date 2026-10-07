// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findPath, revealAll } from "@/game/gridNavigation"
import { SHELF_AND_DOOR, TWO_STONES, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./playgroundCarve.testing"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const play = (text: string) => {
  const config = stoneFloor(text)
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  return { ...sequenceHarness(carved.seed, config), grid: carved.grid }
}

describe("a plate offers its stone", () => {
  it("arriving on a plate holding a stone offers the lift and moves nothing", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "shelf"))
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "lift" })
    expect(h.store.mechanismStates).toEqual({})
  })

  it("taking the lift puts the stone in hand, and the empty plate it stood on offers it back on a second tap", () => {
    const h = play(SHELF_AND_DOOR)
    const shelf = plateNamed(h.grid, "shelf")
    h.tap(shelf[0], shelf[1])
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).toEqual(["+ hand"])
    expect(h.current().prompt).toBeNull()
    h.tap(shelf[0], shelf[1])
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "set" })
  })

  it("a stone set back down on its plate is offered again and lifts a second time", () => {
    const h = play(SHELF_AND_DOOR)
    const shelf = plateNamed(h.grid, "shelf")
    h.tap(shelf[0], shelf[1])
    act(() => h.current().prompt!.take())
    h.settle()
    h.tap(shelf[0], shelf[1])
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).toEqual(["stones.shelf"])
    h.tap(shelf[0], shelf[1])
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "lift" })
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).toEqual(["+ hand"])
  })

  it("setting the stone on the door's plate opens the door", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(plateNamed(h.grid, "p"))
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "set" })
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).toEqual(["stones.p"])
    expect(h.current().openGateKeys.size).toBe(1)
  })

  it("offers no lift on a plate holding a stone while the hand is full", () => {
    const h = play(TWO_STONES)
    h.walkTo(plateNamed(h.grid, "a"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(plateNamed(h.grid, "b"))
    expect(h.current().prompt).toBeNull()
  })

  it("offers nothing on an empty plate with empty hands", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "p"))
    expect(h.current().prompt).toBeNull()
  })

  it("a walk over a plate to somewhere else moves no stone and offers nothing", () => {
    const h = play(TWO_STONES)
    const lit = revealAll(h.grid)
    const a = plateNamed(h.grid, "a")
    // A plate some route from the entrance crosses on its way to another plate, if this carve has one.
    const crossing = ["b", "p"]
      .map(name => plateNamed(h.grid, name))
      .find(to => findPath(lit, h.grid.entrancePos, to).some(([r, c]) => r === a[0] && c === a[1]))
    expect(crossing, "some route crosses plate a on its way to another plate").toBeDefined()
    h.walkTo(crossing!)
    expect(h.store.mechanismStates).toEqual({})
    expect(h.current().prompt?.at).not.toEqual(a)
  })
})

describe("standing on a plate", () => {
  it("leaves the way it would open shut for the walk: the door is still a door and no gate key is held", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "p"))
    const { grid, openGateKeys } = h.current()
    expect(openGateKeys.size).toBe(0)
    expect(grid!.cells.flat().some(cell => cell.type === "room" && cell.tags?.includes("gate"))).toBe(true)
  })
})

describe("a carrying walk", () => {
  const OPEN = "in -- out\nshelf plate @in stone\nin ?\nout ?"
  const lift = (h: ReturnType<typeof play>) => {
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
  }

  it("is turned away at the way out: no prompt, the line that says why", () => {
    const h = play(OPEN)
    lift(h)
    h.walkTo(h.grid.exitPos)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: h.grid.exitPos })
  })

  it("is offered the way out again once the hands are empty", () => {
    const h = play(OPEN)
    lift(h)
    const shelf = plateNamed(h.grid, "shelf")
    h.tap(shelf[0], shelf[1])
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).not.toContain("+ hand")
    h.walkTo(h.grid.exitPos)
    expect(h.current().prompt).toMatchObject({ kind: "exit" })
    expect(h.current().notice).toBeNull()
  })

  it("is turned away at the stairs back up, as at the way down", () => {
    const config = stoneFloor(OPEN, { entrance: "stairhead" })
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    const h = { ...sequenceHarness(carved.seed, config), grid: carved.grid }
    lift(h)
    h.walkTo(h.grid.entrancePos)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: h.grid.entrancePos })
  })

  it("forgets the line at the next tap, which moves the explorer on", () => {
    const h = play(OPEN)
    lift(h)
    h.walkTo(h.grid.exitPos)
    h.walkTo(plateNamed(h.grid, "shelf"))
    expect(h.current().notice).toBeNull()
  })
})
