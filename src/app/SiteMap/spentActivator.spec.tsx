// @vitest-environment jsdom
import { render, renderHook, act } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { cellAddress } from "@/game/cellAddress"
import { isSpent } from "@/game/mechanismDoors"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { journeys as allKnownJourneys } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { andDoorFloor, threeOwnerDoorFloor } from "@/game/testSupport/gateFaceFixtures"
import { useAssembledFloor } from "./useAssembledFloor"
import { useMechanismStates } from "./useMechanismStates"
import { useSiteNavigation } from "./useSiteNavigation"
import { SiteMapView } from "./SiteMapView"
import { cellCenter, CELL } from "./mapScale"
import "@/mods/registerModApps"

const JOURNEY = allKnownJourneys[0].id

const FLOORS: Record<string, () => FloorConfig> = {
  "one torch and a lever on one door": andDoorFloor,
  "two torches and a lever on one door": threeOwnerDoorFloor,
}

const carve = (config: FloorConfig): { seed: number; grid: FloorGrid } => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (result.success) return { seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

const carved = new Map<string, { seed: number; grid: FloorGrid }>()
beforeAll(() => {
  for (const [name, config] of Object.entries(FLOORS)) carved.set(name, carve(config()))
}, 120_000)

const roomsOf = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

const torchesOf = (grid: FloorGrid) => roomsOf(grid).filter(({ cell }) => cell.family === "torch")
const leversOf = (grid: FloorGrid) =>
  roomsOf(grid).filter(({ cell }) => cell.tags?.includes("handle") && cell.family !== "torch")

/** Every cell walked and lit, so what differs between two renders is the mechanism's position alone. */
const walked = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "completed" }))
  ),
})

/** Every assignment of lit/unlit to these cells: 2^n of them, as address -> position maps. */
const everyLighting = (grid: FloorGrid, torches: { at: [number, number] }[]) => {
  const addresses = torches.map(({ at }) => cellAddress(grid, 0, at[0], at[1])!)
  return Array.from({ length: 2 ** addresses.length }, (_, bits) => ({
    label: addresses.map((_a, i) => ((bits >> i) & 1 ? "lit" : "unlit")).join("+"),
    states: new Map(addresses.map((address, i) => [address, (bits >> i) & 1 ? "lit" : "unlit"])),
  }))
}

const markerOf = (container: HTMLElement, r: number, c: number) => {
  const { cx, cy } = cellCenter(r, c)
  return Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
    el => parseFloat(el.style.left) === cx - CELL / 2 && parseFloat(el.style.top) === cy - CELL / 2
  )
}
const tickedOff = (marker: HTMLElement | undefined) => marker?.textContent?.includes("✓") ?? false

describe("a spent activator says so on the map", () => {
  for (const name of Object.keys(FLOORS)) {
    it(`${name}: every torch wears the used appearance when lit and the unused one when not, in every combination`, () => {
      const { grid: base } = carved.get(name)!
      const torches = torchesOf(base)
      expect(torches.length, "the floor has torches").toBeGreaterThan(0)
      const grid = walked(base)
      for (const { label, states } of everyLighting(base, torches)) {
        const { container, unmount } = render(<SiteMapView grid={grid} currentFloor={0} mechanismStates={states} />)
        for (const { at } of torches) {
          const lit = states.get(cellAddress(base, 0, at[0], at[1])!) === "lit"
          const where = `${name} / ${label} / torch at ${at}`
          const marker = markerOf(container, at[0], at[1])
          expect(tickedOff(marker), `${where}: ✓`).toBe(lit)
          expect(marker?.querySelector("g[opacity]")?.getAttribute("opacity"), `${where}: dim`).toBe(lit ? "0.45" : "1")
        }
        unmount()
      }
    })

    it(`${name}: a lever, which can always be thrown back, never wears the used appearance`, () => {
      const { grid: base } = carved.get(name)!
      const levers = leversOf(base)
      expect(levers.length).toBeGreaterThan(0)
      for (const state of ["left", "right"]) {
        const states = new Map(levers.map(({ at }) => [cellAddress(base, 0, at[0], at[1])!, state]))
        const { container, unmount } = render(
          <SiteMapView grid={walked(base)} currentFloor={0} mechanismStates={states} />
        )
        for (const { at } of levers)
          expect(tickedOff(markerOf(container, at[0], at[1])), `${state} at ${at}`).toBe(false)
        unmount()
      }
    })

    it(`${name}: a torch's drawn furniture eases back once lit and stands full when unlit`, () => {
      const { grid: base } = carved.get(name)!
      const torches = torchesOf(base)
      for (const { label, states } of everyLighting(base, torches)) {
        const { container, unmount } = render(
          <SiteMapView grid={walked(base)} currentFloor={0} mechanismStates={states} />
        )
        for (const { at } of torches) {
          const lit = states.get(cellAddress(base, 0, at[0], at[1])!) === "lit"
          const art = container.querySelector<HTMLElement>(`[data-node-sprite="handle:${at[0]},${at[1]}"]`)
          expect(art, `${name} / ${label}: the torch draws furniture`).not.toBeNull()
          expect(art!.style.opacity === "0.5", `${name} / ${label} / ${at}`).toBe(lit)
        }
        unmount()
      }
    })
  }
})

// ── Walking over one, on the real navigation hook and the real torch family ───────────────────────────

type Store = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  standingKey: string | null
  mechanismStates: Record<string, string>
}

const makeJourneyData = (id: string): TranslatedJourney =>
  ({
    id,
    exterior: "pyramid",
    difficulty: "starter",
    levelCount: 1,
    journeyLength: "short",
    name: id,
    lengthLabel: "short",
  }) as TranslatedJourney

const harness = (name: string) => {
  const { seed, grid: base } = carved.get(name)!
  const config = FLOORS[name]()
  const store: Store = { exploredCells: {}, positionKey: null, standingKey: null, mechanismStates: {} }
  const doc = (): StoredJourneyStateV3 => ({
    journeyId: JOURNEY,
    levelNr: 1,
    completionCount: 0,
    active: true,
    exploredSections: {},
    exploredCells: store.exploredCells,
    position: null,
    positionKey: store.positionKey,
    standingKey: store.standingKey,
    interiorLevelNr: null,
    mechanismStates: store.mechanismStates,
  })
  const hook = renderHook(() => {
    const journeys = {
      ...createJourneysV3Api({
        journeys: [doc()],
        setJourneys: updater => {
          const next =
            typeof updater === "function"
              ? (updater as (prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])([doc()])
              : updater
          store.exploredCells = next[0]?.exploredCells ?? {}
          store.positionKey = next[0]?.positionKey ?? null
          store.standingKey = next[0]?.standingKey ?? null
          store.mechanismStates = next[0]?.mechanismStates ?? {}
        },
        journeyData: [makeJourneyData(JOURNEY)],
      }),
      getPurchasedShopSlots: () => new Set<string>(),
      getSkippedConsumables: () => new Set<string>(),
    } as unknown as JourneyAPI
    const assembled = useAssembledFloor(
      JOURNEY,
      config,
      seed,
      0,
      journeys.getExploredCells(JOURNEY),
      store.positionKey,
      0,
      undefined,
      undefined,
      useMechanismStates(journeys, JOURNEY),
      store.standingKey
    )
    const encountered: [number, number][] = []
    const nav = useSiteNavigation({
      journeys,
      journeyId: JOURNEY,
      siteConfig: [config],
      seed,
      currentFloor: 0,
      grid: assembled.grid,
      explorerPos: assembled.explorerPos,
      onEncounter: ([r, c]) => void encountered.push([r, c]),
      onSkippedConsumable: () => {},
      onExitReached: () => {},
    })
    return { ...assembled, ...nav, journeys, encountered }
  })
  return { hook, base }
}

describe("a spent activator is walked over like ordinary ground", () => {
  afterEach(() => vi.useRealTimers())

  const tapTorch = (state: "unlit" | "lit") => {
    vi.useFakeTimers()
    const h = harness("one torch and a lever on one door")
    const [{ at }] = torchesOf(h.base)
    act(() => h.hook.result.current.journeys.setMechanismState(cellAddress(h.base, 0, at[0], at[1])!, state))
    h.hook.rerender()
    // Standing in it once, so the room reads as visited and a second tap is the re-entry path.
    act(() => h.hook.result.current.onCellClick(at[0], at[1]))
    act(() => vi.advanceTimersByTime(5000))
    h.hook.rerender()
    act(() => h.hook.result.current.onCellClick(at[0], at[1]))
    act(() => vi.advanceTimersByTime(5000))
    h.hook.rerender()
    return { h, at }
  }

  it("the torch family stays re-enterable and acts on arrival, so only the mechanism can make it silent", () => {
    const meta = getFamilyPlugin("torch")!.meta
    expect(meta.reEnterable).toBe(true)
    expect(meta.actsOnArrival).toBe(true)
  })

  it("an unlit torch offers to be lit when it is walked onto", () => {
    const { h } = tapTorch("unlit")
    expect(h.hook.result.current.prompt?.kind).toBe("room")
  })

  it("a lit torch hangs no prompt and opens no screen when it is walked onto", () => {
    const { h } = tapTorch("lit")
    expect(h.hook.result.current.prompt).toBeNull()
    expect(h.hook.result.current.encountered).toEqual([])
  })

  it("walking onto a lit torch stands the explorer there and leaves it lit", () => {
    const { h, at } = tapTorch("lit")
    const address = cellAddress(h.base, 0, at[0], at[1])!
    expect(h.hook.result.current.explorerPos).toEqual(at)
    expect(h.hook.result.current.journeys.getMechanismStates(JOURNEY).get(address)).toBe("lit")
  })
})

describe("which mechanisms count as spent", () => {
  const torch = { states: ["unlit", "lit"], initial: "unlit", returnsToInitial: false }
  const oneWaySwitch = { states: ["start", "thrown"], initial: "start", returnsToInitial: false }
  const forkBoard = { states: ["unset", "left", "right"], initial: "unset", returnsToInitial: false }
  const lever = { states: ["left", "right"], initial: "left", returnsToInitial: true }

  it("a one-way two-position control is spent in its second position and not its first", () => {
    for (const mechanism of [torch, oneWaySwitch]) {
      expect(isSpent(mechanism, mechanism.states[0])).toBe(false)
      expect(isSpent(mechanism, mechanism.states[1])).toBe(true)
    }
  })

  it("a one-way control with a position still ahead of it is never spent, and neither is a lever", () => {
    for (const state of forkBoard.states) expect(isSpent(forkBoard, state)).toBe(false)
    for (const state of lever.states) expect(isSpent(lever, state)).toBe(false)
  })
})
