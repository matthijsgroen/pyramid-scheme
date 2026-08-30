import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { WORLD_TARGETS } from "./worldSpec"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
// Deliberate exception to "src/worldGen/ never imports src/mods/": this integration spec
// verifies the REAL, complete world, which needs the real mod-owned currencies — same standing
// as scripts/generateWorld.ts, the other sanctioned place that reaches across for a full build.
// Production code (configBuilder.ts/placeFragments.ts) never imports this; it derives the
// expected reward counts from the injected currencies themselves.
import { ALL_CURRENCY_DISTRIBUTIONS } from "../mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
} from "../mods/registeredMods"
import { MOSAIC_TOTAL } from "../mods/mosaic/game/mosaicCurrency"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  allocateEncounterSpread,
} from "../mods/allFamilyMeta"

// This is a structural golden guard (reward counts, determinism, tomb linking) — NOT an economy
// check. The economy guard is a separate global invariant (validated by generate-world) that only
// balances once the whole world is authored; skip it here so these assertions don't depend on
// economy tuning mid-authoring.
beforeAll(() => {
  process.env.SKIP_ECONOMY_GUARD = "1"
})
afterAll(() => {
  delete process.env.SKIP_ECONOMY_GUARD
})

const buildRealConfigs = () =>
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
    MOD_SHOP_STOCK
  )

// Golden guard for the world-builder refactor: buildRealConfigs() must keep
// producing the same reward counts and the same output on every run.

const countRewards = (configs: Record<string, SiteConfig[]>) => {
  let mapPieces = 0
  let mosaicPieces = 0

  const count = (r: TreasureReward | undefined) => {
    if (!r) return
    if (r.type === "mapPiece") mapPieces++
    if (r.type === "mosaicPiece") mosaicPieces++
  }

  // Count both node reward fields: the path-end `endReward` AND every `rewards[]` entry (shop stock
  // lives here) — mirrors validate.ts + the detector's uniform sweep.
  const counts = (rs: (TreasureReward | undefined)[] | undefined) => rs?.forEach(count)
  const countFloor = (floor: FloorConfig) => {
    count(floor.mainEndReward)
    counts(floor.rewards)
    for (const s of floor.sideSections) {
      count(s.endReward)
      counts(s.rewards)
      for (const sub of s.sideSections ?? []) {
        count(sub.endReward)
        counts(sub.rewards)
      }
    }
  }

  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) countFloor(floor)
    }
  }

  return { mapPieces, mosaicPieces }
}

// A full world build assembles every reachable floor, so these budgets are seconds, not
// milliseconds — and they have to hold on a CI runner well slower than a dev machine. They were
// already within 40% of the old 20s ceiling before the assembler's recovery phase (which resolves
// floors reachability used to silently skip) made a build ~30% dearer, so this leaves real headroom
// rather than something to shave again the next time the world grows.
describe("buildConfigs golden guard", () => {
  it("hits reward targets exactly (map + mosaic from their mods)", () => {
    const configs = buildRealConfigs()
    expect(countRewards(configs)).toEqual({
      mapPieces: WORLD_TARGETS.mapPieceRewards,
      mosaicPieces: MOSAIC_TOTAL,
    })
  }, 90_000)

  it("is deterministic across runs", () => {
    const first = buildRealConfigs()
    const second = buildRealConfigs()
    expect(second).toEqual(first)
  }, 90_000)
})

describe("tomb floor linking — ward-path shortcuts", () => {
  // Built in beforeAll (not the describe body) so it runs AFTER the top-level beforeAll sets
  // SKIP_ECONOMY_GUARD — a describe-body call would execute at collection time, before it.
  let floors: FloorConfig[]
  beforeAll(() => {
    floors = buildRealConfigs().junior_treasure_tomb[0]
  }, 90_000)

  it("every floor's main path ends in a real exit, not an auto-chained stairhead", () => {
    for (const floor of floors) expect(floor.exitOrStaircase).toBe("exit")
  })

  it("every non-last floor has a ward-path shortcut gated by that floor's own key", () => {
    for (let i = 0; i < floors.length - 1; i++) {
      const shortcut = floors[i].sideSections.find(s => s.gate?.type === "tomb-key")
      expect(shortcut).toBeDefined()
      expect(shortcut!.gate).toEqual({
        type: "tomb-key",
        wardKeyId: (floors[i].mainEndReward as unknown as { keyId: string }).keyId,
      })
      expect(typeof shortcut!.end).toBe("object")
    }
  })

  it("the last floor gets a ward-chest loot pocket (not a staircase shortcut) keyed on its own treasure", () => {
    // §E: every treasure gates an (optional) pocket — the last floor has no next floor to skip
    // to, so its own treasure gates a loot chest instead of a shortcut staircase.
    const last = floors[floors.length - 1]
    const pocket = last.sideSections.find(s => s.gate?.type === "tomb-key")
    expect(pocket).toBeDefined()
    expect(pocket!.gate).toEqual({
      type: "tomb-key",
      wardKeyId: (last.mainEndReward as unknown as { keyId: string }).keyId,
    })
    expect(pocket!.end).toBe("treasure") // a chest, not a { stairId } staircase
  })

  it("wires each floor's entrance to the previous floor's shortcut stairId", () => {
    for (let i = 0; i < floors.length - 1; i++) {
      const shortcut = floors[i].sideSections.find(s => s.gate?.type === "tomb-key")!
      expect(floors[i + 1].entrance).toEqual(shortcut.end)
    }
  })
})
