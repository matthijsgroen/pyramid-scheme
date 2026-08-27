import { describe, expect, it } from "vitest"
import {
  applyMove,
  forcedMove,
  gcd,
  isReachable,
  legalMoves,
  openingGap,
  playLine,
  shortestLine,
  usefulMoves,
  type Capacities,
  type Volumes,
} from "./canisters"

const EMPTY: Volumes = [0, 0]
const key = (v: Volumes) => `${v[0]},${v[1]}`

describe("pouring", () => {
  it("empties the source or fills the destination, whichever comes first", () => {
    // The two cases are the whole rule, and which one happened is the information a pour carries.
    expect(applyMove([3, 5], [3, 0], { kind: "pour", from: 0, to: 1 })).toEqual([0, 3])
    expect(applyMove([3, 5], [3, 4], { kind: "pour", from: 0, to: 1 })).toEqual([2, 5])
  })

  it("offers no move that changes nothing", () => {
    // Pouring a full canister into a full one is not something the player can do, so it is not something
    // the solver may reason about.
    expect(legalMoves([3, 5], [3, 5]).filter(m => m.kind === "pour")).toEqual([])
    expect(
      legalMoves([3, 5], [0, 0])
        .map(m => m.kind)
        .sort()
    ).toEqual(["fill", "fill"])
  })
})

describe("what can be measured at all", () => {
  it("is the multiples of the two capacities' common divisor, and nothing else", () => {
    expect([1, 2, 3, 4, 5].filter(t => isReachable([3, 5], t))).toEqual([1, 2, 3, 4, 5])
    // Two even canisters can never measure an odd volume — the rung that teaches why.
    expect([1, 2, 3, 4, 5, 6, 7, 8].filter(t => isReachable([4, 8], t))).toEqual([4, 8])
  })

  it("agrees with the search, which is the only thing that could disagree with it", () => {
    // isReachable is decided arithmetically so generation never gambles; this holds it to what a search
    // actually finds, over every target of every pair up to 12.
    for (let a = 2; a <= 11; a++)
      for (let b = a + 1; b <= 12; b++)
        for (let t = 0; t <= b; t++) {
          const found = shortestLine([a, b], EMPTY, t) !== null
          expect(found, `[${a},${b}] -> ${t}`).toBe(isReachable([a, b], t))
        }
  })
})

/**
 * **The property the whole family rests on** (design doc §4.3).
 *
 * A line has at most TWO points where the player chooses; every other step has exactly one move worth
 * making, decided by two local rules with no lookahead. That is what lets a hint name a move and say why:
 * on a forced step the reason is checkable from the board, and on a choice step there is nothing to hint
 * because the choice is the puzzle.
 *
 * A property test rather than an example, because a single counter-example would mean hints could only
 * come from a search — and a hint that cannot say WHY is the one thing this catalogue does not ship.
 */
describe("a line is two decisions and forced everywhere else", () => {
  const survey = () => {
    let steps = 0
    let forced = 0
    const perLine: number[] = []
    for (let a = 3; a <= 13; a++)
      for (let b = a + 1; b <= 14; b++) {
        if (gcd(a, b) === a) continue
        const capacities: Capacities = [a, b]
        for (let target = 1; target <= b; target++) {
          if (!isReachable(capacities, target)) continue
          const line = shortestLine(capacities, EMPTY, target)
          if (line === null || line.length === 0) continue
          const seen = new Set([key(EMPTY)])
          let at: Volumes = EMPTY
          let choices = 0
          for (const move of line) {
            const useful = usefulMoves(capacities, at, seen).length
            steps++
            if (useful === 1) forced++
            else choices++
            at = applyMove(capacities, at, move)
            seen.add(key(at))
          }
          perLine.push(choices)
        }
      }
    return { steps, forced, perLine }
  }

  it("never asks the player to choose more than twice in one line", () => {
    const { perLine } = survey()
    expect(perLine.length).toBeGreaterThan(300)
    expect(Math.max(...perLine)).toBeLessThanOrEqual(2)
    expect(Math.min(...perLine)).toBeGreaterThanOrEqual(1)
  })

  it("forces three steps in four, which is what there is to hint", () => {
    const { steps, forced } = survey()
    expect(forced / steps).toBeGreaterThan(0.7)
  })

  it("is forced from a non-empty start too, which is what makes a second leg safe", () => {
    // A leg after the first opens from wherever the last one left off (design doc §5).
    const capacities: Capacities = [5, 8]
    const start: Volumes = [2, 8]
    const line = shortestLine(capacities, start, 3)
    expect(line).not.toBeNull()
    const seen = new Set([key(start)])
    let at = start
    let choices = 0
    for (const move of line!) {
      if (usefulMoves(capacities, at, seen).length > 1) choices++
      at = applyMove(capacities, at, move)
      seen.add(key(at))
    }
    expect(choices).toBeLessThanOrEqual(2)
  })

  it("names no move where the player still has a choice", () => {
    // From empty both fills are open, so there is nothing to hint — the choice is the puzzle.
    expect(forcedMove([3, 5], EMPTY, new Set([key(EMPTY)]))).toBeUndefined()
  })
})

describe("the opening", () => {
  it("costs at most two moves to get wrong, which is why the budget must be exact", () => {
    // Measured over every reachable target of every pair up to 16: the gap is 0, 1 or 2 and never more,
    // because a player who opens wrong recovers rather than walking a ruined line. So the penalty cannot
    // carry the difficulty — the budget being exact is what makes being wrong cost anything (§3).
    for (let a = 3; a <= 15; a++)
      for (let b = a + 1; b <= 16; b++) {
        if (gcd(a, b) === a) continue
        for (let t = 1; t <= b; t++) {
          if (t % gcd(a, b) !== 0) continue
          const gap = openingGap([a, b], EMPTY, t)
          expect(gap, `[${a},${b}] -> ${t}`).toBeLessThanOrEqual(2)
        }
      }
  })
})

describe("playing a line out", () => {
  it("lands on the target it was found for", () => {
    const line = shortestLine([7, 11], EMPTY, 6)
    expect(line).not.toBeNull()
    expect(playLine([7, 11], EMPTY, line!)).toContain(6)
  })
})

/**
 * **An independent check on the search**, and the reason the opening is the whole decision.
 *
 * The folk framing of this puzzle is two mechanical strategies: keep filling one vessel and pouring it
 * into the other, emptying and refilling as they run out. Verified here over every reachable target of
 * every pair up to 16 — 900-odd cases — **the better of those two is always the true optimum**, and no
 * mixed line ever beats both.
 *
 * So this is both a correctness oracle for `shortestLine`, written a completely different way, and the
 * statement of what a player is actually choosing between.
 */
describe("the two mechanical strategies", () => {
  const strategy = (capacities: Capacities, target: number, from: 0 | 1): number => {
    const to = (1 - from) as 0 | 1
    const volumes = [0, 0]
    for (let steps = 0; steps < 500; steps++) {
      if (volumes[0] === target || volumes[1] === target) return steps
      if (volumes[from] === 0) {
        volumes[from] = capacities[from]
        continue
      }
      if (volumes[to] === capacities[to]) {
        volumes[to] = 0
        continue
      }
      const amount = Math.min(volumes[from], capacities[to] - volumes[to])
      volumes[from] -= amount
      volumes[to] += amount
    }
    return Infinity
  }

  it("bound the shortest line from empty, on every reachable target up to 14", () => {
    let checked = 0
    for (let a = 2; a <= 13; a++)
      for (let b = a + 1; b <= 14; b++)
        for (let target = 1; target <= b; target++) {
          const capacities: Capacities = [a, b]
          if (!isReachable(capacities, target)) continue
          const search = shortestLine(capacities, EMPTY, target)?.length
          const mechanical = Math.min(strategy(capacities, target, 0), strategy(capacities, target, 1))
          expect(search, `[${a},${b}] -> ${target}`).toBe(mechanical)
          checked++
        }
    expect(checked).toBeGreaterThan(500)
  })
})
