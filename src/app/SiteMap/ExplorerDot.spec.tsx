// @vitest-environment jsdom
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { ExplorerDot } from "./ExplorerDot"

const corridor = (dirs: string[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs) as GridCell extends { dirs: infer D } ? D : never,
  state: "completed",
})

const grid: FloorGrid = {
  cells: [[corridor(["e"]), corridor(["w", "e"]), corridor(["w"])]],
  rows: 1,
  cols: 3,
  entrancePos: [0, 0],
  exitPos: [0, 2],
  siteId: "test-site",
  staircases: {},
}

describe("ExplorerDot", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // The map keys this component by floor, so arriving downstairs mounts a fresh dot already standing
  // where it belongs. It has to say so: the map offers nowhere to walk until it hears the dot has
  // arrived, which left a deeper floor with no corridor arrows at all.
  it("announces arrival on mount, so a map remounted on a new floor knows where the dot is", () => {
    const onArrive = vi.fn()

    render(<ExplorerDot grid={grid} pos={[0, 1]} onArrive={onArrive} />)

    expect(onArrive).toHaveBeenCalled()
  })

  // Guards the other half: announcing on mount must not become the only time it announces. The walk
  // itself is driven by animation frames, so the clock has to be run out for the dot to get there.
  it("announces arrival again once it has walked somewhere", () => {
    const onArrive = vi.fn()
    const { rerender } = render(<ExplorerDot grid={grid} pos={[0, 1]} onArrive={onArrive} />)
    onArrive.mockClear()

    rerender(<ExplorerDot grid={grid} pos={[0, 2]} onArrive={onArrive} />)
    act(() => void vi.advanceTimersByTime(2000))

    expect(onArrive).toHaveBeenCalled()
  })
})

describe("ExplorerFigure, carrying", () => {
  afterEach(() => vi.doUnmock("./tileAssets"))

  const figure = async (frames: Record<string, string[]>) => {
    vi.resetModules()
    vi.doMock("./tileAssets", async original => ({
      ...(await original<typeof import("./tileAssets")>()),
      sharedTileFrames: (prefix: string) => frames[prefix] ?? [],
    }))
    return (await import("./ExplorerDot")).ExplorerFigure
  }

  it("draws the carrying frames of its facing", async () => {
    const Figure = await figure({ "explorer-e": ["walk.png"], "explorer-carry-e": ["carry.png"] })
    const { container } = render(<Figure facing="w" carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("carry.png")
  })

  it("falls back to the walking frames while a facing has no carrying art", async () => {
    const Figure = await figure({ "explorer-n": ["walk.png"] })
    const { container } = render(<Figure facing="n" carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("walk.png")
  })

  it("the walking explorer is drawn carrying while a stone is in hand", async () => {
    vi.resetModules()
    vi.doMock("./tileAssets", async original => ({
      ...(await original<typeof import("./tileAssets")>()),
      sharedTileFrames: (prefix: string) =>
        ({ "explorer-s": ["walk.png"], "explorer-carry-s": ["carry.png"] })[prefix] ?? [],
    }))
    const { ExplorerDot: Dot } = await import("./ExplorerDot")
    const { container } = render(<Dot grid={grid} pos={[0, 1]} carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("carry.png")
  })
})
