import { describe, expect, it } from "vitest"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { worldLevelSites } from "@/data/worldLevels"
import { demandLabel, enumerateConfigs, seedFloor } from "@/game/seeds/enumerateConfigs"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { findUnbakedSwitchBoards } from "@/worldGen/validate"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"

// The guard on the shipped artifact (`docs/instructions/puzzle-screens.md` §6.1). A miss is never *wrong* — play
// time falls back to generating live — so this does not protect correctness. It protects the reason
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

  // Two boards built for every bucket the world has, so the budget is the sweep's size rather than the
  // default 5s a single-board test is written against.
  it("builds a room's board from the list rather than from the room's own seed", { timeout: 60_000 }, () => {
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
    // **Budgeted for the dearest family rather than the average one.** Rebuilding one board costs what
    // that family's generator costs: microseconds for sumplete, about a second for rush hour, whose
    // generator searches and then climbs (docs/game-design/puzzles/rush-hour.md §3.1). Three boards a
    // bucket at a second each blows the default 5s, and the answer is the budget rather than fewer
    // boards — the middle and last entries are exactly where a half-filled list goes wrong.
    it("still builds a board its own generator would keep, on the first attempt", { timeout: 30_000 }, () => {
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
  "constellation/wizard: 60",
  "canisters/wizard: 59",
  "balance-scale/wizard: 56",
  "procession/wizard: 54",
  "constellation/master: 49",
  "canisters/master: 48",
  "futoshiki/wizard: 48",
  "hidato/wizard: 43",
  "eclipse/wizard: 43",
  "sumplete/wizard: 43",
  "lightbeam/wizard: 43",
  "procession/master: 41",
  "rush-hour/wizard: 41",
  "sudoku/wizard: 40",
  "balance-scale/master: 39",
  "star-battle/wizard: 39",
  "hidato/master: 37",
  "twin-stars/wizard: 35",
  "procession/expert: 30",
  "sumplete/master: 30",
  "eclipse/expert: 29",
  "twin-stars/master: 28",
  "canisters/expert: 27",
  "eclipse/master: 27",
  "sudoku/master: 27",
  "futoshiki/master: 26",
  "rush-hour/master: 24",
  "hidato/expert: 24",
  "constellation/expert: 23",
  "lightbeam/master: 23",
  "sudoku/expert: 22",
  "sumplete/expert: 22",
  "lightbeam/expert: 20",
  "constellation/junior: 20",
  "star-battle/master: 20",
  "twin-stars/expert: 19",
  "rush-hour/expert: 18",
  "balance-scale/expert: 17",
  "star-battle/junior: 17",
  "canisters/junior: 16",
  "star-battle/expert: 15",
  "hidato/junior: 14",
  "twin-stars/junior: 13",
  "eclipse/junior: 12",
  "lightbeam/junior: 12",
  "futoshiki/expert: 12",
  "procession/junior: 11",
  "star-battle/starter: 9",
  "procession/starter: 8",
  "balance-scale/starter: 8",
  "constellation/starter: 8",
  "sudoku/starter: 7",
  "rush-hour/junior: 7",
  "rush-hour/starter: 7",
  "eclipse/starter: 7",
  "futoshiki/junior: 7",
  "hidato/starter: 6",
  "sumplete/junior: 6",
  "balance-scale/junior: 6",
  "lightbeam/starter: 4",
  "futoshiki/starter: 4",
  "sumplete/starter: 3",
  "sudoku/junior: 3",
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
    expect(demands.filter(demand => demand.familyId === "lightbeamSwitch").map(labelledDemand)).toEqual([
      "lightbeamSwitch/junior adjacent: 1",
      "lightbeamSwitch/junior opposite: 1",
      "lightbeamSwitch/junior three: 1",
    ])
  })
})

// THE RULING THIS FILE'S LISTS EXIST FOR: a board's quality stops being bounded by what a phone can
// find in the moment. Live generation is still the mechanism — it is the playtest journey's path and
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
    expect(switchBuckets.length, "no switch bucket to empty").toBe(3)
    for (const bucket of switchBuckets) {
      const without = Object.fromEntries(Object.entries(puzzleSeeds).filter(([hash]) => hash !== bucket.hash))
      expect(
        findUnbakedSwitchBoards(generatedWorldConfigs, ALL_FAMILY_META, without).map(
          board =>
            `${board.journeyId} level ${board.levelNr} floor ${board.floorIndex}: ` +
            `${board.familyId} at ${board.difficulty}, ${board.forkShape} fork`
        ),
        `emptying ${demandLabel(bucket)} went unreported`
      ).toEqual([`junior_2 level 2 floor 0: lightbeamSwitch at junior, ${bucket.ctx.forkShape} fork`])
    }
  })
})
