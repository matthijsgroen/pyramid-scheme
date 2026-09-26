import { describe, expect, it } from "vitest"
import {
  findEmptyChests,
  findStrandingLocks,
  findUnbakedSwitchBoards,
  findUndrawnOneWays,
  sweepMissedASwitch,
  validateRewardCounts,
} from "./validate"
import { DEV_CAPABILITIES, PYRAMID_CAPABILITIES } from "./capabilities"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta, FamilyOptions } from "@/game/families/familyMeta"
import type { ForkShape } from "@/game/forkShape"
import { configHash } from "@/game/seeds/configHash"
import { WORLD_TARGETS } from "./worldSpec"
import { PYRAMID_JOURNEYS } from "./data"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
import type { FloorGrid, RoomCell } from "@/game/siteTypes"
import { assembleFloor, defaultResolveEncounter } from "@/game/siteAssembler"
import type { ResolveEncounter } from "@/game/siteAssembler"
import type { FloorConfig as GameFloorConfig } from "@/game/siteTypes"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

const fillFragments = (n: number): FloorConfig["sideSections"] =>
  Array.from({ length: n }, (_, i) => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    endReward: { type: "hieroglyphFragment" as const, hieroglyphId: `h${i}` },
  }))

describe("validateRewardCounts", () => {
  it("throws when a non-last floor is set to exit incorrectly", () => {
    const configs = { site: [[floor({ exitOrStaircase: "staircase" })]] as SiteConfig[] }
    expect(() => validateRewardCounts(configs)).toThrow(/expected "exit"/)
  })

  it("throws when mapPiece count doesn't match WORLD_TARGETS", () => {
    const configs = { site: [[floor()]] as SiteConfig[] }
    expect(() => validateRewardCounts(configs)).toThrow(new RegExp(`Expected ${WORLD_TARGETS.mapPieceRewards} map`))
  })

  it("throws when a mapPiece references an unknown journey id", () => {
    const configs = {
      site: [
        [
          floor({
            sideSections: [
              {
                pathPuzzles: 0,
                difficulty: "starter",
                end: "treasure",
                endReward: { type: "mapPiece", tombId: "not_real" },
              },
            ],
          }),
        ],
      ] as SiteConfig[],
    }
    expect(() => validateRewardCounts(configs)).toThrow(/unknown journey IDs/)
  })

  // A config valid on every OTHER check (mapPiece count, known journey ids) so the
  // fragment-count tests below isolate just that one check. Mosaic is no longer a
  // validateRewardCounts concern — it's a mod-owned capped currency the placement pass
  // hard-fails on, not a post-hoc count here.
  const validConfigWithFragments = (n: number): Record<string, SiteConfig[]> => {
    const realTombId = PYRAMID_JOURNEYS[0].id
    return {
      [realTombId]: [
        [
          floor({
            sideSections: [
              ...fillFragments(n),
              ...Array.from({ length: WORLD_TARGETS.mapPieceRewards }, () => ({
                pathPuzzles: 0,
                difficulty: "starter" as const,
                end: "treasure" as const,
                endReward: { type: "mapPiece" as const, tombId: realTombId },
              })),
            ],
          }),
        ],
      ] as SiteConfig[],
    }
  }

  // The "is this a gating-currency reward" predicate is injected (in production, built from the
  // registered currencies). Here a stand-in matching the hieroglyphFragment rewards fillFragments emits.
  const isFragment = (r: TreasureReward) => r.type === "hieroglyphFragment"

  it("passes when counts exactly match WORLD_TARGETS and all mapPiece ids are known", () => {
    expect(() => validateRewardCounts(validConfigWithFragments(5), 5, isFragment)).not.toThrow()
  })

  it("throws when the gating-currency reward count doesn't match the injected expectation", () => {
    expect(() => validateRewardCounts(validConfigWithFragments(3), 5, isFragment)).toThrow(
      /Expected 5 gating-currency rewards, got 3/
    )
  })

  it("skips the currency-reward check entirely when no expectation is injected", () => {
    expect(() => validateRewardCounts(validConfigWithFragments(3), undefined, isFragment)).not.toThrow()
  })

  // §7.3: a hidden corridor is a discovery-gated OPTIONAL pocket — a gating currency the solver
  // must guarantee (map piece / registered fragment) may never sit there. placeFragments excludes
  // hidden slots; this guard is the post-build backstop.
  const realTombId = PYRAMID_JOURNEYS[0].id
  const hiddenSectionWith = (r: TreasureReward): Record<string, SiteConfig[]> => ({
    [realTombId]: [
      [
        floor({
          sideSections: [
            { pathPuzzles: 0, difficulty: "starter", end: "treasure", hidden: true, endReward: r },
            ...Array.from({ length: WORLD_TARGETS.mapPieceRewards }, () => ({
              pathPuzzles: 0,
              difficulty: "starter" as const,
              end: "treasure" as const,
              endReward: { type: "mapPiece" as const, tombId: realTombId },
            })),
          ],
        }),
      ],
    ] as SiteConfig[],
  })

  it("throws when a hidden section holds a gating currency (registered fragment)", () => {
    const configs = hiddenSectionWith({ type: "hieroglyphFragment", hieroglyphId: "h0" })
    expect(() => validateRewardCounts(configs, undefined, isFragment)).toThrow(/hidden .*pocket/)
  })

  it("throws when a hidden section holds a map piece", () => {
    const configs = hiddenSectionWith({ type: "mapPiece", tombId: realTombId })
    expect(() => validateRewardCounts(configs, undefined, isFragment)).toThrow(/hidden .*pocket/)
  })

  it("allows a hidden section holding optional (non-gating) loot", () => {
    const configs = hiddenSectionWith({ type: "sellable", itemId: "sell_bronze_1" })
    expect(() => validateRewardCounts(configs, undefined, isFragment)).not.toThrow()
  })
})

// The old `validateDiscovery` tests were removed in §E — secondary-tomb discovery + ward-key
// ordering are no longer a separate post-build check; the worklist reachability model
// (reachability.ts + placeFragments.ts) guarantees both and hard-fails on a stuck lock. Its
// coverage lives in reachability.spec.ts / the configBuilder integration golden guard. See
// docs/game-design/keys-and-locks-solver.md.

// The shop economy guard moved to the shop mod (src/mods/shop/game/economyGuard.spec.ts) —
// it's a shop-owned balance check, injected as the mod's worldValidator, not a core rule.

describe("findEmptyChests", () => {
  // Chests are authored. The generator will not rearrange a floor around one that holds nothing, so
  // this is what tells the author to settle it: add loot, or take the chest out.
  const grid = (rooms: Array<Partial<RoomCell>>): FloorGrid => ({
    cells: [
      rooms.map(r => ({ type: "room", roomType: "encounter", dirs: new Set(), state: "fogged", ...r }) as RoomCell),
    ],
    rows: 1,
    cols: rooms.length,
    entrancePos: [0, 0],
    exitPos: [0, rooms.length - 1],
    siteId: "s",
    staircases: {},
  })

  const found = (rooms: Array<Partial<RoomCell>>) =>
    findEmptyChests({ j: [[floor()]] }, () => grid(rooms)).map(c => `${c.row},${c.col}`)

  it("names a treasure room that holds nothing", () => {
    expect(found([{ tags: ["treasure"] }])).toEqual(["0,0"])
  })

  it("says nothing about a chest that holds something", () => {
    expect(found([{ tags: ["treasure"], reward: { type: "money", amount: 1 } }])).toEqual([])
  })

  it("says nothing about a floor-key host, which holds a key rather than a reward", () => {
    // A treasure end with no authored endReward is how a section OFFERS itself as a key host — the
    // assembler puts a key in it. Reading the spec alone would report every one of those as empty.
    expect(found([{ tags: ["treasure"], keyColor: "blue" }])).toEqual([])
  })

  it("says nothing about a stocked shop, and names an unstocked one", () => {
    expect(found([{ tags: ["shop"], stock: [{ type: "money", amount: 1 }] }])).toEqual([])
    expect(found([{ tags: ["shop"], stock: [undefined] }])).toEqual(["0,0"])
  })

  it("leaves puzzle rooms alone — a puzzle without loot is an ordinary room", () => {
    expect(found([{ tags: ["puzzle"] }])).toEqual([])
  })
})

describe("findUnbakedSwitchBoards", () => {
  const seedable: FamilyMeta = {
    id: "stub-switch",
    ownerMod: "test",
    tags: ["stub-switch"],
    icon: "",
    color: "",
    rewardPriority: 0,
    seedable: {
      resolveOptions: ({ difficulty, forkShape }) => ({ difficulty, forkShape }) as unknown as FamilyOptions,
      generate: () => null,
      grade: () => null,
    },
  }
  const bucket = (difficulty: Difficulty, forkShape: ForkShape) =>
    configHash(seedable.seedable!.resolveOptions({ difficulty, forkShape }))

  const switchFloor = (difficulty: Difficulty) =>
    floor({ difficulty, forks: [{ exits: 2, count: 1 }], switches: { encounter: "stub-switch", min: 1, max: 1 } })

  const shipped = PYRAMID_JOURNEYS[0].id

  it("owes a shipped floor's switch all three shapes, and reports the ones no list covers", () => {
    const seeds = { [bucket("junior", "adjacent")]: [1, 2] }
    expect(
      findUnbakedSwitchBoards({ [shipped]: [[switchFloor("junior")]] }, [seedable], seeds).map(
        board => `${board.difficulty} ${board.forkShape}`
      )
    ).toEqual(["junior opposite", "junior three"])
  })

  it("reads the tier off the floor that authored the switch, not off the journey", () => {
    expect(
      findUnbakedSwitchBoards({ [shipped]: [[switchFloor("wizard")]] }, [seedable], {}).map(board => board.difficulty)
    ).toEqual(["wizard", "wizard", "wizard"])
  })

  it("excuses a site whose capabilities say its boards are not baked", () => {
    const configs = { [shipped]: [[switchFloor("junior")]] }
    expect(findUnbakedSwitchBoards(configs, [seedable], {}, () => DEV_CAPABILITIES)).toEqual([])
    expect(findUnbakedSwitchBoards(configs, [seedable], {}, () => PYRAMID_CAPABILITIES)).toHaveLength(3)
  })

  it("says nothing about a floor that authors no switch, or a family with no generator", () => {
    expect(findUnbakedSwitchBoards({ [shipped]: [[floor()]] }, [seedable], {})).toEqual([])
    const live: FamilyMeta = { ...seedable, seedable: undefined }
    expect(findUnbakedSwitchBoards({ [shipped]: [[switchFloor("junior")]] }, [live], {})).toEqual([])
  })
})

describe("findUndrawnOneWays", () => {
  const shipped = PYRAMID_JOURNEYS[0].id
  const dropFloor = () =>
    floor({
      sideSections: [
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", label: "ledge" },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", label: "sink" },
      ],
      oneWays: [{ from: "ledge", to: "sink" }],
    })

  it("names the floor a drop stands on, and the passage it authored", () => {
    expect(findUndrawnOneWays({ [shipped]: [[floor()], [floor(), dropFloor()]] })).toEqual([
      { journeyId: shipped, levelNr: 2, floorIndex: 1, from: "ledge", to: "sink" },
    ])
  })

  it("excuses a site whose capabilities say it may stand one", () => {
    // Said with both presets, because an exemption that excuses nothing would pass the first line
    // alone: the same floor is refused under a shipped site's capabilities.
    const configs = { [shipped]: [[dropFloor()]] }
    expect(findUndrawnOneWays(configs, () => DEV_CAPABILITIES)).toEqual([])
    expect(findUndrawnOneWays(configs, () => PYRAMID_CAPABILITIES)).toHaveLength(1)
  })

  it("refuses a site nothing knows about, which nothing cleared either", () => {
    expect(findUndrawnOneWays({ unknown: [[dropFloor()]] })).toHaveLength(1)
  })

  it("says nothing about a floor that authors no drop", () => {
    expect(findUndrawnOneWays({ [shipped]: [[floor()]] })).toEqual([])
  })
})

describe("findStrandingLocks", () => {
  // See src/game/floorLock.spec.ts for why the walk back is stubbed: core assembles without the family
  // registry, and a switch is refused outright unless its family offers it.
  const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
    ...defaultResolveEncounter(encounter, defaultTag),
    reEnterable: true,
  })

  const switchFloor = () =>
    floor({
      pathPuzzles: 2,
      difficulty: "junior",
      forks: [{ exits: 2, count: 1 }],
      switches: { encounter: "sumplete", min: 1, max: 1 },
      sideSections: [
        { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
        { pathPuzzles: 1, difficulty: "junior", end: "treasure" },
      ],
    })

  // worldGen's FloorConfig is a slightly looser mirror of game/siteTypes.ts's, and authored data only
  // ever assigns values the stricter type accepts too — the same cast reachability.ts makes.
  const carve = (config: FloorConfig): FloorGrid | null => {
    for (let seed = 0; seed < 60; seed++) {
      const result = assembleFloor("spec:1", config as GameFloorConfig, seed, reEnterableFamilies, {
        floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
      })
      if (result.success) return result.grid
    }
    return null
  }

  // A door nothing on the floor mints the key for, standing on the way out: the walk finds it sealed,
  // so no state it can reach stands at the exit.
  const sealTheWayOut = (grid: FloorGrid | null): FloorGrid | null => {
    if (!grid) return null
    const [r, c] = grid.exitPos
    const cell = grid.cells[r][c]
    if (cell.type !== "room") throw new Error("the way out is not a room")
    const cells = grid.cells.map(row => [...row])
    cells[r][c] = { ...cell, requiredKeyId: "nothing-mints-this", gateVariant: "floor-key", keyIsAuthored: true }
    return { ...grid, cells }
  }

  const configs = { spec: [[switchFloor()]] } as Record<string, SiteConfig[]>

  it("says nothing about a floor carrying no lock", () => {
    const plain = { spec: [[floor()]] } as Record<string, SiteConfig[]>
    expect(findStrandingLocks(plain, (_journeyId, config) => carve(config))).toEqual({ walked: 0, stranding: [] })
  })

  it("reports the floor and the state when a lock leaves the way out unreachable", () => {
    const { stranding } = findStrandingLocks(configs, (_journeyId, config) => sealTheWayOut(carve(config)))
    expect(stranding).toHaveLength(1)
    expect(stranding[0]).toMatchObject({ journeyId: "spec", levelNr: 1, floorIndex: 0 })
    // The exact message, because "way out" also matches the stranding one: the sweep could otherwise
    // report the wrong kind of failure and stay green.
    expect(stranding[0].problem).toBe("no sequence of moves reaches the way out")
  })

  it("counts the floors whose lock it actually walked", () => {
    expect(findStrandingLocks(configs, (_journeyId, config) => carve(config)).walked).toBe(1)
  })

  it("skips a floor that will not carve, which the unassembled sweep already reports", () => {
    expect(findStrandingLocks(configs, () => null)).toEqual({ walked: 0, stranding: [] })
  })

  describe("sweepMissedASwitch", () => {
    it("reports a world that authors a switch whose sweep walked no lock at all", () => {
      expect(sweepMissedASwitch(configs, 0)).toBe(true)
    })

    it("says nothing once the sweep has walked a lock", () => {
      expect(sweepMissedASwitch(configs, 1)).toBe(false)
    })

    it("says nothing about a world that authors no switch, which has no lock to walk", () => {
      const plain = { spec: [[floor()]] } as Record<string, SiteConfig[]>
      expect(sweepMissedASwitch(plain, 0)).toBe(false)
    })

    it("says nothing about a switch no junction was reserved for, which carves no gate", () => {
      const unreserved = {
        spec: [[floor({ switches: { encounter: "sumplete", min: 1, max: 1 } })]],
      } as Record<string, SiteConfig[]>
      expect(sweepMissedASwitch(unreserved, 0)).toBe(false)
    })
  })
})
