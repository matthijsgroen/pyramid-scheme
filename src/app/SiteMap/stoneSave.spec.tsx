// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isCarrying, plateLookAt } from "@/game/stonePlay"
import { SHELF_AND_DOOR, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./playgroundCarve.testing"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const play = () => {
  const config = stoneFloor(SHELF_AND_DOOR)
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  return { ...sequenceHarness(carved.seed, config), grid: carved.grid }
}

describe("the stones in the save", () => {
  it("are one entry, filed under the first plate's slot", () => {
    const h = play()
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.keys(h.store.mechanismStates)).toEqual([expect.stringContaining("xplate:stones.p")])
  })

  it("keep a stone in hand through a reload: he still carries it and the empty plate offers the set-down", () => {
    const h = play()
    const shelf = plateNamed(h.grid, "shelf")
    h.walkTo(shelf)
    act(() => h.current().prompt!.take())
    h.settle()
    h.remount()
    h.settle()
    const { grid, mechanismStates } = h.current()
    expect(isCarrying(grid!, 0, mechanismStates)).toBe(true)
    h.tap(shelf[0], shelf[1])
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "set" })
  })

  it("keep a stone where it was set down through a reload, and the door it holds open", () => {
    const h = play()
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(plateNamed(h.grid, "p"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.remount()
    h.settle()
    const { grid, mechanismStates, openGateKeys } = h.current()
    const [r, c] = plateNamed(grid!, "p")
    expect(plateLookAt(grid!, 0, r, c, mechanismStates, false)).toBe("stone")
    expect(openGateKeys.size).toBe(1)
  })

  it("read as the authored start where the save holds no entry", () => {
    const h = play()
    const { grid, mechanismStates, openGateKeys } = h.current()
    const [r, c] = plateNamed(grid!, "shelf")
    expect(h.store.mechanismStates).toEqual({})
    expect(plateLookAt(grid!, 0, r, c, mechanismStates, false)).toBe("stone")
    expect(openGateKeys.size).toBe(0)
  })
})
