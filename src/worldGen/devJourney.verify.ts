import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { collectSlots } from "./slots"
import {
  findEmptyChests,
  findStrandingLocks,
  findUnbakedSwitchBoards,
  findUnwalkedLocks,
  type FloorRef,
  type StrandingLock,
} from "./validate"
import { PYRAMID_CAPABILITIES } from "./capabilities"
import { puzzleSeeds } from "../data/puzzleSeeds"
import { generatedWorldConfigs } from "../data/generatedWorld"
import { DEV_JOURNEY_ID } from "./data"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
import { assembleFloor } from "../game/siteAssembler"
// worldGen's FloorConfig is a looser mirror of game/siteTypes.ts's, and authored data only ever
// assigns values the stricter type accepts too — the same cast reachability.ts makes to assemble.
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
import { expandFloorLocks } from "../game/floorLocks"
import { deadFloorRegions, walkFloorLock } from "../game/floorLockWalk"
import { oneWayRuns } from "../game/gridNavigation"
import { refusal } from "./carveSeedSearch"
import { resolveOneWayRealisation } from "../mods/allOneWayRealisations"
import { resolvePassageRealisation } from "../mods/allPassageRealisations"
import { doubleBackLock } from "./spec/locks/doubleBack"
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
// be made at: a floor that carves at some other seed is not the floor anybody opens. A shipped floor
// carves at the (packing, seed) the bake stamped on it; a dev floor, never baked, at its own.
const assembleAt = (journeyId: string, floor: FloorConfig, levelNr: number, floorIndex: number): FloorGrid | null => {
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const baked = generatedWorldConfigs[journeyId]?.[levelNr - 1]?.[floorIndex]
  const pinned = baked ? { ...floor, seed: baked.seed, packing: baked.packing } : floor
  const result = assembleFloor(journeyId, pinned as GameFloorConfig, seed, resolveEncounterMeta, {
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
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(12)
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
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(12)
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
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(12)
    const empties = findEmptyChests({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] }, assembleAt)
    expect(empties).toEqual([])
  })
})

describe("what the dev journey authors", () => {
  it("gives each topology feature a floor of its own, spread across four tiers", () => {
    expect(devFloors(withDev).map(f => f.difficulty)).toEqual([
      "junior",
      "expert",
      "expert",
      "expert",
      "master",
      "wizard",
      "expert",
      "expert",
      "junior",
      "expert",
      "expert",
      "expert",
    ])
  })

  it("stands a switch in a reserved junction on every floor but the lever's, the gate's, the sluice's, doubleBack's, the procession's, twoStones' and stoneGate's, none of which needs one", () => {
    // Counted first, so a world that grew no dev journey fails here rather than walking an empty list.
    const floors = devFloors(withDev)
    expect(floors).toHaveLength(12)
    // A switch decides which of its OWN ways out opens, so it needs a junction reserved for it; a
    // handle reaches across the floor to doors elsewhere, and a control (the lever's, or any of
    // doubleBack's three, the sluice's, the procession's, twoStones' or stoneGate's) stands in its own region — all of them ask for neither.
    const noJunction = new Set([1, 3, 6, 7, 9, 10, 11])
    floors.forEach((floor, i) => {
      if (noJunction.has(i)) {
        expect(floor.forks).toBeUndefined()
        expect(floor.switches).toBeUndefined()
      } else {
        expect(floor.forks).toEqual([{ exits: 2, count: 1 }])
        expect(floor.switches).toEqual({ encounter: "lightbeamSwitch", min: 1, max: 1 })
      }
    })
  })

  // The map-piece branch and the ward gate are auto-injected onto ordinary pyramids by position, and
  // a dev site sits at a position that would earn both. Its capability preset is what keeps them off
  // it, so the count of side sections is exactly what the spec authors: two branches on a switch
  // floor, three on the lever's — the room it stands in and the two doors it swaps — one on the
  // gate's, which needs only somewhere for its control to stand, and none on a lock floor's (doubleBack, the sluice, the procession, twoStones, stoneGate), whose lock
  // is the whole floor.
  it("grows none of the branches the real economies inject by position", () => {
    expect(devFloors(withDev).map(floor => floor.sideSections.length)).toEqual([2, 0, 2, 0, 2, 2, 3, 1, 2, 0, 0, 0])
  })

  it("carves every one of them at the seed the runtime hands it", () => {
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(12)
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

  it("stands a gate on pyramid 8's mouth—hall—vault connection, carried through world generation", () => {
    const pyramid8 = withDev[DEV_JOURNEY_ID][7]
    expect(pyramid8).toHaveLength(1)
    const [floor] = pyramid8

    expect(floor.obstacles).toEqual([
      { id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } },
    ])
  })

  it("stands the control that opens it, carried through world generation", () => {
    const pyramid8 = withDev[DEV_JOURNEY_ID][7]
    const [floor] = pyramid8

    expect(floor.controls).toEqual([
      {
        id: "s1",
        in: "mouth",
        states: ["left", "right"],
        initial: "right",
        returnsToInitial: true,
        opens: { right: ["vaultDoor"] },
      },
    ])
  })

  it("places the designer's doubleBack lock on pyramid 2, bound to the lightbeam switch, the handle and the zipline", () => {
    const pyramid2 = withDev[DEV_JOURNEY_ID][1]
    expect(pyramid2).toHaveLength(1)
    const [floor] = pyramid2

    expect(floor.locks).toEqual([{ lock: doubleBackLock() }])
    expect(floor.realisations).toEqual({ "fork-switch": "lightbeamSwitch", toggle: "handle", "one-way": "zipline" })
    // The lock compiles the layout and the barriers; authoring them beside it would be two statements of one thing.
    expect(floor.regionLayout).toBeUndefined()
    expect(floor.obstacles).toBeUndefined()
    expect(floor.controls).toBeUndefined()
  })

  it("compiles doubleBack's six regions, five gates and its drops, between the floor's entrance and exit", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const expanded = expandFloorLocks(floor as GameFloorConfig)
    if (!expanded.ok) throw new Error(`doubleBack did not compile: ${JSON.stringify(expanded.reasons)}`)
    const { regionLayout, obstacles } = expanded.config

    expect(regionLayout!.regions.map(region => region.name)).toEqual([
      "entrance",
      "doubleBack.in",
      "doubleBack.leftLower",
      "doubleBack.rightLower",
      "doubleBack.s1",
      "doubleBack.s2",
      "doubleBack.out",
      "exit",
    ])
    expect(regionLayout!.connections).toEqual([
      ["entrance", "doubleBack.in"],
      ["doubleBack.in", "doubleBack.leftLower"],
      ["doubleBack.in", "doubleBack.rightLower"],
      ["doubleBack.rightLower", "doubleBack.s1"],
      ["doubleBack.leftLower", "doubleBack.s2"],
      ["doubleBack.in", "doubleBack.out"],
      ["doubleBack.out", "exit"],
    ])
    expect(obstacles!.map(({ id, kind, at }) => [id, kind, at.on === "connection" ? at.between : undefined])).toEqual([
      ["doubleBack.in-leftLower", "gate", ["doubleBack.in", "doubleBack.leftLower"]],
      ["doubleBack.in-rightLower", "gate", ["doubleBack.in", "doubleBack.rightLower"]],
      ["doubleBack.rightLower-s1", "gate", ["doubleBack.rightLower", "doubleBack.s1"]],
      ["doubleBack.leftLower-s2", "gate", ["doubleBack.leftLower", "doubleBack.s2"]],
      ["doubleBack.in-out", "gate", ["doubleBack.in", "doubleBack.out"]],
      ...Object.entries(floor.locks![0].lock.oneWays ?? {}).map(([id, { from, to }]) => [
        `doubleBack.${id}`,
        "oneWay",
        [`doubleBack.${from}`, `doubleBack.${to}`],
      ]),
    ])
  })

  it("compiles doubleBack's three controls: a fork-switch operating its own fork and two toggles dressed as handles", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const expanded = expandFloorLocks(floor as GameFloorConfig)
    if (!expanded.ok) throw new Error(`doubleBack did not compile: ${JSON.stringify(expanded.reasons)}`)

    expect(expanded.config.controls).toEqual([
      { id: "doubleBack.Y", in: "doubleBack.in", control: "fork-switch", encounter: "lightbeamSwitch" },
      {
        id: "doubleBack.S1",
        in: "doubleBack.s1",
        states: ["a", "b"],
        initial: "a",
        returnsToInitial: true,
        opens: { a: ["doubleBack.rightLower-s1"], b: ["doubleBack.leftLower-s2"] },
        encounter: "handle",
      },
      {
        id: "doubleBack.S2",
        in: "doubleBack.s2",
        states: ["a", "b"],
        initial: "a",
        returnsToInitial: true,
        opens: { a: [], b: ["doubleBack.in-out"] },
        encounter: "handle",
      },
    ])
  })

  it("carves pyramid 2 at its own pinned seed on the first attempt, sound: solvable, and no order of moves strands anyone", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    expect(floor.sideSections).toEqual([])
    expect(floor.packing).toBeUndefined()
    expect(floor.seed).toBe(111235356889667)

    const result = assembleFloor(
      DEV_JOURNEY_ID,
      floor as GameFloorConfig,
      floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), 2, 0),
      resolveEncounterMeta,
      {
        resolveKeyRequirements,
        resolveOneWay: resolveOneWayRealisation,
        resolvePassage: resolvePassageRealisation,
        floorRef: { journeyId: DEV_JOURNEY_ID, levelIndex: 1, floorIndex: 0 },
        maxAttempts: 1,
      }
    )
    // The bake's own acceptance: carves, on attempt 0, walks sound, leaves no dead region.
    expect(refusal(result)).toBeNull()
    if (!result.success) throw new Error("unreachable: a refusal-free result carved")
    expect(walkFloorLock(result.grid)).toEqual({ sound: true, states: expect.any(Number) })
    // The second drop is what keeps every region reachable, not what keeps every region occupied by
    // some state — no region is dead on this floor exactly as on the design doc's own worked example.
    expect(deadFloorRegions(result.grid)).toEqual([])
  })

  it("stands the fork-switch junction on exactly the two seams into the arms, resting or open to one of them", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const grid = assembleAt(DEV_JOURNEY_ID, floor, 2, 0)
    if (!grid) throw new Error("doubleBack did not carve at its own seed")
    const junctions = grid.cells
      .flat()
      .filter((cell): cell is Extract<typeof cell, { type: "room" }> => cell.type === "room")
      .filter(room => room.mechanismId === "doubleBack.Y")
    expect(junctions).toHaveLength(1)
    const [Y] = junctions

    expect(Y.family).toBe("lightbeamSwitch")
    expect(Y.region).toBe("doubleBack.in")
    const seams = Y.exits!.filter(exit => exit.kind !== "main")
    const arm = (dir: string): string | undefined => {
      const [r, c] = grid.cells
        .flatMap((row, ri) => row.map((cell, ci) => (cell === Y ? [ri, ci] : [])))
        .find(at => at.length)!
      const [dr, dc] = { n: [-2, 0], s: [2, 0], e: [0, 2], w: [0, -2] }[dir]!
      const next = grid.cells[r + dr][c + dc]
      return next.type === "empty" ? undefined : next.region
    }
    expect(seams.map(exit => [exit.gateKeyId!.split(":").pop(), arm(exit.dir)]).sort()).toEqual([
      ["doubleBack.in-leftLower", "doubleBack.leftLower"],
      ["doubleBack.in-rightLower", "doubleBack.rightLower"],
    ])
    // Rest, then one position per seam: each opens its own seam and shuts the other.
    expect(Y.mechanism!.states).toHaveLength(3)
    expect(Y.mechanism!.states[0]).toBe("rest")
    expect([...Y.mechanism!.positions.map(p => p.gateKeyId)].sort()).toEqual(seams.map(exit => exit.gateKeyId!).sort())
  })

  it("stands S1 and S2 as handles, each in its own chamber", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const grid = assembleAt(DEV_JOURNEY_ID, floor, 2, 0)
    if (!grid) throw new Error("doubleBack did not carve at its own seed")
    const toggles = grid.cells
      .flat()
      .filter((cell): cell is Extract<typeof cell, { type: "room" }> => cell.type === "room")
      .filter(room => room.mechanismId === "doubleBack.S1" || room.mechanismId === "doubleBack.S2")

    expect(toggles.map(room => [room.mechanismId, room.family, room.region]).sort()).toEqual([
      ["doubleBack.S1", "handle", "doubleBack.s1"],
      ["doubleBack.S2", "handle", "doubleBack.s2"],
    ])
  })

  it("draws every drop the lock declares as a zipline from its launch region to its landing region", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const grid = assembleAt(DEV_JOURNEY_ID, floor, 2, 0)
    if (!grid) throw new Error("doubleBack did not carve at its own seed")
    const regionAt = ([r, c]: readonly [number, number]) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.region
    }

    expect(
      oneWayRuns(grid)
        .map(run => [run.kind, regionAt(run.launch), regionAt(run.landing)])
        .sort()
    ).toEqual(
      Object.values(floor.locks![0].lock.oneWays ?? {})
        .map(({ from, to }) => ["zipline", `doubleBack.${from}`, `doubleBack.${to}`])
        .sort()
    )
  })

  it("has Y, S1 and S2 on pyramid 2 each wear a glyph of their own, and every gate wear its mechanism's mark", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const grid = assembleAt(DEV_JOURNEY_ID, floor, 2, 0)
    if (!grid) throw new Error("doubleBack did not carve at its own seed")
    const rooms = grid.cells.flat().filter(cell => cell.type === "room")
    const mechanisms = rooms.filter(room => room.mechanismId !== undefined)
    expect(mechanisms.map(room => room.mechanismId).sort()).toEqual(["doubleBack.S1", "doubleBack.S2", "doubleBack.Y"])
    const glyphs = mechanisms.map(room => room.mark?.glyph)
    expect(glyphs.every(glyph => glyph !== undefined)).toBe(true)
    expect(new Set(glyphs).size).toBe(3)
    for (const room of mechanisms)
      for (const { gateKeyId } of room.mechanism!.positions)
        for (const gate of rooms.filter(cell => cell.requiredKeyId === gateKeyId))
          expect(gate.mark, `${room.mechanismId} ${gateKeyId}`).toEqual(room.mark)
  })

  // THE SECOND DROP, ON THE REAL ASSEMBLED FLOOR: pyramid 2's own carve with the drop that leaves leftLower for
  // the junction's region cut out — its launch no longer opens onto it and its span is empty ground — so the only
  // thing that differs is the one drop under test. Without it the player who falls into leftLower has no way back
  // to the junction, and the walk refuses the floor.
  it("walks unsound on pyramid 2's own carve once the second drop is taken away", () => {
    const [floor] = withDev[DEV_JOURNEY_ID][1]
    const grid = assembleAt(DEV_JOURNEY_ID, floor, 2, 0)
    if (!grid) throw new Error("doubleBack did not carve at its own seed")
    const regionAt = ([r, c]: readonly [number, number]) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.region
    }
    const second = oneWayRuns(grid).find(
      run => regionAt(run.launch) === "doubleBack.leftLower" && regionAt(run.landing) === "doubleBack.in"
    )
    if (!second) throw new Error("the carve has no drop from leftLower to the junction's region")
    const cells = grid.cells.map(row => [...row])
    for (const [r, c] of second.cells) cells[r][c] = { type: "empty" }
    const [lr, lc] = second.launch
    const launch = cells[lr][lc]
    if (launch.type !== "room" && launch.type !== "corridor") throw new Error("the drop's launch is no ground")
    cells[lr][lc] = { ...launch, dirs: new Set([...launch.dirs].filter(dir => dir !== second.dir)) }

    const result = walkFloorLock({ ...grid, cells })
    expect(result?.sound).toBe(false)
  })
})

// HOW FAR THE LOCK SWEEP REACHES, HELD AS A NUMBER RATHER THAN AS "MORE THAN NOTHING". The build's
// own guard compares the walk against the floors the authoring owes it, which catches a walk that
// stopped reaching them — but not an authoring that quietly stopped standing mechanisms, because then
// both sides fall together. The counts are pinned here, where both worlds exist in one process: the
// shipped world stands seven mechanism floors and a plain build can only ever prove those, so the twelve the
// dev journey adds are provable nowhere else.
describe("the floors the lock sweep walks", () => {
  it("walks the seven mechanism floors the shipped world stands, and finds no strand", () => {
    expect(plainSweep.walked).toHaveLength(7)
    expect(plainSweep.stranding).toEqual([])
  })

  it("walks nineteen once the dev journey stands its twelve, and finds no strand", () => {
    expect(withDevSweep.walked).toHaveLength(19)
    expect(withDevSweep.stranding).toEqual([])
  })

  it("walks twelve of them on the dev journey itself", () => {
    expect(withDevSweep.walked.filter(ref => ref.journeyId === DEV_JOURNEY_ID)).toHaveLength(12)
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
      "master adjacent",
      "master opposite",
      "master three",
      "wizard adjacent",
      "wizard opposite",
      "wizard three",
    ])
  })

  it("lets the world build anyway, with nothing reported against the dev journey", () => {
    expect(unbakedOn(withDev).filter(board => board.journeyId === DEV_JOURNEY_ID)).toEqual([])
  })

  it("holds every other journey to the requirement, dev journey present or not", () => {
    expect(unbakedOn(withoutDev(withDev))).toEqual(unbakedOn(plain))
  })
})
