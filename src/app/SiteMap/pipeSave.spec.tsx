// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { holeLookAt, isCarrying } from "@/game/stonePlay"
import { PIPE_BINDING, PIPED, holeIn, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./playgroundCarve"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const play = () => {
  const config = stoneFloor(PIPED, { realisations: PIPE_BINDING })
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  return { ...sequenceHarness(carved.seed, config), grid: carved.grid }
}

const posted = () => {
  const h = play()
  h.walkTo(plateNamed(h.grid, "shelf"))
  act(() => h.current().prompt!.take())
  h.settle()
  h.walkTo(holeIn(h.grid, "in"))
  expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "post" })
  act(() => h.current().prompt!.take())
  h.settle()
  return h
}

describe("a stone posted through a pipe, in the save", () => {
  it("is one entry, filed under the first plate's slot", () => {
    const h = posted()
    expect(Object.keys(h.store.mechanismStates)).toEqual([expect.stringMatching(/xplate:stones\.p$/)])
  })

  it("lies in the far hole through a reload, the near one empty and the hands free", () => {
    const h = posted()
    h.remount()
    h.settle()
    const { grid, mechanismStates } = h.current()
    const far = holeIn(grid!, "hall")
    const near = holeIn(grid!, "in")
    expect(holeLookAt(grid!, 0, far[0], far[1], mechanismStates)).toBe("stone")
    expect(holeLookAt(grid!, 0, near[0], near[1], mechanismStates)).toBe("empty")
    expect(isCarrying(grid!, 0, mechanismStates)).toBe(false)
  })

  it("is taken out of the far hole into the hand, past the narrow passage it went round", async () => {
    const h = posted()
    const far = holeIn(h.grid, "hall")
    for (let crossings = 0; crossings < 3; crossings++) {
      h.walkTo(far)
      if (h.current().prompt?.kind !== "obstacle") break
      await act(async () => h.current().prompt!.take())
      h.settle()
    }
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "take" })
    act(() => h.current().prompt!.take())
    h.settle()
    const { grid, mechanismStates } = h.current()
    expect(isCarrying(grid!, 0, mechanismStates)).toBe(true)
  })
})
