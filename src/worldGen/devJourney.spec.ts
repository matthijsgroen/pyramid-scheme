import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { collectSlots } from "./slots"
import {
  findEmptyChests,
  findStrandingLocks,
  findUnbakedSwitchBoards,
  findUndrawnOneWays,
  findUnwalkedLocks,
  type FloorRef,
  type StrandingLock,
} from "./validate"
import { PYRAMID_CAPABILITIES } from "./capabilities"
import { puzzleSeeds } from "../data/puzzleSeeds"
import { DEV_JOURNEY_ID } from "./data"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
import { assembleFloor } from "../game/siteAssembler"
// worldGen's FloorConfig is a looser mirror of game/siteTypes.ts's, and authored data only ever
// assigns values the stricter type accepts too — the same cast reachability.ts makes to assemble.
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
// Same sanctioned exception configBuilder.integration.spec.ts takes: the claim here is about the
// REAL, complete world, which only the real mod-owned currencies can build.
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
  ALL_FAMILY_META,
} from "../mods/allFamilyMeta"

// Mirrors scripts/generateWorld.ts's own call arg-for-arg (EMPTY_FRACTION 0 included), economy guard
// and all: a dev journey that quietly earned the player money would move `guaranteedIncome`, and that
// is one of the things this file is here to catch.
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

const rewardsOf = (configs: Record<string, SiteConfig[]>): TreasureReward[] => {
  const out: TreasureReward[] = []
  const add = (r: TreasureReward | undefined) => {
    if (r) out.push(r)
  }
  const addAll = (rs: (TreasureReward | undefined)[] | undefined) => rs?.forEach(add)
  for (const sites of Object.values(configs)) {
    for (const floors of sites) {
      for (const floor of floors) {
        add(floor.mainEndReward)
        addAll(floor.rewards)
        for (const section of floor.sideSections) {
          add(section.endReward)
          addAll(section.rewards)
          for (const sub of section.sideSections ?? []) {
            add(sub.endReward)
            addAll(sub.rewards)
          }
        }
      }
    }
  }
  return out
}

const tally = (rewards: readonly TreasureReward[], key: (r: TreasureReward) => string): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const r of rewards) counts[key(r)] = (counts[key(r)] ?? 0) + 1
  return counts
}

const byCurrency = (configs: Record<string, SiteConfig[]>) => tally(rewardsOf(configs), r => r.type)

const mosaicByTier = (configs: Record<string, SiteConfig[]>) =>
  tally(
    rewardsOf(configs).filter(r => r.type === "mosaicPiece"),
    r => `${r.tier}`
  )

// The seed a player actually gets for that floor, which is the only one a claim about the carve can
// be made at: a floor that carves at some other seed is not the floor anybody opens.
const assembleAt = (journeyId: string, floor: FloorConfig, levelNr: number, floorIndex: number): FloorGrid | null => {
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const result = assembleFloor(journeyId, floor as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId, floorIndex },
  })
  return result.success ? result.grid : null
}

const withoutDev = (configs: Record<string, SiteConfig[]>): Record<string, SiteConfig[]> =>
  Object.fromEntries(Object.entries(configs).filter(([id]) => id !== DEV_JOURNEY_ID))

const devFloors = (configs: Record<string, SiteConfig[]>): FloorConfig[] =>
  (configs[DEV_JOURNEY_ID] ?? []).flatMap(site => site)

// Two complete world builds, and the comparison between them is the point of the file — so both are
// paid for once here rather than by whichever test happens to run first. Budget: a single build runs
// well under 30s, and everything below reads these two.
let plain: Record<string, SiteConfig[]>
let withDev: Record<string, SiteConfig[]>
// The lock sweep over each of them, carved once here for the same reason: it assembles every floor in
// the world, and three tests below read the one result.
let plainSweep: { walked: FloorRef[]; stranding: StrandingLock[] }
let withDevSweep: { walked: FloorRef[]; stranding: StrandingLock[] }

beforeAll(() => {
  delete process.env.INCLUDE_DEV
  plain = build()
  process.env.INCLUDE_DEV = "1"
  withDev = build()
  delete process.env.INCLUDE_DEV
  plainSweep = findStrandingLocks(plain, assembleAt)
  withDevSweep = findStrandingLocks(withDev, assembleAt)
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

describe("the dev journey's place in the generated world", () => {
  // Everything below compares two worlds; if the second one never grew the dev journey, every
  // comparison would pass while proving nothing at all.
  it("is built only when INCLUDE_DEV is set", () => {
    expect(plain[DEV_JOURNEY_ID]).toBeUndefined()
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(7)
  })

  it("leaves every other journey exactly as it was", () => {
    expect(JSON.stringify(withoutDev(withDev))).toBe(JSON.stringify(plain))
  })
})

describe("the loot the dev journey contributes", () => {
  it("is none: not one reward is placed anywhere on it", () => {
    expect(rewardsOf({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] })).toEqual([])
  })

  it("is none the solver could have placed either: it offers no slot", () => {
    // Counted first: a world with no dev journey would filter an empty list and prove nothing.
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(7)
    const devSlots = collectSlots(withDev, familyPriorityFor).filter(s => s.journeyId === DEV_JOURNEY_ID)
    expect(devSlots).toEqual([])
  })

  it("moves no currency's placed count", () => {
    expect(byCurrency(withDev)).toEqual(byCurrency(plain))
  })

  it("moves no mosaic tier's placed count", () => {
    expect(mosaicByTier(withDev)).toEqual(mosaicByTier(plain))
  })

  // Its chests hold nothing on purpose, and findEmptyChests knows a site outside the loot economy
  // has nothing to fill them with — so it reports none of them and the generator does not stop.
  it("leaves no empty chest for the generator to refuse", () => {
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(7)
    const empties = findEmptyChests({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] }, assembleAt)
    expect(empties).toEqual([])
  })
})

describe("what the dev journey authors", () => {
  it("gives each topology feature a floor of its own, spread across four tiers", () => {
    expect(devFloors(withDev).map(f => f.difficulty)).toEqual([
      "junior",
      "junior",
      "expert",
      "expert",
      "master",
      "wizard",
      "expert",
    ])
  })

  it("stands a switch in a reserved junction on every floor but the lever's, which needs no junction", () => {
    // Counted first, so a world that grew no dev journey fails here rather than walking an empty list.
    const floors = devFloors(withDev)
    expect(floors).toHaveLength(7)
    for (const floor of floors.slice(0, 6)) {
      expect(floor.forks).toEqual([{ exits: 2, count: 1 }])
      expect(floor.switches).toEqual({ encounter: "lightbeamSwitch", min: 1, max: 1 })
    }
    // A switch decides which of its OWN ways out opens, so it needs a junction reserved for it; a
    // handle reaches across the floor to doors elsewhere, and asks for neither.
    expect(floors[6].forks).toBeUndefined()
    expect(floors[6].switches).toBeUndefined()
  })

  // The map-piece branch and the ward gate are auto-injected onto ordinary pyramids by position, and
  // a dev site sits at a position that would earn both. Its capability preset is what keeps them off
  // it, so the count of side sections is exactly what the spec authors: two branches on a switch
  // floor, and three on the lever's — the room it stands in and the two doors it swaps.
  it("grows none of the branches the real economies inject by position", () => {
    expect(devFloors(withDev).map(floor => floor.sideSections.length)).toEqual([2, 2, 2, 2, 2, 2, 3])
  })

  it("carves every one of them at the seed the runtime hands it", () => {
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(7)
    const failed: string[] = []
    withDev[DEV_JOURNEY_ID].forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        if (!assembleAt(DEV_JOURNEY_ID, floor, levelIndex + 1, floorIndex))
          failed.push(`level ${levelIndex + 1} floor ${floorIndex}`)
      })
    )
    expect(failed).toEqual([])
  })

  it("stands a one-way drop on the floor that was waiting for one", () => {
    // Pyramid 3's own floor, named as the site it is: the third entry of every floor the journey grew
    // would move the day any dev site gains a second one.
    const pyramid3 = withDev[DEV_JOURNEY_ID][2]
    expect(pyramid3).toHaveLength(1)
    const [floor] = pyramid3
    expect(floor.oneWays).toEqual([{ from: "ledge", to: "sink" }])
    expect(floor.sideSections.map(section => section.label)).toEqual(expect.arrayContaining(["ledge", "sink"]))
  })

  // The only proof the field survives buildConfigs -> buildSite at all: Task 2's DSL test would
  // pass even if the builder dropped regionLayout on the floor, since it only checks the constraint
  // is authorable. Asserted whole (every region with its appetite, every connection, both ports) so
  // a builder that carries only part of the layout still fails here.
  it("stands a layout on the topology bench, carried through world generation", () => {
    const floor = withDev[DEV_JOURNEY_ID][0][0]

    expect(floor.regionLayout).toEqual({
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
      ],
      in: "mouth",
      out: "vault",
    })
  })

  // The gap the layout round-trip above cannot close: it proves the CONFIG survives world
  // generation, not that a carved cell ever reads it. This is the only place a cell's `region` is
  // asserted on a floor that came through world generation rather than a hand-built one —
  // `assembleAt` is the same helper "carves every one of them at the seed the runtime hands it"
  // uses, so this file carves a dev floor exactly one way.
  it("carves the bench floor with every cell knowing its region", () => {
    const floor = withDev[DEV_JOURNEY_ID][0][0]
    const grid = assembleAt(DEV_JOURNEY_ID, floor, 1, 0)
    if (!grid) throw new Error("bench floor did not carve")

    const carved = grid.cells
      .flat()
      .filter((c): c is Extract<typeof c, { type: "room" | "corridor" }> => c.type === "room" || c.type === "corridor")

    expect(carved.filter(c => c.region === undefined)).toEqual([])
    // Exact set, not `⊆ authored`: a route that outran the path would still carry only authored
    // names on every cell, so a subset check cannot see that fault — this is the one place a real
    // generated floor proves every declared region actually got a cell.
    expect([...new Set(carved.map(c => c.region))].sort()).toEqual(["hall", "mouth", "vault"])
  })

  it("stands a lever on pyramid 7, with a door on each side so throwing it swaps them", () => {
    const pyramid7 = withDev[DEV_JOURNEY_ID][6]
    expect(pyramid7).toHaveLength(1)
    const [floor] = pyramid7
    expect(floor.handles).toEqual([{ in: "lever", left: ["vault"], right: ["cellar"] }])
    expect(floor.sideSections.map(section => section.label)).toEqual(
      expect.arrayContaining(["lever", "vault", "cellar"])
    )
  })

  // The develop-only boundary is what keeps an undrawn drop off a floor a player will meet, and it is
  // the capability that grants it — not the journey's id. Said here as well as on the guard itself,
  // because this is the journey the exemption exists for.
  it("is the only journey whose capabilities let a drop stand on it", () => {
    expect(findUndrawnOneWays(withDev)).toEqual([])
    expect(findUndrawnOneWays({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] }, () => PYRAMID_CAPABILITIES)).toHaveLength(
      1
    )
  })
})

// HOW FAR THE LOCK SWEEP REACHES, HELD AS A NUMBER RATHER THAN AS "MORE THAN NOTHING". The build's
// own guard compares the walk against the floors the authoring owes it, which catches a walk that
// stopped reaching them — but not an authoring that quietly stopped standing mechanisms, because then
// both sides fall together. The counts are pinned here, where both worlds exist in one process: the
// shipped world stands one mechanism and a plain build can only ever prove that one, so the seven the
// dev journey adds are provable nowhere else.
describe("the floors the lock sweep walks", () => {
  it("walks the one mechanism the shipped world stands, and finds no strand", () => {
    expect(plainSweep.walked).toHaveLength(1)
    expect(plainSweep.stranding).toEqual([])
  })

  it("walks eight once the dev journey stands its seven, and finds no strand", () => {
    expect(withDevSweep.walked).toHaveLength(8)
    expect(withDevSweep.stranding).toEqual([])
  })

  it("walks seven of them on the dev journey itself", () => {
    expect(withDevSweep.walked.filter(ref => ref.journeyId === DEV_JOURNEY_ID)).toHaveLength(7)
  })

  it("reaches every floor whose authoring owes it a lock, in both worlds", () => {
    expect(findUnwalkedLocks(plain, plainSweep.walked)).toEqual([])
    expect(findUnwalkedLocks(withDev, withDevSweep.walked)).toEqual([])
  })
})

// THE RULING THE PLAYTEST JOURNEY IS THE EXCEPTION TO. A shipped site whose authored switch has no
// baked board stops the build; this journey stands the mechanic at tiers nobody has baked yet, on
// purpose, so its boards are searched for live instead. What excuses it is its capabilities
// (capabilities.ts's requireBakedBoards), never its id.
describe("the baked-board requirement on the dev journey", () => {
  const unbakedOn = (configs: Record<string, SiteConfig[]>) =>
    findUnbakedSwitchBoards(configs, ALL_FAMILY_META, puzzleSeeds)

  // Said first, because everything below would pass just as well on a journey that authored no switch
  // at an unbaked tier at all — and then the exemption would be excusing nothing.
  it("is excusing something: the journey really does author switches no list covers", () => {
    // The same walk with the exemption withdrawn, which is the only way to see what it hides.
    const asIfShipped = findUnbakedSwitchBoards(
      { [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] },
      ALL_FAMILY_META,
      puzzleSeeds,
      () => PYRAMID_CAPABILITIES
    )
    expect([...new Set(asIfShipped.map(board => `${board.difficulty} ${board.forkShape}`))].sort()).toEqual([
      "expert adjacent",
      "expert opposite",
      "expert three",
      "master adjacent",
      "master opposite",
      "master three",
      "wizard adjacent",
      "wizard opposite",
      "wizard three",
    ])
  })

  it("lets the world build anyway, with nothing reported against the dev journey", () => {
    expect(unbakedOn(withDev)).toEqual([])
  })

  it("holds every other journey to the requirement, dev journey present or not", () => {
    expect(unbakedOn(plain)).toEqual([])
    expect(unbakedOn(withoutDev(withDev))).toEqual([])
  })
})
