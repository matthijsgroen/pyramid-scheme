import { describe, expect, it } from "vitest"
import { findEmptyChests, validateRewardCounts } from "./validate"
import { WORLD_TARGETS } from "./worldSpec"
import { PYRAMID_JOURNEYS } from "./data"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
import type { FloorGrid, RoomCell } from "@/game/siteTypes"

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
