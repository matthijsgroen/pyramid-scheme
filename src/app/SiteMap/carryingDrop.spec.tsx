// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { oneWayRuns } from "@/game/gridNavigation"
import { plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./playgroundCarve"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("a carrying walk at a drop's launch", () => {
  it("is turned away", () => {
    const config = stoneFloor("in -- yard\nyard -- out\nout >> in\nshelf plate @yard stone\nin ?\nyard ?\nout ?", {
      realisations: { weights: "stonePlate", "one-way": "zipline" },
    })
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    const h = { ...sequenceHarness(carved.seed, config), grid: carved.grid }
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    const { launch } = oneWayRuns(h.grid)[0]
    h.walkTo(launch)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: launch })
  })
})
