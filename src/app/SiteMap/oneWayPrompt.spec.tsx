// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import en from "../../../public/locales/en/common.json"
import nl from "../../../public/locales/nl/common.json"
import { oneWayRuns } from "@/game/gridNavigation"
import type { OneWayRealisationMeta, ResolveOneWayRealisation } from "@/game/oneWayRealisation"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction, FloorConfig, FloorGrid, SiteConfig } from "@/game/siteTypes"
import { designerDoubleBack } from "@/game/testSupport/forkSwitchFixtures"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { cellAddress } from "./cellIdentity"
import { useSiteNavigation } from "./useSiteNavigation"

// A realisation only a test declares, so a prompt that is the zipline's own cannot pass for the declared one.
const ZIPLINE_META = resolveOneWayRealisation("zipline")!
const ROPE: OneWayRealisationMeta = { id: "rope", ownerMod: "test", prompt: "rope.invitation" }
const resolveWithRope: ResolveOneWayRealisation = id => (id === ROPE.id ? ROPE : resolveOneWayRealisation(id))

const sectioned: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
}

const FLOORS: [string, FloorConfig, number][] = [
  ["a section-addressed drop", sectioned, 1],
  ["the doubleBack's two region-addressed drops", designerDoubleBack(), 2],
]

const carve = (config: FloorConfig): FloorGrid => {
  for (let seed = 1; seed <= 60; seed++) {
    const result = assembleFloor("spec:one-way", config, seed, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      resolveOneWay: resolveWithRope,
    })
    if (result.success) return result.grid
  }
  throw new Error("no seed carved the floor")
}

// Every cell is standing ground, so only the drop's own rules decide what a tap does.
const walkable = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row => row.map(cell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))),
})

const STEP: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const arrive = () => act(() => void vi.advanceTimersByTime(2000))
const NO_SITE: SiteConfig = []

const standAt = (grid: FloorGrid, run: ReturnType<typeof oneWayRuns>[number]) => {
  const journeys = {
    markCellExplored: vi.fn(),
    updatePosition: vi.fn(),
    getPurchasedShopSlots: () => new Set<string>(),
    getSkippedConsumables: () => new Set<string>(),
    getMechanismStates: vi.fn(() => new Map<string, string>()),
    setMechanismState: vi.fn(),
  } as unknown as JourneyAPI
  const playTraversal = vi.fn(() => Promise.resolve())
  const [dr, dc] = STEP[run.dir]
  const fromNode: [number, number] = [run.launch[0] - dr, run.launch[1] - dc]
  const hook = renderHook(() =>
    useSiteNavigation({
      journeys,
      journeyId: "j1",
      siteConfig: NO_SITE,
      seed: 1,
      currentFloor: 0,
      grid,
      explorerPos: fromNode,
      onEncounter: vi.fn(),
      onSkippedConsumable: vi.fn(),
      onExitReached: vi.fn(),
      playTraversal,
      resolveOneWay: resolveWithRope,
    })
  )
  return { hook, journeys, playTraversal }
}

const lookup = (locale: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((at, part) => (at as Record<string, unknown> | undefined)?.[part], locale)

describe("every realisation of a one-way is taken through its declared prompt", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  describe.each(FLOORS)("on %s", (_, config, drops) => {
    describe.each([ZIPLINE_META, ROPE])("realised as $id", realisation => {
      const grid = walkable(carve({ ...config, oneWayRealisation: realisation.id }))
      const runs = oneWayRuns(grid)

      it("carries every drop of the floor", () => {
        expect(runs).toHaveLength(drops)
        expect(runs.map(run => run.kind)).toEqual(runs.map(() => realisation.id))
      })

      it.each(runs.map((run, index) => [index, run] as const))(
        "offers drop %i's launch with the realisation's prompt and crosses nothing until it is taken",
        (_index, run) => {
          const { hook, journeys, playTraversal } = standAt(grid, run)

          act(() => hook.result.current.onCellClick(run.launch[0], run.launch[1]))
          arrive()

          expect(hook.result.current.prompt).toMatchObject({
            kind: "obstacle",
            at: run.launch,
            invitation: realisation.prompt,
          })
          expect(playTraversal).not.toHaveBeenCalled()
          const landing = cellAddress(grid, 0, run.landing[0], run.landing[1])
          expect(journeys.updatePosition).not.toHaveBeenCalledWith("j1", landing, expect.anything())
        }
      )

      it.each(runs.map((run, index) => [index, run] as const))(
        "leaves the player at drop %i's launch when the offer is declined, and lands them when it is taken",
        async (_index, run) => {
          const { hook, journeys, playTraversal } = standAt(grid, run)
          const launch = cellAddress(grid, 0, run.launch[0], run.launch[1])
          const landing = cellAddress(grid, 0, run.landing[0], run.landing[1])
          act(() => hook.result.current.onCellClick(run.launch[0], run.launch[1]))
          arrive()

          expect(journeys.updatePosition).toHaveBeenLastCalledWith("j1", launch, expect.anything())
          expect(playTraversal).not.toHaveBeenCalled()

          await act(async () => hook.result.current.prompt!.take())

          expect(playTraversal).toHaveBeenCalledOnce()
          expect(journeys.updatePosition).toHaveBeenLastCalledWith("j1", landing, expect.anything())
        }
      )
    })
  })

  it("offers a crossing whose realisation nobody declares through the generic one-way prompt", () => {
    const grid = walkable(carve({ ...sectioned, oneWayRealisation: ZIPLINE_META.id }))
    const [run] = oneWayRuns(grid)
    const cells = grid.cells.map(row =>
      row.map(cell =>
        cell.type === "corridor" && cell.obstacle ? { ...cell, obstacle: { ...cell.obstacle, kind: "gone" } } : cell
      )
    )
    const { hook } = standAt({ ...grid, cells }, { ...run, kind: "gone" })

    act(() => hook.result.current.onCellClick(run.launch[0], run.launch[1]))
    arrive()

    expect(hook.result.current.prompt?.invitation).toBeUndefined()
    expect(hook.result.current.prompt?.kind).toBe("obstacle")
  })
})

describe("what the prompt says before a one-way is crossed", () => {
  const PROMPTS: [string, string, string][] = [
    ["ui.prompt.zipline", "Ride the line — there is no way back", "Glij langs de lijn — er is geen weg terug"],
    ["ui.prompt.oneWay", "Cross over — there is no way back", "Steek over — er is geen weg terug"],
  ]

  it.each(PROMPTS)(
    "says %s cannot be recrossed, in the approved wording, in English and Dutch",
    (key, english, dutch) => {
      expect(lookup(en, key)).toBe(english)
      expect(lookup(nl, key)).toBe(dutch)
    }
  )

  it("is the declared key's text that the zipline offers, in both languages", () => {
    expect(lookup(en, ZIPLINE_META.prompt!)).toBe(PROMPTS[0][1])
    expect(lookup(nl, ZIPLINE_META.prompt!)).toBe(PROMPTS[0][2])
  })

  it.each(PROMPTS)("%s names no landing and hints at none", key => {
    const landing =
      /\b(land|lands|landing|arrive|to the|towards|beyond|other side|overkant|aan de andere|naar|terecht|kom je|bij de)\b/i
    for (const locale of [en, nl]) expect(lookup(locale, key) as string).not.toMatch(landing)
  })

  it("offers nothing but the launch and the declared words, so no destination reaches the player", () => {
    const grid = walkable(carve({ ...sectioned, oneWayRealisation: ZIPLINE_META.id }))
    const [run] = oneWayRuns(grid)
    vi.useFakeTimers()
    const { hook } = standAt(grid, run)

    act(() => hook.result.current.onCellClick(run.launch[0], run.launch[1]))
    arrive()
    vi.useRealTimers()

    const offered = hook.result.current.prompt!
    const said = Object.entries(offered).filter(([, value]) => value !== undefined)
    expect(said.map(([key]) => key).sort()).toEqual(["at", "invitation", "kind", "obstacleKind", "take"])
    expect(offered.at).toEqual(run.launch)
    expect(JSON.stringify([offered.at, offered.invitation])).not.toContain(JSON.stringify(run.landing))
  })
})
