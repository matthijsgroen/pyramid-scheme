import { beforeEach, describe, expect, it, vi } from "vitest"
import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { configHash } from "./configHash"
import { generatePuzzle } from "./generatePuzzle"

vi.mock("@/data/puzzleSeeds", () => ({ puzzleSeeds: {} }))
const { puzzleSeeds } = await import("@/data/puzzleSeeds")

type Options = { size: number }
const OPTIONS: Options = { size: 4 }
const HASH = configHash(OPTIONS)

// Records what it was asked for, so a test can tell a listed seed from the room's own and a single
// attempt from the full search.
const calls: { seed: number; attempts?: number }[] = []
const meta: FamilyMeta = {
  id: "test",
  ownerMod: "test",
  tags: [],
  icon: "?",
  color: "blue",
  rewardPriority: 0,
  seedable: seedable({
    resolveOptions: () => OPTIONS,
    generate: (seed, _options, attempts) => {
      calls.push({ seed, attempts })
      return { board: seed }
    },
    grade: () => ({ steps: 1 }),
  }),
}

describe("generatePuzzle", () => {
  beforeEach(() => {
    calls.length = 0
    for (const key of Object.keys(puzzleSeeds)) delete puzzleSeeds[key]
  })

  it("searches on the device when the family has no list yet", () => {
    expect(generatePuzzle(meta, 77, {})).toEqual({ board: 77 })
    expect(calls).toEqual([{ seed: 77, attempts: undefined }])
  })

  it("searches on the device when a dial has moved and taken the key with it", () => {
    puzzleSeeds[configHash({ size: 5 })] = [1234]
    generatePuzzle(meta, 77, {})
    expect(calls).toEqual([{ seed: 77, attempts: undefined }])
  })

  it("builds from a listed seed, in one attempt, when the list has the configuration", () => {
    puzzleSeeds[HASH] = [1234]
    expect(generatePuzzle(meta, 77, {})).toEqual({ board: 1234 })
    expect(calls).toEqual([{ seed: 1234, attempts: 1 }])
  })

  it("indexes the list by the room's own seed, so two rooms draw different boards", () => {
    puzzleSeeds[HASH] = [10, 20, 30]
    expect(generatePuzzle(meta, 7, {})).toEqual({ board: 20 })
    expect(generatePuzzle(meta, 8, {})).toEqual({ board: 30 })
  })

  it("gives one room the same board every time, which is what the save model relies on", () => {
    puzzleSeeds[HASH] = [10, 20, 30]
    expect(generatePuzzle(meta, 41, {})).toEqual(generatePuzzle(meta, 41, {}))
  })

  it("wraps rather than running off the end of a short list", () => {
    puzzleSeeds[HASH] = [10, 20]
    expect(generatePuzzle(meta, 4, {})).toEqual({ board: 10 })
  })

  it("refuses a family that declares no generator", () => {
    expect(() => generatePuzzle({ ...meta, seedable: undefined }, 1, {})).toThrow("declares no generator")
  })

  // A list entry is only ever given ONE attempt, because that is what it was proven to need. So the
  // moment a list and its generator disagree — a dial moved without `yarn generate-seeds`, a seed proven
  // under options that have since shifted — the attempt misses and the generator throws. A board is built
  // during render, so that throw is the screen going away. Searching instead is what every family did
  // before there were lists: slower, never wrong.
  const drifted: FamilyMeta = {
    ...meta,
    seedable: seedable({
      resolveOptions: () => OPTIONS,
      generate: (seed, _options, attempts) => {
        calls.push({ seed, attempts })
        if (attempts === 1) throw new Error("no board for size 8 at regionLine")
        return { board: seed }
      },
      grade: () => ({ steps: 1 }),
    }),
  }

  it("searches when a listed seed does not build first time, instead of letting the throw reach the screen", () => {
    puzzleSeeds[HASH] = [10, 20]

    expect(generatePuzzle(drifted, 77, {})).toEqual({ board: 77 })
    expect(calls).toEqual([
      { seed: 20, attempts: 1 },
      { seed: 77, attempts: undefined },
    ])
  })
})
