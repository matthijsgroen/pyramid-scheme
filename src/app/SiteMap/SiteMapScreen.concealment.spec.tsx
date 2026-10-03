// @vitest-environment jsdom
import { render, act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { openDoorsFor, openWaysOut } from "@/game/mechanismDoors"
import { cellAddress } from "@/game/cellAddress"
import { concealedBehindBarriers } from "@/game/concealment"
import { clearGameData } from "@/support/useGameStorage"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { offRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { computeFloorExploration } from "./floorExploration"
import { sealWaysOut } from "./useAssembledFloor"
import { useFloorExplorationRecorder } from "./useFloorExplorationRecorder"
import { SiteMapView } from "./SiteMapView"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

let grid: FloorGrid
let explorerPos: readonly [number, number]

vi.mock("./useAssembledFloor", async importOriginal => {
  const actual = await importOriginal<typeof import("./useAssembledFloor")>()
  return {
    ...actual,
    useAssembledFloor: () => ({
      grid,
      explorerPos,
      hiddenJunctions: new Set<string>(),
      hiddenSections: new Set<string>(),
      junctionSections: new Map<string, ReadonlySet<string>>(),
      openGateKeys: new Set<string>(),
    }),
  }
})
vi.mock("./useFloorExplorationRecorder", () => ({ useFloorExplorationRecorder: vi.fn() }))
vi.mock("./SiteMapView", async importOriginal => {
  const actual = await importOriginal<typeof import("./SiteMapView")>()
  return { ...actual, SiteMapView: vi.fn(actual.SiteMapView) }
})

const { SiteMapScreen } = await import("./SiteMapScreen")

const JOURNEY = "test-journey"
const config: FloorConfig = offRouteSluiceFloor()

// The first carve of the sluice floor, with the sluice shut on something and the whole floor seen.
const shutFloor = (): { grid: FloorGrid; from: readonly [number, number] } => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (!result.success) continue
    const base = result.grid
    const lever = base.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.mechanism ? [[r, c] as const] : []))
    )[0]
    for (const state of ["dry", "wet"]) {
      const open = openDoorsFor(base, 0, new Map([[cellAddress(base, 0, lever[0], lever[1])!, state]]))
      const live = sealWaysOut(openWaysOut(base, open))
      const seen: FloorGrid = {
        ...live,
        cells: live.cells.map(row =>
          row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
        ),
      }
      if (concealedBehindBarriers(seen, live.entrancePos).size > 0) return { grid: seen, from: live.entrancePos }
    }
  }
  throw new Error("no carve shut anything off")
}

describe("a shut barrier's concealment is a drawing matter only", () => {
  beforeEach(async () => {
    Element.prototype.scrollTo = vi.fn()
    await clearGameData()
    vi.mocked(useFloorExplorationRecorder).mockClear()
    vi.mocked(SiteMapView).mockClear()
  })
  afterEach(cleanup)

  it("the exploration summary is read off the true floor, so a hidden stretch does not count as unexplored", async () => {
    const found = shutFloor()
    grid = found.grid
    explorerPos = found.from
    render(
      <SiteMapScreen
        journeyId={JOURNEY}
        siteConfig={[config]}
        levelIndex={0}
        seed={1}
        onSiteComplete={() => {}}
        onCancel={() => {}}
      />
    )
    await act(async () => {
      await Promise.resolve()
    })

    const recorded = vi.mocked(useFloorExplorationRecorder).mock.calls.at(-1)![0].grid!
    const drawn = vi.mocked(SiteMapView).mock.calls.at(-1)![0].grid
    const hidden = concealedBehindBarriers(grid, explorerPos)
    expect(hidden.size).toBeGreaterThan(0)
    expect(
      [...hidden].every(key => {
        const [r, c] = key.split(",").map(Number)
        return (drawn.cells[r][c] as { state: string }).state === "fogged"
      }),
      "the drawing hides the stretch"
    ).toBe(true)
    expect(recorded, "the recorder counts the grid with nothing concealed").toBe(grid)
    expect(computeFloorExploration(recorded)).toEqual(computeFloorExploration(grid))
  })
})
