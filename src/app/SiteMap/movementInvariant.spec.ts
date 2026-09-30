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
// Three properties, asserted at every step of a full walk rather than at a sampled few (this
// project's rule — a sampled version would have missed at least one of the three). They are stated as
// acceptance criteria in docs/mods/floor-topology-design.md, "What makes the map of a floor
// acceptable":
//
//   A. offers match walkability — a stopping point (a room, or a corridor corner) that `walkableFrom`
//      reaches must be some marker's click target; nothing offers a destination the player cannot
//      actually reach.
//   B. taking an offer moves the explorer there — clicking a target the map offered must leave the
//      explorer standing on it.
//   C. every tap draws something, except a corridor corner already completed — see `markerViolations`.
//
// A one-way's mouth is walkable from its landing and is a stopping point like any other corner
// (`isStoppingPoint` below knows it by `isOneWayMouth`, since it stalls at "visible" rather than
// "reachable"), so property A holds it to the same offer requirement. Only the direction BEYOND the
// mouth, back the way the drop came, is never in `walkableFrom` — the mouth's own `dirs` never carry
// it — so nothing is ever required to offer that, which is what keeps crossing impossible.
//
// WHAT IS WALKED IS A MECHANIC, NOT A FLOOR. Each fixture below is a dozen cells drawn by hand
// (`floorFrom`) around one mechanism — a plain corridor, a lever and its gates, a drop — and is walked
// through every (position × mechanism state) a player can reach. A failure names the mechanic. The
// authored world is checked for soundness by `INCLUDE_DEV=1 yarn validate-world`, not here.
//
// Built at the hook level — `useAssembledFloor` + `useSiteNavigation` + `clickTargets` +
// `walkableFrom` — so it runs in the normal suite and stays fast; a browser is not needed to see two
// pure functions disagree with each other. The assembler is stood in for by the fixture's own grid;
// everything after the carve is the real pipeline.
import { renderHook, act, render } from "@testing-library/react"
import { createElement, useState } from "react"
import { describe, expect, it, vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, MechanismRecord, SiteConfig } from "@/game/siteTypes"
import { walkableFrom, findPath, isSealedWayOut, isOneWayMouth, revealAll } from "@/game/gridNavigation"
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
import { encodeEdge } from "./edgeId"
import { AXES, KINDS, addressed, dropGrid, floorFrom, roomPiece, type Piece } from "./floorFixtures.testing"
// Populates the family registry, the same side effect every other assembled-floor spec relies on.
import "@/mods/registerModApps"

// The fixture's own grid stands in for the carve: `useAssembledFloor` asks the assembler for a floor
// and gets the one drawn by hand, keyed by the config object it was handed.
const { carved } = vi.hoisted(() => ({ carved: new WeakMap<object, unknown>() }))
vi.mock("@/game/siteAssembler", async importOriginal => {
  const actual = await importOriginal<typeof import("@/game/siteAssembler")>()
  return {
    ...actual,
    assembleFloor: (...args: Parameters<typeof actual.assembleFloor>) => {
      const grid = carved.get(args[1])
      return grid ? { success: true, grid } : actual.assembleFloor(...args)
    },
  }
})

const standIn = (grid: FloorGrid): FloorConfig => {
  const config: FloorConfig = {
    pathPuzzles: 1,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
  }
  carved.set(config, grid)
  return config
}

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
// shipped journey list (src/data/journeys.ts) and marked active", so the harness's one stored journey
// is a real, known one. This is safe for what is under test: the floor comes from the fixture, and the
// journey id reaches nothing but the store's own bookkeeping.
const JOURNEY_ID = allKnownJourneys[0].id
const SEED = 1

/** Wires one floor's real reveal pipeline (`useAssembledFloor`) to the real click handler
 * (`useSiteNavigation`) over `createJourneysV3Api` — the same factory `useJourneys.spec.ts` itself
 * drives — rebuilt fresh on every render (so `activeJourneyId`/`levelOf` see the latest write) from a
 * single stored journey whose `exploredCells`/`positionKey`/`standingKey`/`mechanismStates` ARE `store`'s
 * own fields, so a rerender always reflects the latest click, the same round trip `SiteMapScreen` makes
 * minus the DOM. `patch` lets a test corrupt one write to prove the checks below actually fire on the
 * class of bug they're for. */
const buildHarness = (
  grid: FloorGrid,
  store: Store,
  patch: Partial<JourneyAPI> = {},
  onEncounter?: (pos: readonly [number, number], freshArrival: boolean) => void
): Harness => {
  const floorConfig = standIn(grid)
  const siteConfig: SiteConfig = [floorConfig]
  const journeyData = [makeJourneyData(JOURNEY_ID)]

  // The one stored journey, as it stands RIGHT NOW — read fresh on every `setJourneys` call (never a
  // snapshot closed over at render time) so two writes issued moments apart from the same render's
  // `journeys` (a click's own `updatePosition`, then a scheduled prompt's `setMechanismState`) compose
  // instead of the second clobbering the first back to whatever the first read before it ran.
  const currentJourneyDoc = (): StoredJourneyStateV3 => ({
    journeyId: JOURNEY_ID,
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
    const exploredCells = journeys.getExploredCells(JOURNEY_ID)
    const mechanismPositions = useMechanismStates(journeys, JOURNEY_ID)
    const assembled = useAssembledFloor(
      JOURNEY_ID,
      floorConfig,
      SEED,
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
      journeyId: JOURNEY_ID,
      siteConfig,
      seed: SEED,
      currentFloor: 0,
      grid: assembled.grid,
      explorerPos: assembled.explorerPos,
      // A room the explorer opens is solved on the spot, as a played board is, unless a test asks to see
      // the screen open instead: a room that stays unsolved stops the reveal, and the walk with it.
      onEncounter:
        onEncounter ??
        (([r, c]) => {
          const cell = assembled.grid?.cells[r]?.[c]
          const address = cell && cellAddress(assembled.grid!, 0, r, c)
          if (cell && cell.type !== "empty" && address)
            journeys.markCellExplored(cell.sectionHash ?? "", encodeEdge(0, r, c), address)
        }),
      onSkippedConsumable: () => {},
      onExitReached: () => {},
    })
    return { ...assembled, onCellClick: nav.onCellClick, prompt: nav.prompt }
  }

  return { useHook }
}

// Every fixture is small, so a walk that needs more than this has run away rather than run long.
const STEP_BUDGET = 500

/**
 * Walks every reachable (position × mechanism-state) combination of a floor depth-first, asserting
 * both halves of the invariant at every stop it visits and every offer it takes — a step budget bails
 * out with its own violation rather than hanging, so a floor whose branching runs away is a red test
 * rather than a stuck one.
 */
const walkFloor = (grid: FloorGrid): { violations: string[]; steps: number } => {
  const store = makeStore()
  const harness = buildHarness(grid, store)
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
    if (steps > STEP_BUDGET) {
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

// THE FIXTURES. One mechanic each, drawn by hand. `E` is the entrance, `R` a room, `F` a fork, `.` a
// corridor; the letters below are added per mechanic.
const gateKey = (id: string) => `${OBSTACLE_KEY_PREFIX}fixture:${id}`

/** A gate a control owns: a room with bars in it and nothing standing inside, opened by no key. */
const gate =
  (id: string): Piece =>
  dirs => ({
    type: "room",
    roomType: "encounter",
    tags: ["gate"],
    requiredKeyId: gateKey(id),
    dirs: new Set(dirs),
    state: "fogged",
  })

const lever = (mechanism: MechanismRecord): Piece =>
  roomPiece({ family: "handle", tags: ["handle"], mechanism, mechanismId: "lever" })

const leverOpening = (...gates: string[]): MechanismRecord => ({
  states: ["left", "right"],
  initial: "left",
  returnsToInitial: true,
  positions: gates.map(id => ({ state: "right", gateKeyId: gateKey(id) })),
})

/** One gate ahead of the fork's east branch, one ahead of its south branch. */
const TWO_GATES = ["E.L.F.A..", "    .   .", "    B   R", "    .    ", "    R    "]

const lockedRun = (mechanism: MechanismRecord) =>
  floorFrom(["E.L.A..", "      .", "      R"], { L: lever(mechanism), A: gate("a") })
const forkedRun = (mechanism: MechanismRecord) =>
  floorFrom(TWO_GATES, { L: lever(mechanism), A: gate("a"), B: gate("b") })

// A mouth carries one direction, toward its landing; the landing carries none back.
const mouth: Piece = () => ({ type: "corridor", dirs: new Set<Direction>(["e"]), state: "fogged" })
const landing: Piece = dirs => roomPiece()(dirs.filter(dir => dir !== "w"))
const DROP = { M: mouth, T: landing }

const plainCorridors = floorFrom(["E.R..", "    .", "  R.F.R", "  .", "  R"])

// The lever throws once and the gate's owner is the only thing that decides whether it stands.
const oneGate = lockedRun(leverOpening("a"))
const twoGatesTogether = forkedRun(leverOpening("a", "b"))
// The lever leaves "a" open and "b" shut on arrival, and throwing it swaps them.
const toggledGates = forkedRun({
  states: ["left", "right"],
  initial: "left",
  returnsToInitial: true,
  positions: [
    { state: "left", gateKeyId: gateKey("a") },
    { state: "right", gateKeyId: gateKey("b") },
  ],
})
// Two levers own one gate and neither names a mode, so the gate stands only while BOTH are thrown.
const andGate = floorFrom(["E.L.N.A..", "        .", "        R"], {
  L: lever(leverOpening("a")),
  N: lever(leverOpening("a")),
  A: gate("a"),
})
const oneWayDrop = floorFrom(["E.RMT.R"], DROP)
const gateAndDrop = floorFrom(["E.L.A.RMT.R"], { ...DROP, L: lever(leverOpening("a")), A: gate("a") })

// `minSteps` sits just under each fixture's measured step count (109, 33, 93, 75, 90, 23 and 30), so a walk
// that stalls early is red rather than quietly shorter.
type Fixture = { name: string; grid: FloorGrid; minSteps: number }

const fixtures: Fixture[] = [
  { name: "a plain corridor with corners and a room, no mechanism", grid: plainCorridors, minSteps: 100 },
  { name: "a lever and one gate", grid: oneGate, minSteps: 25 },
  { name: "a lever and two gates opening together", grid: twoGatesTogether, minSteps: 80 },
  { name: "a lever and two gates, one open and one shut, so the lever toggles", grid: toggledGates, minSteps: 65 },
  { name: "two levers and one gate that needs both", grid: andGate, minSteps: 75 },
  { name: "a one-way drop crossed from its departure", grid: oneWayDrop, minSteps: 15 },
  { name: "a gate and a one-way drop on one floor", grid: gateAndDrop, minSteps: 25 },
]

// A drop stood at from its landing, in every shape the drop takes (axis × what stands at each end).
const landingShapes = AXES.flatMap(axis =>
  KINDS.flatMap(departure =>
    KINDS.map(kind => ({
      name: `a one-way drop stood at from its landing: ${axis.travel}-going, ${departure} departure, ${kind} landing`,
      grid: addressed(dropGrid(axis, departure, kind).grid),
    }))
  )
)

describe("the movement invariant — offers match walkability, and taking one moves the explorer", () => {
  it.each(fixtures)("holds across every reachable state of $name", ({ grid, minSteps }) => {
    const { violations, steps } = walkFloor(grid)

    expect(violations).toEqual([])
    expect(steps).toBeGreaterThan(minSteps) // a walk this short would prove nothing was exercised
  })

  it.each(landingShapes)("holds across every reachable state of $name", ({ grid }) => {
    const { violations, steps } = walkFloor(grid)

    expect(violations).toEqual([])
    expect(steps).toBeGreaterThan(3)
  })
})

// PROVING THE GUARD HAS TEETH. The walk above is only worth having if a corrupted write turns it red,
// so this corrupts the two writes directly, to prove the checks fire on the exact shape of the two
// sightings this invariant is FOR (a reveal that leaves the explorer behind, and a stopping point no
// marker names) without needing a real commit to revert each time.
describe("the guard actually fires", () => {
  const grid = plainCorridors
  // The first place the map offers that is not the ground the explorer already stands on.
  const offeredElsewhere = (
    offers: ReadonlyMap<string, readonly [number, number]>,
    explorerPos: readonly [number, number]
  ) => {
    const found = [...offers.values()].find(([r, c]) => r !== explorerPos[0] || c !== explorerPos[1])
    if (!found) throw new Error("the fixture offers nowhere to go")
    return found
  }

  // Sighting 3, reproduced directly: a click that marks the cell explored (so the corridor beyond it
  // lifts out of the fog, same as a real reveal) but never writes the new position — the write
  // `goHere()` makes and a broken build could drop. `offerViolations` alone cannot see this: the grid
  // and the offer it came from are both perfectly consistent, only the explorer failed to follow.
  it("catches a click that reveals a cell without moving the explorer onto it", () => {
    const store = makeStore()
    const harness = buildHarness(grid, store, {
      // The corrupted write: explored, but the position never moves — exactly "explores it, but the
      // player does not move there".
      updatePosition: () => {},
    })
    const hook = renderHook(harness.useHook)
    const { grid: carvedGrid, explorerPos } = hook.result.current
    if (!carvedGrid) throw new Error("fixture did not carve")

    const claims = buildRoomClaims(carvedGrid)
    const offers = offeredTargets(carvedGrid, claims, explorerPos)
    const target = offeredElsewhere(offers, explorerPos)

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
    const harness = buildHarness(grid, store)
    const hook = renderHook(harness.useHook)
    const { grid: carvedGrid, explorerPos } = hook.result.current
    if (!carvedGrid) throw new Error("fixture did not carve")

    const claims = buildRoomClaims(carvedGrid)
    const realOffers = offeredTargets(carvedGrid, claims, explorerPos)
    expect(realOffers.size).toBeGreaterThan(0) // the entrance really does offer somewhere on this fixture
    expect(offerViolations(carvedGrid, explorerPos, realOffers)).toEqual([]) // sound before the corruption

    // Erase every marker that leads to one destination — the near cell whose arrow points at it AND
    // its own corner/room entry alike, since a target reachable by more than one marker would survive
    // losing just one of them. The corruption a drawn-but-dead arrow or a missing one both reduce to.
    const victim = offeredElsewhere(realOffers, explorerPos)
    const corrupted = new Map(
      [...realOffers].filter(([, target]) => target[0] !== victim[0] || target[1] !== victim[1])
    )

    expect(offerViolations(carvedGrid, explorerPos, corrupted)).toEqual([
      `walkable stopping point ${victim[0]},${victim[1]} (${carvedGrid.cells[victim[0]][victim[1]].type}) has no offer pointing to it, from ${explorerPos}`,
    ])
  })
})

// A GATE A CONTROL OWNS IS SHOWN OR HIDDEN BY THE CONTROL ALONE. The player never stands in it, taps it
// or is asked anything at it; what the lever is set to is the whole of whether the bars are there. Every
// gate of every lever fixture is put through shut, open and shut again, because the last step is the
// one a gate that remembered having been passed would draw wrong.
describe("a gate a control owns is decided by its control alone", () => {
  type Gate = { key: string; owners: Array<{ address: string; shut: string; open: string; initial: string }> }
  const lockFixtures = [
    { name: "a lever and one gate", grid: oneGate, gateCount: 1 },
    { name: "a lever and two gates opening together", grid: twoGatesTogether, gateCount: 2 },
    { name: "a lever and two gates, one open and one shut", grid: toggledGates, gateCount: 2 },
  ].map(({ name, grid, gateCount }) => {
    const mechanisms: Array<{
      address: string
      states: readonly string[]
      initial: string
      opens: (s: string) => string[]
    }> = []
    const gateKeys = new Set<string>()
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type !== "room") return
        if (cell.requiredKeyId?.startsWith(OBSTACLE_KEY_PREFIX)) gateKeys.add(cell.requiredKeyId)
        if (!cell.mechanism) return
        const record = cell.mechanism
        mechanisms.push({
          address: cellAddress(grid, 0, r, c)!,
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
    return { name, grid, gateCount, gates }
  })

  const scene = (grid: FloorGrid) => {
    const store = makeStore()
    const encounters: Array<readonly [number, number]> = []
    const harness = buildHarness(grid, store, {}, pos => void encounters.push(pos))
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

  describe.each(lockFixtures)("$name", ({ grid, gateCount, gates }) => {
    it("has its gates, each with a control that opens it, none carrying a family", () => {
      expect(gates).toHaveLength(gateCount)
      expect(tileUrl("expert", "gate")).toBeTruthy()
      for (const { key, owners } of gates) {
        expect(owners.length, `${key} has an opener`).toBeGreaterThan(0)
        const [r, c] = findGate(grid, key)!
        const cell = grid.cells[r][c]
        expect(cell.type === "room" && cell.family).toBeUndefined()
        expect(isSealedWayOut(cell)).toBe(true)
      }
    })

    it("draws every gate shut, then open, then shut again from the lever alone, without the player entering it", () => {
      vi.useFakeTimers()
      try {
        for (const { key, owners } of gates) {
          const { store, encounters, hook, setLevers } = scene(grid)
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
          const { store, encounters, hook, setLevers } = scene(grid)
          const shut = Object.fromEntries(owners.map(o => [o.address, o.shut]))
          const { grid: carvedGrid, explorerPos } = setLevers(shut)
          const [r, c] = findGate(carvedGrid!, key)!
          const seen = revealAll(carvedGrid!)

          expect(walkableFrom(seen, explorerPos).has(`${r},${c}`), `${key} is walkable`).toBe(false)
          expect(findPath(seen, explorerPos, [r, c]), `${key} has a path`).toEqual([])
          const offered = [...offeredTargets(seen, buildRoomClaims(seen), explorerPos).values()]
          expect(
            offered.some(([or, oc]) => or === r && oc === c),
            `${key} is offered`
          ).toBe(false)
          expect(carvedGrid!.cells[r][c], `${key} was marked passed`).not.toMatchObject({ state: "completed" })

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
})
