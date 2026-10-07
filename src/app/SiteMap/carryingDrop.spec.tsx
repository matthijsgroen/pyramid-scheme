// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { oneWayRuns } from "@/game/gridNavigation"
import type { OneWayRealisationMeta } from "@/game/oneWayRealisation"
import { plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./playgroundCarve.testing"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

// The registry's realisations with `handsFull` taken off, so each half of the launch guard is pinned alone: an
// `unladen` drop turns a carrying walk away by the lock's word, a `handsFull` realisation by its own (handed to the
// navigation only, where a stone floor's carve would refuse it as `stonePasses`).
vi.mock("@/mods/allOneWayRealisations", async importOriginal => {
  const real = await importOriginal<typeof import("@/mods/allOneWayRealisations")>()
  return {
    resolveOneWayRealisation: (id: string | undefined): OneWayRealisationMeta | undefined => {
      const meta = real.resolveOneWayRealisation(id)
      return meta && { id: meta.id, ownerMod: meta.ownerMod, ...(meta.prompt ? { prompt: meta.prompt } : {}) }
    },
  }
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const dropFloor = (drop: string) =>
  stoneFloor(`in -- yard\nyard -- out\n${drop}\nshelf plate @yard stone\nin ?\nyard ?\nout ?`, {
    realisations: { weights: "stonePlate", "one-way": "zipline" },
  })

const playCarrying = (drop: string, resolveOneWay?: (id: string | undefined) => OneWayRealisationMeta | undefined) => {
  const config = dropFloor(drop)
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  const h = { ...sequenceHarness(carved.seed, config, resolveOneWay ? { resolveOneWay } : {}), grid: carved.grid }
  h.walkTo(plateNamed(h.grid, "shelf"))
  act(() => h.current().prompt!.take())
  h.settle()
  return h
}

describe("a carrying walk at a drop's launch", () => {
  it("is turned away at the launch of a drop the lock takes with empty hands", () => {
    const h = playCarrying("out -[unladen]- >> in")
    const { launch } = oneWayRuns(h.grid)[0]
    h.walkTo(launch)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: launch })
  })

  it("is turned away by a handsFull realisation the carve did not see (a defensive fallback for a carve/play registry mismatch, never a carved stone floor)", () => {
    const zipline = (id: string | undefined): OneWayRealisationMeta | undefined =>
      id === "zipline" ? { id, ownerMod: "topology", prompt: "ui.prompt.zipline", handsFull: true } : undefined
    const h = playCarrying("out >> in", zipline)
    const { launch, unladen } = oneWayRuns(h.grid)[0]
    expect(unladen).toBeUndefined()
    h.walkTo(launch)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: launch })
  })
})
