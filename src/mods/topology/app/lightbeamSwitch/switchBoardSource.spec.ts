import { beforeAll, describe, expect, it } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { FORK_SHAPES, type ForkShape } from "@/game/forkShape"
import { configHash } from "@/game/seeds/configHash"
import {
  CANONICAL_WAYS_OUT,
  generateLightbeamSwitch,
  resolveLightbeamSwitchOptions,
  type LightbeamSwitchBoard,
} from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { litWayOut } from "../../game/lightbeamSwitch/lightbeamSwitchState"
import { buildSwitchBoard } from "./plugin"

const SEED = 5

const bucketOf = (difficulty: Difficulty, shape: ForkShape) =>
  configHash(resolveLightbeamSwitchOptions({ difficulty, forkShape: shape }))

// THE OWNER'S RULING: a switch board comes off an offline list, verified ahead of time, rather than being
// searched for in the player's session. A fork has three shapes up to rotation and the board is turned to
// face the real one, so the list stays finite — which is what makes the ruling payable at all.
describe("where a switch board comes from", () => {
  it("is the shape and tier's baked list, never a search from the room's own seed", () => {
    let served = 0
    for (const shape of FORK_SHAPES) {
      const list = puzzleSeeds[bucketOf("junior", shape)] ?? []
      expect(list.length, `${shape} at junior ships no seed list`).toBeGreaterThan(0)
      // A seed off the list is what parts the two answers: the room's own seed would build its own board.
      expect(list).not.toContain(SEED)
      const board = buildSwitchBoard(SEED, { difficulty: "junior", forkShape: shape })
      expect(board).toEqual(generateLightbeamSwitch(list[SEED % list.length], "junior", shape, 1))
      expect(board).not.toEqual(generateLightbeamSwitch(SEED, "junior", shape))
      served++
    }
    expect(served).toBe(FORK_SHAPES.length)
  })

  // Only the tiers a SHIPPED floor authors a switch at are baked — junior, today. The develop-only
  // journey stands the mechanic at expert, master and wizard as well, and those are deliberately left
  // to the search: it is where an unbaked tier is meant to be walked. The build lets that through for
  // that journey alone (worldGen/capabilities.ts, worldGen/validate.ts's findUnbakedSwitchBoards) and
  // stops on it everywhere else, so what is left to prove here is that the search still hands over a
  // board worth playing.
  describe("a shape and tier no list covers", () => {
    // Read off the artifact rather than named, so a tier that later earns a list moves to the other
    // side of the split by itself instead of leaving a stale expectation passing.
    const pairs = difficulties.flatMap(difficulty => FORK_SHAPES.map(shape => ({ difficulty, shape })))
    const unlisted = pairs.filter(({ difficulty, shape }) => !puzzleSeeds[bucketOf(difficulty, shape)]?.length)
    const key = ({ difficulty, shape }: { difficulty: Difficulty; shape: ForkShape }) => `${difficulty} ${shape}`

    const built = new Map<string, LightbeamSwitchBoard>()
    // A live search per pair, the wizard three-way ones being the dearest boards this family builds — so
    // the sweep gets a budget of its own rather than the 5s a single-board test is written against.
    beforeAll(() => {
      for (const pair of unlisted)
        built.set(key(pair), buildSwitchBoard(SEED, { difficulty: pair.difficulty, forkShape: pair.shape }))
    }, 60_000)

    // Starter sits in the split too, below the debut a floor may author a switch at: no journey stands
    // one there, so nothing bakes it, and the generator answers anyway.
    it("is every tier but the ones the shipped world authors", () => {
      expect(unlisted.map(key)).toEqual([
        "starter adjacent",
        "starter opposite",
        "starter three",
        "master adjacent",
        "master opposite",
        "master three",
        "wizard adjacent",
        "wizard opposite",
        "wizard three",
      ])
    })

    it("still hands the fork a playable board", () => {
      let checked = 0
      for (const pair of unlisted) {
        const board = built.get(key(pair))!
        expect(board.shrines.map(shrine => shrine.canonicalDir).sort(), key(pair)).toEqual(
          [...CANONICAL_WAYS_OUT[pair.shape]].sort()
        )
        // A board that opens already lit has decided the fork for the player.
        expect(litWayOut(board, { angles: board.grid.initial }), key(pair)).toBeUndefined()
        checked++
      }
      expect(checked).toBe(unlisted.length)
    })
  })
})
