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
// Three halves, asserted every step of a full walk of the floor rather than at a sampled few (this
// project's rule — a sampled version would have missed at least one of the three):
//
//   A. offers match walkability — a stopping point (a room, or a corridor corner) that `walkableFrom`
//      reaches must be some marker's click target; nothing offers a destination the player cannot
//      actually reach.
//   C. every tap draws something, except a corridor corner already completed — see `markerViolations`.
//   B. taking an offer moves the explorer there — clicking a target the map offered must leave the
//      explorer standing on it.
//
// A one-way's mouth is walkable from its landing and is a stopping point like any other corner
// (`isStoppingPoint` below knows it by `isOneWayMouth`, since it stalls at "visible" rather than
// "reachable"), so property A holds it to the same offer requirement. Only the direction BEYOND the
// mouth, back the way the drop came, is never in `walkableFrom` — the mouth's own `dirs` never carry
// it — so nothing is ever required to offer that, which is what keeps crossing impossible.
//
// Built at the hook level — `useAssembledFloor` + `useSiteNavigation` + `clickTargets` +
// `walkableFrom` — so it runs in the normal suite and stays fast; a browser is not needed to see two
// pure functions disagree with each other.
import { renderHook, act, render } from "@testing-library/react"
import { createElement, useState } from "react"
import { describe, expect, it, vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, SiteConfig } from "@/game/siteTypes"
import { walkableFrom, findPath, isSealedWayOut, isOneWayMouth, revealAll } from "@/game/gridNavigation"
import { assembleFloor } from "@/game/siteAssembler"
import { cellAddress } from "@/game/cellAddress"
import { OBSTACLE_KEY_PREFIX } from "@/game/cellSlot"
import { nodeSpritesFor } from "./SiteMapView"
import { tileUrl } from "./tileAssets"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { journeys as allKnownJourneys } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { useAssembledFloor } from "./useAssembledFloor"
import { useMechanismStates } from "./useMechanismStates"
import { useSiteNavigation } from "./useSiteNavigation"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { SiteMapView } from "./SiteMapView"
import { CELL, cellCenter } from "./mapScale"
import { isCorridorCorner } from "./corridorRuns"
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
// `clickTargets.ts` — except a one-way mouth, which never reaches "reachable" (`revealOneWayMouth`
// only ever lifts its fog to "visible") and is named by `isOneWayMouth` instead — and never a way a
// switch shut, which `walkableFrom` already refuses to enter.
const isStoppingPoint = (
  grid: FloorGrid,
  r: number,
  c: number,
  cell: { type: string; state?: string; dirs?: ReadonlySet<string> }
): boolean => {
  if (cell.type === "room")
    return (cell.state === "reachable" || cell.state === "completed") && !isSealedWayOut(cell as never)
  if (cell.type === "corridor")
    return (
      (cell.state === "reachable" ||
        cell.state === "completed" ||
        (cell.state === "visible" && isOneWayMouth(grid, r, c))) &&
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
    if (isStoppingPoint(grid, r, c, cell) && !offeredTargetSet.has(key)) {
      violations.push(`walkable stopping point ${key} (${cell.type}) has no offer pointing to it, from ${explorerPos}`)
    }
  }
  return violations
}

/** Property C: every tap draws something, except a corridor corner the player has already completed.
 * Read off the rendered DOM, because that is the only place a tap with nothing on it exists.
 * `offerViolations` reads offer data and stays green when the map offers a target and draws no marker
 * for it (a drop's mouth was exactly that: tapping bare stone walked the player there).
 *
 * THE EXEMPTION IS A DECISION. A corner the player has already walked is drawn ground they can see, so
 * it needs no marker to be findable. That is not true of a one-way mouth: it is `visible` but never
 * walked, with nothing pointing at it — so a mouth is never exempt, whatever its state. */
const markerViolations = (grid: FloorGrid, explorerPos: readonly [number, number]): string[] => {
  // jsdom has no layout, so it has no `scrollTo`; the map centres on the explorer through it.
  Element.prototype.scrollTo ??= () => {}
  const exempt = new Set<string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (
        cell.type === "corridor" &&
        cell.state === "completed" &&
        isCorridorCorner(cell.dirs) &&
        !isOneWayMouth(grid, r, c)
      ) {
        const { cx, cy } = cellCenter(r, c)
        exempt.add(`${cx - CELL / 2}px,${cy - CELL / 2}px`)
      }
    })
  )
  const { container, unmount } = render(createElement(SiteMapView, { grid, explorerPos, onCellClick: () => {} }))
  try {
    return Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]"))
      .filter(cell => cell.style.cursor === "pointer" && (cell.querySelector("svg")?.childElementCount ?? 0) === 0)
      .filter(cell => !exempt.has(`${cell.style.left},${cell.style.top}`))
      .map(cell => `a tap at (left ${cell.style.left}, top ${cell.style.top}) draws nothing, from ${explorerPos}`)
  } finally {
    unmount()
  }
}

// Flat, plain-mutable state — read directly by `useAssembledFloor` and by `walkFloor`'s own
// backtracking (`sig`/`snapshot`) below — that IS the one stored journey's own `exploredCells`,
// `positionKey`, `standingKey` and `mechanismStates`, so a click's effect on the ACTUAL rendered grid is
// what gets asserted, not a spy's call list. Carries both position fields, not just `positionKey`, for
// the same reason the real store does: `standingKey` is what `explorerPos` draws from, and a `Store`
// missing it would go back to being the kinder-than-real fake Task 1 replaced.
type Store = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  standingKey: string | null
  mechanismStates: Record<string, string>
}

const makeStore = (): Store => ({ exploredCells: {}, positionKey: null, standingKey: null, mechanismStates: {} })

type Harness = {
  useHook: () => ReturnType<typeof useAssembledFloor> & { onCellClick: (r: number, c: number) => void; prompt: unknown }
}

// `createJourneysV3Api` reads and writes only what its own JourneyAPI surface needs, so the fixture
// below carries no translation fields — nothing in markCellExplored/updatePosition/getMechanismStates/
// setMechanismState reads journeyData at all (only getJourney/maxDifficulty do, and neither is called
// by useSiteNavigation).
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

// `useJourneys.ts` gates `markCellExplored` and `setMechanismState` behind "this journey is in the
// shipped journey list (src/data/journeys.ts) and marked active" — a fixture id like the dev-topology
// floor or the guard-proof tests' own id is never in that list, so the harness's one stored journey
// borrows a real, known one instead. This is safe for what is under test: `assembleFloor`'s carve is
// fixed entirely by `(floorConfig, seed)`, and the journeyId it receives is embedded only into
// generated address labels.
const knownJourneyIds = new Set(allKnownJourneys.map(j => j.id))
const fallbackKnownJourneyId = allKnownJourneys[0].id

/** Wires one floor's real reveal pipeline (`useAssembledFloor`) to the real click handler
 * (`useSiteNavigation`) over `createJourneysV3Api` — the same factory `useJourneys.spec.ts` itself
 * drives — rebuilt fresh on every render (so `activeJourneyId`/`levelOf` see the latest write) from a
 * single stored journey whose `exploredCells`/`positionKey`/`standingKey`/`mechanismStates` ARE `store`'s
 * own fields, so a rerender always reflects the latest click, the same round trip `SiteMapScreen` makes
 * minus the DOM. `patch` lets a test corrupt one write to prove the checks below actually fire on the
 * class of bug they're for. */
const buildHarness = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  siteConfig: SiteConfig,
  store: Store,
  patch: Partial<JourneyAPI> = {},
  onEncounter: (pos: readonly [number, number], freshArrival: boolean) => void = () => {}
): Harness => {
  const storedJourneyId = knownJourneyIds.has(journeyId) ? journeyId : fallbackKnownJourneyId
  const journeyData = [makeJourneyData(storedJourneyId)]

  // The one stored journey, as it stands RIGHT NOW — read fresh on every `setJourneys` call (never a
  // snapshot closed over at render time) so two writes issued moments apart from the same render's
  // `journeys` (a click's own `updatePosition`, then a scheduled prompt's `setMechanismState`) compose
  // instead of the second clobbering the first back to whatever the first read before it ran.
  const currentJourneyDoc = (): StoredJourneyStateV3 => ({
    journeyId: storedJourneyId,
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

  const useHook = () => {
    const [, force] = useState(0)
    void force
    const journeys = {
      ...createJourneysV3Api({
        journeys: [currentJourneyDoc()],
        setJourneys: updater => {
          const next =
            typeof updater === "function"
              ? (updater as (prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])([currentJourneyDoc()])
              : updater
          store.exploredCells = next[0]?.exploredCells ?? {}
          store.positionKey = next[0]?.positionKey ?? null
          store.standingKey = next[0]?.standingKey ?? null
          store.mechanismStates = next[0]?.mechanismStates ?? {}
        },
        journeyData,
      }),
      getPurchasedShopSlots: () => new Set<string>(),
      getSkippedConsumables: () => new Set<string>(),
      ...patch,
    } as unknown as JourneyAPI

    // The same two reads `SiteMapScreen` makes — `store.exploredCells`/`store.mechanismStates` are
    // createJourneysV3Api's OWN storage, keyed `${levelNr}:${...}` (its `atLevel`/section-key
    // bookkeeping); only these strip that prefix back down to what `useAssembledFloor`/`openDoorsFor`
    // match sections and gates by.
    const exploredCells = journeys.getExploredCells(storedJourneyId)
    const mechanismPositions = useMechanismStates(journeys, storedJourneyId)
    const assembled = useAssembledFloor(
      storedJourneyId,
      floorConfig,
      seed,
      0,
      exploredCells,
      store.positionKey,
      0,
      undefined,
      undefined,
      mechanismPositions,
      store.standingKey
    )
    const nav = useSiteNavigation({
      journeys,
      journeyId: storedJourneyId,
      siteConfig,
      seed,
      currentFloor: 0,
      grid: assembled.grid,
      explorerPos: assembled.explorerPos,
      onEncounter,
      onSkippedConsumable: () => {},
      onExitReached: () => {},
    })
    return { ...assembled, onCellClick: nav.onCellClick, prompt: nav.prompt }
  }

  return { useHook }
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
  // Both position fields, not just `positionKey`: `standingKey` is the live cell — a bend included —
  // and post-fix it is what moves on every corridor step `positionKey` itself stays frozen through. The
  // coordinate appended at each call site (`@row,col`) already pins down the resolved cell exactly, so
  // this adds no state `here`/`targetSig` didn't already distinguish; it's here so the signature reads
  // as the real save document's own two fields, not a partial one that happens to still work.
  const sig = () =>
    `${store.positionKey ?? "start"}|${store.standingKey ?? "start"}|${JSON.stringify(store.mechanismStates)}`
  const snapshot = () => ({ ...store })

  const visit = (): void => {
    steps++
    if (steps > 20000) {
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
    violations.push(...markerViolations(grid, explorerPos))

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

    expect(violations).toEqual([])
    expect(steps).toBeGreaterThan(50) // a walk this floor short would prove nothing was exercised
  }, 120_000)

  // A plain shipped floor, with no mechanism at all — the guard is not only for the exotic case.
  it("holds on an ordinary shipped floor", () => {
    const floor = allFloors()[0]

    const { violations, steps } = walkFloor(floor.journeyId, floor.config, floor.seed)

    expect(violations).toEqual([])
    expect(steps).toBeGreaterThan(3)
  }, 120_000)
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

// A GATE A CONTROL OWNS IS SHOWN OR HIDDEN BY THE CONTROL ALONE. The player never stands in it, taps it
// or is asked anything at it; what the lever is set to is the whole of whether the bars are there. Every
// one of doubleBack's five gates is put through shut, open and shut again, because the last step is the
// one a gate that remembered having been passed would draw wrong.
describe("a gate a control owns is decided by its control alone", () => {
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), 2, 0)
  const floorConfig = buildDoubleBack()
  // A gate.s key is minted from the journey id the harness carves the floor under (`buildHarness`), so the
  // floor is carved under the same one here.
  const storedJourneyId = knownJourneyIds.has(DEV_JOURNEY_ID) ? DEV_JOURNEY_ID : fallbackKnownJourneyId
  const carved = assembleFloor(storedJourneyId, floorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: storedJourneyId, floorIndex: 0 },
  })
  if (!carved.success) throw new Error("doubleBack did not assemble")
  const base = carved.grid

  type Gate = { key: string; owners: Array<{ address: string; shut: string; open: string; initial: string }> }
  const mechanisms: Array<{
    address: string
    states: readonly string[]
    initial: string
    opens: (s: string) => string[]
  }> = []
  const gateKeys = new Set<string>()
  base.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room") return
      if (cell.requiredKeyId?.startsWith(OBSTACLE_KEY_PREFIX)) gateKeys.add(cell.requiredKeyId)
      if (!cell.mechanism) return
      const address = cellAddress(base, 0, r, c)!
      const record = cell.mechanism
      mechanisms.push({
        address,
        states: record.states,
        initial: record.initial,
        opens: state => record.positions.filter(p => p.state === state).map(p => p.gateKeyId),
      })
    })
  )
  const gates: Gate[] = [...gateKeys].map(key => ({
    key,
    owners: mechanisms
      .filter(m => m.states.some(s => m.opens(s).includes(key)))
      .map(m => ({
        address: m.address,
        initial: m.initial,
        open: m.states.find(s => m.opens(s).includes(key))!,
        shut: m.states.find(s => !m.opens(s).includes(key))!,
      })),
  }))

  const scene = () => {
    const store = makeStore()
    const encounters: Array<readonly [number, number]> = []
    const harness = buildHarness(
      DEV_JOURNEY_ID,
      floorConfig,
      seed,
      [floorConfig],
      store,
      {},
      pos => void encounters.push(pos)
    )
    const hook = renderHook(harness.useHook)
    // Every mechanism at its own initial position except those named — the state a lever is thrown to
    // is the only thing this scene ever changes.
    const setLevers = (positions: Record<string, string>) => {
      store.mechanismStates = Object.fromEntries(Object.entries(positions).map(([a, s]) => [`1:${a}`, s]))
      hook.rerender()
      return hook.result.current
    }
    return { store, encounters, hook, setLevers }
  }
  const findGate = (grid: FloorGrid, key: string): [number, number] | null => {
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c]
        if (cell.type === "room" && cell.requiredKeyId === key) return [r, c]
      }
    return null
  }
  const drawnBars = (grid: FloorGrid, positions: Record<string, string>): string[] => {
    const seen = revealAll(grid)
    return nodeSpritesFor(seen, buildRoomClaims(seen), "expert", undefined, new Map(Object.entries(positions)), 0)
      .map(sprite => sprite.key)
      .filter(key => key.startsWith("wall:") || key.startsWith("gate:"))
  }

  it("has the five gates of doubleBack, each with a control that opens it, none carrying a family", () => {
    expect(gates).toHaveLength(5)
    expect(tileUrl("expert", "gate")).toBeTruthy()
    for (const { key, owners } of gates) {
      expect(owners.length, `${key} has an opener`).toBeGreaterThan(0)
      const [r, c] = findGate(base, key)!
      const cell = base.cells[r][c]
      expect(cell.type === "room" && cell.family).toBeUndefined()
      expect(isSealedWayOut(cell)).toBe(true)
    }
  })

  it("draws every gate shut, then open, then shut again from the lever alone, without the player entering it", () => {
    vi.useFakeTimers()
    try {
      for (const { key, owners } of gates) {
        const { store, encounters, hook, setLevers } = scene()
        const start = hook.result.current.explorerPos
        const shut = Object.fromEntries(owners.map(o => [o.address, o.shut]))
        const open = Object.fromEntries(owners.map(o => [o.address, o.open]))

        const first = setLevers(shut)
        const at = findGate(first.grid!, key)
        expect(at, `${key} stands while its lever is shut`).not.toBeNull()
        const shutBars = drawnBars(first.grid!, shut)
        expect(shutBars, `${key} is drawn while shut`).toContain(`wall:${at![0]},${at![1]}`)

        const second = setLevers(open)
        expect(findGate(second.grid!, key), `${key} is gone while its lever is open`).toBeNull()
        expect(drawnBars(second.grid!, open), `${key} is not drawn while open`).not.toContain(
          `wall:${at![0]},${at![1]}`
        )

        const third = setLevers(shut)
        expect(findGate(third.grid!, key), `${key} stands again once its lever is thrown back`).toEqual(at)
        expect(drawnBars(third.grid!, shut), `${key} is drawn again once thrown back`).toEqual(shutBars)

        // The lever moved and the player never did: no cell written, no screen opened.
        act(() => vi.advanceTimersByTime(5000))
        expect(hook.result.current.explorerPos).toEqual(start)
        expect(store.positionKey).toBeNull()
        expect(store.exploredCells).toEqual({})
        expect(encounters).toEqual([])
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it("refuses every shut gate to the player: not walkable, no path, no marker, no screen or prompt on a tap", () => {
    vi.useFakeTimers()
    try {
      for (const { key, owners } of gates) {
        const { store, encounters, hook, setLevers } = scene()
        const shut = Object.fromEntries(owners.map(o => [o.address, o.shut]))
        const { grid, explorerPos } = setLevers(shut)
        const [r, c] = findGate(grid!, key)!
        const seen = revealAll(grid!)

        expect(walkableFrom(seen, explorerPos).has(`${r},${c}`), `${key} is walkable`).toBe(false)
        expect(findPath(seen, explorerPos, [r, c]), `${key} has a path`).toEqual([])
        const offered = [...offeredTargets(seen, buildRoomClaims(seen), explorerPos).values()]
        expect(
          offered.some(([or, oc]) => or === r && oc === c),
          `${key} is offered`
        ).toBe(false)
        expect(grid!.cells[r][c], `${key} was marked passed`).not.toMatchObject({ state: "completed" })

        act(() => hook.result.current.onCellClick(r, c))
        act(() => vi.advanceTimersByTime(5000))
        hook.rerender()
        expect(encounters, `${key} opened a screen`).toEqual([])
        expect(hook.result.current.prompt, `${key} offered a prompt`).toBeNull()
        expect(hook.result.current.explorerPos).toEqual(explorerPos)
        expect(store.positionKey).toBeNull()
      }
    } finally {
      vi.useRealTimers()
    }
  })
})
