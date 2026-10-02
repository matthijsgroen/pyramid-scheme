// @vitest-environment jsdom
//
// A WAY OPEN OUT OF THE PLAYER'S OWN CELL ALWAYS OFFERS SOMETHING TO WALK TO. Walked on the real dev
// pyramid-2 floor (doubleBack, ziplines) from the entrance, the way `movementInvariant.spec.ts` walks
// a hand-drawn one: take every offer, reveal as the player goes, visit every position. At each one,
// each way open from the player's cell that leads to a walkable cell must have an offer pointing that
// way. The fixtures there are a dozen cells; this is the floor a player reported a missing arrow on.
import { renderHook, act } from "@testing-library/react"
import { useState } from "react"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, SiteConfig } from "@/game/siteTypes"
import { dropEndsOf, walkableFrom } from "@/game/gridNavigation"
import { cellAddress } from "@/game/cellAddress"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { journeys as allKnownJourneys } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { useAssembledFloor } from "./useAssembledFloor"
import { useMechanismStates } from "./useMechanismStates"
import { useSiteNavigation } from "./useSiteNavigation"
import { buildRoomClaims } from "./roomClaims"
import { markerAt, offerContextFrom, offeredTargets } from "./clickTargets"
import { DIR_MOVES, corridorRunTargetsFrom } from "./corridorRuns"
import { encodeEdge } from "./edgeId"
import { buildConfigs } from "@/worldGen/configBuilder"
import { DEV_JOURNEY_ID } from "@/worldGen/data"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig as GameFloorConfig } from "@/game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
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
import "@/mods/registerModApps"

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

// The marker rule the map draws by. A guard test flips `dropDotMarkers` to break exactly one branch of
// it — the corner dot's — and leaves every other marker, and every tap, as the real rule makes them.
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
const STEP_BUDGET = 2500

/**
 * Walks every reachable (position × mechanism-state) combination of a floor depth-first, asserting
 * both halves of the invariant at every stop it visits and every offer it takes — a step budget bails
 * out with its own violation rather than hanging, so a floor whose branching runs away is a red test
 * rather than a stuck one.
 */
const walkFloor = async (
  grid: FloorGrid,
  inspect: (grid: FloorGrid, at: readonly [number, number]) => string[]
): Promise<{ violations: string[]; steps: number }> => {
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
  const sig = () => JSON.stringify(store.mechanismStates)
  const snapshot = () => ({ ...store })

  const visit = async (): Promise<void> => {
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

    violations.push(...inspect(grid, explorerPos))

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
        // Taking a span is a promise that settles with the player on the landing, so it is awaited.
        await act(async () => prompt.take())
        act(() => vi.advanceTimersByTime(5000))
        hook.rerender()
      }
      await visit()
      Object.assign(store, before)
      hook.rerender()
    }
  }

  vi.useFakeTimers()
  try {
    await visit()
  } finally {
    vi.useRealTimers()
  }
  return { violations, steps }
}

const build = () =>
  buildConfigs(
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

let pyramid2: FloorGrid

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  const withDev = build()
  delete process.env.INCLUDE_DEV
  const [floor] = withDev[DEV_JOURNEY_ID][1]
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), 2, 0)
  const result = assembleFloor(DEV_JOURNEY_ID, floor as unknown as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex: 0 },
  })
  if (!result.success) throw new Error("dev pyramid 2 did not carve")
  pyramid2 = result.grid
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

const NAMES: Record<Direction, string> = { n: "north", s: "south", e: "east", w: "west" }

/** Every way open out of the player's own cell that leads to a walkable cell, with nothing offered
 * toward it or nothing drawn on it. Each violation reads as a map reference.
 *
 * A run that ends at a shut gate is left out: its far end is a wall the player can see (`walkableFrom`
 * refuses to enter it), so the run offers nothing by design. */
const wayOutViolations = (grid: FloorGrid, at: readonly [number, number]): string[] => {
  const cell = grid.cells[at[0]][at[1]]
  if (cell.type === "empty") return []
  const claims = buildRoomClaims(grid)
  const offers = offeredTargets(grid, claims, at)
  const ctx = offerContextFrom(grid, at, {})
  const walkable = walkableFrom(grid, at)
  const runs = corridorRunTargetsFrom(grid, at)
  const out: string[] = []
  for (const dir of cell.dirs) {
    const nr = at[0] + DIR_MOVES[dir][0]
    const nc = at[1] + DIR_MOVES[dir][1]
    const key = `${nr},${nc}`
    const next = grid.cells[nr]?.[nc]
    if (!next || next.type === "empty" || !walkable.has(key)) continue
    const run = runs.get(key)
    if (run && !walkable.has(`${run.row},${run.col}`)) continue
    const offered = offers.has(key)
    const marker = markerAt(grid, claims, nr, nc, ctx)
    if (offered && marker) continue
    out.push(
      `standing at ${at} (${cell.type} ${[...cell.dirs].join("")}, ${cell.state}), ${NAMES[dir]} is open to ${key} ` +
        `(${next.type} ${[...(next.dirs ?? [])].join("")}, ${next.state}): offer=${offered}, marker=${JSON.stringify(marker)}`
    )
  }
  return out
}

describe("a way open out of the player's cell, on the real dev pyramid 2", () => {
  it("always offers something to walk to, and draws it", async () => {
    const stood = new Set<string>()
    const { violations, steps } = await walkFloor(pyramid2, (grid, at) => {
      stood.add(`${at[0]},${at[1]}`)
      return wayOutViolations(grid, at)
    })

    expect([...new Set(violations)]).toEqual([])
    expect(steps).toBeGreaterThan(20) // a walk this short would prove nothing was exercised
    // The report this guards stood on a drop's landing, so the walk must have stood on one.
    const dropEnds = [...dropEndsOf(pyramid2).keys()]
    expect(dropEnds.filter(key => stood.has(key)).length).toBeGreaterThan(0)
  }, 170_000)
})
