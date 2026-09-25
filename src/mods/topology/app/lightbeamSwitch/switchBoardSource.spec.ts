import { beforeAll, describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
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

  // Only the tiers the shipped world authors a switch at are baked. The dev journey stands one at expert,
  // master and wizard, and a board still has to arrive there — searched for, slower, never wrong.
  describe("a shape and tier no list covers", () => {
    const unbaked = new Map<ForkShape, LightbeamSwitchBoard>()
    // Wizard three-way boards are the dearest this family builds, so the sweep gets a budget of its own
    // rather than the 5s a single-board test is written against.
    beforeAll(() => {
      for (const shape of FORK_SHAPES)
        unbaked.set(shape, buildSwitchBoard(SEED, { difficulty: "wizard", forkShape: shape }))
    }, 60_000)

    it("ships no list to draw from", () => {
      expect(FORK_SHAPES.filter(shape => puzzleSeeds[bucketOf("wizard", shape)]?.length)).toEqual([])
    })

    it("still hands the fork a playable board", () => {
      let built = 0
      for (const shape of FORK_SHAPES) {
        const board = unbaked.get(shape)!
        expect(board.shrines.map(shrine => shrine.canonicalDir).sort()).toEqual([...CANONICAL_WAYS_OUT[shape]].sort())
        // A board that opens already lit has decided the fork for the player.
        expect(litWayOut(board, { angles: board.grid.initial })).toBeUndefined()
        built++
      }
      expect(built).toBe(FORK_SHAPES.length)
    })
  })
})
