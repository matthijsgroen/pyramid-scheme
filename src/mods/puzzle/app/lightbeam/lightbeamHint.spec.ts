import { describe, expect, it } from "vitest"
import en from "../../../../../public/locales/en/common.json"
import nl from "../../../../../public/locales/nl/common.json"
import { difficulties } from "@/data/difficultyLevels"
import { isLit, pieceStateCount } from "@/mods/puzzle/game/lightbeam/beam"
import { generateLightbeam } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { LIGHTBEAM_CONFIG } from "@/mods/puzzle/game/lightbeam/lightbeamConfig"
import { TECHNIQUES } from "@/mods/puzzle/game/lightbeam/techniques"
import { buildLightbeamHint } from "./lightbeamHint"

const board = (difficulty: (typeof difficulties)[number], seed: number) => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  return generateLightbeam(size, seed, options)
}

const phrase = (locale: object, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale)

describe("buildLightbeamHint", () => {
  const starter = board("starter", 1)

  it("says nothing once the shrine is lit", () => {
    expect(buildLightbeamHint(starter, starter.solution)).toBeUndefined()
  })

  it("names a piece the player is holding on a setting that cannot work", () => {
    const hint = buildLightbeamHint(starter, starter.initial)
    expect(hint?.piece).toBeDefined()
    expect(starter.movable[hint!.piece!]).toBeDefined()
  })

  it("shows the beam its reason is about, so 'the light dies here' has a here", () => {
    expect(buildLightbeamHint(starter, starter.initial)?.beam.length).toBeGreaterThan(0)
  })

  it("lights the squares the piece it names can stand in", () => {
    const hint = buildLightbeamHint(starter, starter.initial)
    const piece = starter.movable[hint!.piece!]
    const cells = piece.kind === "turnMirror" ? [piece.at] : piece.stops
    for (const at of cells) expect(hint?.cells.has(`${at.row},${at.col}`)).toBe(true)
  })

  // Following the advice is what moves the hint on: put the piece it named where the deduction says, and
  // the next hint is about something else.
  it("moves on once its advice is taken", () => {
    const first = buildLightbeamHint(starter, starter.initial)
    const piece = first!.piece!
    const fixed = starter.initial.map((state, index) => (index === piece ? starter.solution[index] : state))
    expect(buildLightbeamHint(starter, fixed)?.piece).not.toBe(piece)
  })

  // A decoy's setting genuinely does not matter, so a board that is right everywhere else is solved
  // whatever the decoy is doing — and once something else IS wrong, that is what the player needs to hear
  // about, not the piece they can safely ignore.
  it("never spends a hint on a decoy while something real is set wrong", () => {
    // Asks for a branch that turns rather than trusting a tier seed to produce one. That mirror is off the
    // winning beam's line by construction, so it is a decoy — which is also a check that `branchDepth` puts a
    // genuinely free piece on the board.
    const expert = generateLightbeam(7, 2, {
      turns: 4,
      branchDepth: 1,
      techniqueCap: "neverReached",
    })
    // A piece whose every setting still lights the shrine is exactly a decoy.
    const decoy = expert.movable.findIndex((piece, index) =>
      Array.from({ length: pieceStateCount(piece) }, (_, state) =>
        expert.solution.map((held, other) => (other === index ? state : held))
      ).every(config => isLit(expert, config))
    )
    expect(decoy).toBeGreaterThanOrEqual(0)
    const fiddled = expert.solution.map((state, index) =>
      index === decoy ? (state + 1) % pieceStateCount(expert.movable[index]) : state
    )
    // Fiddling with it leaves the shrine lit, so there is no hint to give — the board is already solved.
    expect(isLit(expert, fiddled)).toBe(true)
    // Take the route apart and the decoy is no longer what the player needs to hear about.
    const alsoWrong = fiddled.map((state, index) =>
      index === decoy ? state : (state + 1) % pieceStateCount(expert.movable[index])
    )
    expect(buildLightbeamHint(expert, alsoWrong)?.key).not.toBe("neverReached")
  })

  // A wizard board costs the better part of a second to build and solve — its configuration space is what
  // `onlySurvivor` enumerates — so six of them a tier needs a real timeout rather than vitest's 5s default.
  it("always has something to say while the board is dark", { timeout: 120_000 }, () => {
    for (const difficulty of difficulties)
      for (let seed = 1; seed <= 6; seed++) {
        const puzzle = board(difficulty, seed)
        expect(buildLightbeamHint(puzzle, puzzle.initial)).toBeDefined()
      }
  })
})

describe("every reason the ladder can give is phrased in both locales", () => {
  // A hint that reaches the player as a raw translation key is worse than no hint, so the keys are checked
  // against the ladder itself rather than against whatever the specs above happened to trip over.
  const keys = [
    "entryRun",
    "exitRun",
    // One socket to reach, or several — different sentences, because the second is a route to plan and the
    // first is a square to hit.
    ...["one", "all"].map(shape => `wiringFires.${shape}`),
    "wiringDead",
    ...["deadEnd", "feedsExit"].flatMap(technique => ["wall", "edge", "loop"].map(end => `${technique}.${end}`)),
    "neverReached",
    "onlySurvivor",
  ]

  it("covers every rung of the ladder", () => {
    for (const technique of TECHNIQUES) expect(keys.some(key => key.startsWith(technique))).toBe(true)
  })

  it.each(keys)("%s reads as a sentence in English and Dutch", key => {
    expect(typeof phrase(en.lightbeam.hint, key)).toBe("string")
    expect(typeof phrase(nl.lightbeam.hint, key)).toBe("string")
  })

  it("has the goal and the rules in both", () => {
    for (const locale of [en, nl]) {
      // The goal is its own section above the rules (`puzzle-screens.md` §1), not a bullet in them.
      expect(typeof locale.lightbeam.goal).toBe("string")
      for (const rule of ["mirrors", "walls", "tap", "nodes"])
        expect(typeof phrase(locale.lightbeam.rules, rule)).toBe("string")
    }
  })
})
