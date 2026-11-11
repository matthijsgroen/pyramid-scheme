import { describe, expect, it } from "vitest"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { worldLevelSites } from "@/data/worldLevels"
import { demandLabel, enumerateConfigs, seedFloor } from "@/game/seeds/enumerateConfigs"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { findUnbakedSwitchBoards } from "@/worldGen/validate"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import { FORK_SHAPES } from "@/game/forkShape"

// The guard on the shipped artifact (`docs/instructions/puzzle-screens.md`: the search happens on a build
// machine, not a phone). A miss is never *wrong* — play time falls back to generating live — so this
// does not protect correctness. It protects the reason
// the lists exist: a dial moved, the key moved with it, and the top tier is quietly back to searching
// on the player's phone.
const demands = enumerateConfigs(worldLevelSites, ALL_FAMILY_META)
const labelledDemand = (demand: (typeof demands)[number]) => `${demandLabel(demand)}: ${demand.rooms}`

describe("shipped puzzle seeds", () => {
  it("covers every configuration the baked world asks a seedable family for", () => {
    const missing = demands.filter(demand => !puzzleSeeds[demand.hash]?.length)
    expect(missing.map(demandLabel)).toEqual([])
  })

  // Coverage alone is not enough: a bucket holding fewer boards than the rooms that draw from it
  // repeats one for certain, since a room picks by `roomSeed % seeds.length` off an arbitrary hash.
  //
  // Held to the FLOOR (the demand itself) rather than to the target the offline pass aims for. The
  // pass fills to 1.5×, and that gap is headroom on purpose: moving rooms between buckets that
  // already exist is what re-authoring a journey does constantly, and the artifact still covers them.
  // So this goes red when the lists genuinely cannot — a family added, or one drawn at a tier it had
  // never reached — and stays quiet for churn. Asserting the target instead would demand a
  // regeneration for every authoring edit, which is a build step masquerading as a guard.
  it("covers the rooms drawing from each bucket, with the surplus as headroom", () => {
    const thin = demands
      .filter(demand => (puzzleSeeds[demand.hash]?.length ?? 0) < seedFloor(demand))
      .map(demand => `${demandLabel(demand)}: ${puzzleSeeds[demand.hash]?.length ?? 0} for ${demand.rooms} rooms`)
    expect(thin).toEqual([])
  })

  it("builds a room's board from the list rather than from the room's own seed", () => {
    const roomSeed = 123456
    for (const demand of demands) {
      const meta = ALL_FAMILY_META.find(family => family.id === demand.familyId)!
      const options = meta.seedable!.resolveOptions(demand.ctx)
      const seeds = puzzleSeeds[demand.hash]
      expect(generatePuzzle(meta, roomSeed, demand.ctx)).toEqual(
        meta.seedable!.generate(seeds[roomSeed % seeds.length], options, 1)
      )
    }
  })

  it("ships no bucket the world no longer asks for", () => {
    const wanted = new Set(demands.map(demand => demand.hash))
    expect(Object.keys(puzzleSeeds).filter(hash => !wanted.has(hash))).toEqual([])
  })

  // Sampled rather than swept: a full re-verify is the CLI's job, and re-solving every board of every
  // family would put minutes of the top tiers' solver time into every test run.
  describe.each(demands.map(demand => [demandLabel(demand), demand] as const))("%s", (_name, demand) => {
    // Three boards a bucket rather than fewer: the middle and last entries are exactly where a half-filled
    // list goes wrong.
    it("still builds a board its own generator would keep, on the first attempt", () => {
      const seedable = ALL_FAMILY_META.find(family => family.id === demand.familyId)?.seedable
      const options = seedable!.resolveOptions(demand.ctx)
      const seeds = puzzleSeeds[demand.hash] ?? []
      for (const seed of [seeds[0], seeds[seeds.length >> 1], seeds[seeds.length - 1]].filter(s => s !== undefined))
        expect(seedable!.grade(seedable!.generate(seed, options, 1), options)).not.toBeNull()
    })
  })
})

// What the world asked for BEFORE a switch was ever counted, pinned so the switch's arrival is proved
// additive: teaching the pass about `switches` must not move one room of one other family into or out of
// a bucket. Re-authoring a journey moves these numbers and this table moves with it — a diff that touches
// only the lines whose journeys were edited is what it is here to show.
const DEMAND_WITHOUT_SWITCHES = [
  "constellation/wizard: 74",
  "canisters/wizard: 70",
  "procession/wizard: 70",
  "balance-scale/wizard: 69",
  "futoshiki/wizard: 60",
  "rush-hour/wizard: 57",
  "hidato/wizard: 57",
  "constellation/master: 56",
  "eclipse/wizard: 53",
  "lightbeam/wizard: 53",
  "sudoku/wizard: 50",
  "balance-scale/master: 50",
  "sumplete/wizard: 50",
  "star-battle/wizard: 47",
  "twin-stars/wizard: 46",
  "procession/master: 45",
  "hidato/master: 44",
  "canisters/master: 41",
  "eclipse/master: 33",
  "procession/expert: 33",
  "eclipse/expert: 32",
  "sudoku/master: 30",
  "sudoku/expert: 29",
  "canisters/expert: 29",
  "twin-stars/master: 29",
  "sumplete/expert: 29",
  "sumplete/master: 28",
  "constellation/expert: 27",
  "futoshiki/master: 27",
  "constellation/junior: 26",
  "hidato/expert: 26",
  "star-battle/master: 26",
  "hidato/starter: 25",
  "twin-stars/expert: 25",
  "rush-hour/master: 24",
  "rush-hour/expert: 24",
  "lightbeam/master: 24",
  "rush-hour/starter: 23",
  "lightbeam/expert: 22",
  "canisters/junior: 19",
  "balance-scale/expert: 19",
  "star-battle/junior: 19",
  "sudoku/starter: 18",
  "balance-scale/starter: 18",
  "lightbeam/junior: 18",
  "futoshiki/expert: 18",
  "twin-stars/junior: 17",
  "lightbeam/starter: 16",
  "eclipse/junior: 16",
  "star-battle/expert: 16",
  "procession/junior: 11",
  "hidato/junior: 11",
  "futoshiki/junior: 8",
  "sudoku/junior: 8",
  "rush-hour/junior: 7",
  "balance-scale/junior: 7",
  "sumplete/junior: 5",
  "procession/expert door4: 1",
]

describe("the demand the world declares", () => {
  it("is the switch's three shapes on top of every other family's, and nothing else moved", () => {
    expect(demands.filter(demand => demand.familyId !== "lightbeamSwitch").map(labelledDemand)).toEqual(
      DEMAND_WITHOUT_SWITCHES
    )
  })

  // A fork's shape is the carve's choice, settled by the maze rather than by the authoring, so a floor
  // that stands a switch anywhere owes a board for all three.
  it("owes the switch a board at every shape, at the tiers the world authors one", () => {
    const switchDemands = demands.filter(demand => demand.familyId === "lightbeamSwitch")
    expect(switchDemands).not.toEqual([])
    for (const tier of new Set(switchDemands.map(demand => demand.difficulty))) {
      expect(
        switchDemands.filter(demand => demand.difficulty === tier).map(demand => demand.ctx.forkShape),
        `lightbeamSwitch/${tier}`
      ).toEqual([...FORK_SHAPES])
    }
  })
})

// THE RULING THIS FILE'S LISTS EXIST FOR: a board's quality stops being bounded by what a phone can
// find in the moment. Live generation is still the mechanism — it is the Lock editor's path and
// the safety net — but for a SHIPPED authored switch it would silently give that ruling back, so
// `yarn generate-world` stops and names the floor instead (scripts/generateWorld.ts).
describe("the baked-board requirement on the shipped world", () => {
  it("is met: every authored switch in the world as it ships has its list", () => {
    expect(findUnbakedSwitchBoards(generatedWorldConfigs, ALL_FAMILY_META, puzzleSeeds)).toEqual([])
  })

  // Emptied one bucket at a time, so the check is shown firing on the real world rather than on a
  // world invented to make it fire — and so a check that could only ever be met fails here.
  it("names the floor and the shape when a bucket is emptied", () => {
    const switchBuckets = demands.filter(demand => demand.familyId === "lightbeamSwitch")
    expect(switchBuckets, "no switch bucket to empty").not.toEqual([])
    for (const bucket of switchBuckets) {
      const without = Object.fromEntries(Object.entries(puzzleSeeds).filter(([hash]) => hash !== bucket.hash))
      const reported = findUnbakedSwitchBoards(generatedWorldConfigs, ALL_FAMILY_META, without)
      expect(reported, `emptying ${demandLabel(bucket)} went unreported`).not.toEqual([])
      for (const board of reported) {
        expect(generatedWorldConfigs[board.journeyId]?.[board.levelNr - 1]?.[board.floorIndex]).toBeDefined()
        expect(board).toMatchObject({
          familyId: "lightbeamSwitch",
          difficulty: bucket.difficulty,
          forkShape: bucket.ctx.forkShape,
        })
      }
    }
  })
})
