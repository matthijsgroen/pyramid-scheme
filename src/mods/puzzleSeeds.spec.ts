import { describe, expect, it } from "vitest"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { worldLevelSites } from "@/data/worldLevels"
import { enumerateConfigs, seedFloor } from "@/game/seeds/enumerateConfigs"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"

// The guard on the shipped artifact (`docs/instructions/puzzle-screens.md` §6.1). A miss is never *wrong* — play
// time falls back to generating live — so this does not protect correctness. It protects the reason
// the lists exist: a dial moved, the key moved with it, and the top tier is quietly back to searching
// on the player's phone.
const demands = enumerateConfigs(worldLevelSites, ALL_FAMILY_META)

describe("shipped puzzle seeds", () => {
  it("covers every configuration the baked world asks a seedable family for", () => {
    const missing = demands.filter(demand => !puzzleSeeds[demand.hash]?.length)
    expect(missing.map(demand => `${demand.familyId}/${demand.difficulty}`)).toEqual([])
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
      .map(
        demand =>
          `${demand.familyId}/${demand.difficulty}: ${puzzleSeeds[demand.hash]?.length ?? 0} for ${demand.rooms} rooms`
      )
    expect(thin).toEqual([])
  })

  it("builds a room's board from the list rather than from the room's own seed", () => {
    const roomSeed = 123456
    for (const demand of demands) {
      const meta = ALL_FAMILY_META.find(family => family.id === demand.familyId)!
      const options = meta.seedable!.resolveOptions({ difficulty: demand.difficulty })
      const seeds = puzzleSeeds[demand.hash]
      expect(generatePuzzle(meta, roomSeed, { difficulty: demand.difficulty })).toEqual(
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
  describe.each(demands.map(demand => [`${demand.familyId}/${demand.difficulty}`, demand] as const))(
    "%s",
    (_name, demand) => {
      it("still builds a board its own generator would keep, on the first attempt", () => {
        const seedable = ALL_FAMILY_META.find(family => family.id === demand.familyId)?.seedable
        const options = seedable!.resolveOptions({ difficulty: demand.difficulty })
        const seeds = puzzleSeeds[demand.hash] ?? []
        for (const seed of [seeds[0], seeds[seeds.length >> 1], seeds[seeds.length - 1]].filter(s => s !== undefined))
          expect(seedable!.grade(seedable!.generate(seed, options, 1), options)).not.toBeNull()
      })
    }
  )
})
