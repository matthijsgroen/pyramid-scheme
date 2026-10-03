import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { journeys as allJourneys } from "@/data/journeys"
import { getFamilyPlugin, resolveEncounter as realResolveEncounter } from "@/app/families/familyRegistry"
import { createJourneysV3Api, MECHANISM_SLOT_VERSION, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { assembleFloor, defaultResolveEncounter, type ResolveEncounter } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { cellAddress, legacyCellAddress, storedAtCell } from "@/game/cellAddress"
import { legalTargets } from "@/game/mechanismDoors"
import type { FloorConfig, FloorGrid, RoomCell } from "@/game/siteTypes"
import { designerDoubleBack, forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { handleFloorConfig } from "@/game/testSupport/handleFixtures"
import { andDoorFloor, threeOwnerDoorFloor } from "@/game/testSupport/gateFaceFixtures"
import { boardIndexesForFloor } from "./boardIndexes"
import { encodeEdge } from "./edgeId"
import { backfillMechanismSlots } from "./backfillMechanismSlots"
import { applyExplored } from "./useAssembledFloor"
import { cellKey, findByAddress } from "./cellIdentity"

const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

type Carved = { grid: FloorGrid; seed: number }

const carveAtAnySeed = (config: FloorConfig, siteId: string, seed?: number): Carved => {
  for (let at = seed ?? 1; at <= (seed ?? 60); at++) {
    const result = assembleFloor(siteId, config, at, reEnterable)
    if (result.success) return { grid: result.grid, seed: at }
  }
  throw new Error(`no seed carved ${siteId}`)
}

const JUNIOR_2 = "junior_2"
const JUNIOR_2_LEVEL = 2

/** The shipped pyramid-2 floor of junior_2, at its real seed, with its own switch bound to `encounter`. */
const realJunior2Floor = (encounter: string): FloorGrid => {
  const config = allJourneys.find(j => j.id === JUNIOR_2)!.siteConfigs![JUNIOR_2_LEVEL - 1][0] as FloorConfig
  const result = assembleFloor(
    JUNIOR_2,
    { ...config, switches: { ...config.switches!, encounter } },
    floorAssemblySeed(persistentInteriorSeed(JUNIOR_2), JUNIOR_2_LEVEL, 0),
    realResolveEncounter,
    {
      resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
      floorRef: { journeyId: JUNIOR_2, levelIndex: JUNIOR_2_LEVEL - 1, floorIndex: 0 },
      resolveBoardIndex: boardIndexesForFloor(JUNIOR_2, JUNIOR_2_LEVEL - 1, 0),
    }
  )
  if (!result.success) throw new Error(`junior_2 floor refused: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

const mechanismRooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.mechanism && !cell.sequenceTile ? [{ r, c, cell: cell as RoomCell }] : []
    )
  )

/** Every control of the config bound to `encounter` where `pick` says so, and left alone elsewhere. */
const rebindControls = (
  config: FloorConfig,
  bind: (encounter: string | undefined, id: string) => string | undefined
) => ({
  ...config,
  controls: config.controls!.map(control => {
    const { encounter: _was, ...rest } = control
    const encounter = bind(control.encounter, control.id)
    return { ...rest, ...(encounter === undefined ? {} : { encounter }) }
  }) as NonNullable<FloorConfig["controls"]>,
})

type Scenario = {
  name: string
  journeyId: string
  levelNr: number
  before: () => FloorGrid
  after: () => FloorGrid
}

let forkSwitchCarved: Carved | undefined
/** The fork-switch floor carves slowly; one carve serves every test that needs it. */
const forkSwitchCarve = (): Carved => (forkSwitchCarved ??= carveAtAnySeed(forkSwitchFloorConfig(), "site-slot-fork"))

const swapTorchAndLever = (encounter: string | undefined) => (encounter === "torch" ? undefined : "torch")

const scenarios: Scenario[] = [
  {
    name: "a torch and a lever owning one door",
    journeyId: "dev_topology",
    levelNr: 1,
    before: () => carveAtAnySeed(andDoorFloor(), "site-slot", 3).grid,
    after: () =>
      carveAtAnySeed(
        rebindControls(andDoorFloor(), e => swapTorchAndLever(e)),
        "site-slot",
        3
      ).grid,
  },
  {
    name: "the plain switch of the shipped junior_2 pyramid 2",
    journeyId: JUNIOR_2,
    levelNr: JUNIOR_2_LEVEL,
    before: () => realJunior2Floor("lightbeamSwitch"),
    after: () => realJunior2Floor("handle"),
  },
  {
    name: "a fork-switch beside the doubleBack's controls",
    journeyId: "dev_topology",
    levelNr: 1,
    before: () => forkSwitchCarve().grid,
    after: () => {
      const config = forkSwitchFloorConfig()
      const rebound = {
        ...config,
        controls: config.controls!.map(c => (c.id === "Y" ? { ...c, encounter: "handle" } : c)) as NonNullable<
          FloorConfig["controls"]
        >,
      }
      return carveAtAnySeed(rebound, "site-slot-fork", forkSwitchCarve().seed).grid
    },
  },
]

const makeJourney = (overrides: Partial<StoredJourneyStateV3>): StoredJourneyStateV3 => ({
  journeyId: JUNIOR_2,
  levelNr: 1,
  completionCount: 0,
  active: true,
  exploredSections: {},
  position: null,
  interiorLevelNr: null,
  ...overrides,
})

/** A store the API writes into, read back through a fresh API each time, as the app does. */
const liveStore = (journey: StoredJourneyStateV3) => {
  let state = [journey]
  const api = () =>
    createJourneysV3Api({
      journeys: state,
      setJourneys: update => {
        state = typeof update === "function" ? update(state) : update
      },
      journeyData: [{ id: journey.journeyId, exterior: "pyramid", levelCount: 9 }] as never,
    })
  return { api, saved: () => state[0] }
}

describe("a mechanic's progress across a change of realisation", () => {
  for (const scenario of scenarios) {
    it(`keeps every stored state and explored mark of ${scenario.name}`, () => {
      const before = scenario.before()
      const after = scenario.after()
      const rooms = mechanismRooms(before)
      expect(rooms.length).toBeGreaterThan(0)
      // The premise: the binding really moved to another family, or nothing was asked of the slot.
      const familiesOf = (grid: FloorGrid) =>
        mechanismRooms(grid).map(({ cell }) => `${cell.mechanismId}=${cell.family}`)
      expect(familiesOf(after)).not.toEqual(familiesOf(before))

      const { api, saved } = liveStore(makeJourney({ journeyId: scenario.journeyId, levelNr: scenario.levelNr }))
      const written = new Map<string, string>()
      for (const { r, c, cell } of rooms) {
        const address = cellAddress(before, 0, r, c)!
        const target = legalTargets(cell.mechanism!, cell.mechanism!.initial)[0]
        api().setMechanismState(address, target)
        written.set(cell.mechanismId!, target)
        api().markCellExplored(cell.sectionHash ?? "", encodeEdge(0, r, c), address)
      }

      const states = api().getMechanismStates(scenario.journeyId)
      const explored = api().getExploredCells(scenario.journeyId)
      const read = mechanismRooms(after).map(({ r, c, cell }) => ({
        id: cell.mechanismId!,
        state: storedAtCell(after, 0, r, c, states),
        explored: explored[cell.sectionAddress!]?.includes(cellKey(after, 0, r, c)!) ?? false,
      }))

      const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
      expect([...read].sort(byId)).toEqual(
        [...written].map(([id, state]) => ({ id, state, explored: true })).sort(byId)
      )
      expect(saved().mechanismStates).not.toEqual({})
    })
  }
})

describe("two mechanics on one floor", () => {
  const floors: [string, FloorGrid][] = [
    ["a torch and a lever", carveAtAnySeed(andDoorFloor(), "site-two").grid],
    ["two torches and a lever", carveAtAnySeed(threeOwnerDoorFloor(), "site-three").grid],
    ["the doubleBack's controls", carveAtAnySeed(designerDoubleBack(), "site-double").grid],
    ["a fork-switch and the doubleBack's controls", forkSwitchCarve().grid],
    [
      "two levers",
      carveAtAnySeed(
        handleFloorConfig(
          { in: "lever", left: ["vault"], right: ["pocket"] },
          { in: "lever2", left: ["vault2"], right: ["pocket2"] }
        ),
        "site-levers"
      ).grid,
    ],
  ]
  for (const [name, grid] of floors) {
    it(`give ${name} an address each`, () => {
      const addresses = mechanismRooms(grid).map(({ r, c }) => cellAddress(grid, 0, r, c))
      expect(addresses.length).toBeGreaterThanOrEqual(2)
      expect(new Set(addresses).size).toBe(addresses.length)
    })
  }
})

describe("a save written before a mechanism's slot named the mechanism", () => {
  // Written out by hand, as the save was: the family is in the slot.
  const oldSlotOf = (cell: RoomCell) =>
    cell.mechanismId!.startsWith("switch:") ? `x${cell.family}` : `x${cell.family}:${cell.mechanismId}`

  const oldSave = (grid: FloorGrid, journeyId: string, levelNr: number) => {
    const rooms = mechanismRooms(grid)
    const exploredCells: Record<string, string[]> = {}
    const mechanismStates: Record<string, string> = {}
    for (const { cell } of rooms) {
      const section = `${levelNr}:${cell.sectionAddress}`
      exploredCells[section] = [...(exploredCells[section] ?? []), `0/${oldSlotOf(cell)}`]
      const old = `${levelNr}:${cell.sectionAddress}#0/${oldSlotOf(cell)}`
      mechanismStates[old] = `state-of-${cell.mechanismId}`
      mechanismStates[`${old}:angles`] = `angles-of-${cell.mechanismId}`
    }
    // Entries that are not a mechanism's: a puzzle room, a chest, a trap, a bought slot, a position.
    exploredCells[`${levelNr}:main`] = [...(exploredCells[`${levelNr}:main`] ?? []), "0/p0", "0/xtreasure-chest"]
    return makeJourney({
      journeyId,
      levelNr,
      exploredCells,
      mechanismStates,
      disabledTraps: [`${levelNr}:main#0/p1`],
      purchasedStock: [`${levelNr}:main#0/xfez-shop!0`],
      positionKey: `main#0/p0`,
      standingKey: `main#0/p0`,
    })
  }

  const grids: [string, FloorGrid, string, number][] = [
    ["a control floor", carveAtAnySeed(andDoorFloor(), "site-old").grid, "dev_topology", 1],
    ["a fork-switch floor", forkSwitchCarve().grid, "dev_topology", 1],
    ["the junior_2 plain switch", realJunior2Floor("lightbeamSwitch"), JUNIOR_2, JUNIOR_2_LEVEL],
  ]

  for (const [name, grid, journeyId, levelNr] of grids) {
    const save = oldSave(grid, journeyId, levelNr)
    const assembleFor = () => grid

    it(`still reads ${name}'s state and explored rooms through the fallback`, () => {
      const states = new Map(Object.entries(save.mechanismStates!).map(([k, v]) => [k.slice(`${levelNr}:`.length), v]))
      for (const { r, c, cell } of mechanismRooms(grid))
        expect(storedAtCell(grid, 0, r, c, states)).toBe(`state-of-${cell.mechanismId}`)
      const named = applyExplored(
        grid,
        0,
        Object.fromEntries(Object.entries(save.exploredCells!).map(([k, v]) => [k.slice(`${levelNr}:`.length), v]))
      )
      for (const { r, c } of mechanismRooms(grid)) expect((named.cells[r][c] as RoomCell).state).not.toBe("fogged")
    })

    it(`still stands the explorer on ${name}'s mechanism room when the save names it by the old address`, () => {
      for (const { r, c, cell } of mechanismRooms(grid))
        expect(findByAddress(grid, 0, `${cell.sectionAddress}#0/${oldSlotOf(cell)}`)).toEqual([r, c])
    })

    it(`copies ${name}'s entries to the new address and touches nothing else`, () => {
      const { api, saved } = liveStore(save)
      api().setMechanismSlotBackfill(journeyId, backfillMechanismSlots(save, assembleFor))

      const expectedStates = { ...save.mechanismStates }
      const expectedCells: Record<string, string[]> = Object.fromEntries(
        Object.entries(save.exploredCells!).map(([k, v]) => [k, [...v]])
      )
      for (const { cell } of mechanismRooms(grid)) {
        const base = `${levelNr}:${cell.sectionAddress}#0/`
        expectedStates[`${base}xmech:${cell.mechanismId}`] = `state-of-${cell.mechanismId}`
        expectedStates[`${base}xmech:${cell.mechanismId}:angles`] = `angles-of-${cell.mechanismId}`
        expectedCells[`${levelNr}:${cell.sectionAddress}`].push(`0/xmech:${cell.mechanismId}`)
      }
      expect(saved()).toEqual({
        ...save,
        exploredCells: expectedCells,
        mechanismStates: expectedStates,
        mechanismSlotVersion: MECHANISM_SLOT_VERSION,
      })
    })

    it(`copies ${name}'s entries once, however often it runs, and never over a newer state`, () => {
      const once = backfillMechanismSlots(save, assembleFor)
      expect(backfillMechanismSlots({ ...save, ...once }, assembleFor)).toEqual(once)

      const [first] = mechanismRooms(grid)
      const address = `${levelNr}:${cellAddress(grid, 0, first.r, first.c)}`
      const moved = { ...save.mechanismStates, [address]: "moved-since" }
      expect(backfillMechanismSlots({ ...save, mechanismStates: moved }, assembleFor).mechanismStates[address]).toBe(
        "moved-since"
      )
    })

    it(`reads ${name} from the new address alone once the old keys are gone`, () => {
      const copied = backfillMechanismSlots(save, assembleFor)
      const states = new Map(
        Object.entries(copied.mechanismStates)
          .filter(([key]) => key.includes("xmech:"))
          .map(([k, v]) => [k.slice(`${levelNr}:`.length), v])
      )
      for (const { r, c, cell } of mechanismRooms(grid)) {
        expect(legacyCellAddress(grid, 0, r, c)).not.toBeNull()
        expect(states.get(cellAddress(grid, 0, r, c)!)).toBe(`state-of-${cell.mechanismId}`)
      }
    })
  }
})
