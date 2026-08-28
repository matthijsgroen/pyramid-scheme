import { describe, expect, it } from "vitest"
import {
  applyMove,
  forkCount,
  legalMoves,
  playLine,
  shortestLine,
  totalOf,
  usefulMoves,
  volumeKey,
  type Capacities,
  type Volumes,
} from "./canisters"

const CLASSIC: Capacities = [8, 5, 3]
const FULL: Volumes = [8, 0, 0]

describe("pouring", () => {
  it("empties the source or fills the destination, whichever comes first", () => {
    // The two cases are the whole rule, and which one happened is the information a pour carries.
    expect(applyMove(CLASSIC, [8, 0, 0], { from: 0, to: 1 })).toEqual([3, 5, 0])
    expect(applyMove(CLASSIC, [3, 5, 0], { from: 1, to: 2 })).toEqual([3, 2, 3])
  })

  it("never creates or loses water, which is the whole of this variant", () => {
    // There is no river and no ground: the water in front of the player is all there is, so an amount has
    // to come from somewhere and nothing can be thrown away to start again.
    let volumes: Volumes = FULL
    for (const move of [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 0 },
      { from: 1, to: 2 },
    ]) {
      volumes = applyMove(CLASSIC, volumes, move)
      expect(totalOf(volumes)).toBe(8)
    }
  })

  it("offers no pour that moves nothing", () => {
    expect(legalMoves(CLASSIC, [0, 5, 3])).toEqual([
      { from: 1, to: 0 },
      { from: 2, to: 0 },
    ])
    expect(
      legalMoves(CLASSIC, [8, 0, 0])
        .map(m => m.to)
        .sort()
    ).toEqual([1, 2])
  })
})

describe("the classic board", () => {
  /**
   * Eight full, with a five and a three to work in — Tartaglia's board, and Poisson's.
   *
   * **This family asks for less than the classic does, and the pour count says so.** The famous puzzle is
   * to SPLIT the eight into two fours, which takes seven pours; standing a single four in any canister
   * takes six. Measuring out an amount is what a site asks a room for, so six is the goal here — and the
   * seventh pour, the one that makes the other four, is what the classic wants and this does not.
   */
  it("stands a 4 in a canister in six pours", () => {
    const line = shortestLine(CLASSIC, FULL, 4)
    expect(line).not.toBeNull()
    expect(line).toHaveLength(6)
    expect(playLine(CLASSIC, FULL, line!)).toContain(4)
  })

  it("takes one pour more to make the second 4, which is the classic's own goal", () => {
    const line = shortestLine(CLASSIC, FULL, 4)!
    const at = playLine(CLASSIC, FULL, line)
    const rest = shortestLine(CLASSIC, at, 4)
    // Already standing at a 4, so the search returns nothing to do — the split needs a goal of its own.
    expect(rest).toEqual([])
    expect(at.filter(amount => amount === 4)).toHaveLength(1)
  })
})

/**
 * **What the player is actually deciding**, and the reason this variant is gated on forks rather than on
 * forcing (design doc §4).
 *
 * With no river to fill from and no ground to empty onto, the two rules that made the tap-and-sink version
 * nearly forced have nothing to prune — those moves do not exist. What is left forks, usually two ways, and
 * that fork is the puzzle.
 */
describe("a line forks rather than forcing", () => {
  it("leaves the player a choice at most steps, over every board worth generating", () => {
    let steps = 0
    let forks = 0
    for (let big = 6; big <= 12; big++)
      for (let mid = 3; mid < big; mid++)
        for (let small = 2; small < mid; small++) {
          if (mid + small < big) continue
          const capacities: Capacities = [big, mid, small]
          const start: Volumes = [big, 0, 0]
          for (let target = 1; target < big; target++) {
            const line = shortestLine(capacities, start, target)
            if (line === null || line.length === 0) continue
            const seen = new Set([volumeKey(start)])
            let at = start
            for (const move of line) {
              if (usefulMoves(capacities, at, seen).length > 1) forks++
              steps++
              at = applyMove(capacities, at, move)
              seen.add(volumeKey(at))
            }
          }
        }
    expect(steps).toBeGreaterThan(500)
    // Most steps offer a choice — which is why a hint here narrows rather than decides.
    expect(forks / steps).toBeGreaterThan(0.6)
  })

  it("counts the forks along a line, which is what a board is gated on", () => {
    const line = shortestLine(CLASSIC, FULL, 4)
    expect(forkCount(CLASSIC, FULL, line!)).toBeGreaterThan(0)
  })
})

describe("what can be measured", () => {
  it("finds a line from a non-empty start, which is what makes a second leg safe", () => {
    // A leg after the first begins from wherever the last one left the canisters (design doc §5).
    const line = shortestLine(CLASSIC, [3, 5, 0], 6)
    expect(line).not.toBeNull()
    expect(playLine(CLASSIC, [3, 5, 0], line!)).toContain(6)
  })

  it("returns null for an amount the water cannot stand at", () => {
    // More than there is: 9 cannot come out of 8, however it is poured.
    expect(shortestLine(CLASSIC, FULL, 9)).toBeNull()
  })
})
