// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Direction, GridCell } from "@/game/siteTypes"
import type { RegionBarrierCover } from "@/game/regionBarrierCover"
import { barrierSound, CORE_SOUNDS } from "@/app/audio/coreSounds"
import { floorFrom } from "./floorFixtures.testing"
import { useRevealWave } from "./useRevealWave"
import { useRegionBarrierCovers } from "./useRegionBarrierCovers"

const playSound = vi.hoisted(() => vi.fn())
vi.mock("@/app/audio/audio", () => ({ playSound }))

const hidden = (dirs: Direction[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "reachable",
  hidden: true,
})

const SHUT = floorFrom(["E..R   "])
const OPEN = floorFrom(["E..Rhhh"], { h: hidden })

const cover = (region: string, realisation: string): RegionBarrierCover => ({ region, realisation, cells: [] })

beforeEach(() => playSound.mockClear())

describe("a corridor opening behind a gate", () => {
  it("sounds once when it opens, and not on mount", () => {
    const { rerender } = renderHook(({ grid }) => useRevealWave(grid, "site:0"), { initialProps: { grid: SHUT } })
    expect(playSound).toHaveBeenCalledTimes(0)
    rerender({ grid: OPEN })
    rerender({ grid: OPEN })
    expect(playSound.mock.calls.map(([name]) => name)).toEqual([CORE_SOUNDS.corridorOpens])
  })

  it("stays quiet when the next floor shows more", () => {
    const { rerender } = renderHook(({ grid, floor }) => useRevealWave(grid, floor), {
      initialProps: { grid: SHUT, floor: "site:0" },
    })
    rerender({ grid: OPEN, floor: "site:1" })
    expect(playSound).toHaveBeenCalledTimes(0)
  })
})

describe("a region barrier receding", () => {
  it("sounds its own realisation once when its cover goes, and not on mount", () => {
    const { rerender } = renderHook(({ covers }) => useRegionBarrierCovers(covers, "site:0"), {
      initialProps: { covers: [cover("a", "made-up-water"), cover("b", "made-up-sand")] },
    })
    expect(playSound).toHaveBeenCalledTimes(0)
    rerender({ covers: [cover("b", "made-up-sand")] })
    rerender({ covers: [cover("b", "made-up-sand")] })
    expect(playSound.mock.calls.map(([name]) => name)).toEqual([barrierSound("made-up-water")])
  })

  it("stays quiet on a floor change", () => {
    const { rerender } = renderHook(({ covers, floor }) => useRegionBarrierCovers(covers, floor), {
      initialProps: { covers: [cover("a", "made-up-water")], floor: "site:0" },
    })
    rerender({ covers: [], floor: "site:1" })
    expect(playSound).toHaveBeenCalledTimes(0)
  })
})
