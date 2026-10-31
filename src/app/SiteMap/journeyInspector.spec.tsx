// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { onRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { journeys } from "@/data/journeys"
import "@/mods/registerModApps"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})

const JOURNEY = journeys.find(j => j.exterior === "pyramid" && j.difficulty === "starter")!.id

const carveFloor = (): FloorGrid => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, onRouteSluiceFloor(), seed)
    if (result.success) return result.grid
  }
  throw new Error("no seed carved the sluice floor")
}

/** A floor one cell big: whatever the floor below covered lies outside it. */
const tinyFloor = (below: FloorGrid): FloorGrid => {
  const [r, c] = below.entrancePos
  const entrance = below.cells[r][c] as Exclude<GridCell, { type: "empty" }>
  return {
    ...below,
    rows: 1,
    cols: 1,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    staircases: {},
    cells: [[{ ...entrance, dirs: new Set(), regionBarrier: undefined, region: undefined } as GridCell]],
  }
}

const floors = vi.hoisted(() => ({ grids: [] as FloorGrid[] }))

// Every pyramid keeps its count but climbs two made-up floors.
vi.mock("@/data/generatedWorld", async importOriginal => {
  const actual = await importOriginal<typeof import("@/data/generatedWorld")>()
  const { onRouteSluiceFloor: config } = await import("@/game/testSupport/regionBarrierFixtures")
  return {
    ...actual,
    generatedWorldConfigs: new Proxy(actual.generatedWorldConfigs, {
      get: (target, id) => (typeof id === "string" ? target[id]?.map(() => [config(), config()]) : undefined),
    }),
  }
})

vi.mock("@/game/assembleInspectedFloor", () => ({
  assembleInspectedFloor: (_journey: string, _config: unknown, _seed: number, floorIndex: number) => ({
    success: true,
    grid: floors.grids[floorIndex],
  }),
}))

afterEach(cleanup)

describe("the journey inspector steps between floors", { timeout: 120_000 }, () => {
  it("draws the next floor without the floor below's water", async () => {
    const below = carveFloor()
    floors.grids = [below, tinyFloor(below)]
    const { default: meta, Inspector } = await import("./JourneyInspector.stories")
    const JourneyInspector = meta.component
    const { container } = render(<JourneyInspector {...Inspector.args} pyramidNumber={1} />)
    expect(container.querySelectorAll("[data-region-cover]").length, "the floor below is under water").toBeGreaterThan(
      0
    )

    fireEvent.click(screen.getByText("Floor →"))

    expect(screen.getByText(/floor 2\/2/)).toBeTruthy()
    expect(container.querySelectorAll("[data-region-cover]")).toHaveLength(0)
  })
})
