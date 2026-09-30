// @vitest-environment jsdom
//
// THE INVARIANT A PLAYER ACTUALLY DEPENDS ON: standing anywhere reachable, they can get somewhere
// else. Every feature so far has been tested sideways — a mechanism writes the right state, a reveal
// stops at a drop's landing — and none of that asserts what the player taps and watches. Three
// regressions in one day (an arrow drawn over a dead click, a mechanism's own corridor staying dark,
// a corner dot that revealed without walking) each broke this and left every one of those sideways
// tests green, because none of them is this property:
//
//   For every cell the explorer can stand on, the moves the map OFFERS are exactly the moves
//   `walkableFrom` says exist — and taking an offer moves the explorer to it.
//
// Two halves, asserted every step of a full walk of the floor rather than at a sampled few (this
// project's rule — a sampled version would have missed at least one of the three):
//
//   A. offers match walkability — a stopping point (a room, or a corridor corner) that `walkableFrom`
//      reaches must be some marker's click target; nothing offers a destination the player cannot
//      actually reach.
//   B. taking an offer moves the explorer there — clicking a target the map offered must leave the
//      explorer standing on it.
//
// A one-way's landing needs no exception here: its barred direction is simply not in `walkableFrom`,
// so nothing is ever required to offer it. The property already reads that asymmetry correctly.
//
// Built at the hook level — `useAssembledFloor` + `useSiteNavigation` + `clickTargets` +
// `walkableFrom` — so it runs in the normal suite and stays fast; a browser is not needed to see two
// pure functions disagree with each other.
import { renderHook, act } from "@testing-library/react"
import { useMemo, useState } from "react"
import { describe, expect, it, vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, SiteConfig } from "@/game/siteTypes"
import { walkableFrom, isSealedWayOut } from "@/game/gridNavigation"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useAssembledFloor } from "./useAssembledFloor"
import { useSiteNavigation } from "./useSiteNavigation"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { isCorridorCorner } from "./corridorRuns"
import { sectionOfAddress, keyOfAddress } from "./cellIdentity"
import { buildConfigs } from "@/worldGen/configBuilder"
import { DEV_JOURNEY_ID } from "@/worldGen/data"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { allFloors } from "./worldFloors.testing"
import { ALL_CURRENCY_DISTRIBUTIONS } from "@/mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  REGISTERED_MOD_IDS,
} from "@/mods/registeredMods"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "@/mods/allFamilyMeta"
// Populates the family registry, the same side effect every other assembled-floor spec relies on.
import "@/mods/registerModApps"

// A stopping point is what a marker ever names as a destination: a room, or a corridor corner (a
// plain straight-through corridor is a waypoint a run folds INTO its far end, never a destination of
// its own — see corridorRuns.ts). Restricted to `reachable`/`completed`, matching every gate in
// `clickTargets.ts`, and never a way a switch shut, which `walkableFrom` already refuses to enter.
const isStoppingPoint = (cell: { type: string; state?: string; dirs?: ReadonlySet<string> }): boolean => {
  if (cell.type === "room")
    return (cell.state === "reachable" || cell.state === "completed") && !isSealedWayOut(cell as never)
  if (cell.type === "corridor")
    return (
      (cell.state === "reachable" || cell.state === "completed") &&
      isCorridorCorner(cell.dirs as ReadonlySet<Direction>)
    )
  return false
}

/** Property A: every stopping point `walkableFrom` reaches is some marker's click target. Returns one
 * message per cell that fails it, empty when the floor is sound. `offers` defaults to the real ones
 * the map would compute; a test proving the check has teeth passes a corrupted map instead, so the
 * grid and its true walkability stay honest while only the thing a bug would actually break is faked. */
const offerViolations = (
  grid: FloorGrid,
  explorerPos: readonly [number, number],
  offers: ReadonlyMap<string, readonly [number, number]> = offeredTargets(grid, buildRoomClaims(grid), explorerPos)
): string[] => {
  const walkable = walkableFrom(grid, explorerPos)
  const offeredTargetSet = new Set([...offers.values()].map(([r, c]) => `${r},${c}`))
  const violations: string[] = []
  for (const key of walkable) {
    if (key === `${explorerPos[0]},${explorerPos[1]}`) continue
    const [r, c] = key.split(",").map(Number)
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue
    if (isStoppingPoint(cell) && !offeredTargetSet.has(key)) {
      violations.push(`walkable stopping point ${key} (${cell.type}) has no offer pointing to it, from ${explorerPos}`)
    }
  }
  return violations
}

// A minimal, real journeys store: plain mutable state a click writes through, replicating exactly the
// two writes `useJourneys` makes (`markCellExplored`'s cell-key bookkeeping, `updatePosition`'s
// address) rather than a mock that only records that a call happened. `useAssembledFloor` reads this
// same state back out, so a click's effect on the ACTUAL rendered grid is what gets asserted, not a
// spy's call list.
type Store = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  mechanismStates: Record<string, string>
}

const makeStore = (): Store => ({ exploredCells: {}, positionKey: null, mechanismStates: {} })

type Harness = {
  journeys: JourneyAPI
  useHook: () => ReturnType<typeof useAssembledFloor> & { onCellClick: (r: number, c: number) => void; prompt: unknown }
}

/** Wires one floor's real reveal pipeline (`useAssembledFloor`) to the real click handler
 * (`useSiteNavigation`) over a plain mutable store, so a rerender always reflects the latest click —
 * the same round trip `SiteMapScreen` makes, minus the DOM. `patch` lets a test corrupt one write to
 * prove the checks below actually fire on the class of bug they're for. */
const buildHarness = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  siteConfig: SiteConfig,
  store: Store,
  patch: Partial<JourneyAPI> = {}
): Harness => {
  const journeys = {
    markCellExplored: (_sectionHash: string, _cellId: string, address?: string | null) => {
      if (!address) return
      const section = sectionOfAddress(address)
      const key = keyOfAddress(address)
      const keys = store.exploredCells[section] ?? []
      if (keys.includes(key)) return
      store.exploredCells = { ...store.exploredCells, [section]: [...keys, key] }
    },
    updatePosition: (_journeyId: string, address: string) => {
      store.positionKey = address
    },
    getPurchasedShopSlots: () => new Set<string>(),
    getSkippedConsumables: () => new Set<string>(),
    getMechanismStates: () => new Map(Object.entries(store.mechanismStates)),
    setMechanismState: (address: string, stateId: string) => {
      store.mechanismStates = { ...store.mechanismStates, [address]: stateId }
    },
    ...patch,
  } as unknown as JourneyAPI

  const useHook = () => {
    const [, force] = useState(0)
    void force
    const mechanismPositions = useMemo(
      () => new Map(Object.entries(store.mechanismStates)),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on content, not the object identity
      [JSON.stringify(store.mechanismStates)]
    )
    const assembled = useAssembledFloor(
      journeyId,
      floorConfig,
      seed,
      0,
      store.exploredCells,
      store.positionKey,
      0,
      undefined,
      undefined,
      mechanismPositions
    )
    const nav = useSiteNavigation({
      journeys,
      journeyId,
      siteConfig,
      seed,
      currentFloor: 0,
      grid: assembled.grid,
      explorerPos: assembled.explorerPos,
      onEncounter: () => {},
      onSkippedConsumable: () => {},
      onExitReached: () => {},
    })
    return { ...assembled, onCellClick: nav.onCellClick, prompt: nav.prompt }
  }

  return { journeys, useHook }
}

/**
 * Walks every reachable (position × mechanism-state) combination of a floor depth-first, asserting
 * both halves of the invariant at every stop it visits and every offer it takes — a step budget bails
 * out with its own violation rather than hanging, so a floor whose branching runs away is a red test
 * rather than a stuck one.
 */
const walkFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number
): { violations: string[]; steps: number } => {
  const siteConfig: SiteConfig = [floorConfig]
  const store = makeStore()
  const harness = buildHarness(journeyId, floorConfig, seed, siteConfig, store)
  const hook = renderHook(harness.useHook)

  const visited = new Set<string>()
  const violations: string[] = []
  let steps = 0
  const sig = () => `${store.positionKey ?? "start"}|${JSON.stringify(store.mechanismStates)}`
  const snapshot = () => ({ ...store })

  const visit = (): void => {
    steps++
    if (steps > 3000) {
      violations.push("step budget exceeded — the walk never settled")
      return
    }
    hook.rerender()
    const { grid, explorerPos } = hook.result.current
    if (!grid) {
      violations.push("floor did not carve")
      return
    }
    const here = sig() + `@${explorerPos[0]},${explorerPos[1]}`
    if (visited.has(here)) return
    visited.add(here)

    violations.push(...offerViolations(grid, explorerPos))

    const claims = buildRoomClaims(grid)
    const offers = offeredTargets(grid, claims, explorerPos)
    for (const [, target] of offers) {
      const targetSig = sig() + `@${target[0]},${target[1]}`
      if (visited.has(targetSig)) continue
      const before = snapshot()
      act(() => hook.result.current.onCellClick(target[0], target[1]))
      hook.rerender()
      const after = hook.result.current.explorerPos
      if (after[0] !== target[0] || after[1] !== target[1]) {
        violations.push(
          `clicked the offer at ${target[0]},${target[1]} from ${explorerPos} but the explorer is at ${after[0]},${after[1]}`
        )
        Object.assign(store, before)
        continue
      }
      act(() => vi.advanceTimersByTime(5000))
      hook.rerender()
      const prompt = hook.result.current.prompt as { take: () => void } | null
      if (prompt) {
        act(() => prompt.take())
        act(() => vi.advanceTimersByTime(5000))
        hook.rerender()
      }
      visit()
      Object.assign(store, before)
      hook.rerender()
    }
  }

  vi.useFakeTimers()
  try {
    visit()
  } finally {
    vi.useRealTimers()
  }
  return { violations, steps }
}

const buildDoubleBack = (): FloorConfig => {
  process.env.INCLUDE_DEV = "1"
  const configs = buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    0,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta
  )
  delete process.env.INCLUDE_DEV
  // worldGen's FloorConfig is a looser mirror of game/siteTypes.ts's, and authored data only ever
  // assigns values the stricter type accepts too — the same cast devJourney.spec.ts's own
  // `assembleAt` makes.
  return configs[DEV_JOURNEY_ID][1][0] as unknown as FloorConfig
}

describe("the movement invariant — offers match walkability, and taking one moves the explorer", () => {
  // doubleBack: five gates, three controls (one three-state fork, two one-shot levers) and two
  // one-way drops on a single floor — the exotic subject, walked through every mechanism combination
  // a player can actually reach.
  it("holds across doubleBack's full reachable state space", () => {
    const journeyId = DEV_JOURNEY_ID
    const floorConfig = buildDoubleBack()
    const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), 2, 0)

    const { violations, steps } = walkFloor(journeyId, floorConfig, seed)

    expect(steps).toBeGreaterThan(50) // a walk this floor short would prove nothing was exercised
    expect(violations).toEqual([])
  }, 30_000)

  // A plain shipped floor, with no mechanism at all — the guard is not only for the exotic case.
  it("holds on an ordinary shipped floor", () => {
    const floor = allFloors()[0]

    const { violations, steps } = walkFloor(floor.journeyId, floor.config, floor.seed)

    expect(steps).toBeGreaterThan(3)
    expect(violations).toEqual([])
  }, 30_000)
})

// PROVING THE GUARD HAS TEETH. Reverting `58815d67` (the lever throw) and re-running the doubleBack
// walk above did turn it red — at 7 steps against the 50 the walk expects, since nothing ever throws
// a lever any more and the floor stops dead at the first one. Reverting `97714cdd` (the one-way
// landing reveal) did NOT turn it red: that fix stops a REVEAL from running past a landing early, and
// once a cell is (wrongly) reachable this invariant has no opinion on why — it only asks that offers
// and walkability agree, which they still did. So this file also corrupts the two writes directly,
// to prove the checks fire on the exact shape of the two sightings this invariant is FOR (a
// reveal that leaves the explorer behind, and a stopping point no marker names) without needing a
// real commit to revert each time.
describe("the guard actually fires", () => {
  const floorConfig: FloorConfig = {
    pathPuzzles: 2,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
  }
  const journeyId = "guard-proof"
  const seed = 1

  // Sighting 3, reproduced directly: a click that marks the cell explored (so the corridor beyond it
  // lifts out of the fog, same as a real reveal) but never writes the new position — the write
  // `goHere()` makes and a broken build could drop. `offerViolations` alone cannot see this: the grid
  // and the offer it came from are both perfectly consistent, only the explorer failed to follow.
  it("catches a click that reveals a cell without moving the explorer onto it", () => {
    const store = makeStore()
    const harness = buildHarness(journeyId, floorConfig, seed, [floorConfig], store, {
      // The corrupted write: explored, but the position never moves — exactly "explores it, but the
      // player does not move there".
      updatePosition: () => {},
    })
    const hook = renderHook(harness.useHook)
    const { grid, explorerPos } = hook.result.current
    if (!grid) throw new Error("fixture did not carve")

    const claims = buildRoomClaims(grid)
    const offers = offeredTargets(grid, claims, explorerPos)
    const [, target] = [...offers][0]

    act(() => hook.result.current.onCellClick(target[0], target[1]))
    hook.rerender()
    const after = hook.result.current.explorerPos

    expect(after).not.toEqual(target) // the corrupted store really did fail to move the explorer
    // The exact assertion `walkFloor` makes on every offer it takes:
    expect(after[0] === target[0] && after[1] === target[1]).toBe(false)
  })

  // Sighting 1/2, reproduced at the level `offerViolations` actually checks: a stopping point
  // `walkableFrom` reaches that the map's own offers never name — an arrow drawn with nothing under
  // it, or (as `clickTargets.ts` builds both from one map) no arrow at all where one belongs. The grid
  // and its true walkability are the real, uncorrupted floor; only the offer map is faked, standing in
  // for the one thing a rendering bug would actually break.
  it("catches a walkable stopping point no offer names", () => {
    const store = makeStore()
    const harness = buildHarness(journeyId, floorConfig, seed, [floorConfig], store)
    const hook = renderHook(harness.useHook)
    const { grid, explorerPos } = hook.result.current
    if (!grid) throw new Error("fixture did not carve")

    const claims = buildRoomClaims(grid)
    const realOffers = offeredTargets(grid, claims, explorerPos)
    expect(realOffers.size).toBeGreaterThan(0) // the entrance really does offer somewhere on this fixture
    expect(offerViolations(grid, explorerPos, realOffers)).toEqual([]) // sound before the corruption

    // Erase every marker that leads to one destination — the near cell whose arrow points at it AND
    // its own corner/room entry alike, since a target reachable by more than one marker would survive
    // losing just one of them. The corruption a drawn-but-dead arrow or a missing one both reduce to.
    const [, victim] = [...realOffers][0]
    const corrupted = new Map(
      [...realOffers].filter(([, target]) => target[0] !== victim[0] || target[1] !== victim[1])
    )

    expect(offerViolations(grid, explorerPos, corrupted)).toEqual([
      `walkable stopping point ${victim[0]},${victim[1]} (${grid.cells[victim[0]][victim[1]].type}) has no offer pointing to it, from ${explorerPos}`,
    ])
  })
})
