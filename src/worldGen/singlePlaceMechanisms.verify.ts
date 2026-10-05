import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { FloorConfig, SiteConfig } from "./types"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
import { floorLock, regionsOf } from "../game/floorLock"
import { legalTargets } from "../game/mechanismDoors"
import { reachableStates, type LockSpec } from "../game/lockWalk"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  REGISTERED_MOD_IDS,
} from "../mods/registeredMods"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "../mods/allFamilyMeta"

// The dev journey's floors are the only real ones that author controls, so they are the real floors a
// mechanism's moves can be checked on, each at the seed the player is handed.
let dev: SiteConfig[]

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  dev = buildConfigs(
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
  )[DEV_JOURNEY_ID]
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

const assembleAt = (floor: FloorConfig, levelNr: number, floorIndex: number): FloorGrid | null => {
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), levelNr, floorIndex)
  const result = assembleFloor(DEV_JOURNEY_ID, floor as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex },
  })
  return result.success ? result.grid : null
}

// Each mechanism's moves as they were before a move could be placed: made in the region of the cell the
// mechanism stands in, read off the grid's own regions rather than floorLock's.
const asBefore = (grid: FloorGrid, lock: LockSpec): { lock: LockSpec; mechanisms: number } => {
  const { of } = regionsOf(grid)
  const mechanisms = { ...lock.mechanisms }
  let found = 0
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" || !cell.mechanism) return
      const id = Object.keys(mechanisms).find(key => key.endsWith(` ${r},${c}`))!
      found++
      mechanisms[id] = {
        ...mechanisms[id],
        transitions: cell.mechanism.states.flatMap(from =>
          legalTargets(cell.mechanism!, from).map(to => ({ from, to, at: of.get(`${r},${c}`)! }))
        ),
      }
    })
  )
  return { lock: { ...lock, mechanisms }, mechanisms: found }
}

describe("the dev journey's mechanisms, each working in one place", () => {
  it("reach exactly the states they reached before moves could be placed, on every dev floor", () => {
    expect(dev).toHaveLength(9)
    let withMechanisms = 0
    dev.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        const grid = assembleAt(floor, levelIndex + 1, floorIndex)
        expect(grid, `level ${levelIndex + 1} floor ${floorIndex} carves`).not.toBeNull()
        const lock = floorLock(grid!)
        if (!lock) return
        const before = asBefore(grid!, lock)
        withMechanisms += before.mechanisms
        expect(lock.mechanisms, `level ${levelIndex + 1}`).toEqual(before.lock.mechanisms)
        expect(reachableStates(lock), `level ${levelIndex + 1}`).toEqual(reachableStates(before.lock))
      })
    )
    expect(withMechanisms).toBeGreaterThanOrEqual(9)
  })
})
